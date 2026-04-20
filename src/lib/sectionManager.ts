import type { Card } from "$lib/tauri";

export interface CardSectionProgress {
  cardId: string;
  correctCount: number;
  wrongCount: number;
  mastered: boolean;
}

export type SectionPhase = "section" | "section-complete" | "final-review" | "complete";

export function splitIntoSections(cards: Card[]): Card[][] {
  const n = cards.length;
  if (n <= 10) return [cards];

  const numSections = Math.ceil(n / 8);
  const baseSize = Math.floor(n / numSections);
  const remainder = n % numSections;

  const sections: Card[][] = [];
  let offset = 0;
  for (let i = 0; i < numSections; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    sections.push(cards.slice(offset, offset + size));
    offset += size;
  }

  return sections;
}

export class SectionManager {
  sections: Card[][];
  currentSectionIndex: number = 0;
  sectionProgress: Map<string, CardSectionProgress> = new Map();
  globalWrongCounts: Map<string, number> = new Map();
  struggleCardIds: Set<string> = new Set();
  allCards: Map<string, Card> = new Map();
  phase: SectionPhase = "section";
  newCardQueue: Card[];
  private cardIndex: number = 0;

  // Session-wide stats
  totalAnswered: number = 0;
  totalCorrect: number = 0;
  sectionAnswered: number = 0;
  sectionCorrect: number = 0;

  constructor(cards: Card[]) {
    this.sections = splitIntoSections(cards);
    this.newCardQueue = cards.slice(this.sections[0].length);
    for (const card of cards) {
      this.allCards.set(card.id, card);
      this.globalWrongCounts.set(card.id, 0);
    }
    this.initSection(this.sections[0].map((c) => c.id));
  }

  private initSection(cardIds: string[]) {
    this.sectionProgress.clear();
    this.cardIndex = 0;
    this.sectionAnswered = 0;
    this.sectionCorrect = 0;
    for (const id of cardIds) {
      this.sectionProgress.set(id, {
        cardId: id,
        correctCount: 0,
        wrongCount: this.globalWrongCounts.get(id) ?? 0,
        mastered: false,
      });
    }
  }

  get activeCards(): CardSectionProgress[] {
    return [...this.sectionProgress.values()].filter((p) => !p.mastered);
  }

  get currentSectionCards(): CardSectionProgress[] {
    return [...this.sectionProgress.values()];
  }

  get totalSections(): number {
    return this.sections.length;
  }

  get sectionCardCount(): number {
    return this.sectionProgress.size;
  }

  nextCard(): CardSectionProgress | null {
    const active = this.activeCards;
    if (active.length === 0) return null;
    const idx = this.cardIndex % active.length;
    this.cardIndex++;
    return active[idx];
  }

  recordAnswer(cardId: string, correct: boolean): { mastered: boolean; sectionDone: boolean } {
    const progress = this.sectionProgress.get(cardId)!;
    this.totalAnswered++;
    this.sectionAnswered++;

    if (correct) {
      this.totalCorrect++;
      this.sectionCorrect++;
      progress.correctCount = Math.min(progress.correctCount + 1, 3);
    } else {
      progress.correctCount = Math.max(progress.correctCount - 2, 0);
      progress.wrongCount++;
      this.globalWrongCounts.set(cardId, progress.wrongCount);
    }

    const justMastered = progress.correctCount >= 3 && !progress.mastered;
    if (justMastered) {
      progress.mastered = true;
    }

    if (progress.wrongCount > 3) {
      this.struggleCardIds.add(cardId);
    }

    const sectionDone = this.activeCards.length === 0;
    if (sectionDone) {
      this.phase = "section-complete";
    }

    return { mastered: justMastered, sectionDone };
  }

  advanceSection(): void {
    const carryOver: string[] = [];
    for (const [id, progress] of this.sectionProgress) {
      if (progress.wrongCount > 3) {
        carryOver.push(id);
      }
    }

    const targetSize = 8;
    const newCardCount = Math.max(targetSize - carryOver.length, 0);

    const newCards = this.newCardQueue.splice(0, newCardCount);
    const nextCardIds = [...carryOver, ...newCards.map((c) => c.id)];

    if (nextCardIds.length === 0) {
      if (this.struggleCardIds.size > 0) {
        this.phase = "final-review";
      } else {
        this.phase = "complete";
      }
      return;
    }

    this.currentSectionIndex++;
    this.phase = "section";
    this.initSection(nextCardIds);
  }

  startFinalReview(): void {
    this.phase = "final-review";
    this.sectionProgress.clear();
    this.cardIndex = 0;
    this.sectionAnswered = 0;
    this.sectionCorrect = 0;
    for (const id of this.struggleCardIds) {
      this.sectionProgress.set(id, {
        cardId: id,
        correctCount: 0,
        wrongCount: this.globalWrongCounts.get(id) ?? 0,
        mastered: false,
      });
    }
  }

  recordFinalReviewAnswer(cardId: string, correct: boolean): { allDone: boolean } {
    const progress = this.sectionProgress.get(cardId)!;
    this.totalAnswered++;
    this.sectionAnswered++;

    if (correct) {
      this.totalCorrect++;
      this.sectionCorrect++;
    } else {
      progress.wrongCount++;
      this.globalWrongCounts.set(cardId, progress.wrongCount);
    }

    progress.mastered = true;

    const allDone = this.activeCards.length === 0;
    if (allDone) {
      this.phase = "complete";
    }
    return { allDone };
  }

  getCard(cardId: string): Card | undefined {
    return this.allCards.get(cardId);
  }
}
