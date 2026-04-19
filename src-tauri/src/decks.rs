use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub front: String,
    pub back: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Deck {
    pub id: String,
    pub title: String,
    pub description: String,
    pub cards: Vec<Card>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Deck {
    pub fn new(title: String, description: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            description,
            cards: vec![],
            created_at: now,
            updated_at: now,
        }
    }

    pub fn add_card(&mut self, front: String, back: String) -> Card {
        let card = Card {
            id: Uuid::new_v4().to_string(),
            front,
            back,
            created_at: Utc::now(),
        };
        self.cards.push(card.clone());
        self.updated_at = Utc::now();
        card
    }

    pub fn remove_card(&mut self, card_id: &str) -> bool {
        let len = self.cards.len();
        self.cards.retain(|c| c.id != card_id);
        if self.cards.len() != len {
            self.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn update_card(&mut self, card_id: &str, front: String, back: String) -> bool {
        if let Some(card) = self.cards.iter_mut().find(|c| c.id == card_id) {
            card.front = front;
            card.back = back;
            self.updated_at = Utc::now();
            true
        } else {
            false
        }
    }
}

use crate::storage;
use std::path::PathBuf;

fn decks_dir(data_dir: &PathBuf) -> PathBuf {
    storage::ensure_subdir(data_dir, "decks")
}

fn deck_path(data_dir: &PathBuf, deck_id: &str) -> PathBuf {
    decks_dir(data_dir).join(format!("{}.json", deck_id))
}

pub fn save_deck(data_dir: &PathBuf, deck: &Deck) {
    let path = deck_path(data_dir, &deck.id);
    storage::write_json(&path, deck);
}

pub fn load_deck(data_dir: &PathBuf, deck_id: &str) -> Option<Deck> {
    let path = deck_path(data_dir, deck_id);
    storage::read_json(&path)
}

pub fn list_decks(data_dir: &PathBuf) -> Vec<Deck> {
    let dir = decks_dir(data_dir);
    storage::list_json_files(&dir)
        .iter()
        .filter_map(|p| storage::read_json::<Deck>(p))
        .collect()
}

pub fn delete_deck(data_dir: &PathBuf, deck_id: &str) -> bool {
    let path = deck_path(data_dir, deck_id);
    storage::delete_json(&path)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_dir() -> (tempfile::TempDir, PathBuf) {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().to_path_buf();
        (dir, path)
    }

    #[test]
    fn test_create_deck() {
        let deck = Deck::new("Biology".to_string(), "Chapter 1".to_string());
        assert_eq!(deck.title, "Biology");
        assert_eq!(deck.description, "Chapter 1");
        assert!(deck.cards.is_empty());
    }

    #[test]
    fn test_add_and_remove_card() {
        let mut deck = Deck::new("Test".to_string(), "".to_string());
        let card = deck.add_card("Q".to_string(), "A".to_string());
        assert_eq!(deck.cards.len(), 1);

        assert!(deck.remove_card(&card.id));
        assert!(deck.cards.is_empty());
        assert!(!deck.remove_card("nonexistent"));
    }

    #[test]
    fn test_update_card() {
        let mut deck = Deck::new("Test".to_string(), "".to_string());
        let card = deck.add_card("Q".to_string(), "A".to_string());

        assert!(deck.update_card(&card.id, "Q2".to_string(), "A2".to_string()));
        assert_eq!(deck.cards[0].front, "Q2");
        assert_eq!(deck.cards[0].back, "A2");
        assert!(!deck.update_card("nonexistent", "X".to_string(), "Y".to_string()));
    }

    #[test]
    fn test_save_and_load_deck() {
        let (_dir, path) = test_dir();
        let mut deck = Deck::new("Bio".to_string(), "Ch1".to_string());
        deck.add_card("What is DNA?".to_string(), "Deoxyribonucleic acid".to_string());

        save_deck(&path, &deck);
        let loaded = load_deck(&path, &deck.id).unwrap();

        assert_eq!(loaded.title, "Bio");
        assert_eq!(loaded.cards.len(), 1);
        assert_eq!(loaded.cards[0].front, "What is DNA?");
    }

    #[test]
    fn test_list_decks() {
        let (_dir, path) = test_dir();
        save_deck(&path, &Deck::new("Deck 1".to_string(), "".to_string()));
        save_deck(&path, &Deck::new("Deck 2".to_string(), "".to_string()));

        let decks = list_decks(&path);
        assert_eq!(decks.len(), 2);
    }

    #[test]
    fn test_delete_deck() {
        let (_dir, path) = test_dir();
        let deck = Deck::new("Delete me".to_string(), "".to_string());
        save_deck(&path, &deck);

        assert!(delete_deck(&path, &deck.id));
        assert!(load_deck(&path, &deck.id).is_none());
    }
}
