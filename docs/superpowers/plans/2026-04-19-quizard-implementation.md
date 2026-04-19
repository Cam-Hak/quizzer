# Quizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight cross-platform desktop flashcard app with spaced repetition and test generation.

**Architecture:** Tauri v2 (Rust backend) + Svelte 5 (TypeScript frontend). Rust handles file I/O, SM-2 algorithm, and quiz generation via Tauri IPC commands. Svelte renders 4 views (Home, DeckEditor, Study, Test) with state-based routing. All data persisted as JSON files in the platform app data directory.

**Tech Stack:** Tauri v2, Svelte 5 (runes), TypeScript, Rust, Playwright (E2E)

**Note:** The spec calls the quiz module `tests.rs` but this plan uses `quiz.rs` to avoid naming conflicts with Rust's `#[cfg(test)] mod tests` convention.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `svelte.config.js`, `tsconfig.json`, `index.html`
- Create: `src/main.ts`, `src/App.svelte`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git and create .gitignore**

```bash
cd /Users/cameronhakenson/Developer/quizard
git init
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
target/
.superpowers/
.DS_Store
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "quizard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5",
    "@tauri-apps/cli": "^2",
    "svelte": "^5",
    "typescript": "^5",
    "vite": "^6"
  }
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
});
```

- [ ] **Step 4: Create svelte.config.js**

```js
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
};
```

- [ ] **Step 5: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "paths": {
      "$lib/*": ["./src/lib/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.svelte"]
}
```

- [ ] **Step 6: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Quizard</title>
    <link rel="stylesheet" href="/src/app.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: Create src/main.ts and src/App.svelte**

`src/main.ts`:

```ts
import App from "./App.svelte";
import { mount } from "svelte";

const app = mount(App, { target: document.getElementById("app")! });

export default app;
```

`src/App.svelte`:

```svelte
<h1>Quizard</h1>
```

- [ ] **Step 8: Create src-tauri/Cargo.toml**

```toml
[package]
name = "quizard"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
tauri-build = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
rand = "0.8"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

- [ ] **Step 9: Create src-tauri/tauri.conf.json**

```json
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-config-schema/schema.json",
  "productName": "Quizard",
  "version": "0.1.0",
  "identifier": "com.quizard.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "title": "Quizard",
    "windows": [
      {
        "title": "Quizard",
        "width": 1024,
        "height": 768,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

- [ ] **Step 10: Create src-tauri/src/main.rs and build.rs**

`src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build()
}
```

`src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 11: Create src-tauri/capabilities/default.json**

```json
{
  "$schema": "https://raw.githubusercontent.com/nickkuk/tauri-docs/v2/references/_schemas/capability.json",
  "identifier": "default",
  "description": "Default capabilities for Quizard",
  "windows": ["main"],
  "permissions": ["core:default"]
}
```

- [ ] **Step 12: Install dependencies and verify build**

```bash
cd /Users/cameronhakenson/Developer/quizard
npm install
cd src-tauri && cargo check && cd ..
```

Expected: npm installs successfully, cargo check compiles with no errors.

- [ ] **Step 13: Commit**

```bash
git add .gitignore package.json vite.config.ts svelte.config.js tsconfig.json index.html src/ src-tauri/
git commit -m "feat: scaffold Tauri v2 + Svelte 5 project"
```

---

### Task 2: Storage Module (Rust)

**Files:**
- Create: `src-tauri/src/storage.rs`

- [ ] **Step 1: Write tests for storage helpers**

Create `src-tauri/src/storage.rs`:

```rust
use std::fs;
use std::path::PathBuf;

pub fn data_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    use tauri::Manager;
    let dir = app_handle.path().app_data_dir().expect("failed to get app data dir").join("data");
    fs::create_dir_all(&dir).expect("failed to create data dir");
    dir
}

pub fn ensure_subdir(base: &PathBuf, name: &str) -> PathBuf {
    let dir = base.join(name);
    fs::create_dir_all(&dir).expect("failed to create subdir");
    dir
}

pub fn read_json<T: serde::de::DeserializeOwned>(path: &PathBuf) -> Option<T> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn write_json<T: serde::Serialize>(path: &PathBuf, data: &T) {
    let content = serde_json::to_string_pretty(data).expect("failed to serialize");
    fs::write(path, content).expect("failed to write file");
}

pub fn list_json_files(dir: &PathBuf) -> Vec<PathBuf> {
    let entries = fs::read_dir(dir);
    match entries {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| p.extension().map_or(false, |ext| ext == "json"))
            .collect(),
        Err(_) => vec![],
    }
}

pub fn delete_json(path: &PathBuf) -> bool {
    fs::remove_file(path).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_write_and_read_json() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.json");

        let mut data: HashMap<String, String> = HashMap::new();
        data.insert("key".to_string(), "value".to_string());

        write_json(&path.to_path_buf(), &data);
        let result: Option<HashMap<String, String>> = read_json(&path.to_path_buf());

        assert!(result.is_some());
        assert_eq!(result.unwrap().get("key").unwrap(), "value");
    }

    #[test]
    fn test_read_json_missing_file() {
        let path = PathBuf::from("/nonexistent/file.json");
        let result: Option<HashMap<String, String>> = read_json(&path);
        assert!(result.is_none());
    }

    #[test]
    fn test_list_json_files() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("a.json"), "{}").unwrap();
        fs::write(dir.path().join("b.json"), "{}").unwrap();
        fs::write(dir.path().join("c.txt"), "").unwrap();

        let files = list_json_files(&dir.path().to_path_buf());
        assert_eq!(files.len(), 2);
    }

    #[test]
    fn test_delete_json() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("delete_me.json");
        fs::write(&path, "{}").unwrap();

        assert!(delete_json(&path.to_path_buf()));
        assert!(!path.exists());
    }
}
```

- [ ] **Step 2: Add tempfile dev dependency to Cargo.toml**

Add to `src-tauri/Cargo.toml` under `[dependencies]`:

```toml
[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 3: Register module in main.rs and run tests**

Add to top of `src-tauri/src/main.rs`:

```rust
mod storage;
```

Run:

```bash
cd src-tauri && cargo test storage::tests -- --nocapture
```

Expected: all 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/storage.rs src-tauri/src/main.rs src-tauri/Cargo.toml
git commit -m "feat: add storage module with JSON file helpers"
```

---

### Task 3: Decks Module (Rust)

**Files:**
- Create: `src-tauri/src/decks.rs`

- [ ] **Step 1: Write deck types and tests**

Create `src-tauri/src/decks.rs`:

```rust
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
```

- [ ] **Step 2: Register module and run tests**

Add to `src-tauri/src/main.rs`:

```rust
mod decks;
```

Run:

```bash
cd src-tauri && cargo test decks::tests -- --nocapture
```

Expected: all 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/decks.rs src-tauri/src/main.rs
git commit -m "feat: add decks module with CRUD operations"
```

---

### Task 4: SM-2 Review Engine (Rust)

**Files:**
- Create: `src-tauri/src/review.rs`

- [ ] **Step 1: Write SM-2 algorithm with tests**

Create `src-tauri/src/review.rs`:

```rust
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

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
    state.next_review = state.last_review + Duration::days(state.interval_days);
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

fn review_path(data_dir: &PathBuf, deck_id: &str) -> PathBuf {
    let dir = storage::ensure_subdir(data_dir, "reviews");
    dir.join(format!("{}.json", deck_id))
}

pub fn load_review_state(data_dir: &PathBuf, deck_id: &str) -> DeckReviewState {
    let path = review_path(data_dir, deck_id);
    storage::read_json(&path).unwrap_or_else(|| DeckReviewState {
        deck_id: deck_id.to_string(),
        cards: HashMap::new(),
    })
}

pub fn save_review_state(data_dir: &PathBuf, state: &DeckReviewState) {
    let path = review_path(data_dir, &state.deck_id);
    storage::write_json(&path, state);
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
            next_review: Utc::now() - Duration::days(1),
            ..CardReviewState::default()
        });
        review.cards.insert("c2".to_string(), CardReviewState {
            next_review: Utc::now() + Duration::days(5),
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
        let mut state = DeckReviewState {
            deck_id: "deck1".to_string(),
            cards: HashMap::new(),
        };
        state.cards.insert("c1".to_string(), CardReviewState::default());

        save_review_state(&path, &state);
        let loaded = load_review_state(&path, "deck1");
        assert_eq!(loaded.cards.len(), 1);
        assert!(loaded.cards.contains_key("c1"));
    }

    #[test]
    fn test_load_missing_review_returns_empty() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().to_path_buf();
        let state = load_review_state(&path, "nonexistent");
        assert_eq!(state.deck_id, "nonexistent");
        assert!(state.cards.is_empty());
    }
}
```

- [ ] **Step 2: Register module and run tests**

Add to `src-tauri/src/main.rs`:

```rust
mod review;
```

Run:

```bash
cd src-tauri && cargo test review::tests -- --nocapture
```

Expected: all 12 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/review.rs src-tauri/src/main.rs
git commit -m "feat: add SM-2 spaced repetition review engine"
```

---

### Task 5: Quiz Generation Module (Rust)

**Files:**
- Create: `src-tauri/src/quiz.rs`

- [ ] **Step 1: Write quiz generation with tests**

Create `src-tauri/src/quiz.rs`:

```rust
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
```

- [ ] **Step 2: Register module and run tests**

Add to `src-tauri/src/main.rs`:

```rust
mod quiz;
```

Run:

```bash
cd src-tauri && cargo test quiz::tests -- --nocapture
```

Expected: all 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/quiz.rs src-tauri/src/main.rs
git commit -m "feat: add quiz generation module with MC and written answers"
```

---

### Task 6: Tauri Command Wiring

**Files:**
- Modify: `src-tauri/src/main.rs`
- Create: `src/lib/tauri.ts`

- [ ] **Step 1: Add Tauri commands to main.rs**

Replace `src-tauri/src/main.rs` entirely:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod storage;
mod decks;
mod review;
mod quiz;

use tauri::Manager;

fn get_data_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    storage::data_dir(app)
}

#[tauri::command]
fn list_decks(app: tauri::AppHandle) -> Vec<decks::Deck> {
    decks::list_decks(&get_data_dir(&app))
}

#[tauri::command]
fn get_deck(app: tauri::AppHandle, deck_id: String) -> Option<decks::Deck> {
    decks::load_deck(&get_data_dir(&app), &deck_id)
}

#[tauri::command]
fn create_deck(app: tauri::AppHandle, title: String, description: String) -> decks::Deck {
    let deck = decks::Deck::new(title, description);
    decks::save_deck(&get_data_dir(&app), &deck);
    deck
}

#[tauri::command]
fn delete_deck(app: tauri::AppHandle, deck_id: String) -> bool {
    decks::delete_deck(&get_data_dir(&app), &deck_id)
}

#[tauri::command]
fn add_card(app: tauri::AppHandle, deck_id: String, front: String, back: String) -> Option<decks::Card> {
    let data_dir = get_data_dir(&app);
    let mut deck = decks::load_deck(&data_dir, &deck_id)?;
    let card = deck.add_card(front, back);
    decks::save_deck(&data_dir, &deck);
    Some(card)
}

#[tauri::command]
fn update_card(app: tauri::AppHandle, deck_id: String, card_id: String, front: String, back: String) -> bool {
    let data_dir = get_data_dir(&app);
    if let Some(mut deck) = decks::load_deck(&data_dir, &deck_id) {
        if deck.update_card(&card_id, front, back) {
            decks::save_deck(&data_dir, &deck);
            return true;
        }
    }
    false
}

#[tauri::command]
fn remove_card(app: tauri::AppHandle, deck_id: String, card_id: String) -> bool {
    let data_dir = get_data_dir(&app);
    if let Some(mut deck) = decks::load_deck(&data_dir, &deck_id) {
        if deck.remove_card(&card_id) {
            decks::save_deck(&data_dir, &deck);
            return true;
        }
    }
    false
}

#[tauri::command]
fn get_due_cards(app: tauri::AppHandle, deck_id: String) -> Vec<String> {
    let data_dir = get_data_dir(&app);
    let deck = match decks::load_deck(&data_dir, &deck_id) {
        Some(d) => d,
        None => return vec![],
    };
    let review_state = review::load_review_state(&data_dir, &deck_id);
    let card_ids: Vec<String> = deck.cards.iter().map(|c| c.id.clone()).collect();
    review::get_due_cards(&review_state, &card_ids, 20)
}

#[tauri::command]
fn submit_rating(app: tauri::AppHandle, deck_id: String, card_id: String, rating: u8) {
    let data_dir = get_data_dir(&app);
    let mut review_state = review::load_review_state(&data_dir, &deck_id);
    let card_state = review_state
        .cards
        .entry(card_id)
        .or_insert_with(review::CardReviewState::default);
    review::process_rating(card_state, rating);
    review::save_review_state(&data_dir, &review_state);
}

#[tauri::command]
fn get_review_state(app: tauri::AppHandle, deck_id: String) -> review::DeckReviewState {
    review::load_review_state(&get_data_dir(&app), &deck_id)
}

#[tauri::command]
fn generate_test(app: tauri::AppHandle, deck_id: String, count: Option<usize>, question_type: String) -> Vec<quiz::Question> {
    let data_dir = get_data_dir(&app);
    let deck = match decks::load_deck(&data_dir, &deck_id) {
        Some(d) => d,
        None => return vec![],
    };
    let qt = match question_type.as_str() {
        "multiple_choice" => quiz::QuestionType::MultipleChoice,
        "written" => quiz::QuestionType::Written,
        _ => quiz::QuestionType::MultipleChoice,
    };
    quiz::generate_questions(&deck, count, qt)
}

#[tauri::command]
fn save_test_result(app: tauri::AppHandle, result: quiz::TestResult) {
    quiz::save_test_result(&get_data_dir(&app), &result);
}

#[tauri::command]
fn get_test_results(app: tauri::AppHandle, deck_id: String) -> Vec<quiz::TestResult> {
    quiz::load_test_results(&get_data_dir(&app), &deck_id)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_decks,
            get_deck,
            create_deck,
            delete_deck,
            add_card,
            update_card,
            remove_card,
            get_due_cards,
            submit_rating,
            get_review_state,
            generate_test,
            save_test_result,
            get_test_results,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Create TypeScript wrappers**

Create `src/lib/tauri.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";

export interface Card {
  id: string;
  front: string;
  back: string;
  created_at: string;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  cards: Card[];
  created_at: string;
  updated_at: string;
}

export interface CardReviewState {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  last_review: string;
}

export interface DeckReviewState {
  deck_id: string;
  cards: Record<string, CardReviewState>;
}

export interface Question {
  card_id: string;
  prompt: string;
  correct_answer: string;
  question_type: "MultipleChoice" | "Written";
  options: string[] | null;
}

export interface TestAnswer {
  card_id: string;
  correct: boolean;
  given_answer: string;
}

export interface TestResult {
  id: string;
  deck_id: string;
  score: number;
  total: number;
  answers: TestAnswer[];
  completed_at: string;
}

export const api = {
  listDecks: () => invoke<Deck[]>("list_decks"),
  getDeck: (deckId: string) => invoke<Deck | null>("get_deck", { deckId }),
  createDeck: (title: string, description: string) =>
    invoke<Deck>("create_deck", { title, description }),
  deleteDeck: (deckId: string) => invoke<boolean>("delete_deck", { deckId }),
  addCard: (deckId: string, front: string, back: string) =>
    invoke<Card | null>("add_card", { deckId, front, back }),
  updateCard: (deckId: string, cardId: string, front: string, back: string) =>
    invoke<boolean>("update_card", { deckId, cardId, front, back }),
  removeCard: (deckId: string, cardId: string) =>
    invoke<boolean>("remove_card", { deckId, cardId }),
  getDueCards: (deckId: string) => invoke<string[]>("get_due_cards", { deckId }),
  submitRating: (deckId: string, cardId: string, rating: number) =>
    invoke<void>("submit_rating", { deckId, cardId, rating }),
  getReviewState: (deckId: string) =>
    invoke<DeckReviewState>("get_review_state", { deckId }),
  generateTest: (deckId: string, count: number | null, questionType: string) =>
    invoke<Question[]>("generate_test", { deckId, count, questionType }),
  saveTestResult: (result: TestResult) =>
    invoke<void>("save_test_result", { result }),
  getTestResults: (deckId: string) =>
    invoke<TestResult[]>("get_test_results", { deckId }),
};
```

- [ ] **Step 3: Verify Rust compiles**

```bash
cd src-tauri && cargo check
```

Expected: compiles with no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/main.rs src/lib/tauri.ts
git commit -m "feat: wire up Tauri commands and TypeScript API layer"
```

---

### Task 7: Dark Theme + App Shell

**Files:**
- Create: `src/app.css`
- Modify: `src/App.svelte`
- Create: `src/lib/stores/deckStore.ts`
- Create: `src/lib/stores/sessionStore.ts`

- [ ] **Step 1: Create dark theme CSS**

Create `src/app.css`:

```css
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f3460;
  --accent: #e94560;
  --accent-hover: #ff6b81;
  --text-primary: #eee;
  --text-secondary: #aaa;
  --text-muted: #666;
  --border: #2a2a4a;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #ef4444;
  --radius: 8px;
  --radius-lg: 12px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
}

button {
  cursor: pointer;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  padding: 8px 16px;
  transition: background 0.2s;
}

button.primary {
  background: var(--accent);
  color: white;
}

button.primary:hover {
  background: var(--accent-hover);
}

button.secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

button.secondary:hover {
  background: var(--border);
}

button.danger {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
}

button.danger:hover {
  background: var(--danger);
  color: white;
}

input, textarea {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-primary);
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
}

input:focus, textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.app-layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 200px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar h1 {
  font-size: 20px;
  margin-bottom: 24px;
  color: var(--accent);
}

.sidebar button {
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  padding: 8px 12px;
  border-radius: var(--radius);
  font-size: 14px;
  width: 100%;
}

.sidebar button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar button.active {
  background: var(--bg-tertiary);
  color: var(--accent);
}

.main-content {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}
```

- [ ] **Step 2: Create Svelte stores**

Create `src/lib/stores/deckStore.ts`:

```ts
import { writable } from "svelte/store";
import type { Deck } from "$lib/tauri";

export const decks = writable<Deck[]>([]);
export const currentDeck = writable<Deck | null>(null);
```

Create `src/lib/stores/sessionStore.ts`:

```ts
import { writable } from "svelte/store";
import type { Question } from "$lib/tauri";

export type View = "home" | "editor" | "study" | "test";

export const currentView = writable<View>("home");
export const studyQueue = writable<string[]>([]);
export const testQuestions = writable<Question[]>([]);
```

- [ ] **Step 3: Create App.svelte with navigation**

Replace `src/App.svelte`:

```svelte
<script lang="ts">
  import { currentView, type View } from "$lib/stores/sessionStore";
  import { currentDeck } from "$lib/stores/deckStore";
  import Home from "./routes/Home.svelte";
  import DeckEditor from "./routes/DeckEditor.svelte";
  import Study from "./routes/Study.svelte";
  import Test from "./routes/Test.svelte";

  function navigate(view: View) {
    if (view === "home") {
      $currentDeck = null;
    }
    $currentView = view;
  }
</script>

<div class="app-layout">
  <nav class="sidebar">
    <h1>Quizard</h1>
    <button class:active={$currentView === "home"} onclick={() => navigate("home")}>
      Home
    </button>
    {#if $currentDeck}
      <button class:active={$currentView === "editor"} onclick={() => navigate("editor")}>
        Edit Deck
      </button>
      <button class:active={$currentView === "study"} onclick={() => navigate("study")}>
        Study
      </button>
      <button class:active={$currentView === "test"} onclick={() => navigate("test")}>
        Test
      </button>
    {/if}
  </nav>

  <main class="main-content">
    {#if $currentView === "home"}
      <Home />
    {:else if $currentView === "editor"}
      <DeckEditor />
    {:else if $currentView === "study"}
      <Study />
    {:else if $currentView === "test"}
      <Test />
    {/if}
  </main>
</div>
```

- [ ] **Step 4: Create placeholder route files**

Create `src/routes/Home.svelte`:

```svelte
<h2>My Decks</h2>
<p style="color: var(--text-secondary)">No decks yet. Create one to get started.</p>
```

Create `src/routes/DeckEditor.svelte`:

```svelte
<h2>Deck Editor</h2>
```

Create `src/routes/Study.svelte`:

```svelte
<h2>Study Mode</h2>
```

Create `src/routes/Test.svelte`:

```svelte
<h2>Test Mode</h2>
```

- [ ] **Step 5: Verify frontend builds**

```bash
cd /Users/cameronhakenson/Developer/quizard && npm run build
```

Expected: Vite builds successfully. (Tauri invoke calls will fail in browser-only mode, which is expected.)

- [ ] **Step 6: Commit**

```bash
git add src/app.css src/App.svelte src/lib/stores/ src/routes/ src/main.ts
git commit -m "feat: add dark theme, app shell, navigation, and Svelte stores"
```

---

### Task 8: Home View + Components

**Files:**
- Modify: `src/routes/Home.svelte`
- Create: `src/components/DeckCard.svelte`
- Create: `src/components/ProgressBar.svelte`

- [ ] **Step 1: Create ProgressBar component**

Create `src/components/ProgressBar.svelte`:

```svelte
<script lang="ts">
  let { value = 0, max = 100 }: { value?: number; max?: number } = $props();
  let percentage = $derived(max > 0 ? Math.round((value / max) * 100) : 0);
</script>

<div class="progress-bar">
  <div class="progress-fill" style="width: {percentage}%"></div>
  <span class="progress-label">{percentage}%</span>
</div>

<style>
  .progress-bar {
    background: var(--bg-tertiary);
    border-radius: 4px;
    height: 8px;
    position: relative;
    overflow: hidden;
  }
  .progress-fill {
    background: var(--accent);
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s;
  }
  .progress-label {
    position: absolute;
    right: 0;
    top: 12px;
    font-size: 11px;
    color: var(--text-muted);
  }
</style>
```

- [ ] **Step 2: Create DeckCard component**

Create `src/components/DeckCard.svelte`:

```svelte
<script lang="ts">
  import type { Deck, DeckReviewState } from "$lib/tauri";
  import ProgressBar from "./ProgressBar.svelte";

  let {
    deck,
    reviewState,
    onselect,
    ondelete,
  }: {
    deck: Deck;
    reviewState?: DeckReviewState;
    onselect: () => void;
    ondelete: () => void;
  } = $props();

  let mastered = $derived(() => {
    if (!reviewState || deck.cards.length === 0) return 0;
    const learned = Object.values(reviewState.cards).filter(
      (c) => c.repetitions >= 3
    ).length;
    return learned;
  });
</script>

<div class="deck-card" onclick={onselect} onkeydown={(e) => e.key === "Enter" && onselect()} role="button" tabindex="0">
  <div class="deck-header">
    <h3>{deck.title}</h3>
    <button class="delete-btn" onclick={(e) => { e.stopPropagation(); ondelete(); }}>×</button>
  </div>
  {#if deck.description}
    <p class="deck-desc">{deck.description}</p>
  {/if}
  <p class="card-count">{deck.cards.length} card{deck.cards.length !== 1 ? "s" : ""}</p>
  <ProgressBar value={mastered()} max={deck.cards.length} />
</div>

<style>
  .deck-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .deck-card:hover {
    border-color: var(--accent);
  }
  .deck-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .deck-header h3 {
    font-size: 16px;
  }
  .delete-btn {
    background: transparent;
    color: var(--text-muted);
    font-size: 18px;
    padding: 2px 6px;
    line-height: 1;
  }
  .delete-btn:hover {
    color: var(--danger);
  }
  .deck-desc {
    color: var(--text-secondary);
    font-size: 13px;
    margin-bottom: 8px;
  }
  .card-count {
    color: var(--text-muted);
    font-size: 12px;
    margin-bottom: 12px;
  }
</style>
```

- [ ] **Step 3: Build Home view**

Replace `src/routes/Home.svelte`:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { api, type DeckReviewState } from "$lib/tauri";
  import { decks, currentDeck } from "$lib/stores/deckStore";
  import { currentView } from "$lib/stores/sessionStore";
  import DeckCard from "../components/DeckCard.svelte";

  let reviewStates = $state<Record<string, DeckReviewState>>({});
  let showCreate = $state(false);
  let newTitle = $state("");
  let newDescription = $state("");

  onMount(async () => {
    await loadDecks();
  });

  async function loadDecks() {
    $decks = await api.listDecks();
    for (const deck of $decks) {
      reviewStates[deck.id] = await api.getReviewState(deck.id);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const deck = await api.createDeck(newTitle.trim(), newDescription.trim());
    newTitle = "";
    newDescription = "";
    showCreate = false;
    $currentDeck = deck;
    $currentView = "editor";
  }

  function selectDeck(deck: typeof $decks[0]) {
    $currentDeck = deck;
    $currentView = "editor";
  }

  async function deleteDeck(deckId: string) {
    await api.deleteDeck(deckId);
    await loadDecks();
  }
</script>

<div class="home">
  <div class="home-header">
    <h2>My Decks</h2>
    <button class="primary" onclick={() => (showCreate = !showCreate)}>
      {showCreate ? "Cancel" : "+ New Deck"}
    </button>
  </div>

  {#if showCreate}
    <div class="create-form">
      <input bind:value={newTitle} placeholder="Deck title" />
      <input bind:value={newDescription} placeholder="Description (optional)" />
      <button class="primary" onclick={handleCreate}>Create</button>
    </div>
  {/if}

  {#if $decks.length === 0}
    <p class="empty">No decks yet. Create one to get started.</p>
  {:else}
    <div class="deck-grid">
      {#each $decks as deck (deck.id)}
        <DeckCard
          {deck}
          reviewState={reviewStates[deck.id]}
          onselect={() => selectDeck(deck)}
          ondelete={() => deleteDeck(deck.id)}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .home-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }
  .create-form {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    align-items: center;
  }
  .create-form input {
    max-width: 300px;
  }
  .empty {
    color: var(--text-muted);
    margin-top: 40px;
    text-align: center;
  }
  .deck-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
</style>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: builds successfully.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Home.svelte src/components/
git commit -m "feat: add Home view with deck grid, DeckCard, and ProgressBar"
```

---

### Task 9: Deck Editor View

**Files:**
- Modify: `src/routes/DeckEditor.svelte`

- [ ] **Step 1: Build DeckEditor view**

Replace `src/routes/DeckEditor.svelte`:

```svelte
<script lang="ts">
  import { currentDeck } from "$lib/stores/deckStore";
  import { api } from "$lib/tauri";

  let editingId = $state<string | null>(null);
  let editFront = $state("");
  let editBack = $state("");
  let newFront = $state("");
  let newBack = $state("");

  async function addCard() {
    if (!newFront.trim() || !newBack.trim() || !$currentDeck) return;
    await api.addCard($currentDeck.id, newFront.trim(), newBack.trim());
    $currentDeck = await api.getDeck($currentDeck.id);
    newFront = "";
    newBack = "";
  }

  async function deleteCard(cardId: string) {
    if (!$currentDeck) return;
    await api.removeCard($currentDeck.id, cardId);
    $currentDeck = await api.getDeck($currentDeck.id);
  }

  function startEdit(cardId: string, front: string, back: string) {
    editingId = cardId;
    editFront = front;
    editBack = back;
  }

  async function saveEdit() {
    if (!$currentDeck || !editingId) return;
    await api.updateCard($currentDeck.id, editingId, editFront.trim(), editBack.trim());
    $currentDeck = await api.getDeck($currentDeck.id);
    editingId = null;
  }

  function cancelEdit() {
    editingId = null;
  }
</script>

{#if $currentDeck}
  <div class="editor">
    <h2>{$currentDeck.title}</h2>
    {#if $currentDeck.description}
      <p class="desc">{$currentDeck.description}</p>
    {/if}

    <div class="add-card">
      <h3>Add Card</h3>
      <div class="card-form">
        <input bind:value={newFront} placeholder="Front (question)" />
        <input bind:value={newBack} placeholder="Back (answer)" />
        <button class="primary" onclick={addCard}>Add</button>
      </div>
    </div>

    <div class="card-list">
      <h3>Cards ({$currentDeck.cards.length})</h3>
      {#each $currentDeck.cards as card (card.id)}
        <div class="card-row">
          {#if editingId === card.id}
            <input bind:value={editFront} />
            <input bind:value={editBack} />
            <div class="card-actions">
              <button class="primary" onclick={saveEdit}>Save</button>
              <button class="secondary" onclick={cancelEdit}>Cancel</button>
            </div>
          {:else}
            <div class="card-front">{card.front}</div>
            <div class="card-back">{card.back}</div>
            <div class="card-actions">
              <button class="secondary" onclick={() => startEdit(card.id, card.front, card.back)}>Edit</button>
              <button class="danger" onclick={() => deleteCard(card.id)}>Delete</button>
            </div>
          {/if}
        </div>
      {/each}
      {#if $currentDeck.cards.length === 0}
        <p class="empty">No cards yet. Add some above.</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .desc {
    color: var(--text-secondary);
    margin-bottom: 24px;
  }
  .add-card {
    margin-bottom: 32px;
  }
  .add-card h3 {
    margin-bottom: 12px;
    font-size: 14px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .card-form {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .card-list h3 {
    margin-bottom: 12px;
    font-size: 14px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .card-row {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 8px;
  }
  .card-front, .card-back {
    flex: 1;
    font-size: 14px;
  }
  .card-front {
    color: var(--text-primary);
  }
  .card-back {
    color: var(--text-secondary);
  }
  .card-row input {
    flex: 1;
  }
  .card-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .empty {
    color: var(--text-muted);
    text-align: center;
    padding: 24px;
  }
</style>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: builds successfully.

- [ ] **Step 3: Commit**

```bash
git add src/routes/DeckEditor.svelte
git commit -m "feat: add deck editor with card CRUD"
```

---

### Task 10: Study Mode View

**Files:**
- Modify: `src/routes/Study.svelte`
- Create: `src/components/Flashcard.svelte`
- Create: `src/components/RatingButtons.svelte`

- [ ] **Step 1: Create RatingButtons component**

Create `src/components/RatingButtons.svelte`:

```svelte
<script lang="ts">
  let { onrate }: { onrate: (rating: number) => void } = $props();
</script>

<div class="rating-buttons">
  <button class="rating again" onclick={() => onrate(1)}>
    <span class="rating-label">Again</span>
    <span class="rating-hint">Didn't know it</span>
  </button>
  <button class="rating hard" onclick={() => onrate(2)}>
    <span class="rating-label">Hard</span>
    <span class="rating-hint">Struggled</span>
  </button>
  <button class="rating good" onclick={() => onrate(3)}>
    <span class="rating-label">Good</span>
    <span class="rating-hint">Got it</span>
  </button>
  <button class="rating easy" onclick={() => onrate(4)}>
    <span class="rating-label">Easy</span>
    <span class="rating-hint">Instant</span>
  </button>
</div>

<style>
  .rating-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  .rating {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 20px;
    border-radius: var(--radius);
    min-width: 80px;
  }
  .rating-label {
    font-weight: 600;
    font-size: 14px;
  }
  .rating-hint {
    font-size: 11px;
    opacity: 0.7;
    margin-top: 2px;
  }
  .again { background: var(--danger); color: white; }
  .again:hover { background: #dc2626; }
  .hard { background: var(--warning); color: #1a1a2e; }
  .hard:hover { background: #f59e0b; }
  .good { background: var(--success); color: #1a1a2e; }
  .good:hover { background: #22c55e; }
  .easy { background: #3b82f6; color: white; }
  .easy:hover { background: #2563eb; }
</style>
```

- [ ] **Step 2: Create Flashcard component**

Create `src/components/Flashcard.svelte`:

```svelte
<script lang="ts">
  let { front, back, flipped = false }: { front: string; back: string; flipped?: boolean } = $props();
</script>

<div
  class="flashcard"
  class:flipped
>
  <div class="flashcard-inner">
    <div class="flashcard-face flashcard-front">
      <p>{front}</p>
      <span class="flip-hint">Click to flip</span>
    </div>
    <div class="flashcard-face flashcard-back">
      <p>{back}</p>
    </div>
  </div>
</div>

<style>
  .flashcard {
    perspective: 1000px;
    cursor: pointer;
    width: 100%;
    max-width: 500px;
    height: 300px;
    margin: 0 auto;
  }
  .flashcard-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.5s;
    transform-style: preserve-3d;
  }
  .flipped .flashcard-inner {
    transform: rotateY(180deg);
  }
  .flashcard-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
  }
  .flashcard-front {
    background: var(--bg-secondary);
  }
  .flashcard-back {
    background: var(--bg-tertiary);
    transform: rotateY(180deg);
  }
  .flashcard-face p {
    font-size: 20px;
    text-align: center;
  }
  .flip-hint {
    position: absolute;
    bottom: 16px;
    color: var(--text-muted);
    font-size: 12px;
  }
</style>
```

- [ ] **Step 3: Build Study view**

Replace `src/routes/Study.svelte`:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { currentDeck } from "$lib/stores/deckStore";
  import { api, type Card } from "$lib/tauri";
  import Flashcard from "../components/Flashcard.svelte";
  import RatingButtons from "../components/RatingButtons.svelte";

  let queue = $state<Card[]>([]);
  let currentIndex = $state(0);
  let flipped = $state(false);
  let sessionComplete = $state(false);
  let reviewed = $state(0);
  let correct = $state(0);
  let againQueue = $state<Card[]>([]);

  let currentCard = $derived(queue[currentIndex] ?? null);

  onMount(async () => {
    if (!$currentDeck) return;
    const dueIds = await api.getDueCards($currentDeck.id);
    queue = $currentDeck.cards.filter((c) => dueIds.includes(c.id));
    if (queue.length === 0) sessionComplete = true;
  });

  async function handleRate(rating: number) {
    if (!$currentDeck || !currentCard) return;

    await api.submitRating($currentDeck.id, currentCard.id, rating);
    reviewed++;

    if (rating >= 2) {
      correct++;
    } else {
      againQueue.push(currentCard);
    }

    flipped = false;

    if (currentIndex < queue.length - 1) {
      currentIndex++;
    } else if (againQueue.length > 0) {
      queue = [...againQueue];
      againQueue = [];
      currentIndex = 0;
    } else {
      sessionComplete = true;
    }
  }
</script>

{#if !$currentDeck}
  <p>No deck selected.</p>
{:else if sessionComplete}
  <div class="session-summary">
    <h2>Session Complete</h2>
    {#if reviewed > 0}
      <div class="stats">
        <div class="stat">
          <span class="stat-value">{reviewed}</span>
          <span class="stat-label">Reviewed</span>
        </div>
        <div class="stat">
          <span class="stat-value">{Math.round((correct / reviewed) * 100)}%</span>
          <span class="stat-label">Accuracy</span>
        </div>
      </div>
    {:else}
      <p class="empty">No cards due for review. Come back later!</p>
    {/if}
  </div>
{:else if currentCard}
  <div class="study-view">
    <div class="study-progress">
      <span>{currentIndex + 1} / {queue.length}</span>
      {#if againQueue.length > 0}
        <span class="again-count">{againQueue.length} to repeat</span>
      {/if}
    </div>

    <Flashcard
      front={currentCard.front}
      back={currentCard.back}
      {flipped}
    />

    <div class="study-actions">
      {#if !flipped}
        <button class="primary" onclick={() => (flipped = true)}>Show Answer</button>
      {:else}
        <RatingButtons onrate={handleRate} />
      {/if}
    </div>
  </div>
{/if}

<style>
  .study-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding-top: 32px;
  }
  .study-progress {
    display: flex;
    gap: 16px;
    color: var(--text-secondary);
    font-size: 14px;
  }
  .again-count {
    color: var(--warning);
  }
  .study-actions {
    margin-top: 16px;
  }
  .session-summary {
    text-align: center;
    padding-top: 64px;
  }
  .stats {
    display: flex;
    gap: 48px;
    justify-content: center;
    margin-top: 32px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .stat-value {
    font-size: 36px;
    font-weight: 700;
    color: var(--accent);
  }
  .stat-label {
    color: var(--text-secondary);
    font-size: 14px;
    margin-top: 4px;
  }
  .empty {
    color: var(--text-muted);
    margin-top: 16px;
  }
</style>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: builds successfully.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Study.svelte src/components/Flashcard.svelte src/components/RatingButtons.svelte
git commit -m "feat: add study mode with flashcards, SM-2 rating, and session tracking"
```

---

### Task 11: Test Mode View

**Files:**
- Modify: `src/routes/Test.svelte`

- [ ] **Step 1: Build Test view**

Replace `src/routes/Test.svelte`:

```svelte
<script lang="ts">
  import { currentDeck } from "$lib/stores/deckStore";
  import { api, type Question, type TestAnswer, type TestResult } from "$lib/tauri";

  type Phase = "setup" | "active" | "results";

  let phase = $state<Phase>("setup");
  let questions = $state<Question[]>([]);
  let currentIndex = $state(0);
  let answers = $state<TestAnswer[]>([]);
  let writtenInput = $state("");
  let questionCount = $state(0);
  let questionType = $state("multiple_choice");
  let result = $state<TestResult | null>(null);

  let currentQuestion = $derived(questions[currentIndex] ?? null);

  function initCount() {
    questionCount = $currentDeck?.cards.length ?? 0;
  }

  $effect(() => {
    if ($currentDeck) initCount();
  });

  async function startTest() {
    if (!$currentDeck) return;
    questions = await api.generateTest(
      $currentDeck.id,
      questionCount > 0 ? questionCount : null,
      questionType
    );
    if (questions.length === 0) return;
    currentIndex = 0;
    answers = [];
    phase = "active";
  }

  function submitMcAnswer(selected: string) {
    if (!currentQuestion) return;
    answers.push({
      card_id: currentQuestion.card_id,
      correct: selected === currentQuestion.correct_answer,
      given_answer: selected,
    });
    advance();
  }

  function submitWrittenAnswer() {
    if (!currentQuestion) return;
    const isCorrect =
      writtenInput.trim().toLowerCase() ===
      currentQuestion.correct_answer.trim().toLowerCase();
    answers.push({
      card_id: currentQuestion.card_id,
      correct: isCorrect,
      given_answer: writtenInput.trim(),
    });
    writtenInput = "";
    advance();
  }

  async function advance() {
    if (currentIndex < questions.length - 1) {
      currentIndex++;
    } else {
      await finishTest();
    }
  }

  async function finishTest() {
    if (!$currentDeck) return;
    const score = answers.filter((a) => a.correct).length;
    const testResult: TestResult = {
      id: crypto.randomUUID(),
      deck_id: $currentDeck.id,
      score,
      total: answers.length,
      answers,
      completed_at: new Date().toISOString(),
    };
    await api.saveTestResult(testResult);
    result = testResult;
    phase = "results";
  }

  function retake() {
    phase = "setup";
    result = null;
  }
</script>

{#if !$currentDeck}
  <p>No deck selected.</p>
{:else if phase === "setup"}
  <div class="test-setup">
    <h2>Test: {$currentDeck.title}</h2>
    <div class="setup-form">
      <label>
        <span>Number of questions</span>
        <input type="number" bind:value={questionCount} min="1" max={$currentDeck.cards.length} />
      </label>
      <label>
        <span>Question type</span>
        <select bind:value={questionType}>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="written">Written Answer</option>
        </select>
      </label>
      <button class="primary" onclick={startTest} disabled={$currentDeck.cards.length === 0}>
        Start Test
      </button>
      {#if $currentDeck.cards.length === 0}
        <p class="empty">Add cards to this deck first.</p>
      {/if}
    </div>
  </div>
{:else if phase === "active" && currentQuestion}
  <div class="test-active">
    <div class="test-progress">
      Question {currentIndex + 1} of {questions.length}
    </div>
    <div class="question-card">
      <h3>{currentQuestion.prompt}</h3>

      {#if currentQuestion.question_type === "MultipleChoice" && currentQuestion.options}
        <div class="mc-options">
          {#each currentQuestion.options as option}
            <button class="mc-option" onclick={() => submitMcAnswer(option)}>
              {option}
            </button>
          {/each}
        </div>
      {:else}
        <div class="written-form">
          <input
            bind:value={writtenInput}
            placeholder="Type your answer..."
            onkeydown={(e) => e.key === "Enter" && submitWrittenAnswer()}
          />
          <button class="primary" onclick={submitWrittenAnswer}>Submit</button>
        </div>
      {/if}
    </div>
  </div>
{:else if phase === "results" && result}
  <div class="test-results">
    <h2>Test Complete</h2>
    <div class="score">
      <span class="score-value">{Math.round((result.score / result.total) * 100)}%</span>
      <span class="score-detail">{result.score} / {result.total} correct</span>
    </div>

    <h3>Review</h3>
    <div class="review-list">
      {#each result.answers as answer, i}
        <div class="review-item" class:incorrect={!answer.correct}>
          <div class="review-question">{questions[i].prompt}</div>
          <div class="review-answer">
            {#if answer.correct}
              <span class="correct-badge">✓ {answer.given_answer}</span>
            {:else}
              <span class="wrong-badge">✗ {answer.given_answer}</span>
              <span class="correct-answer">→ {questions[i].correct_answer}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <button class="primary" onclick={retake}>Retake Test</button>
  </div>
{/if}

<style>
  .test-setup, .test-results {
    max-width: 600px;
  }
  .setup-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 24px;
  }
  .setup-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .setup-form label span {
    font-size: 13px;
    color: var(--text-secondary);
  }
  select {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-primary);
    padding: 8px 12px;
    font-size: 14px;
  }
  .test-progress {
    color: var(--text-secondary);
    font-size: 14px;
    margin-bottom: 24px;
  }
  .question-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 32px;
    max-width: 600px;
  }
  .question-card h3 {
    margin-bottom: 24px;
    font-size: 18px;
  }
  .mc-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .mc-option {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 12px 16px;
    text-align: left;
    font-size: 14px;
    border: 1px solid var(--border);
  }
  .mc-option:hover {
    border-color: var(--accent);
    background: var(--bg-primary);
  }
  .written-form {
    display: flex;
    gap: 8px;
  }
  .score {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 32px 0;
  }
  .score-value {
    font-size: 48px;
    font-weight: 700;
    color: var(--accent);
  }
  .score-detail {
    color: var(--text-secondary);
    margin-top: 4px;
  }
  .review-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 16px 0 24px;
  }
  .review-item {
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }
  .review-item.incorrect {
    border-color: var(--danger);
  }
  .review-question {
    font-size: 14px;
    margin-bottom: 4px;
  }
  .correct-badge {
    color: var(--success);
    font-size: 13px;
  }
  .wrong-badge {
    color: var(--danger);
    font-size: 13px;
  }
  .correct-answer {
    color: var(--success);
    font-size: 13px;
    margin-left: 8px;
  }
  .empty {
    color: var(--text-muted);
  }
</style>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: builds successfully.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Test.svelte
git commit -m "feat: add test mode with MC, written answers, and score review"
```

---

### Task 12: E2E Tests

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/deck-management.spec.ts`
- Create: `tests/e2e/study-mode.spec.ts`
- Create: `tests/e2e/test-mode.spec.ts`
- Create: `tests/e2e/fixtures/sample-deck.json`
- Create: `src/lib/mock.ts`

E2E tests run against the Vite dev server. Tauri `invoke` calls are mocked at the module level so tests can run in a browser without the Rust backend. Rust unit tests (Tasks 2-5) cover backend logic.

- [ ] **Step 1: Install Playwright**

```bash
cd /Users/cameronhakenson/Developer/quizard
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create mock layer for Tauri invoke**

Create `src/lib/mock.ts`:

```ts
import type { Deck, DeckReviewState, Question, TestResult } from "./tauri";

let mockDecks: Deck[] = [];
let mockReviews: Record<string, DeckReviewState> = {};
let mockResults: TestResult[] = [];

export function resetMocks() {
  mockDecks = [];
  mockReviews = {};
  mockResults = [];
}

export function seedDeck(deck: Deck) {
  mockDecks.push(deck);
}

export async function mockInvoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  switch (cmd) {
    case "list_decks":
      return mockDecks;
    case "get_deck":
      return mockDecks.find((d) => d.id === args?.deckId) ?? null;
    case "create_deck": {
      const deck: Deck = {
        id: crypto.randomUUID(),
        title: args?.title as string,
        description: args?.description as string,
        cards: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDecks.push(deck);
      return deck;
    }
    case "delete_deck":
      mockDecks = mockDecks.filter((d) => d.id !== args?.deckId);
      return true;
    case "add_card": {
      const deck = mockDecks.find((d) => d.id === args?.deckId);
      if (!deck) return null;
      const card = {
        id: crypto.randomUUID(),
        front: args?.front as string,
        back: args?.back as string,
        created_at: new Date().toISOString(),
      };
      deck.cards.push(card);
      return card;
    }
    case "update_card": {
      const d = mockDecks.find((d) => d.id === args?.deckId);
      const c = d?.cards.find((c) => c.id === args?.cardId);
      if (!c) return false;
      c.front = args?.front as string;
      c.back = args?.back as string;
      return true;
    }
    case "remove_card": {
      const dk = mockDecks.find((d) => d.id === args?.deckId);
      if (!dk) return false;
      dk.cards = dk.cards.filter((c) => c.id !== args?.cardId);
      return true;
    }
    case "get_due_cards": {
      const dck = mockDecks.find((d) => d.id === args?.deckId);
      return dck?.cards.map((c) => c.id) ?? [];
    }
    case "submit_rating":
      return undefined;
    case "get_review_state":
      return mockReviews[args?.deckId as string] ?? { deck_id: args?.deckId, cards: {} };
    case "generate_test": {
      const tDeck = mockDecks.find((d) => d.id === args?.deckId);
      if (!tDeck) return [];
      return tDeck.cards.map((c): Question => ({
        card_id: c.id,
        prompt: c.front,
        correct_answer: c.back,
        question_type: (args?.questionType === "written" ? "Written" : "MultipleChoice") as "Written" | "MultipleChoice",
        options: args?.questionType === "written" ? null : [c.back, "Wrong 1", "Wrong 2", "Wrong 3"],
      }));
    }
    case "save_test_result":
      mockResults.push(args?.result as TestResult);
      return undefined;
    case "get_test_results":
      return mockResults.filter((r) => r.deck_id === args?.deckId);
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}
```

- [ ] **Step 3: Update vite.config.ts to support mock mode**

Replace `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  resolve: {
    alias: {
      ...(process.env.TAURI_ENV_PLATFORM
        ? {}
        : { "@tauri-apps/api/core": "/src/lib/mock-invoke-shim.ts" }),
    },
  },
});
```

Create `src/lib/mock-invoke-shim.ts`:

```ts
import { mockInvoke } from "./mock";

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return mockInvoke(cmd, args) as T;
}
```

- [ ] **Step 4: Create playwright.config.ts**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:1420",
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    port: 1420,
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 5: Create test fixture**

Create `tests/e2e/fixtures/sample-deck.json`:

```json
{
  "id": "test-deck-1",
  "title": "Biology 101",
  "description": "Basic biology concepts",
  "cards": [
    { "id": "c1", "front": "What is DNA?", "back": "Deoxyribonucleic acid", "created_at": "2026-04-19T00:00:00Z" },
    { "id": "c2", "front": "What is RNA?", "back": "Ribonucleic acid", "created_at": "2026-04-19T00:00:00Z" },
    { "id": "c3", "front": "What is ATP?", "back": "Adenosine triphosphate", "created_at": "2026-04-19T00:00:00Z" },
    { "id": "c4", "front": "What is mitosis?", "back": "Cell division producing two identical daughter cells", "created_at": "2026-04-19T00:00:00Z" },
    { "id": "c5", "front": "What is meiosis?", "back": "Cell division producing four genetically different cells", "created_at": "2026-04-19T00:00:00Z" }
  ],
  "created_at": "2026-04-19T00:00:00Z",
  "updated_at": "2026-04-19T00:00:00Z"
}
```

- [ ] **Step 6: Create deck management E2E test**

Create `tests/e2e/deck-management.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("Deck Management", () => {
  test("create a new deck", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h2")).toHaveText("My Decks");

    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', "Test Deck");
    await page.fill('input[placeholder="Description (optional)"]', "A test");
    await page.click("text=Create");

    await expect(page.locator("h2")).toHaveText("Test Deck");
  });

  test("add and delete a card", async ({ page }) => {
    await page.goto("/");
    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', "Card Test");
    await page.click("text=Create");

    await page.fill('input[placeholder="Front (question)"]', "Q1");
    await page.fill('input[placeholder="Back (answer)"]', "A1");
    await page.click("text=Add");

    await expect(page.locator(".card-row")).toHaveCount(1);
    await expect(page.locator(".card-front")).toHaveText("Q1");

    await page.click("text=Delete");
    await expect(page.locator(".card-row")).toHaveCount(0);
  });

  test("edit a card", async ({ page }) => {
    await page.goto("/");
    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', "Edit Test");
    await page.click("text=Create");

    await page.fill('input[placeholder="Front (question)"]', "Original Q");
    await page.fill('input[placeholder="Back (answer)"]', "Original A");
    await page.click("text=Add");

    await page.click("text=Edit");
    const inputs = page.locator(".card-row input");
    await inputs.first().fill("Updated Q");
    await inputs.last().fill("Updated A");
    await page.click("text=Save");

    await expect(page.locator(".card-front")).toHaveText("Updated Q");
    await expect(page.locator(".card-back")).toHaveText("Updated A");
  });
});
```

- [ ] **Step 7: Create study mode E2E test**

Create `tests/e2e/study-mode.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("Study Mode", () => {
  async function createDeckWithCards(page: any) {
    await page.goto("/");
    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', "Study Deck");
    await page.click("text=Create");

    await page.fill('input[placeholder="Front (question)"]', "Q1");
    await page.fill('input[placeholder="Back (answer)"]', "A1");
    await page.click("text=Add");

    await page.fill('input[placeholder="Front (question)"]', "Q2");
    await page.fill('input[placeholder="Back (answer)"]', "A2");
    await page.click("text=Add");
  }

  test("study session shows cards and accepts ratings", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Study");

    await expect(page.locator(".flashcard-front p")).toBeVisible();
    await page.click("text=Show Answer");
    await expect(page.locator(".rating-buttons")).toBeVisible();

    await page.click("text=Good");
    await expect(page.locator(".study-progress")).toContainText("2 /");
  });

  test("session completes when all cards reviewed", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Study");

    for (let i = 0; i < 2; i++) {
      await page.click("text=Show Answer");
      await page.click("text=Good");
    }

    await expect(page.locator("h2")).toHaveText("Session Complete");
    await expect(page.locator(".stat-value").first()).toBeVisible();
  });
});
```

- [ ] **Step 8: Create test mode E2E test**

Create `tests/e2e/test-mode.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("Test Mode", () => {
  async function createDeckWithCards(page: any) {
    await page.goto("/");
    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', "Quiz Deck");
    await page.click("text=Create");

    const cards = [
      ["What is 1+1?", "2"],
      ["What is 2+2?", "4"],
      ["What is 3+3?", "6"],
      ["What is 4+4?", "8"],
    ];

    for (const [front, back] of cards) {
      await page.fill('input[placeholder="Front (question)"]', front);
      await page.fill('input[placeholder="Back (answer)"]', back);
      await page.click("text=Add");
    }
  }

  test("complete a multiple choice test", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Test");

    await page.click("text=Start Test");

    for (let i = 0; i < 4; i++) {
      await expect(page.locator(".question-card h3")).toBeVisible();
      const correctAnswer = await page.locator(".question-card h3").textContent();
      await page.locator(".mc-option").first().click();
    }

    await expect(page.locator("h2")).toHaveText("Test Complete");
    await expect(page.locator(".score-value")).toBeVisible();
  });

  test("complete a written answer test", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Test");

    await page.locator("select").selectOption("written");
    await page.click("text=Start Test");

    for (let i = 0; i < 4; i++) {
      await page.fill('input[placeholder="Type your answer..."]', "guess");
      await page.click("text=Submit");
    }

    await expect(page.locator("h2")).toHaveText("Test Complete");
  });

  test("shows missed questions in review", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Test");

    await page.locator("select").selectOption("written");
    await page.click("text=Start Test");

    for (let i = 0; i < 4; i++) {
      await page.fill('input[placeholder="Type your answer..."]', "wrong");
      await page.click("text=Submit");
    }

    await expect(page.locator(".review-item.incorrect")).toHaveCount(4);
  });
});
```

- [ ] **Step 9: Run E2E tests**

```bash
npx playwright test
```

Expected: all tests pass. If there are failures, fix the specific selectors or timing issues.

- [ ] **Step 10: Commit**

```bash
git add playwright.config.ts tests/ src/lib/mock.ts src/lib/mock-invoke-shim.ts vite.config.ts
git commit -m "feat: add E2E tests with Playwright and Tauri mock layer"
```

---

### Task 13: CLAUDE.md Documentation

**Files:**
- Create: `CLAUDE.md`
- Create: `src-tauri/CLAUDE.md`
- Create: `src/CLAUDE.md`
- Create: `src/routes/CLAUDE.md`

- [ ] **Step 1: Create root CLAUDE.md**

Create `CLAUDE.md`:

```markdown
# Quizard

Lightweight cross-platform desktop flashcard app with spaced repetition and test generation.

## Stack

- Tauri v2 (Rust backend, native OS webview)
- Svelte 5 (runes mode) + TypeScript frontend
- JSON file storage in platform app data directory
- Dark theme, no CSS framework

## Commands

- `npm run dev` — start Vite dev server (frontend only)
- `npm run tauri dev` — start full Tauri app in dev mode
- `npm run build` — build frontend
- `npm run tauri build` — build distributable app
- `cd src-tauri && cargo test` — run Rust unit tests
- `npx playwright test` — run E2E tests

## Conventions

- TypeScript for all frontend code
- Svelte 5 runes ($state, $derived, $effect, $props)
- Minimal commenting — code should be self-explanatory
- Flat file structure
- State-based routing via currentView store (no router library)
- All Tauri IPC calls go through src/lib/tauri.ts typed wrappers
```

- [ ] **Step 2: Create src-tauri/CLAUDE.md**

Create `src-tauri/CLAUDE.md`:

```markdown
# Rust Backend

## Modules

- `storage.rs` — JSON file I/O helpers, app data directory management
- `decks.rs` — Deck/Card types, CRUD operations
- `review.rs` — SM-2 spaced repetition algorithm, review state persistence
- `quiz.rs` — Test generation (multiple choice + written), result storage
- `main.rs` — Tauri command registration, thin wrappers calling module functions

## Tauri Commands

All commands receive `app: tauri::AppHandle` to resolve the data directory.
Commands are registered in main.rs via `tauri::generate_handler![]`.
Frontend calls them via `invoke()` from @tauri-apps/api/core.

## Data Directory

Platform-specific app data dir (e.g. ~/Library/Application Support/com.quizard.app/).
Subdirectories: data/decks/, data/reviews/, data/tests/.

## Testing

`cargo test` runs all module tests. Each module has inline #[cfg(test)] tests.
Uses tempfile crate for isolated test directories.
```

- [ ] **Step 3: Create src/CLAUDE.md**

Create `src/CLAUDE.md`:

```markdown
# Svelte Frontend

## Structure

- `lib/tauri.ts` — Typed wrappers for all Tauri invoke calls + shared types
- `lib/stores/` — Svelte writable stores (deckStore, sessionStore)
- `lib/mock.ts` — Mock Tauri invoke for E2E testing without Rust backend
- `components/` — Reusable UI components (Flashcard, DeckCard, ProgressBar, RatingButtons)
- `routes/` — Page-level views (Home, DeckEditor, Study, Test)
- `App.svelte` — Root layout with sidebar navigation
- `app.css` — Global dark theme CSS variables and base styles

## Patterns

- All Tauri calls: `import { api } from "$lib/tauri"` then `await api.methodName()`
- Reactivity: Svelte 5 runes — $state for local, $derived for computed, $props for component inputs
- Navigation: `currentView` store drives which route component renders in App.svelte
- No component library — all UI is hand-built with CSS variables from app.css
```

- [ ] **Step 4: Create src/routes/CLAUDE.md**

Create `src/routes/CLAUDE.md`:

```markdown
# Route Views

## Navigation Flow

Home → select deck → DeckEditor (also enables Study/Test sidebar buttons)
Sidebar buttons switch between Editor, Study, Test for the selected deck.
"Home" button clears the selected deck and returns to deck grid.

## Views

- `Home.svelte` — Deck grid with create form. Loads all decks + review states on mount.
- `DeckEditor.svelte` — Card list with add/edit/delete. Reloads deck from backend after mutations.
- `Study.svelte` — Loads due cards on mount, manages study queue with again-queue for failed cards.
- `Test.svelte` — Three phases: setup (pick count + type) → active (answer questions) → results (score + review).
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md src-tauri/CLAUDE.md src/CLAUDE.md src/routes/CLAUDE.md
git commit -m "docs: add CLAUDE.md context files for all major directories"
```
