import { writable } from "svelte/store";
import type { Question } from "$lib/tauri";

export type View = "home" | "editor" | "flashcards" | "study" | "test";

export const currentView = writable<View>("home");
export const testQuestions = writable<Question[]>([]);
