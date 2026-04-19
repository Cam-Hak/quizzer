<script lang="ts">
  import { currentDeck } from "$lib/stores/deckStore";
  import { api, type Question, type TestAnswer, type TestResult } from "$lib/tauri";
  import { renderMarkdown } from "$lib/markdown";
  import { getMatchingWords, highlightMatches } from "$lib/wordMatch";

  type Phase = "setup" | "active" | "results";

  let phase = $state<Phase>("setup");
  let questions = $state<Question[]>([]);
  let currentIndex = $state(0);
  let answers = $state<TestAnswer[]>([]);
  let writtenInput = $state("");
  let questionCount = $state(0);
  let questionType = $state("multiple_choice");
  let result = $state<TestResult | null>(null);

  let currentQuestion = $derived(questions[currentIndex] ?? null);
  let judgingState = $state<{ userAnswer: string; correctAnswer: string } | null>(null);

  function initCount() {
    questionCount = $currentDeck?.cards.length ?? 0;
  }

  $effect(() => {
    if ($currentDeck) initCount();
  });

  let errorMsg = $state("");

  async function startTest() {
    if (!$currentDeck) return;
    try {
      questions = await api.generateTest(
        $currentDeck.id,
        questionCount > 0 ? questionCount : null,
        questionType
      );
      if (questions.length === 0) return;
      currentIndex = 0;
      answers = [];
      phase = "active";
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }
  }

  function submitMcAnswer(selected: string) {
    if (!currentQuestion) return;
    answers.push({
      card_id: currentQuestion.card_id,
      correct: selected === currentQuestion.correct_answer,
      given_answer: selected,
    });
    advance();
  }

  function submitWrittenAnswer() {
    if (!currentQuestion || judgingState) return;
    judgingState = {
      userAnswer: writtenInput.trim(),
      correctAnswer: currentQuestion.correct_answer,
    };
    writtenInput = "";
  }

  function handleTestJudgment(correct: boolean) {
    if (!currentQuestion) return;
    answers.push({
      card_id: currentQuestion.card_id,
      correct,
      given_answer: judgingState!.userAnswer,
    });
    judgingState = null;
    advance();
  }

  async function advance() {
    if (currentIndex < questions.length - 1) {
      currentIndex++;
    } else {
      await finishTest();
    }
  }

  async function finishTest() {
    if (!$currentDeck) return;
    const score = answers.filter((a) => a.correct).length;
    const testResult: TestResult = {
      id: crypto.randomUUID(),
      deck_id: $currentDeck.id,
      score,
      total: answers.length,
      answers,
      completed_at: new Date().toISOString(),
    };
    await api.saveTestResult(testResult);
    result = testResult;
    phase = "results";
  }

  function retake() {
    phase = "setup";
    result = null;
  }

  function handleKey(e: KeyboardEvent) {
    if (phase !== "active" || !currentQuestion) return;
    const tag = (document.activeElement?.tagName ?? "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    if (judgingState) {
      if (e.key === "1") handleTestJudgment(true);
      else if (e.key === "2") handleTestJudgment(false);
      return;
    }

    if (currentQuestion.question_type === "MultipleChoice" && currentQuestion.options) {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < currentQuestion.options.length) {
        submitMcAnswer(currentQuestion.options[idx]);
      }
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if !$currentDeck}
  <p>No deck selected.</p>
{:else if phase === "setup"}
  <div class="test-setup">
    <h2>Test: {$currentDeck.title}</h2>
    <div class="setup-form">
      <label>
        <span>Number of questions</span>
        <input type="number" bind:value={questionCount} min="1" max={$currentDeck.cards.length} />
      </label>
      <label>
        <span>Question type</span>
        <select bind:value={questionType}>
          <option value="multiple_choice">Multiple Choice</option>
          <option value="written">Written Answer</option>
        </select>
      </label>
      <button class="primary" onclick={startTest} disabled={$currentDeck.cards.length === 0}>
        Start Test
      </button>
      {#if $currentDeck.cards.length === 0}
        <p class="empty">Add cards to this deck first.</p>
      {/if}
      {#if errorMsg}
        <p class="error-msg" role="alert">{errorMsg}</p>
      {/if}
    </div>
  </div>
{:else if phase === "active" && currentQuestion}
  <div class="test-active">
    <div class="test-progress">
      Question {currentIndex + 1} of {questions.length}
    </div>
    <div class="question-card">
      <h3>{@html renderMarkdown(currentQuestion.prompt)}</h3>

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
            <button class="primary" onclick={() => handleTestJudgment(true)}><span class="key-hint">1</span> I was right</button>
            <button class="secondary" onclick={() => handleTestJudgment(false)}><span class="key-hint">2</span> I was wrong</button>
          </div>
        </div>
      {:else if currentQuestion.question_type === "MultipleChoice" && currentQuestion.options}
        <div class="mc-options">
          {#each currentQuestion.options as option, i}
            <button class="mc-option" onclick={() => submitMcAnswer(option)}>
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
            onkeydown={(e) => e.key === "Enter" && submitWrittenAnswer()}
          />
          <button class="primary" onclick={submitWrittenAnswer}>Submit</button>
        </div>
      {/if}
    </div>
  </div>
{:else if phase === "results" && result}
  <div class="test-results">
    <h2>Test Complete</h2>
    <div class="score">
      <span class="score-value">{Math.round((result.score / result.total) * 100)}%</span>
      <span class="score-detail">{result.score} / {result.total} correct</span>
    </div>

    <h3>Review</h3>
    <div class="review-list">
      {#each result.answers as answer, i}
        <div class="review-item" class:incorrect={!answer.correct}>
          <div class="review-question">{@html renderMarkdown(questions[i].prompt)}</div>
          <div class="review-answer">
            {#if answer.correct}
              <span class="correct-badge">✓ {answer.given_answer}</span>
            {:else}
              <span class="wrong-badge">✗ {answer.given_answer}</span>
              <span class="correct-answer">→ {questions[i].correct_answer}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <button class="primary" onclick={retake}>Retake Test</button>
  </div>
{/if}

<style>
  .test-setup, .test-results {
    max-width: 600px;
  }
  .test-setup h2, .test-results h2 {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.3px;
  }
  .setup-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 24px;
    padding: 24px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }
  .setup-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .setup-form label span {
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  .test-progress {
    color: var(--text-secondary);
    font-size: 14px;
    margin-bottom: 24px;
    font-variant-numeric: tabular-nums;
  }
  /* question-card max-width override (base styles are global) */
  .question-card {
    max-width: 600px;
  }
  .score {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 32px 0;
    padding: 32px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
  }
  .score-value {
    font-size: 56px;
    font-weight: 800;
    line-height: 1;
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .score-detail {
    color: var(--text-secondary);
    margin-top: 8px;
    font-size: 15px;
  }
  .review-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 16px 0 24px;
  }
  .review-item {
    padding: 12px 16px;
    background: var(--bg-secondary);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    transition: border-color var(--transition-fast);
  }
  .review-item.incorrect {
    border-color: rgba(239,68,68,0.4);
    background: rgba(239,68,68,0.03);
  }
  .review-question {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
  }
  .correct-badge {
    color: var(--success);
    font-size: 13px;
    font-weight: 500;
  }
  .wrong-badge {
    color: var(--danger);
    font-size: 13px;
    font-weight: 500;
  }
  .correct-answer {
    color: var(--success);
    font-size: 13px;
    margin-left: 8px;
  }
  .empty {
    color: var(--text-muted);
  }
  .error-msg {
    color: var(--danger);
    font-size: 13px;
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
