import type { Deck, DeckReviewState, Question, TestResult } from "./tauri";

let mockDecks: Deck[] = [];
let mockReviews: Record<string, DeckReviewState> = {};
let mockResults: TestResult[] = [];

export function resetMocks() {
  mockDecks = [];
  mockReviews = {};
  mockResults = [];
}

export function seedDeck(deck: Deck) {
  mockDecks.push(deck);
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function mockInvoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  switch (cmd) {
    case "list_decks":
      return clone(mockDecks);
    case "get_deck": {
      const found = mockDecks.find((d) => d.id === args?.deckId);
      return found ? clone(found) : null;
    }
    case "create_deck": {
      const deck: Deck = {
        id: crypto.randomUUID(),
        title: args?.title as string,
        description: args?.description as string,
        cards: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockDecks.push(deck);
      return clone(deck);
    }
    case "delete_deck":
      mockDecks = mockDecks.filter((d) => d.id !== args?.deckId);
      return true;
    case "add_card": {
      const deck = mockDecks.find((d) => d.id === args?.deckId);
      if (!deck) return null;
      const card = {
        id: crypto.randomUUID(),
        front: args?.front as string,
        back: args?.back as string,
        created_at: new Date().toISOString(),
      };
      deck.cards.push(card);
      return card;
    }
    case "update_card": {
      const d = mockDecks.find((d) => d.id === args?.deckId);
      const c = d?.cards.find((c) => c.id === args?.cardId);
      if (!c) return false;
      c.front = args?.front as string;
      c.back = args?.back as string;
      return true;
    }
    case "remove_card": {
      const dk = mockDecks.find((d) => d.id === args?.deckId);
      if (!dk) return false;
      dk.cards = dk.cards.filter((c) => c.id !== args?.cardId);
      return true;
    }
    case "get_due_cards": {
      const dck = mockDecks.find((d) => d.id === args?.deckId);
      return dck?.cards.map((c) => c.id) ?? [];
    }
    case "submit_rating":
      return undefined;
    case "get_review_state":
      return mockReviews[args?.deckId as string] ?? { deck_id: args?.deckId, cards: {} };
    case "generate_test": {
      const tDeck = mockDecks.find((d) => d.id === args?.deckId);
      if (!tDeck) return [];
      return tDeck.cards.map((c): Question => ({
        card_id: c.id,
        prompt: c.front,
        correct_answer: c.back,
        question_type: (args?.questionType === "written" ? "Written" : "MultipleChoice") as "Written" | "MultipleChoice",
        options: args?.questionType === "written" ? null : [c.back, "Wrong 1", "Wrong 2", "Wrong 3"],
      }));
    }
    case "save_test_result":
      mockResults.push(args?.result as TestResult);
      return undefined;
    case "get_test_results":
      return mockResults.filter((r) => r.deck_id === args?.deckId);
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}
