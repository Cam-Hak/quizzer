# Quizard

A lightweight desktop flashcard app with spaced repetition and test generation. Built with Tauri v2 and Svelte 5. Runs natively on macOS, Windows, and Linux. All data stays on your machine — no account, no cloud sync.

## Features

- **Deck management** — Create, edit, and delete flashcard decks; add, update, and remove individual cards
- **Spaced repetition** — Study sessions driven by the SM-2 algorithm; rate each card (Again / Hard / Good / Easy) and the scheduler adjusts future review intervals automatically
- **Test generation** — Generate quizzes from any deck in multiple-choice or written-answer format, with per-question scoring and a missed-card review at the end
- **Fully local** — Data is written as JSON files to the platform app data directory; no network requests, no authentication
- **Dark theme** — Hand-built CSS with no third-party component library

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18 or later |
| Rust toolchain | stable (install via [rustup](https://rustup.rs)) |
| Tauri v2 system dependencies | see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS |

The Tauri prerequisites page covers OS-specific packages such as WebView2 on Windows, webkit2gtk on Linux, and Xcode command-line tools on macOS.

## Installation

```bash
git clone <repository-url>
cd quizard
npm install
```

## Running in Development

```bash
npm run tauri dev
```

This starts the Vite dev server on port 1420 and opens the Tauri window. Hot module replacement is active for frontend changes; Rust changes trigger a backend recompile.

## Production Build

```bash
npm run tauri build
```

Produces a platform-native installer in `src-tauri/target/release/bundle/`.

## Running the Tests

### Rust unit tests (31 tests)

```bash
cd src-tauri && cargo test
```

Tests cover the SM-2 algorithm, deck and card CRUD, JSON storage helpers, test question generation, and path-traversal rejection in the ID validator.

### End-to-end tests (8 tests)

```bash
npx playwright test
```

Playwright starts the Vite dev server automatically (port 1420) and runs browser-level tests across deck management, study mode, and test mode. The Tauri backend is not involved; the frontend uses a mock `invoke` shim during E2E runs.

## Data Storage

Decks, review state, and test results are stored as JSON files under the platform app data directory:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/com.quizard.app/data/` |
| Windows | `%APPDATA%\com.quizard.app\data\` |
| Linux | `~/.local/share/com.quizard.app/data/` |

Subdirectories: `decks/`, `reviews/`, `tests/`. Each deck, review state, and test result is an individual `.json` file named by UUID.

## Project Structure

```
quizard/
├── src/                        # Svelte 5 frontend (TypeScript)
│   ├── App.svelte              # Root layout and sidebar navigation
│   ├── app.css                 # Global dark theme and CSS variables
│   ├── routes/                 # Page-level views (Home, DeckEditor, Study, Test)
│   ├── components/             # Reusable UI (Flashcard, DeckCard, ProgressBar, RatingButtons)
│   └── lib/
│       ├── tauri.ts            # Typed wrappers for all Tauri invoke calls + shared interfaces
│       ├── mock.ts             # In-memory mock backend for E2E testing
│       └── stores/             # Svelte writable stores (deckStore, sessionStore)
├── src-tauri/
│   └── src/                    # Rust backend
│       ├── main.rs             # Tauri command registration
│       ├── storage.rs          # JSON file I/O and app data directory helpers
│       ├── decks.rs            # Deck and Card types, CRUD operations
│       ├── review.rs           # SM-2 spaced repetition algorithm and review state
│       └── quiz.rs             # Test question generation and result persistence
├── tests/
│   └── e2e/                    # Playwright end-to-end tests
├── package.json
├── vite.config.ts
├── svelte.config.js
├── playwright.config.ts
└── src-tauri/
    ├── Cargo.toml
    └── tauri.conf.json
```

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 |
| Frontend framework | Svelte 5 (runes mode) |
| Frontend language | TypeScript |
| Backend language | Rust (2021 edition) |
| Build tool | Vite 6 |
| E2E testing | Playwright |
| Data format | JSON (local filesystem) |

## Contributing

Pull requests are welcome. Please open an issue first for significant changes so the approach can be discussed before implementation.

## License

License not yet specified.
