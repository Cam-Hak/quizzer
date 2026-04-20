# Study Mode Sectioned Learning Design

## Problem

When a deck has more than ~8-10 terms, studying all cards in one flat session is overwhelming. Users lose focus and retention drops. Quizlet's learn mode solves this by splitting cards into manageable sections with multiple passes per section.

## Requirements

### Smart Splitting

- Decks with 10 or fewer cards: single section, no splitting
- Decks with 11+ cards: target section size of 8, split into `ceil(N / 8)` sections
- Redistribute to avoid small remainders — no section smaller than 5 cards
- Examples: 15 → [8, 7], 17 → [9, 8], 9 → [9], 22 → [8, 7, 7], 25 → [9, 8, 8]

### Pass & Mastery Within a Section

- Each card tracks `correctCount` (0-3) and `wrongCount` (cumulative)
- A card is "mastered" when `correctCount` reaches 3
- Cards cycle in round-robin — each unmastered card gets one question per pass
- Correct answer: `correctCount++`
- Wrong answer: `correctCount` drops by 2 (min 0), `wrongCount++`
- Mastered cards drop out of subsequent passes
- Section ends when all cards have 3 correct answers
- Question type: MC at correctCount 0-1, Written at correctCount 2+

### Struggle Cards

- Any card with `wrongCount > 3` at section end is a "struggle card"
- Struggle cards carry into the next section, filling slots before new cards
- This keeps total section size at the target (e.g., 2 struggle cards + 6 new = 8)
- `correctCount` resets to 0 when a card enters a new section
- `wrongCount` persists across sections — a card that keeps failing keeps carrying forward

### Section Transitions

- Brief section completion summary shown between sections (cards mastered, accuracy)
- Next section built from: carry-over struggle cards first, then new cards up to target size

### Final Review Round

- After all sections complete, gather every card that had `wrongCount > 3` at any point during the session
- Run one pass through these cards (one question each)
- No mastery requirement — single confidence-check pass
- Session ends after this round regardless of results

### Session Complete

- Total cards studied, total correct/wrong
- List of "still struggling" cards (if any got wrong in final review)
- SM-2 ratings submitted to backend when cards are mastered within sections (existing behavior)

## Architecture

### Approach: Frontend-only sectioning

All sectioning logic lives in the Svelte frontend. The backend (SM-2 scheduling, question generation) is unchanged.

Rationale: Sectioning is a UI/session concern — how to present cards during a single study session. The backend's job doesn't change.

### New Module: SectionManager (TypeScript)

A plain TypeScript class created by `Study.svelte` at session start.

```
SectionManager
  sections: Card[][]              — pre-computed section assignments
  currentSectionIndex: number
  currentSection: SectionState
    cards: CardSectionProgress[]  — { cardId, correctCount, wrongCount, mastered }
    activeCards()                 — derived: cards where mastered === false
  struggleCards: Set<string>      — cardIds with wrongCount > 3 (accumulated across session)
  phase: "section" | "section-complete" | "final-review" | "complete"
  methods: nextCard(), recordAnswer(), advanceSection(), getFinalReviewCards()
```

### CardSectionProgress

```typescript
interface CardSectionProgress {
  cardId: string
  correctCount: number  // 0-3, resets per section
  wrongCount: number    // cumulative across sections
  mastered: boolean     // true when correctCount >= 3
}
```

### Study.svelte Changes

- `phase` state gains: `"section-complete"` (transition screen) and `"final-review"`
- `pickNextCard` replaced by `SectionManager.nextCard()`
- `cardProgress` map replaced by section-scoped progress
- 3-level mastery (MC -> MC -> Written) maps onto correctCount: 0-1 = MC, 2 = Written
- Section progress indicator in UI (e.g., "Section 2 of 4")

### What Stays the Same

- Question generation via backend (`generateTest`)
- SM-2 rating submission via backend (`submitRating`)
- Answer checking, feedback display, written answer judging
- Flashcard component rendering
- Small decks (≤ 10 cards) behave identically to current behavior (single section)
