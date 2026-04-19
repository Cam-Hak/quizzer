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
