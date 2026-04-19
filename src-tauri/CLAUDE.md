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
