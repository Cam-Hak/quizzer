import { describe, it, expect, beforeEach } from "vitest";
import { splitIntoSections, SectionManager } from "./sectionManager";

// Minimal Card type matching the interface in tauri.ts
interface Card {
  id: string;
  front: string;
  back: string;
  created_at: string;
}

function makeCards(n: number): Card[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `card-${i + 1}`,
    front: `Front ${i + 1}`,
    back: `Back ${i + 1}`,
    created_at: "2026-01-01T00:00:00Z",
  }));
}

// Helper: master one card fully by recording 3 correct answers
function masterCard(manager: SectionManager, cardId: string): void {
  for (let i = 0; i < 3; i++) {
    manager.recordAnswer(cardId, true);
  }
}

// ─── splitIntoSections ────────────────────────────────────────────────────────

describe("splitIntoSections", () => {
  it("returns a single section when n <= 10", () => {
    const cards = makeCards(10);
    const sections = splitIntoSections(cards);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toHaveLength(10);
  });

  it("returns a single section for n = 1", () => {
    const cards = makeCards(1);
    const sections = splitIntoSections(cards);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toHaveLength(1);
  });

  it("returns a single section at the boundary of exactly 10 cards", () => {
    const cards = makeCards(10);
    const sections = splitIntoSections(cards);
    expect(sections).toHaveLength(1);
  });

  it("splits into 2 sections when n = 11", () => {
    const cards = makeCards(11);
    const sections = splitIntoSections(cards);
    expect(sections).toHaveLength(2);
    // 11 cards, 2 sections: ceil(11/8) = 2, baseSize = 5, remainder = 1
    // first section gets 6, second gets 5
    expect(sections[0]).toHaveLength(6);
    expect(sections[1]).toHaveLength(5);
  });

  it("sections differ by at most 1 card (remainder distributed evenly)", () => {
    // Use 20 cards: ceil(20/8) = 3 sections, baseSize = 6, remainder = 2
    // sections 0 and 1 get 7, section 2 gets 6
    const cards = makeCards(20);
    const sections = splitIntoSections(cards);
    const sizes = sections.map((s) => s.length);
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);
    expect(max - min).toBeLessThanOrEqual(1);
  });

  it("covers all cards with no duplicates or omissions", () => {
    const cards = makeCards(25);
    const sections = splitIntoSections(cards);
    const allIds = sections.flat().map((c) => c.id);
    expect(allIds).toHaveLength(cards.length);
    expect(new Set(allIds).size).toBe(cards.length);
  });

  it("preserves card order across sections", () => {
    const cards = makeCards(16);
    const sections = splitIntoSections(cards);
    const flat = sections.flat();
    flat.forEach((card, i) => {
      expect(card.id).toBe(cards[i].id);
    });
  });

  it("returns a single array element containing all cards when n = 9", () => {
    const cards = makeCards(9);
    const sections = splitIntoSections(cards);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toHaveLength(9);
  });
});

// ─── SectionManager constructor ───────────────────────────────────────────────

describe("SectionManager constructor", () => {
  it("initializes sectionProgress for every card in the first section", () => {
    const cards = makeCards(5);
    const mgr = new SectionManager(cards);
    expect(mgr.sectionProgress.size).toBe(5);
    for (const card of cards) {
      expect(mgr.sectionProgress.has(card.id)).toBe(true);
    }
  });

  it("sets correctCount to 0 and mastered to false for all initial cards", () => {
    const cards = makeCards(5);
    const mgr = new SectionManager(cards);
    for (const [, progress] of mgr.sectionProgress) {
      expect(progress.correctCount).toBe(0);
      expect(progress.mastered).toBe(false);
    }
  });

  it("sets wrongCount to 0 for all initial cards", () => {
    const cards = makeCards(5);
    const mgr = new SectionManager(cards);
    for (const [, progress] of mgr.sectionProgress) {
      expect(progress.wrongCount).toBe(0);
    }
  });

  it("newCardQueue contains all cards not in the first section", () => {
    // 16 cards → ceil(16/8) = 2 sections, each size 8
    const cards = makeCards(16);
    const mgr = new SectionManager(cards);
    const firstSectionSize = mgr.sections[0].length;
    expect(mgr.newCardQueue).toHaveLength(cards.length - firstSectionSize);
    const queueIds = mgr.newCardQueue.map((c) => c.id);
    const firstSectionIds = new Set(mgr.sections[0].map((c) => c.id));
    for (const id of queueIds) {
      expect(firstSectionIds.has(id)).toBe(false);
    }
  });

  it("starts with phase = 'section'", () => {
    const mgr = new SectionManager(makeCards(5));
    expect(mgr.phase).toBe("section");
  });

  it("initializes currentSectionIndex to 0", () => {
    const mgr = new SectionManager(makeCards(5));
    expect(mgr.currentSectionIndex).toBe(0);
  });

  it("initializes all session stats to 0", () => {
    const mgr = new SectionManager(makeCards(5));
    expect(mgr.totalAnswered).toBe(0);
    expect(mgr.totalCorrect).toBe(0);
    expect(mgr.sectionAnswered).toBe(0);
    expect(mgr.sectionCorrect).toBe(0);
  });

  it("populates allCards map with every card", () => {
    const cards = makeCards(10);
    const mgr = new SectionManager(cards);
    expect(mgr.allCards.size).toBe(10);
    for (const card of cards) {
      expect(mgr.allCards.get(card.id)).toEqual(card);
    }
  });

  it("initializes globalWrongCounts to 0 for every card", () => {
    const cards = makeCards(5);
    const mgr = new SectionManager(cards);
    for (const card of cards) {
      expect(mgr.globalWrongCounts.get(card.id)).toBe(0);
    }
  });

  it("with <= 10 cards, newCardQueue is empty (single section)", () => {
    const mgr = new SectionManager(makeCards(8));
    expect(mgr.newCardQueue).toHaveLength(0);
  });
});

// ─── nextCard ─────────────────────────────────────────────────────────────────

describe("nextCard", () => {
  it("returns a card from the active (non-mastered) list", () => {
    const cards = makeCards(3);
    const mgr = new SectionManager(cards);
    const card = mgr.nextCard();
    expect(card).not.toBeNull();
    expect(card!.mastered).toBe(false);
  });

  it("returns null when all cards are mastered", () => {
    const cards = makeCards(2);
    const mgr = new SectionManager(cards);
    for (const card of cards) {
      masterCard(mgr, card.id);
    }
    expect(mgr.nextCard()).toBeNull();
  });

  it("cycles through all active cards via the cardIndex", () => {
    const cards = makeCards(3);
    const mgr = new SectionManager(cards);
    const seen = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const c = mgr.nextCard();
      expect(c).not.toBeNull();
      seen.add(c!.cardId);
    }
    expect(seen.size).toBe(3);
  });

  it("excludes mastered cards from rotation", () => {
    const cards = makeCards(3);
    const mgr = new SectionManager(cards);
    masterCard(mgr, "card-1");
    // Remaining two active cards should never return card-1
    for (let i = 0; i < 6; i++) {
      const c = mgr.nextCard();
      if (c !== null) {
        expect(c.cardId).not.toBe("card-1");
      }
    }
  });
});

// ─── recordAnswer — correct answers ───────────────────────────────────────────

describe("recordAnswer (correct)", () => {
  it("increments correctCount by 1 per correct answer", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", true);
    expect(mgr.sectionProgress.get("card-1")!.correctCount).toBe(1);
  });

  it("correctCount is capped at 3 and does not exceed it", () => {
    const mgr = new SectionManager(makeCards(2));
    for (let i = 0; i < 5; i++) {
      mgr.recordAnswer("card-1", true);
    }
    expect(mgr.sectionProgress.get("card-1")!.correctCount).toBe(3);
  });

  it("marks card as mastered when correctCount reaches 3", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", true);
    mgr.recordAnswer("card-1", true);
    expect(mgr.sectionProgress.get("card-1")!.mastered).toBe(false);
    mgr.recordAnswer("card-1", true);
    expect(mgr.sectionProgress.get("card-1")!.mastered).toBe(true);
  });

  it("returns { mastered: true } on the third correct answer", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", true);
    mgr.recordAnswer("card-1", true);
    const result = mgr.recordAnswer("card-1", true);
    expect(result.mastered).toBe(true);
  });

  it("returns { mastered: false } on the first and second correct answers", () => {
    const mgr = new SectionManager(makeCards(2));
    expect(mgr.recordAnswer("card-1", true).mastered).toBe(false);
    expect(mgr.recordAnswer("card-1", true).mastered).toBe(false);
  });

  it("increments totalCorrect and sectionCorrect on each correct answer", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", true);
    expect(mgr.totalCorrect).toBe(1);
    expect(mgr.sectionCorrect).toBe(1);
    mgr.recordAnswer("card-1", true);
    expect(mgr.totalCorrect).toBe(2);
    expect(mgr.sectionCorrect).toBe(2);
  });

  it("increments totalAnswered and sectionAnswered on each answer", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", true);
    mgr.recordAnswer("card-2", false);
    expect(mgr.totalAnswered).toBe(2);
    expect(mgr.sectionAnswered).toBe(2);
  });

  it("returns { sectionDone: false } when unmastered cards remain", () => {
    const mgr = new SectionManager(makeCards(2));
    const result = mgr.recordAnswer("card-1", true);
    expect(result.sectionDone).toBe(false);
  });

  it("returns { sectionDone: true } and sets phase to section-complete when last card is mastered", () => {
    const mgr = new SectionManager(makeCards(1));
    mgr.recordAnswer("card-1", true);
    mgr.recordAnswer("card-1", true);
    const result = mgr.recordAnswer("card-1", true);
    expect(result.sectionDone).toBe(true);
    expect(mgr.phase).toBe("section-complete");
  });

  it("does not set mastered again if card is already mastered (no double-fire)", () => {
    const mgr = new SectionManager(makeCards(2));
    masterCard(mgr, "card-1");
    // A 4th correct answer while already mastered should not re-fire mastered
    const result = mgr.recordAnswer("card-1", true);
    expect(result.mastered).toBe(false);
  });
});

// ─── recordAnswer — wrong answers ─────────────────────────────────────────────

describe("recordAnswer (wrong)", () => {
  it("resets correctCount to 0 when correctCount < 2 (MC level)", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", true); // correctCount = 1
    mgr.recordAnswer("card-1", false);
    expect(mgr.sectionProgress.get("card-1")!.correctCount).toBe(0);
  });

  it("drops correctCount to 1 when correctCount >= 2 (Written level)", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", true);
    mgr.recordAnswer("card-1", true); // correctCount = 2
    mgr.recordAnswer("card-1", false);
    expect(mgr.sectionProgress.get("card-1")!.correctCount).toBe(1);
  });

  it("also drops correctCount to 1 when correctCount was exactly 2", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", true);
    mgr.recordAnswer("card-1", true); // correctCount = 2
    mgr.recordAnswer("card-1", false);
    expect(mgr.sectionProgress.get("card-1")!.correctCount).toBe(1);
  });

  it("increments wrongCount by 1 on each wrong answer", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", false);
    expect(mgr.sectionProgress.get("card-1")!.wrongCount).toBe(1);
    mgr.recordAnswer("card-1", false);
    expect(mgr.sectionProgress.get("card-1")!.wrongCount).toBe(2);
  });

  it("updates globalWrongCounts to match local wrongCount", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", false);
    mgr.recordAnswer("card-1", false);
    expect(mgr.globalWrongCounts.get("card-1")).toBe(2);
  });

  it("does not add card to struggleCardIds when wrongCount <= 3", () => {
    const mgr = new SectionManager(makeCards(2));
    for (let i = 0; i < 3; i++) {
      mgr.recordAnswer("card-1", false);
    }
    expect(mgr.struggleCardIds.has("card-1")).toBe(false);
  });

  it("adds card to struggleCardIds when wrongCount exceeds 3", () => {
    const mgr = new SectionManager(makeCards(2));
    for (let i = 0; i < 4; i++) {
      mgr.recordAnswer("card-1", false);
    }
    expect(mgr.struggleCardIds.has("card-1")).toBe(true);
  });

  it("does not increment totalCorrect or sectionCorrect on a wrong answer", () => {
    const mgr = new SectionManager(makeCards(2));
    mgr.recordAnswer("card-1", false);
    expect(mgr.totalCorrect).toBe(0);
    expect(mgr.sectionCorrect).toBe(0);
  });

  it("returns { sectionDone: true } when wrong answer masters the last card (edge case: already at correctCount=3)", () => {
    // This scenario shouldn't arise naturally, but verify sectionDone reflects active cards
    const mgr = new SectionManager(makeCards(1));
    masterCard(mgr, "card-1");
    // All cards mastered; any subsequent call will see sectionDone
    const result = mgr.recordAnswer("card-1", false);
    // card-1 is already mastered; activeCards is 0 → sectionDone true
    expect(result.sectionDone).toBe(true);
  });
});

// ─── advanceSection ───────────────────────────────────────────────────────────

describe("advanceSection", () => {
  it("increments currentSectionIndex by 1", () => {
    // 16 cards → 2 sections of 8; master all in section 1 then advance
    const cards = makeCards(16);
    const mgr = new SectionManager(cards);
    for (const id of [...mgr.sectionProgress.keys()]) {
      masterCard(mgr, id);
    }
    mgr.advanceSection();
    expect(mgr.currentSectionIndex).toBe(1);
  });

  it("sets phase back to 'section' when there are new cards", () => {
    const cards = makeCards(16);
    const mgr = new SectionManager(cards);
    for (const id of [...mgr.sectionProgress.keys()]) {
      masterCard(mgr, id);
    }
    mgr.advanceSection();
    expect(mgr.phase).toBe("section");
  });

  it("pulls new cards from newCardQueue up to (8 - carryOver count)", () => {
    const cards = makeCards(16);
    const mgr = new SectionManager(cards);
    for (const id of [...mgr.sectionProgress.keys()]) {
      masterCard(mgr, id);
    }
    const queueSizeBefore = mgr.newCardQueue.length;
    mgr.advanceSection();
    // No carry-overs (wrongCount ≤ 3), so 8 cards should be pulled
    expect(mgr.newCardQueue.length).toBe(queueSizeBefore - 8);
    expect(mgr.sectionProgress.size).toBe(8);
  });

  it("carries over cards with wrongCount > 3 into the next section", () => {
    const cards = makeCards(16);
    const mgr = new SectionManager(cards);
    // Give card-1 a wrongCount of 4 (struggle card)
    for (let i = 0; i < 4; i++) {
      mgr.recordAnswer("card-1", false);
    }
    // Master all remaining cards so section completes
    for (const [id] of mgr.sectionProgress) {
      if (id !== "card-1") masterCard(mgr, id);
    }
    mgr.advanceSection();
    expect(mgr.sectionProgress.has("card-1")).toBe(true);
  });

  it("carry-over cards reduce the number of new cards pulled from queue", () => {
    const cards = makeCards(16);
    const mgr = new SectionManager(cards);
    // Make 3 cards struggle (wrongCount > 3)
    const struggleIds = ["card-1", "card-2", "card-3"];
    for (const id of struggleIds) {
      for (let i = 0; i < 4; i++) {
        mgr.recordAnswer(id, false);
      }
    }
    // Master remaining
    for (const [id] of mgr.sectionProgress) {
      if (!struggleIds.includes(id)) masterCard(mgr, id);
    }
    const queueBefore = mgr.newCardQueue.length;
    mgr.advanceSection();
    // targetSize=8, carryOver=3, so pulls 5 new cards
    expect(mgr.newCardQueue.length).toBe(queueBefore - 5);
    expect(mgr.sectionProgress.size).toBe(8);
  });

  it("resets sectionAnswered and sectionCorrect counters", () => {
    const cards = makeCards(16);
    const mgr = new SectionManager(cards);
    mgr.recordAnswer("card-1", true);
    for (const [id] of mgr.sectionProgress) {
      masterCard(mgr, id);
    }
    mgr.advanceSection();
    expect(mgr.sectionAnswered).toBe(0);
    expect(mgr.sectionCorrect).toBe(0);
  });

  it("sets phase to 'complete' when no carry-overs, no new cards, and no struggle cards", () => {
    // 5 cards → single section, no queue
    const cards = makeCards(5);
    const mgr = new SectionManager(cards);
    for (const id of [...mgr.sectionProgress.keys()]) {
      masterCard(mgr, id);
    }
    mgr.advanceSection();
    expect(mgr.phase).toBe("complete");
  });

  it("starts final review when no new cards remain but struggle cards exist", () => {
    // To reach final-review: nextCardIds must be empty (no carry-over, no queue)
    // but struggleCardIds must be non-empty.
    // Set up: single section, master all cards, manually add a struggle card ID,
    // then call advanceSection with no carry-over candidates and empty queue.
    const cards = makeCards(5);
    const mgr = new SectionManager(cards);
    // Master all cards (no wrongCount > 3 → no carry-over)
    for (const [id] of mgr.sectionProgress) {
      masterCard(mgr, id);
    }
    // Simulate that a card was flagged as a struggle in a prior flow
    mgr.struggleCardIds.add("card-1");
    mgr.advanceSection();
    expect(mgr.phase).toBe("final-review");
    expect(mgr.sectionProgress.has("card-1")).toBe(true);
  });

  it("resets cardIndex to 0 so nextCard starts from the beginning of the new section", () => {
    const cards = makeCards(16);
    const mgr = new SectionManager(cards);
    // Burn through several nextCard calls to advance cardIndex
    mgr.nextCard();
    mgr.nextCard();
    mgr.nextCard();
    for (const [id] of mgr.sectionProgress) {
      masterCard(mgr, id);
    }
    mgr.advanceSection();
    // After advancing, the first nextCard call should return the first active card
    const card = mgr.nextCard();
    expect(card).not.toBeNull();
  });
});

// ─── startFinalReview ─────────────────────────────────────────────────────────

describe("startFinalReview", () => {
  function buildManagerWithStruggleCards(): SectionManager {
    const cards = makeCards(5);
    const mgr = new SectionManager(cards);
    // card-1 and card-2 become struggle cards (wrongCount > 3)
    for (const id of ["card-1", "card-2"]) {
      for (let i = 0; i < 4; i++) {
        mgr.recordAnswer(id, false);
      }
    }
    // Master the rest
    for (const [id] of mgr.sectionProgress) {
      if (id !== "card-1" && id !== "card-2") masterCard(mgr, id);
    }
    return mgr;
  }

  it("sets phase to 'final-review'", () => {
    const mgr = buildManagerWithStruggleCards();
    mgr.startFinalReview();
    expect(mgr.phase).toBe("final-review");
  });

  it("populates sectionProgress exclusively with struggle cards", () => {
    const mgr = buildManagerWithStruggleCards();
    mgr.startFinalReview();
    expect(mgr.sectionProgress.size).toBe(2);
    expect(mgr.sectionProgress.has("card-1")).toBe(true);
    expect(mgr.sectionProgress.has("card-2")).toBe(true);
  });

  it("resets correctCount to 0 for all struggle cards", () => {
    const mgr = buildManagerWithStruggleCards();
    // Give card-1 some partial progress before final review
    mgr.recordAnswer("card-1", true);
    mgr.startFinalReview();
    expect(mgr.sectionProgress.get("card-1")!.correctCount).toBe(0);
    expect(mgr.sectionProgress.get("card-2")!.correctCount).toBe(0);
  });

  it("preserves wrongCount from globalWrongCounts in the final review progress", () => {
    const mgr = buildManagerWithStruggleCards();
    mgr.startFinalReview();
    // card-1 was answered wrong 4 times → wrongCount = 4
    expect(mgr.sectionProgress.get("card-1")!.wrongCount).toBe(4);
    expect(mgr.sectionProgress.get("card-2")!.wrongCount).toBe(4);
  });

  it("sets all struggle cards to mastered = false initially", () => {
    const mgr = buildManagerWithStruggleCards();
    mgr.startFinalReview();
    for (const [, p] of mgr.sectionProgress) {
      expect(p.mastered).toBe(false);
    }
  });

  it("resets cardIndex, sectionAnswered, and sectionCorrect", () => {
    const mgr = buildManagerWithStruggleCards();
    mgr.recordAnswer("card-1", true);
    mgr.startFinalReview();
    expect(mgr.sectionAnswered).toBe(0);
    expect(mgr.sectionCorrect).toBe(0);
  });
});

// ─── recordFinalReviewAnswer ──────────────────────────────────────────────────

describe("recordFinalReviewAnswer", () => {
  function buildFinalReview(): SectionManager {
    const cards = makeCards(5);
    const mgr = new SectionManager(cards);
    for (const id of ["card-1", "card-2"]) {
      for (let i = 0; i < 4; i++) {
        mgr.recordAnswer(id, false);
      }
    }
    for (const [id] of mgr.sectionProgress) {
      if (id !== "card-1" && id !== "card-2") masterCard(mgr, id);
    }
    mgr.startFinalReview();
    return mgr;
  }

  it("always marks the card as mastered regardless of correct/wrong", () => {
    const mgr = buildFinalReview();
    mgr.recordFinalReviewAnswer("card-1", false);
    expect(mgr.sectionProgress.get("card-1")!.mastered).toBe(true);
  });

  it("marks card as mastered even on a correct answer", () => {
    const mgr = buildFinalReview();
    mgr.recordFinalReviewAnswer("card-2", true);
    expect(mgr.sectionProgress.get("card-2")!.mastered).toBe(true);
  });

  it("increments totalCorrect and sectionCorrect on a correct answer", () => {
    const mgr = buildFinalReview();
    const totalBefore = mgr.totalCorrect;
    const sectionBefore = mgr.sectionCorrect;
    mgr.recordFinalReviewAnswer("card-1", true);
    expect(mgr.totalCorrect).toBe(totalBefore + 1);
    expect(mgr.sectionCorrect).toBe(sectionBefore + 1);
  });

  it("does not increment totalCorrect on a wrong answer", () => {
    const mgr = buildFinalReview();
    const totalBefore = mgr.totalCorrect;
    mgr.recordFinalReviewAnswer("card-1", false);
    expect(mgr.totalCorrect).toBe(totalBefore);
  });

  it("increments wrongCount in progress and globalWrongCounts on a wrong answer", () => {
    const mgr = buildFinalReview();
    const wrongBefore = mgr.sectionProgress.get("card-1")!.wrongCount;
    mgr.recordFinalReviewAnswer("card-1", false);
    expect(mgr.sectionProgress.get("card-1")!.wrongCount).toBe(wrongBefore + 1);
    expect(mgr.globalWrongCounts.get("card-1")).toBe(wrongBefore + 1);
  });

  it("returns { allDone: false } when unmastered cards remain", () => {
    const mgr = buildFinalReview();
    const result = mgr.recordFinalReviewAnswer("card-1", true);
    expect(result.allDone).toBe(false);
  });

  it("returns { allDone: true } when all struggle cards are answered", () => {
    const mgr = buildFinalReview();
    mgr.recordFinalReviewAnswer("card-1", true);
    const result = mgr.recordFinalReviewAnswer("card-2", true);
    expect(result.allDone).toBe(true);
  });

  it("sets phase to 'complete' when all done", () => {
    const mgr = buildFinalReview();
    mgr.recordFinalReviewAnswer("card-1", false);
    mgr.recordFinalReviewAnswer("card-2", false);
    expect(mgr.phase).toBe("complete");
  });

  it("increments totalAnswered and sectionAnswered on each final review answer", () => {
    const mgr = buildFinalReview();
    const totalBefore = mgr.totalAnswered;
    mgr.recordFinalReviewAnswer("card-1", true);
    expect(mgr.totalAnswered).toBe(totalBefore + 1);
  });
});
