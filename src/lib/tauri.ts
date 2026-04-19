import { invoke } from "@tauri-apps/api/core";

export interface Card {
  id: string;
  front: string;
  back: string;
  created_at: string;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  cards: Card[];
  created_at: string;
  updated_at: string;
}

export interface CardReviewState {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  last_review: string;
}

export interface DeckReviewState {
  deck_id: string;
  cards: Record<string, CardReviewState>;
}

export interface Question {
  card_id: string;
  prompt: string;
  correct_answer: string;
  question_type: "MultipleChoice" | "Written";
  options: string[] | null;
}

export interface TestAnswer {
  card_id: string;
  correct: boolean;
  given_answer: string;
}

export interface TestResult {
  id: string;
  deck_id: string;
  score: number;
  total: number;
  answers: TestAnswer[];
  completed_at: string;
}

export const api = {
  listDecks: () => invoke<Deck[]>("list_decks"),
  getDeck: (deckId: string) => invoke<Deck | null>("get_deck", { deckId }),
  createDeck: (title: string, description: string) =>
    invoke<Deck>("create_deck", { title, description }),
  deleteDeck: (deckId: string) => invoke<boolean>("delete_deck", { deckId }),
  addCard: (deckId: string, front: string, back: string) =>
    invoke<Card | null>("add_card", { deckId, front, back }),
  updateCard: (deckId: string, cardId: string, front: string, back: string) =>
    invoke<boolean>("update_card", { deckId, cardId, front, back }),
  removeCard: (deckId: string, cardId: string) =>
    invoke<boolean>("remove_card", { deckId, cardId }),
  getDueCards: (deckId: string) => invoke<string[]>("get_due_cards", { deckId }),
  submitRating: (deckId: string, cardId: string, rating: number) =>
    invoke<void>("submit_rating", { deckId, cardId, rating }),
  getReviewState: (deckId: string) =>
    invoke<DeckReviewState>("get_review_state", { deckId }),
  generateTest: (deckId: string, count: number | null, questionType: string) =>
    invoke<Question[]>("generate_test", { deckId, count, questionType }),
  saveTestResult: (result: TestResult) =>
    invoke<void>("save_test_result", { result }),
  getTestResults: (deckId: string) =>
    invoke<TestResult[]>("get_test_results", { deckId }),
  exportDeckCsv: (deckId: string, filePath: string) =>
    invoke<void>("export_deck_csv", { deckId, filePath }),
  importDeckCsv: (filePath: string, title: string) =>
    invoke<Deck>("import_deck_csv", { filePath, title }),
};
