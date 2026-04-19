# Route Views

## Navigation Flow

Home → select deck → DeckEditor (also enables Flashcards/Study/Test sidebar buttons)
Sidebar buttons switch between Editor, Flashcards, Study, Test for the selected deck.
"Home" button clears the selected deck and returns to deck grid.

## Views

- `Home.svelte` — Deck grid with create form. Loads all decks + review states on mount.
- `DeckEditor.svelte` — Card list with add/edit/delete. Reloads deck from backend after mutations.
- `Flashcards.svelte` — Simple card browse mode with flip, prev/next, and shuffle toggle.
- `Study.svelte` — Quizlet-like Learn mode. Cards progress through 3 levels: MC → MC → Written. Wrong answers reset to level 0. SM-2 rating submitted when a card reaches "learned" (level 3). Always uses all cards in the deck.
- `Test.svelte` — Three phases: setup (pick count + type) → active (answer questions) → results (score + review).
