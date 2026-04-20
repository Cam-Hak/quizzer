# Quizzer

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
