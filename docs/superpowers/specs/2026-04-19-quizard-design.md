# Quizard — Design Spec

Open source, lightweight desktop application for creating flashcard study sets, generating tests, and learning material through spaced repetition.

## Stack

- **Shell:** Tauri v2 (Rust backend, native OS webview)
- **Frontend:** Svelte 5 (runes mode) + TypeScript
- **Storage:** JSON files in platform-specific app data directory
- **Styling:** Hand-rolled CSS dark theme, no framework
- **E2E Testing:** Playwright with Tauri driver
- **Targets:** macOS, Windows, Linux

## Data Model

All data stored as JSON files under the app's data directory (e.g. `~/Library/Application Support/quizard/data/` on macOS).

### Deck (`data/decks/{id}.json`)

```json
{
  "id": "uuid",
  "title": "Organic Chemistry",
  "description": "Chapter 5 - Functional Groups",
  "cards": [
    {
      "id": "uuid",
      "front": "What is a hydroxyl group?",
      "back": "-OH group bonded to a carbon atom",
      "created_at": "2026-04-19T00:00:00Z"
    }
  ],
  "created_at": "2026-04-19T00:00:00Z",
  "updated_at": "2026-04-19T00:00:00Z"
}
```

### Review State (`data/reviews/{deck_id}.json`)

```json
{
  "deck_id": "uuid",
  "cards": {
    "card_id": {
      "ease_factor": 2.5,
      "interval_days": 4,
      "repetitions": 3,
      "next_review": "2026-04-23T00:00:00Z",
      "last_review": "2026-04-19T00:00:00Z"
    }
  }
}
```

### Test Results (`data/tests/{id}.json`)

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "score": 18,
  "total": 20,
  "answers": [
    { "card_id": "uuid", "correct": true, "given_answer": "..." }
  ],
  "completed_at": "2026-04-19T00:00:00Z"
}
```

Decks, reviews, and tests are separate files for independent read/write without locking.

## Architecture

### Rust Backend (Tauri Commands)

Three modules exposing Tauri commands — no REST API, uses Tauri's IPC directly:

- **decks** — CRUD for decks and cards. List all decks for home screen. Read/write JSON.
- **review** — SM-2 algorithm. Takes a card rating (1-4), updates ease factor/interval, writes review state. Returns next due cards for a deck.
- **tests** — Generate a test from a deck (multiple choice with distractors from same deck, or written answer). Save results.

A shared **storage** module handles JSON file read/write helpers and the app data directory path.

### Svelte Frontend — 4 Views

1. **Home** — Grid of deck cards showing title, card count, mastery percentage, next review date. "Create deck" button.
2. **Deck Editor** — Add/edit/delete cards. Two-column form (front/back).
3. **Study Mode** — Flashcard interface. Show front → flip to reveal back → rate recall (1-4). Due cards from review engine. Session ends when queue is empty.
4. **Test Mode** — Generated quiz. Multiple choice and/or written answer. Score screen at end with review of missed questions.

### Navigation

Top-level sidebar or tab navigation. Home → Deck → Study or Test. No deep routing needed.

### State Management

Svelte stores. One for current deck, one for active study/test session. No global state library — data lives on disk, loaded per-view.

## SM-2 Spaced Repetition Algorithm

### Rating Scale

- **1 (Again)** — Didn't know it. Reset repetitions to 0. Review again within session, then 1 day.
- **2 (Hard)** — Struggled. Interval grows slowly, ease factor decreases slightly.
- **3 (Good)** — Got it with effort. Normal interval growth.
- **4 (Easy)** — Instant recall. Interval grows faster, ease factor increases.

### Interval Calculation

- First correct review: 1 day
- Second correct review: 6 days
- Subsequent: `previous_interval * ease_factor`
- Ease factor adjusts per card (minimum 1.3, starts at 2.5)

### Study Session Flow

1. User selects deck → "Study"
2. Backend returns cards where `next_review <= now`, ordered most overdue first
3. Card front shown → user flips → rates 1-4
4. Backend updates review state, calculates next review date
5. Cards rated "1" re-enter the session queue
6. Session ends when queue empty — shows summary (cards reviewed, accuracy)

New cards with no review history: up to 20 introduced per session, mixed with due reviews.

## Test Generation

### Settings

- Number of questions (default: all cards, or subset)
- Question types: multiple choice, written answer, or mixed

### Multiple Choice

- Correct answer: card's back text
- 3 distractors from other cards' back text in the same deck
- If deck has fewer than 4 cards, falls back to written answer
- Options shuffled randomly

### Written Answer

- Shows card front, user types answer
- Case-insensitive comparison, trimmed whitespace
- Shows correct answer alongside user's answer for self-judgment on partial matches

### Scoring

- Score screen with percentage and list of missed questions with correct answers
- Results saved to `data/tests/`
- Tests do not affect spaced repetition state — they are a separate assessment

## E2E Testing

Playwright with `@tauri-apps/driver` testing the full app (Rust backend + Svelte frontend).

```
tests/
├── e2e/
│   ├── deck-management.spec.ts   # Create, edit, delete decks and cards
│   ├── study-mode.spec.ts        # Flashcard flow, rating, session completion
│   ├── test-mode.spec.ts         # Quiz generation, answering, score screen
│   └── fixtures/
│       └── sample-deck.json      # Pre-loaded test data
```

### Test Coverage

- Create a deck, add cards, verify persistence
- Study flow: flip card, rate recall, verify card reappears or disappears based on rating
- Test flow: generate quiz, answer questions, verify score
- Edge cases: empty deck handling, single-card deck test generation

## Project Structure

```
quizard/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # Tauri entry point
│   │   ├── decks.rs             # Deck CRUD commands
│   │   ├── review.rs            # SM-2 algorithm + study session logic
│   │   ├── tests.rs             # Test generation + results
│   │   └── storage.rs           # JSON file read/write helpers
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── lib/
│   │   ├── stores/
│   │   │   ├── deckStore.ts     # Current deck state
│   │   │   └── sessionStore.ts  # Active study/test session
│   │   └── tauri.ts             # Typed wrappers around Tauri invoke calls
│   ├── routes/
│   │   ├── Home.svelte          # Deck grid
│   │   ├── DeckEditor.svelte    # Card management
│   │   ├── Study.svelte         # Flashcard study mode
│   │   └── Test.svelte          # Quiz mode
│   ├── components/
│   │   ├── Flashcard.svelte     # Flip card component
│   │   ├── DeckCard.svelte      # Deck preview tile for home grid
│   │   ├── ProgressBar.svelte   # Mastery/score bar
│   │   └── RatingButtons.svelte # 1-4 recall rating
│   ├── App.svelte               # Root layout + navigation
│   ├── app.css                  # Global styles, dark theme
│   └── main.ts                  # Svelte mount
├── tests/
│   └── e2e/
│       ├── deck-management.spec.ts
│       ├── study-mode.spec.ts
│       ├── test-mode.spec.ts
│       └── fixtures/
│           └── sample-deck.json
├── CLAUDE.md
├── package.json
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts
└── playwright.config.ts
```

### CLAUDE.md Placement

- `quizard/CLAUDE.md` — project purpose, stack, conventions
- `src-tauri/CLAUDE.md` — Rust backend context, Tauri commands overview
- `src/CLAUDE.md` — Frontend context, component patterns, store usage
- `src/routes/CLAUDE.md` — View-level context, navigation flow

### Conventions

- TypeScript for all frontend code
- Svelte 5 runes mode for reactivity
- No CSS framework — hand-rolled dark theme
- Minimal commenting, self-explanatory code
- Flat file structure, no deep nesting unless clearly needed

## UI Direction

Dark & modern aesthetic. Dark backgrounds, accent colors. Easy on eyes for late-night study sessions. Specific design will be iterated on during implementation.
