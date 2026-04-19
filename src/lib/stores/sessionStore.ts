import { writable } from "svelte/store";
import type { Question } from "$lib/tauri";

export type View = "home" | "editor" | "study" | "test";

export const currentView = writable<View>("home");
export const studyQueue = writable<string[]>([]);
export const testQuestions = writable<Question[]>([]);
