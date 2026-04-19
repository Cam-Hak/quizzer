use chrono::{DateTime, TimeDelta, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::storage;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardReviewState {
    pub ease_factor: f64,
    pub interval_days: i64,
    pub repetitions: i64,
    pub next_review: DateTime<Utc>,
    pub last_review: DateTime<Utc>,
}

impl Default for CardReviewState {
    fn default() -> Self {
        Self {
            ease_factor: 2.5,
            interval_days: 0,
            repetitions: 0,
            next_review: Utc::now(),
            last_review: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeckReviewState {
    pub deck_id: String,
    pub cards: HashMap<String, CardReviewState>,
}

/// Maps our 1-4 rating to SM-2's 0-5 quality scale.
/// 1 (Again) -> 0, 2 (Hard) -> 3, 3 (Good) -> 4, 4 (Easy) -> 5
fn map_rating(rating: u8) -> u8 {
    match rating {
        1 => 0,
        2 => 3,
        3 => 4,
        4 => 5,
        _ => 0,
    }
}

pub fn process_rating(state: &mut CardReviewState, rating: u8) {
    let quality = map_rating(rating) as f64;

    if rating >= 2 {
        match state.repetitions {
            0 => state.interval_days = 1,
            1 => state.interval_days = 6,
            _ => state.interval_days = (state.interval_days as f64 * state.ease_factor).round() as i64,
        }
        state.repetitions += 1;
    } else {
        state.repetitions = 0;
        state.interval_days = 1;
    }

    state.ease_factor += 0.1 - (5.0 - quality) * (0.08 + (5.0 - quality) * 0.02);
    if state.ease_factor < 1.3 {
        state.ease_factor = 1.3;
    }

    state.last_review = Utc::now();
    state.next_review = state.last_review + TimeDelta::days(state.interval_days);
}

pub fn get_due_cards(review_state: &DeckReviewState, all_card_ids: &[String], max_new: usize) -> Vec<String> {
    let now = Utc::now();
    let mut due: Vec<String> = vec![];
    let mut new_cards: Vec<String> = vec![];

    for card_id in all_card_ids {
        match review_state.cards.get(card_id) {
            Some(state) if state.next_review <= now => due.push(card_id.clone()),
            None => new_cards.push(card_id.clone()),
            _ => {}
        }
    }

    due.sort_by(|a, b| {
        let a_review = &review_state.cards[a].next_review;
        let b_review = &review_state.cards[b].next_review;
        a_review.cmp(b_review)
    });

    let new_count = max_new.min(new_cards.len());
    due.extend(new_cards.into_iter().take(new_count));

    due
}

fn review_path(data_dir: &Path, deck_id: &str) -> Result<PathBuf, String> {
    storage::validate_id(deck_id)?;
    let dir = storage::ensure_subdir(data_dir, "reviews")?;
    Ok(dir.join(format!("{}.json", deck_id)))
}

pub fn load_review_state(data_dir: &Path, deck_id: &str) -> Result<DeckReviewState, String> {
    let path = review_path(data_dir, deck_id)?;
    Ok(storage::read_json(&path).unwrap_or_else(|| DeckReviewState {
        deck_id: deck_id.to_string(),
        cards: HashMap::new(),
    }))
}

pub fn save_review_state(data_dir: &Path, state: &DeckReviewState) -> Result<(), String> {
    let path = review_path(data_dir, &state.deck_id)?;
    storage::write_json(&path, state)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_first_correct_review_sets_1_day() {
        let mut state = CardReviewState::default();
        process_rating(&mut state, 3);
        assert_eq!(state.interval_days, 1);
        assert_eq!(state.repetitions, 1);
    }

    #[test]
    fn test_second_correct_review_sets_6_days() {
        let mut state = CardReviewState::default();
        process_rating(&mut state, 3);
        process_rating(&mut state, 3);
        assert_eq!(state.interval_days, 6);
        assert_eq!(state.repetitions, 2);
    }

    #[test]
    fn test_subsequent_reviews_multiply_by_ease() {
        let mut state = CardReviewState::default();
        state.ease_factor = 2.5;
        state.repetitions = 2;
        state.interval_days = 6;
        process_rating(&mut state, 3);
        assert_eq!(state.interval_days, 15); // round(6 * 2.5)
    }

    #[test]
    fn test_again_resets_repetitions() {
        let mut state = CardReviewState::default();
        state.repetitions = 5;
        state.interval_days = 30;
        process_rating(&mut state, 1);
        assert_eq!(state.repetitions, 0);
        assert_eq!(state.interval_days, 1);
    }

    #[test]
    fn test_ease_factor_minimum() {
        let mut state = CardReviewState::default();
        state.ease_factor = 1.3;
        process_rating(&mut state, 1);
        assert!(state.ease_factor >= 1.3);
    }

    #[test]
    fn test_easy_increases_ease_factor() {
        let mut state = CardReviewState::default();
        let original_ef = state.ease_factor;
        process_rating(&mut state, 4);
        assert_eq!(state.ease_factor, original_ef + 0.1);
    }

    #[test]
    fn test_hard_decreases_ease_factor() {
        let mut state = CardReviewState::default();
        let original_ef = state.ease_factor;
        process_rating(&mut state, 2);
        assert!(state.ease_factor < original_ef);
    }

    #[test]
    fn test_get_due_cards_returns_overdue() {
        let mut review = DeckReviewState {
            deck_id: "d1".to_string(),
            cards: HashMap::new(),
        };
        review.cards.insert("c1".to_string(), CardReviewState {
            next_review: Utc::now() - TimeDelta::days(1),
            ..CardReviewState::default()
        });
        review.cards.insert("c2".to_string(), CardReviewState {
            next_review: Utc::now() + TimeDelta::days(5),
            ..CardReviewState::default()
        });

        let all_ids = vec!["c1".to_string(), "c2".to_string()];
        let due = get_due_cards(&review, &all_ids, 0);
        assert_eq!(due, vec!["c1"]);
    }

    #[test]
    fn test_get_due_cards_includes_new_cards() {
        let review = DeckReviewState {
            deck_id: "d1".to_string(),
            cards: HashMap::new(),
        };
        let all_ids = vec!["c1".to_string(), "c2".to_string(), "c3".to_string()];
        let due = get_due_cards(&review, &all_ids, 2);
        assert_eq!(due.len(), 2);
    }

    #[test]
    fn test_get_due_cards_limits_new() {
        let review = DeckReviewState {
            deck_id: "d1".to_string(),
            cards: HashMap::new(),
        };
        let all_ids: Vec<String> = (0..30).map(|i| format!("c{}", i)).collect();
        let due = get_due_cards(&review, &all_ids, 20);
        assert_eq!(due.len(), 20);
    }

    #[test]
    fn test_save_and_load_review_state() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().to_path_buf();
        let deck_id = uuid::Uuid::new_v4().to_string();
        let mut state = DeckReviewState {
            deck_id: deck_id.clone(),
            cards: HashMap::new(),
        };
        state.cards.insert("c1".to_string(), CardReviewState::default());

        save_review_state(&path, &state).unwrap();
        let loaded = load_review_state(&path, &deck_id).unwrap();
        assert_eq!(loaded.cards.len(), 1);
        assert!(loaded.cards.contains_key("c1"));
    }

    #[test]
    fn test_load_missing_review_returns_empty() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().to_path_buf();
        let deck_id = uuid::Uuid::new_v4().to_string();
        let state = load_review_state(&path, &deck_id).unwrap();
        assert_eq!(state.deck_id, deck_id);
        assert!(state.cards.is_empty());
    }
}
