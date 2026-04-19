import { writable } from "svelte/store";
import type { Deck } from "$lib/tauri";

export const decks = writable<Deck[]>([]);
export const currentDeck = writable<Deck | null>(null);
