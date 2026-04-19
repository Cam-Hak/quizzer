# Quizard

A lightweight desktop flashcard app with spaced repetition and test generation. Built with Tauri v2 and Svelte 5. Runs natively on macOS, Windows, and Linux. All data stays on your machine — no account, no cloud sync.

## Install

Download the latest release for your platform from the [Releases](../../releases) page:

| Platform | Download |
|---|---|
| macOS (Apple Silicon) | `.dmg` (aarch64) |
| macOS (Intel) | `.dmg` (x86_64) |
| Windows | `.msi` installer |
| Linux | `.AppImage` or `.deb` |

**macOS:** Open the `.dmg`, drag Quizard to Applications. The app is not code-signed, so macOS will block it. To fix this, open Terminal and run:

```bash
xattr -cr /Applications/Quizard.app
```

If the `.dmg` itself won't open ("damaged and can't be opened"), clear the quarantine on it first:

```bash
xattr -d com.apple.quarantine ~/Downloads/Quizard*.dmg
```

Then reopen the `.dmg` and drag the app to Applications.

**Windows:** Run the `.msi` installer. If prompted about WebView2, the installer will download it automatically.

**Linux:** Make the `.AppImage` executable (`chmod +x Quizard_*.AppImage`) and run it, or install the `.deb` with `sudo dpkg -i Quizard_*.deb`.

After installing, Quizard appears in your dock, taskbar, or application launcher like any native app.

## Features

- **Deck management** — Create, edit, and delete flashcard decks with individual card CRUD
- **Study mode** — Quizlet-style learn flow: cards progress through 3 levels (MC, MC, Written). Wrong answers reset to level 0. Visual feedback with card chips, level steps, and learned celebrations
- **Spaced repetition** — SM-2 algorithm schedules future reviews based on your performance ratings (Again / Hard / Good / Easy)
- **Test generation** — Generate quizzes in multiple-choice or written-answer format, with scoring and a missed-card review
- **Flashcard browser** — Flip through cards with shuffle toggle
- **Fully local** — All data stored as JSON files on your machine. No network requests, no accounts
- **Dark theme** — Hand-built design with Space Grotesk + DM Sans typography, warm amber accent on zinc neutrals, noise texture overlay, and micro-animations

## Data Storage

All your decks, review state, and test results are stored locally in the platform app data directory — never in the application folder or git repo:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/com.quizard.app/data/` |
| Windows | `%APPDATA%\com.quizard.app\data\` |
| Linux | `~/.local/share/com.quizard.app/data/` |

Subdirectories: `decks/`, `reviews/`, `tests/`. Each item is an individual `.json` file named by UUID. To back up your data, copy this directory. To reset, delete it.

---

## Development

Everything below is for contributors and developers.

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| Rust toolchain | stable ([rustup.rs](https://rustup.rs)) |
| Tauri v2 system deps | [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS |

### Setup

```bash
git clone <repository-url>
cd quizard
npm install
```

### Dev Server

```bash
npm run tauri dev
```

Starts Vite on port 1420 with HMR and opens the Tauri window. Rust changes trigger a backend recompile.

### Production Build

```bash
npm run tauri build
```

Produces a platform-native installer in `src-tauri/target/release/bundle/`.

### Tests

**Rust unit tests:**

```bash
cd src-tauri && cargo test
```

Covers SM-2 algorithm, deck/card CRUD, JSON storage, test generation, and path-traversal rejection.

**E2E tests (14 tests):**

```bash
npx playwright test
```

Playwright starts the Vite dev server and runs browser tests across deck management, study mode, and test mode. Uses a mock `invoke` shim — no Tauri backend needed.

### Releasing

Push a version tag to trigger the CI release workflow:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions builds installers for macOS (ARM + Intel), Windows, and Linux, then creates a draft GitHub Release with all artifacts attached. Review and publish the draft from the Releases page.

## Project Structure

```
quizard/
├── src/                        # Svelte 5 frontend (TypeScript)
│   ├── App.svelte              # Root layout and sidebar navigation
│   ├── app.css                 # Design tokens, global styles, animations
│   ├── routes/                 # Page views (Home, DeckEditor, Flashcards, Study, Test)
│   ├── components/             # Reusable UI (Flashcard, DeckCard, ProgressBar, RatingButtons)
│   └── lib/
│       ├── tauri.ts            # Typed wrappers for Tauri IPC calls
│       ├── mock.ts             # In-memory mock backend for E2E testing
│       └── stores/             # Svelte stores (deckStore, sessionStore)
├── src-tauri/
│   ├── tauri.conf.json         # App config, bundle settings, icons
│   └── src/                    # Rust backend
│       ├── main.rs             # Tauri command registration
│       ├── storage.rs          # JSON file I/O and data directory helpers
│       ├── decks.rs            # Deck/Card types and CRUD
│       ├── review.rs           # SM-2 spaced repetition
│       └── quiz.rs             # Test generation and results
├── tests/e2e/                  # Playwright end-to-end tests
├── .github/workflows/
│   └── release.yml             # CI: build + publish releases on tag push
├── package.json
├── vite.config.ts
└── playwright.config.ts
```

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 |
| Frontend | Svelte 5 (runes mode), TypeScript, Vite 6 |
| Backend | Rust (2021 edition) |
| Typography | Space Grotesk (headings), DM Sans (body) |
| Testing | Playwright (E2E), Cargo test (unit) |
| CI/CD | GitHub Actions |
| Data | JSON files (local filesystem) |

## License

License not yet specified.
