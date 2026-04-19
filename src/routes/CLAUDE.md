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
