# Route Views

## Navigation Flow

Home → select deck → DeckEditor (also enables Flashcards/Study/Test sidebar buttons)
Sidebar buttons switch between Editor, Flashcards, Study, Test for the selected deck.
"Home" button clears the selected deck and returns to deck grid.

## Views

- `Home.svelte` — Deck grid with create form. Loads all decks + review states on mount.
- `DeckEditor.svelte` — Card list with add/edit/delete. Reloads deck from backend after mutations.
- `Flashcards.svelte` — Simple card browse mode with flip, prev/next, and shuffle toggle.
- `Study.svelte` — Quizlet-like Learn mode. Large decks (11+ cards) split into sections of ~8. Each card needs 3 correct answers to master within a section (MC at 0-1, Written at 2+). Wrong answers drop progress by 2 (min 0). Cards with 4+ wrong answers carry into the next section. Final review round covers all struggled cards. SM-2 rating submitted on mastery. Uses SectionManager from lib/sectionManager.ts.
- `Test.svelte` — Three phases: setup (pick count + type) → active (answer questions) → results (score + review).
