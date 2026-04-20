<script lang="ts">
  import { onMount } from "svelte";
  import { currentDeck } from "$lib/stores/deckStore";
  import { api, type Question } from "$lib/tauri";
  import { renderMarkdown } from "$lib/markdown";
  import { getMatchingWords, highlightMatches } from "$lib/wordMatch";
  import ProgressBar from "../components/ProgressBar.svelte";
  import { SectionManager, type CardSectionProgress } from "$lib/sectionManager";

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

  let sectionIndex = $derived(manager ? manager.currentSectionIndex + 1 : 0);
  let totalSections = $derived(manager?.totalSections ?? 0);
  let sectionMastered = $derived(
    manager ? [...manager.sectionProgress.values()].filter((p) => p.mastered).length : 0
  );
  let sectionTotal = $derived(manager?.sectionCardCount ?? 0);
  let totalCards = $derived(manager?.allCards.size ?? 0);
  let totalAnswered = $derived(manager?.totalAnswered ?? 0);
  let totalCorrect = $derived(manager?.totalCorrect ?? 0);

  let sectionCardList = $derived(
    manager
      ? [...manager.sectionProgress.values()].map((p) => ({
          id: p.cardId,
          front: manager!.getCard(p.cardId)?.front ?? "",
          correctCount: p.correctCount,
          mastered: p.mastered,
        }))
      : []
  );

  let errorMsg = $state("");

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

  function pickNextCard() {
    if (!manager) return;

    const next = manager.nextCard();
    if (!next) {
      phase = "complete";
      return;
    }

    currentCardId = next.cardId;

    if (useWrittenOnly || next.correctCount >= 2) {
      currentQuestionType = "Written";
      const card = manager.getCard(next.cardId)!;
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

  async function handleMcAnswer(selected: string) {
    if (feedbackState) return;
    const correct = selected === currentCorrectAnswer;
    await recordAnswer(correct, selected);
  }

  async function handleWrittenAnswer() {
    if (feedbackState || judgingState || !writtenInput.trim()) return;
    judgingState = {
      userAnswer: writtenInput.trim(),
      correctAnswer: currentCorrectAnswer,
    };
    writtenInput = "";
  }

  async function handleJudgment(correct: boolean) {
    judgingState = null;
    await recordAnswer(correct, null);
  }

  async function recordAnswer(correct: boolean, selectedOption: string | null) {
    if (!currentCardId || !manager) return;

    let justMastered = false;
    let newCorrectCount = 0;

    if (manager.phase === "final-review") {
      manager.recordFinalReviewAnswer(currentCardId, correct);
      justMastered = false;
      newCorrectCount = correct ? 1 : 0;
    } else {
      const result = manager.recordAnswer(currentCardId, correct);
      const progress = manager.sectionProgress.get(currentCardId)!;
      justMastered = result.mastered;
      newCorrectCount = progress.correctCount;
    }

    feedbackState = {
      correct,
      correctAnswer: currentCorrectAnswer,
      newCorrectCount,
      justMastered,
      selectedOption,
    };

    if (justMastered && $currentDeck) {
      const wrongCount = manager.globalWrongCounts.get(currentCardId) ?? 0;
      const rating = wrongCountToRating(wrongCount);
      await api.submitRating($currentDeck.id, currentCardId, rating);
    }
  }

  function wrongCountToRating(wrongCount: number): number {
    if (wrongCount === 0) return 4;
    if (wrongCount === 1) return 3;
    if (wrongCount === 2) return 2;
    return 1;
  }

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

  function advanceToNextSection() {
    if (!manager) return;

    manager.advanceSection();

    if (manager.phase === "complete") {
      phase = "complete";
    } else if (manager.phase === "final-review") {
      phase = "final-review";
      pickNextCard();
    } else {
      phase = "active";
      pickNextCard();
    }
  }

  function studyAgain() {
    if (!$currentDeck) return;
    manager = new SectionManager($currentDeck.cards);
    pickNextCard();
    phase = "active";
  }

  function handleKey(e: KeyboardEvent) {
    const tag = (document.activeElement?.tagName ?? "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

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

  function levelLabel(level: number): string {
    if (level === 0) return "New";
    if (level === 1) return "Seen";
    if (level === 2) return "Almost";
    return "Learned";
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if !$currentDeck || $currentDeck.cards.length === 0}
  <div class="empty-state">
    <h2>{$currentDeck?.title ?? "No Deck"}</h2>
    <p class="empty">No cards in this deck. Add some in the editor.</p>
  </div>
{:else if phase === "error"}
  <div class="error-state" role="alert">
    <h2>Something went wrong</h2>
    <p>{errorMsg}</p>
  </div>
{:else if phase === "loading"}
  <div class="loading" role="status" aria-live="polite">
    <p>Loading study session...</p>
  </div>
{:else if phase === "active" && currentCardId}
  <div class="study-view">
    <div class="study-header">
      <div class="progress-section">
        <span class="progress-text">{learnedCount} of {totalCards} learned</span>
        <ProgressBar value={learnedCount} max={totalCards} />
      </div>
      <div class="card-chips">
        {#each cardList as card}
          <div
            class="card-chip"
            class:chip-active={card.id === currentCardId}
            class:chip-0={card.level === 0}
            class:chip-1={card.level === 1}
            class:chip-2={card.level === 2}
            class:chip-learned={card.level >= 3}
            title="{card.front} — {levelLabel(card.level)}"
          ></div>
        {/each}
      </div>
    </div>

    <div class="question-card">
      <div class="question-meta">
        <span class="level-badge level-{cardProgress.get(currentCardId)?.level ?? 0}">
          {levelLabel(cardProgress.get(currentCardId)?.level ?? 0)}
        </span>
        <span class="question-type-label">
          {currentQuestionType === "MultipleChoice" ? "Multiple Choice" : "Written Answer"}
        </span>
      </div>

      <div class="level-steps">
        {#each [0, 1, 2] as step}
          <div
            class="level-step"
            class:step-done={step < (cardProgress.get(currentCardId)?.level ?? 0)}
            class:step-current={step === (cardProgress.get(currentCardId)?.level ?? 0) && (cardProgress.get(currentCardId)?.level ?? 0) < 3}
          ></div>
        {/each}
        <span class="level-steps-label">
          {Math.min(cardProgress.get(currentCardId)?.level ?? 0, 3)}/3
        </span>
      </div>

      <h3>{@html renderMarkdown(currentPrompt)}</h3>

      {#if judgingState}
        <div class="judge-card">
          <h4>Compare your answer</h4>
          <div class="judge-answers">
            <div class="judge-answer">
              <span class="judge-label">Your answer</span>
              <p>{@html highlightMatches(judgingState.userAnswer.split(/\s+/), getMatchingWords(judgingState.userAnswer, judgingState.correctAnswer).matching)}</p>
            </div>
            <div class="judge-answer">
              <span class="judge-label">Correct answer</span>
              <p>{judgingState.correctAnswer}</p>
            </div>
          </div>
          <div class="judge-buttons">
            <button class="primary" onclick={() => handleJudgment(true)}><span class="key-hint">1</span> I was right</button>
            <button class="secondary" onclick={() => handleJudgment(false)}><span class="key-hint">2</span> I was wrong</button>
          </div>
        </div>
      {:else if !feedbackState}
        {#if currentQuestionType === "MultipleChoice"}
          <div class="mc-options">
            {#each currentOptions as option, i}
              <button class="mc-option" onclick={() => handleMcAnswer(option)}>
                <span class="key-hint">{i + 1}</span>
                {option}
              </button>
            {/each}
          </div>
        {:else}
          <div class="written-form">
            <input
              bind:value={writtenInput}
              placeholder="Type your answer..."
              onkeydown={(e) => e.key === "Enter" && handleWrittenAnswer()}
            />
            <button class="primary" onclick={handleWrittenAnswer}>Submit</button>
          </div>
        {/if}
      {:else}
        <div class="feedback" class:correct={feedbackState.correct} class:incorrect={!feedbackState.correct} class:just-learned={feedbackState.justLearned} role="status" aria-live="polite">
          {#if feedbackState.justLearned}
            <div class="learned-celebration">
              <span class="learned-check">&#10003;</span>
              <p class="feedback-text learned-text">Learned!</p>
            </div>
            <p class="learned-subtitle">You've mastered this term</p>
          {:else if feedbackState.correct}
            <p class="feedback-text">Correct!</p>
            <p class="level-up-msg">
              Level {feedbackState.newLevel}/3 — {#if feedbackState.newLevel === 1}Keep going!{:else if feedbackState.newLevel === 2}One more to master!{:else}Nice!{/if}
            </p>
          {:else}
            <p class="feedback-text">Incorrect</p>
            <p class="correct-answer">Correct answer: {@html renderMarkdown(feedbackState.correctAnswer)}</p>
            <p class="reset-msg">Reset to start — you'll see this one again</p>
          {/if}

          {#if currentQuestionType === "MultipleChoice" && !feedbackState.justLearned}
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
{:else if phase === "complete"}
  <div class="session-summary">
    <h2>Session Complete</h2>
    <p class="complete-subtitle">You've learned all {totalCards} terms</p>
    <div class="stats">
      <div class="stat">
        <span class="stat-value">{totalCards}</span>
        <span class="stat-label">Learned</span>
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

<style>
  .study-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding-top: 24px;
    max-width: 600px;
  }
  .study-header {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .progress-text {
    font-size: 14px;
    color: var(--text-secondary);
  }

  /* Card chips */
  .card-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .card-chip {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transition: background var(--transition-slow), transform var(--transition-slow), box-shadow var(--transition-slow);
  }
  .chip-active {
    transform: scale(1.4);
  }
  .chip-0 {
    background: var(--level-0-bg);
    border: 1px solid var(--border);
  }
  .chip-1 {
    background: var(--chip-1);
  }
  .chip-2 {
    background: var(--chip-2);
  }
  .chip-learned {
    background: var(--success);
    box-shadow: var(--shadow-glow-success);
  }

  /* Question card — width override (base styles are global) */
  .question-card {
    width: 100%;
  }
  .question-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .level-badge {
    font-size: 12px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .level-0 {
    background: var(--level-0-bg);
    color: var(--level-0-text);
  }
  .level-1 {
    background: var(--level-1-bg);
    color: var(--level-1-text);
  }
  .level-2 {
    background: var(--level-2-bg);
    color: var(--level-2-text);
  }
  .question-type-label {
    font-size: 12px;
    color: var(--text-muted);
  }

  /* Level steps */
  .level-steps {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 20px;
  }
  .level-step {
    width: 24px;
    height: 6px;
    border-radius: 3px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    transition: background var(--transition-slow), border-color var(--transition-slow), box-shadow var(--transition-slow);
  }
  .level-step.step-done {
    background: var(--success);
    border-color: var(--success);
    box-shadow: 0 0 6px rgba(52, 211, 153, 0.3);
  }
  .level-step.step-current {
    background: var(--bg-tertiary);
    border-color: var(--accent);
  }
  .level-steps-label {
    font-size: 11px;
    color: var(--text-muted);
    margin-left: 4px;
    font-variant-numeric: tabular-nums;
  }

  /* Feedback */
  .feedback {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .feedback.correct {
    border-left: 3px solid var(--success);
    padding-left: 16px;
  }
  .feedback.incorrect {
    border-left: 3px solid var(--danger);
    padding-left: 16px;
    animation: shake 0.4s ease-out;
  }
  .feedback-text {
    font-size: 16px;
    font-weight: 600;
  }
  .feedback.correct .feedback-text {
    color: var(--success);
  }
  .feedback.incorrect .feedback-text {
    color: var(--danger);
  }
  .level-up-msg {
    font-size: 13px;
    color: var(--text-secondary);
  }
  .correct-answer {
    color: var(--text-secondary);
    font-size: 14px;
  }
  .reset-msg {
    font-size: 12px;
    color: var(--text-muted);
    font-style: italic;
  }
  .continue-btn {
    margin-top: 8px;
    align-self: flex-start;
  }

  /* Learned celebration */
  .learned-celebration {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .learned-check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--gradient-success);
    color: #000;
    font-size: 20px;
    font-weight: 700;
    flex-shrink: 0;
    animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: var(--shadow-glow-success);
  }
  .learned-text {
    font-size: 20px !important;
    color: var(--success) !important;
  }
  .learned-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
  }
  .just-learned {
    border-left: 3px solid var(--success);
    padding-left: 16px;
  }

  @keyframes pop-in {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); opacity: 1; }
  }

  /* Session summary */
  .session-summary {
    text-align: center;
    padding-top: 64px;
  }
  .complete-subtitle {
    color: var(--text-secondary);
    margin-top: 8px;
    font-size: 15px;
  }
  .stats {
    display: flex;
    gap: 32px;
    justify-content: center;
    margin-top: 32px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    min-width: 100px;
    box-shadow: var(--shadow-sm);
  }
  .stat-value {
    font-size: 36px;
    font-weight: 700;
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .stat-label {
    color: var(--text-secondary);
    font-size: 14px;
    margin-top: 4px;
  }
  .study-again-btn {
    margin-top: 32px;
  }
  .empty-state {
    text-align: center;
    padding-top: 64px;
  }
  .empty {
    color: var(--text-muted);
    margin-top: 16px;
  }
  .loading {
    text-align: center;
    padding-top: 64px;
    color: var(--text-secondary);
  }
  .error-state {
    text-align: center;
    padding-top: 64px;
    color: var(--danger);
  }
  .error-state p {
    color: var(--text-secondary);
    margin-top: 8px;
  }

  /* Judging UI */
  .judge-card h4 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .judge-answers {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .judge-answer {
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: var(--radius);
  }
  .judge-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
  }
  .judge-answer p {
    font-size: 14px;
    line-height: 1.5;
  }
  .judge-buttons {
    display: flex;
    gap: 12px;
    margin-top: 16px;
  }
</style>
