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
use std::path::{Path, PathBuf};

fn decks_dir(data_dir: &Path) -> Result<PathBuf, String> {
    storage::ensure_subdir(data_dir, "decks")
}

fn deck_path(data_dir: &Path, deck_id: &str) -> Result<PathBuf, String> {
    storage::validate_id(deck_id)?;
    Ok(decks_dir(data_dir)?.join(format!("{}.json", deck_id)))
}

pub fn save_deck(data_dir: &Path, deck: &Deck) -> Result<(), String> {
    let path = deck_path(data_dir, &deck.id)?;
    storage::write_json(&path, deck)
}

pub fn load_deck(data_dir: &Path, deck_id: &str) -> Result<Option<Deck>, String> {
    let path = deck_path(data_dir, deck_id)?;
    storage::read_json(&path)
}

pub fn list_decks(data_dir: &Path) -> Result<Vec<Deck>, String> {
    let dir = decks_dir(data_dir)?;
    Ok(storage::list_json_files(&dir)
        .iter()
        .filter_map(|p| match storage::read_json::<Deck>(p) {
            Ok(Some(deck)) => Some(deck),
            Ok(None) => None,
            Err(e) => {
                eprintln!("skipping corrupted deck file {}: {}", p.display(), e);
                None
            }
        })
        .collect())
}

pub fn delete_deck(data_dir: &Path, deck_id: &str) -> Result<bool, String> {
    let path = deck_path(data_dir, deck_id)?;
    Ok(storage::delete_json(&path))
}

fn validate_csv_path(file_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(file_path);
    let resolve = if path.exists() {
        path.canonicalize().map_err(|e| format!("invalid path: {}", e))?
    } else {
        let resolved = path.parent()
            .and_then(|p| p.canonicalize().ok())
            .map(|p| p.join(path.file_name().unwrap_or_default()))
            .ok_or_else(|| "Parent directory does not exist".to_string())?;
        resolved
    };
    let home = dirs::home_dir().ok_or("cannot determine home directory")?;
    let allowed = [
        home,
        std::env::temp_dir().canonicalize().unwrap_or_else(|_| std::env::temp_dir()),
    ];
    if !allowed.iter().any(|a| resolve.starts_with(a)) {
        return Err("file path must be within home or temp directory".to_string());
    }
    Ok(resolve)
}

pub fn export_deck_csv(data_dir: &Path, deck_id: &str, file_path: &str) -> Result<(), String> {
    validate_csv_path(file_path)?;
    let deck = load_deck(data_dir, deck_id)?
        .ok_or_else(|| format!("deck not found: {}", deck_id))?;
    let mut wtr = csv::Writer::from_path(file_path)
        .map_err(|e| format!("failed to open file for writing: {}", e))?;
    wtr.write_record(["front", "back"])
        .map_err(|e| format!("failed to write header: {}", e))?;
    for card in &deck.cards {
        wtr.write_record([&card.front, &card.back])
            .map_err(|e| format!("failed to write card: {}", e))?;
    }
    wtr.flush().map_err(|e| format!("failed to flush: {}", e))?;
    Ok(())
}

pub fn import_deck_csv(data_dir: &Path, file_path: &str, title: String) -> Result<Deck, String> {
    validate_csv_path(file_path)?;
    let content = std::fs::read_to_string(file_path)
        .map_err(|e| format!("failed to read file: {}", e))?;

    let delimiter = if content.lines().next().unwrap_or("").contains('\t') { b'\t' } else { b',' };

    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(delimiter)
        .has_headers(false)
        .from_reader(content.as_bytes());

    let mut deck = Deck::new(title, String::new());
    let mut first = true;

    for result in rdr.records() {
        let record = result.map_err(|e| format!("failed to parse row: {}", e))?;
        if record.len() < 2 { continue; }

        let col0 = record[0].trim();
        let col1 = record[1].trim();

        if first {
            first = false;
            let c0 = col0.to_lowercase();
            let c1 = col1.to_lowercase();
            if (c0 == "front" || c0 == "term" || c0 == "question")
                && (c1 == "back" || c1 == "definition" || c1 == "answer")
            {
                continue;
            }
        }

        if col0.is_empty() && col1.is_empty() { continue; }
        deck.add_card(col0.to_string(), col1.to_string());
    }

    save_deck(data_dir, &deck)?;
    Ok(deck)
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

        save_deck(&path, &deck).unwrap();
        let loaded = load_deck(&path, &deck.id).unwrap().unwrap();

        assert_eq!(loaded.title, "Bio");
        assert_eq!(loaded.cards.len(), 1);
        assert_eq!(loaded.cards[0].front, "What is DNA?");
    }

    #[test]
    fn test_list_decks() {
        let (_dir, path) = test_dir();
        save_deck(&path, &Deck::new("Deck 1".to_string(), "".to_string())).unwrap();
        save_deck(&path, &Deck::new("Deck 2".to_string(), "".to_string())).unwrap();

        let decks = list_decks(&path).unwrap();
        assert_eq!(decks.len(), 2);
    }

    #[test]
    fn test_delete_deck() {
        let (_dir, path) = test_dir();
        let deck = Deck::new("Delete me".to_string(), "".to_string());
        save_deck(&path, &deck).unwrap();

        assert!(delete_deck(&path, &deck.id).unwrap());
        assert!(load_deck(&path, &deck.id).unwrap().is_none());
    }

    #[test]
    fn test_path_traversal_rejected() {
        let (_dir, path) = test_dir();
        assert!(load_deck(&path, "../../../etc/passwd").is_err());
        assert!(delete_deck(&path, "../../malicious").is_err());
    }

    #[test]
    fn test_export_and_import_csv() {
        let (_dir, path) = test_dir();
        let mut deck = Deck::new("Export Test".to_string(), "".to_string());
        deck.add_card("What is H2O?".to_string(), "Water".to_string());
        deck.add_card("What is NaCl?".to_string(), "Salt".to_string());
        save_deck(&path, &deck).unwrap();

        let csv_path = _dir.path().join("export.csv");
        export_deck_csv(&path, &deck.id, csv_path.to_str().unwrap()).unwrap();

        let imported = import_deck_csv(&path, csv_path.to_str().unwrap(), "Imported".to_string()).unwrap();
        assert_eq!(imported.title, "Imported");
        assert_eq!(imported.cards.len(), 2);
        assert_eq!(imported.cards[0].front, "What is H2O?");
        assert_eq!(imported.cards[0].back, "Water");
        assert_eq!(imported.cards[1].front, "What is NaCl?");
        assert_eq!(imported.cards[1].back, "Salt");
    }

    #[test]
    fn test_import_csv_skips_header() {
        let (_dir, path) = test_dir();
        let csv_path = _dir.path().join("with_header.csv");
        std::fs::write(&csv_path, "front,back\nQ1,A1\nQ2,A2\n").unwrap();

        let deck = import_deck_csv(&path, csv_path.to_str().unwrap(), "Header Test".to_string()).unwrap();
        assert_eq!(deck.cards.len(), 2);
        assert_eq!(deck.cards[0].front, "Q1");
    }

    #[test]
    fn test_import_tsv() {
        let (_dir, path) = test_dir();
        let tsv_path = _dir.path().join("tabs.tsv");
        std::fs::write(&tsv_path, "term\tdefinition\nDNA\tDeoxyribonucleic acid\n").unwrap();

        let deck = import_deck_csv(&path, tsv_path.to_str().unwrap(), "TSV Test".to_string()).unwrap();
        assert_eq!(deck.cards.len(), 1);
        assert_eq!(deck.cards[0].front, "DNA");
        assert_eq!(deck.cards[0].back, "Deoxyribonucleic acid");
    }
}
