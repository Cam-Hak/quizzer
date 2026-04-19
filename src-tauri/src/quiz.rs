use chrono::{DateTime, Utc};
use rand::seq::SliceRandom;
use rand::thread_rng;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::decks::{Card, Deck};
use crate::storage;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum QuestionType {
    MultipleChoice,
    Written,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Question {
    pub card_id: String,
    pub prompt: String,
    pub correct_answer: String,
    pub question_type: QuestionType,
    pub options: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestAnswer {
    pub card_id: String,
    pub correct: bool,
    pub given_answer: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub id: String,
    pub deck_id: String,
    pub score: usize,
    pub total: usize,
    pub answers: Vec<TestAnswer>,
    pub completed_at: DateTime<Utc>,
}

pub fn generate_questions(
    deck: &Deck,
    count: Option<usize>,
    question_type: QuestionType,
) -> Vec<Question> {
    let mut rng = thread_rng();
    let mut cards: Vec<&Card> = deck.cards.iter().collect();
    cards.shuffle(&mut rng);

    let count = count.unwrap_or(cards.len()).min(cards.len());
    let selected = &cards[..count];

    selected
        .iter()
        .map(|card| {
            let effective_type = if question_type == QuestionType::MultipleChoice && deck.cards.len() < 4 {
                QuestionType::Written
            } else {
                question_type.clone()
            };

            match effective_type {
                QuestionType::MultipleChoice => {
                    let mut distractors: Vec<String> = deck
                        .cards
                        .iter()
                        .filter(|c| c.id != card.id)
                        .map(|c| c.back.clone())
                        .collect();
                    distractors.shuffle(&mut rng);
                    distractors.truncate(3);

                    let mut options = distractors;
                    options.push(card.back.clone());
                    options.shuffle(&mut rng);

                    Question {
                        card_id: card.id.clone(),
                        prompt: card.front.clone(),
                        correct_answer: card.back.clone(),
                        question_type: QuestionType::MultipleChoice,
                        options: Some(options),
                    }
                }
                QuestionType::Written => Question {
                    card_id: card.id.clone(),
                    prompt: card.front.clone(),
                    correct_answer: card.back.clone(),
                    question_type: QuestionType::Written,
                    options: None,
                },
            }
        })
        .collect()
}

pub fn check_written_answer(given: &str, correct: &str) -> bool {
    given.trim().to_lowercase() == correct.trim().to_lowercase()
}

pub fn save_test_result(data_dir: &PathBuf, result: &TestResult) {
    let dir = storage::ensure_subdir(data_dir, "tests");
    let path = dir.join(format!("{}.json", result.id));
    storage::write_json(&path, result);
}

pub fn load_test_results(data_dir: &PathBuf, deck_id: &str) -> Vec<TestResult> {
    let dir = storage::ensure_subdir(data_dir, "tests");
    storage::list_json_files(&dir)
        .iter()
        .filter_map(|p| storage::read_json::<TestResult>(p))
        .filter(|r| r.deck_id == deck_id)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::decks::Deck;

    fn make_deck(n: usize) -> Deck {
        let mut deck = Deck::new("Test Deck".to_string(), "".to_string());
        for i in 0..n {
            deck.add_card(format!("Q{}", i), format!("A{}", i));
        }
        deck
    }

    #[test]
    fn test_generate_written_questions() {
        let deck = make_deck(5);
        let questions = generate_questions(&deck, None, QuestionType::Written);
        assert_eq!(questions.len(), 5);
        for q in &questions {
            assert_eq!(q.question_type, QuestionType::Written);
            assert!(q.options.is_none());
        }
    }

    #[test]
    fn test_generate_mc_questions_with_enough_cards() {
        let deck = make_deck(6);
        let questions = generate_questions(&deck, Some(3), QuestionType::MultipleChoice);
        assert_eq!(questions.len(), 3);
        for q in &questions {
            assert_eq!(q.question_type, QuestionType::MultipleChoice);
            let opts = q.options.as_ref().unwrap();
            assert_eq!(opts.len(), 4);
            assert!(opts.contains(&q.correct_answer));
        }
    }

    #[test]
    fn test_mc_falls_back_to_written_with_few_cards() {
        let deck = make_deck(3);
        let questions = generate_questions(&deck, None, QuestionType::MultipleChoice);
        for q in &questions {
            assert_eq!(q.question_type, QuestionType::Written);
        }
    }

    #[test]
    fn test_count_limits_questions() {
        let deck = make_deck(10);
        let questions = generate_questions(&deck, Some(5), QuestionType::Written);
        assert_eq!(questions.len(), 5);
    }

    #[test]
    fn test_check_written_answer() {
        assert!(check_written_answer("  Hello  ", "hello"));
        assert!(check_written_answer("HELLO", "hello"));
        assert!(!check_written_answer("wrong", "right"));
    }

    #[test]
    fn test_save_and_load_test_results() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().to_path_buf();

        let result = TestResult {
            id: "t1".to_string(),
            deck_id: "d1".to_string(),
            score: 8,
            total: 10,
            answers: vec![
                TestAnswer { card_id: "c1".to_string(), correct: true, given_answer: "A1".to_string() },
            ],
            completed_at: Utc::now(),
        };

        save_test_result(&path, &result);
        let loaded = load_test_results(&path, "d1");
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].score, 8);
    }

    #[test]
    fn test_load_results_filters_by_deck() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().to_path_buf();

        let r1 = TestResult {
            id: "t1".to_string(),
            deck_id: "d1".to_string(),
            score: 5,
            total: 10,
            answers: vec![],
            completed_at: Utc::now(),
        };
        let r2 = TestResult {
            id: "t2".to_string(),
            deck_id: "d2".to_string(),
            score: 8,
            total: 10,
            answers: vec![],
            completed_at: Utc::now(),
        };

        save_test_result(&path, &r1);
        save_test_result(&path, &r2);

        let results = load_test_results(&path, "d1");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].deck_id, "d1");
    }
}
