# Study Mode Sectioned Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split large flashcard decks into 8-card sections with 3-correct mastery per card, struggle card carry-over between sections, and a final review round.

**Architecture:** All sectioning logic lives in a new `SectionManager` TypeScript module on the frontend. `Study.svelte` delegates card selection and progress tracking to `SectionManager` instead of managing flat card progress directly. The Rust backend is unchanged.

**Tech Stack:** Svelte 5 (runes), TypeScript, existing Tauri IPC (`api.generateTest`, `api.submitRating`)

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/sectionManager.ts` | Section splitting, pass/mastery logic, struggle card tracking, card selection |
| Modify | `src/routes/Study.svelte` | Replace flat card progress with SectionManager, add section-complete and final-review UI phases |

---

### Task 1: Create SectionManager — splitting logic

**Files:**
- Create: `src/lib/sectionManager.ts`

- [ ] **Step 1: Create the module with types and splitIntoSections function**

```typescript
// src/lib/sectionManager.ts

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
```

- [ ] **Step 2: Verify the module compiles**

Run: `cd /Users/cameronhakenson/Developer/quizard && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `sectionManager.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/sectionManager.ts
git commit -m "feat: add sectionManager module with splitIntoSections"
```

---

### Task 2: Add SectionManager class — core state machine

**Files:**
- Modify: `src/lib/sectionManager.ts`

- [ ] **Step 1: Add the SectionManager class below the existing code**

```typescript
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
    // Approximate: initial sections + potential regrouping from struggle cards
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
    // Collect struggle cards from this section that should carry over
    const carryOver: string[] = [];
    for (const [id, progress] of this.sectionProgress) {
      if (progress.wrongCount > 3) {
        carryOver.push(id);
      }
    }

    // Determine how many new cards to pull
    const targetSize = 8;
    const newCardCount = Math.max(targetSize - carryOver.length, 0);

    // Pull new cards from the queue
    const newCards = this.newCardQueue.splice(0, newCardCount);
    const nextCardIds = [...carryOver, ...newCards.map((c) => c.id)];

    if (nextCardIds.length === 0) {
      // No more cards — check if final review needed
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

    // Mark as mastered regardless (single pass)
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
```

- [ ] **Step 2: Verify the module compiles**

Run: `cd /Users/cameronhakenson/Developer/quizard && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/sectionManager.ts
git commit -m "feat: add SectionManager class with pass/mastery and struggle card logic"
```

---

### Task 3: Integrate SectionManager into Study.svelte — initialization

**Files:**
- Modify: `src/routes/Study.svelte`

- [ ] **Step 1: Replace imports and state declarations**

Replace lines 1-56 of Study.svelte with:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { currentDeck } from "$lib/stores/deckStore";
  import { api, type Question } from "$lib/tauri";
  import { renderMarkdown } from "$lib/markdown";
  import { getMatchingWords, highlightMatches } from "$lib/wordMatch";
  import { SectionManager } from "$lib/sectionManager";
  import ProgressBar from "../components/ProgressBar.svelte";

  type Phase = "loading" | "active" | "section-complete" | "final-review" | "complete" | "error";

  let phase = $state<Phase>("loading");
  let manager = $state<SectionManager | null>(null);
  let mcQuestions = $state<Map<string, Question>>(new Map());
  let useWrittenOnly = $state(false);

  let currentCardId = $state<string | null>(null);
  let currentQuestionType = $state<"MultipleChoice" | "Written">("MultipleChoice");
  let currentOptions = $state<string[]>([]);
  let currentPrompt = $state("");
  let currentCorrectAnswer = $state("");
  let writtenInput = $state("");

  let feedbackState = $state<{
    correct: boolean;
    correctAnswer: string;
    newCorrectCount: number;
    justMastered: boolean;
    selectedOption: string | null;
  } | null>(null);

  let judgingState = $state<{ userAnswer: string; correctAnswer: string } | null>(null);

  let errorMsg = $state("");

  let sectionIndex = $derived(manager?.currentSectionIndex ?? 0);
  let totalSections = $derived(manager?.totalSections ?? 1);
  let sectionMastered = $derived(
    manager ? manager.currentSectionCards.filter((p) => p.mastered).length : 0
  );
  let sectionTotal = $derived(manager?.sectionCardCount ?? 0);
  let totalAnswered = $derived(manager?.totalAnswered ?? 0);
  let totalCorrect = $derived(manager?.totalCorrect ?? 0);
  let totalCards = $derived($currentDeck?.cards.length ?? 0);
  let learnedCount = $derived(
    manager
      ? [...manager.allCards.keys()].filter((id) => {
          const wc = manager!.globalWrongCounts.get(id) ?? 0;
          // A card is "learned" if it was mastered and isn't a current active card
          return !manager!.sectionProgress.has(id) || manager!.sectionProgress.get(id)!.mastered;
        }).length - manager!.activeCards.length
      : 0
  );

  let sectionCardList = $derived(
    manager
      ? manager.currentSectionCards.map((p) => ({
          id: p.cardId,
          front: manager!.getCard(p.cardId)?.front ?? "",
          correctCount: p.correctCount,
          mastered: p.mastered,
        }))
      : []
  );
```

- [ ] **Step 2: Replace onMount to use SectionManager**

Replace the existing onMount block (lines 58-84) with:

```typescript
  onMount(async () => {
    if (!$currentDeck || $currentDeck.cards.length === 0) return;

    try {
      useWrittenOnly = $currentDeck.cards.length < 4;

      const questions = await api.generateTest($currentDeck.id, null, "multiple_choice");
      for (const q of questions) {
        mcQuestions.set(q.card_id, q);
      }

      manager = new SectionManager($currentDeck.cards);
      pickNextCard();
      phase = "active";
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
      phase = "error";
    }
  });
```

- [ ] **Step 3: Verify it compiles (may have errors from remaining old code — that's expected at this step)**

Run: `cd /Users/cameronhakenson/Developer/quizard && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/routes/Study.svelte
git commit -m "feat: integrate SectionManager initialization into Study.svelte"
```

---

### Task 4: Replace card selection and answer logic in Study.svelte

**Files:**
- Modify: `src/routes/Study.svelte`

- [ ] **Step 1: Replace pickNextCard function**

Replace the existing `pickNextCard` function with:

```typescript
  function pickNextCard() {
    if (!manager) return;

    const next = manager.nextCard();
    if (!next) {
      if (manager.phase === "section-complete") {
        phase = "section-complete";
      } else if (manager.phase === "final-review") {
        phase = "final-review";
        manager.startFinalReview();
        pickNextCard();
      } else {
        phase = "complete";
      }
      return;
    }

    currentCardId = next.cardId;
    const card = manager.getCard(next.cardId)!;

    if (useWrittenOnly || next.correctCount >= 2) {
      currentQuestionType = "Written";
      currentPrompt = card.front;
      currentCorrectAnswer = card.back;
      currentOptions = [];
      writtenInput = "";
    } else {
      currentQuestionType = "MultipleChoice";
      const q = mcQuestions.get(next.cardId)!;
      currentPrompt = q.prompt;
      currentCorrectAnswer = q.correct_answer;
      currentOptions = [...(q.options ?? [])];
    }

    feedbackState = null;
    judgingState = null;
  }
```

- [ ] **Step 2: Replace recordAnswer function**

Replace the existing `recordAnswer` function with:

```typescript
  async function recordAnswer(correct: boolean, selectedOption: string | null) {
    if (!currentCardId || !manager) return;

    const isFinalReview = phase === "final-review";
    let justMastered = false;
    let sectionDone = false;

    if (isFinalReview) {
      const result = manager.recordFinalReviewAnswer(currentCardId, correct);
      if (result.allDone) {
        phase = "complete";
      }
    } else {
      const result = manager.recordAnswer(currentCardId, correct);
      justMastered = result.mastered;
      sectionDone = result.sectionDone;
    }

    const progress = manager.sectionProgress.get(currentCardId)!;

    feedbackState = {
      correct,
      correctAnswer: currentCorrectAnswer,
      newCorrectCount: progress.correctCount,
      justMastered: justMastered,
      selectedOption,
    };

    if (justMastered && $currentDeck) {
      const rating = wrongCountToRating(progress.wrongCount);
      await api.submitRating($currentDeck.id, currentCardId, rating);
    }
  }
```

- [ ] **Step 3: Replace advance function**

Replace the existing `advance` function with:

```typescript
  function advance() {
    if (!manager) return;

    if (manager.phase === "section-complete") {
      phase = "section-complete";
      return;
    }

    if (manager.phase === "complete") {
      phase = "complete";
      return;
    }

    pickNextCard();
  }
```

- [ ] **Step 4: Add section advance handlers**

Add these functions after the `advance` function:

```typescript
  function advanceToNextSection() {
    if (!manager) return;
    manager.advanceSection();

    if (manager.phase === "final-review") {
      manager.startFinalReview();
      phase = "final-review";
      pickNextCard();
    } else if (manager.phase === "complete") {
      phase = "complete";
    } else {
      phase = "active";
      pickNextCard();
    }
  }

  function startFinalReview() {
    if (!manager) return;
    manager.startFinalReview();
    phase = "final-review";
    pickNextCard();
  }
```

- [ ] **Step 5: Replace studyAgain function**

Replace the existing `studyAgain` function with:

```typescript
  function studyAgain() {
    if (!$currentDeck) return;
    manager = new SectionManager($currentDeck.cards);
    pickNextCard();
    phase = "active";
  }
```

- [ ] **Step 6: Verify it compiles**

Run: `cd /Users/cameronhakenson/Developer/quizard && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 7: Commit**

```bash
git add src/routes/Study.svelte
git commit -m "feat: replace card selection and answer logic with SectionManager"
```

---

### Task 5: Update Study.svelte template — active phase and feedback

**Files:**
- Modify: `src/routes/Study.svelte`

- [ ] **Step 1: Update the active phase header**

Replace the study header block (`{:else if phase === "active" && currentCardId}` through the end of `.card-chips` div) with:

```svelte
{:else if (phase === "active" || phase === "final-review") && currentCardId}
  <div class="study-view">
    <div class="study-header">
      <div class="progress-section">
        {#if phase === "final-review"}
          <span class="progress-text">Final Review — {sectionMastered} of {sectionTotal} reviewed</span>
        {:else}
          <span class="progress-text">Section {sectionIndex + 1} of {totalSections} — {sectionMastered} of {sectionTotal} mastered</span>
        {/if}
        <ProgressBar value={sectionMastered} max={sectionTotal} />
      </div>
      <div class="card-chips">
        {#each sectionCardList as card}
          <div
            class="card-chip"
            class:chip-active={card.id === currentCardId}
            class:chip-new={card.correctCount === 0 && !card.mastered}
            class:chip-progress={card.correctCount > 0 && !card.mastered}
            class:chip-learned={card.mastered}
            title="{card.front} — {card.mastered ? 'Mastered' : card.correctCount + '/3'}"
          ></div>
        {/each}
      </div>
    </div>
```

- [ ] **Step 2: Update the question card meta and level steps**

Replace the `.question-meta` and `.level-steps` blocks with:

```svelte
    <div class="question-card">
      <div class="question-meta">
        {#if manager}
          {@const progress = manager.sectionProgress.get(currentCardId)}
          <span class="level-badge level-{progress?.correctCount ?? 0}">
            {progress?.correctCount ?? 0}/3
          </span>
        {/if}
        <span class="question-type-label">
          {currentQuestionType === "MultipleChoice" ? "Multiple Choice" : "Written Answer"}
        </span>
      </div>

      <div class="level-steps">
        {#if manager}
          {@const progress = manager.sectionProgress.get(currentCardId)}
          {#each [0, 1, 2] as step}
            <div
              class="level-step"
              class:step-done={step < (progress?.correctCount ?? 0)}
              class:step-current={step === (progress?.correctCount ?? 0) && !(progress?.mastered)}
            ></div>
          {/each}
          <span class="level-steps-label">
            {Math.min(progress?.correctCount ?? 0, 3)}/3
          </span>
        {/if}
      </div>
```

- [ ] **Step 3: Update feedback messages to use correctCount instead of level**

Replace the feedback block (from `{:else}` after the written-form div through the continue button) with:

```svelte
      {:else}
        <div class="feedback" class:correct={feedbackState.correct} class:incorrect={!feedbackState.correct} class:just-learned={feedbackState.justMastered} role="status" aria-live="polite">
          {#if feedbackState.justMastered}
            <div class="learned-celebration">
              <span class="learned-check">&#10003;</span>
              <p class="feedback-text learned-text">Mastered!</p>
            </div>
            <p class="learned-subtitle">You've mastered this term for this section</p>
          {:else if feedbackState.correct}
            <p class="feedback-text">Correct!</p>
            <p class="level-up-msg">
              {feedbackState.newCorrectCount}/3 — {#if feedbackState.newCorrectCount === 1}Keep going!{:else if feedbackState.newCorrectCount === 2}One more to master!{:else}Nice!{/if}
            </p>
          {:else}
            <p class="feedback-text">Incorrect</p>
            <p class="correct-answer">Correct answer: {@html renderMarkdown(feedbackState.correctAnswer)}</p>
            <p class="reset-msg">Dropped back — you'll see this one again</p>
          {/if}

          {#if currentQuestionType === "MultipleChoice" && !feedbackState.justMastered}
            <div class="mc-options feedback-options">
              {#each currentOptions as option}
                <div
                  class="mc-option disabled"
                  class:option-correct={option === feedbackState.correctAnswer}
                  class:option-selected-wrong={!feedbackState.correct && option === feedbackState.selectedOption}
                  class:option-dim={option !== feedbackState.correctAnswer && option !== feedbackState.selectedOption}
                >
                  {option}
                </div>
              {/each}
            </div>
          {/if}

          <button class="primary continue-btn" onclick={advance}>Continue</button>
        </div>
      {/if}
    </div>
  </div>
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/cameronhakenson/Developer/quizard && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/routes/Study.svelte
git commit -m "feat: update Study.svelte template for sectioned progress display"
```

---

### Task 6: Add section-complete and final-review UI screens

**Files:**
- Modify: `src/routes/Study.svelte`

- [ ] **Step 1: Add section-complete screen**

Insert this block before the `{:else if phase === "complete"}` block:

```svelte
{:else if phase === "section-complete" && manager}
  <div class="section-summary">
    <h2>Section {sectionIndex + 1} Complete</h2>
    <p class="section-subtitle">Nice work! Here's how you did.</p>
    <div class="stats">
      <div class="stat">
        <span class="stat-value">{manager.sectionCardCount}</span>
        <span class="stat-label">Cards</span>
      </div>
      <div class="stat">
        <span class="stat-value">{manager.sectionAnswered}</span>
        <span class="stat-label">Answers</span>
      </div>
      <div class="stat">
        <span class="stat-value">
          {manager.sectionAnswered > 0 ? Math.round((manager.sectionCorrect / manager.sectionAnswered) * 100) : 0}%
        </span>
        <span class="stat-label">Accuracy</span>
      </div>
    </div>
    {#if manager.newCardQueue.length > 0 || [...manager.sectionProgress.values()].some((p) => p.wrongCount > 3)}
      <button class="primary section-next-btn" onclick={advanceToNextSection}>Next Section</button>
    {:else if manager.struggleCardIds.size > 0}
      <button class="primary section-next-btn" onclick={advanceToNextSection}>Final Review</button>
    {:else}
      <button class="primary section-next-btn" onclick={advanceToNextSection}>Finish</button>
    {/if}
  </div>
```

- [ ] **Step 2: Update the complete screen**

Replace the existing `{:else if phase === "complete"}` block with:

```svelte
{:else if phase === "complete"}
  <div class="session-summary">
    <h2>Session Complete</h2>
    <p class="complete-subtitle">You've studied all {totalCards} terms</p>
    <div class="stats">
      <div class="stat">
        <span class="stat-value">{totalCards}</span>
        <span class="stat-label">Cards</span>
      </div>
      <div class="stat">
        <span class="stat-value">{totalAnswered}</span>
        <span class="stat-label">Answers</span>
      </div>
      <div class="stat">
        <span class="stat-value">
          {totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0}%
        </span>
        <span class="stat-label">Accuracy</span>
      </div>
    </div>
    <button class="primary study-again-btn" onclick={studyAgain}>Study Again</button>
  </div>
{/if}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/cameronhakenson/Developer/quizard && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/routes/Study.svelte
git commit -m "feat: add section-complete transition and final review UI screens"
```

---

### Task 7: Update styles for new chip classes and section summary

**Files:**
- Modify: `src/routes/Study.svelte`

- [ ] **Step 1: Replace chip styles and add section summary styles**

Replace the chip CSS classes (`.chip-0`, `.chip-1`, `.chip-2`, `.chip-learned`) with:

```css
  .chip-new {
    background: var(--level-0-bg);
    border: 1px solid var(--border);
  }
  .chip-progress {
    background: var(--chip-2);
  }
  .chip-learned {
    background: var(--success);
    box-shadow: var(--shadow-glow-success);
  }
```

Add after the `.study-again-btn` style rule:

```css
  /* Section summary */
  .section-summary {
    text-align: center;
    padding-top: 64px;
  }
  .section-subtitle {
    color: var(--text-secondary);
    margin-top: 8px;
    font-size: 15px;
  }
  .section-next-btn {
    margin-top: 32px;
  }
```

- [ ] **Step 2: Remove unused `.chip-1` reference in the template if any remain**

Search the template for any remaining `chip-0`, `chip-1`, `chip-2` class references and replace them with the new `chip-new`, `chip-progress`, `chip-learned` classes. (This should already be done from Task 5 Step 1, but verify.)

- [ ] **Step 3: Update the `handleKey` function to handle section-complete phase**

Replace the existing `handleKey` function with:

```typescript
  function handleKey(e: KeyboardEvent) {
    const tag = (document.activeElement?.tagName ?? "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (phase === "section-complete") {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advanceToNextSection();
      }
      return;
    }

    if (judgingState) {
      if (e.key === "1") handleJudgment(true);
      else if (e.key === "2") handleJudgment(false);
      return;
    }

    if (feedbackState) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advance();
      }
      return;
    }

    if (currentQuestionType === "MultipleChoice" && currentOptions.length > 0) {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < currentOptions.length) {
        handleMcAnswer(currentOptions[idx]);
      }
    }
  }
```

- [ ] **Step 4: Remove the now-unused `levelLabel` function**

Delete the `levelLabel` function — it's no longer used anywhere in the template.

- [ ] **Step 5: Verify it compiles**

Run: `cd /Users/cameronhakenson/Developer/quizard && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add src/routes/Study.svelte
git commit -m "feat: update styles and keyboard handling for sectioned study mode"
```

---

### Task 8: Manual testing and bug fixes

**Files:**
- Modify: `src/lib/sectionManager.ts` (if needed)
- Modify: `src/routes/Study.svelte` (if needed)

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/cameronhakenson/Developer/quizard && npm run tauri dev`

- [ ] **Step 2: Test with a small deck (≤ 10 cards)**

Create or use a deck with 5-8 cards. Verify:
- No section splitting occurs — single section behavior
- Cards cycle through with 3-correct mastery
- Wrong answers drop correctCount by 2 (min 0)
- Session completes when all cards mastered

- [ ] **Step 3: Test with a large deck (15+ cards)**

Create or use a deck with 15+ cards. Verify:
- Cards split into sections of ~8
- Section-complete screen appears between sections
- Struggle cards (wrongCount > 3) carry into next section
- New card count reduces to accommodate carry-over cards
- Final review round appears with all struggle cards
- Session complete shows accurate stats

- [ ] **Step 4: Test keyboard shortcuts**

Verify:
- Number keys work for MC answers
- Space/Enter advances through feedback
- Space/Enter advances through section-complete screen
- 1/2 keys work for written answer judging

- [ ] **Step 5: Fix any bugs found during testing**

- [ ] **Step 6: Commit fixes**

```bash
git add -u
git commit -m "fix: address bugs found during manual testing of sectioned study mode"
```

---

### Task 9: Update route CLAUDE.md

**Files:**
- Modify: `src/routes/CLAUDE.md`

- [ ] **Step 1: Update the Study.svelte description**

Replace the `Study.svelte` line with:

```
- `Study.svelte` — Quizlet-like Learn mode. Large decks (11+ cards) split into sections of ~8. Each card needs 3 correct answers to master within a section (MC at 0-1, Written at 2+). Wrong answers drop progress by 2 (min 0). Cards with 4+ wrong answers carry into the next section. Final review round covers all struggled cards. SM-2 rating submitted on mastery. Uses SectionManager from lib/sectionManager.ts.
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/CLAUDE.md
git commit -m "docs: update Study.svelte description for sectioned learning"
```
