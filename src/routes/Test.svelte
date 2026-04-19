<script lang="ts">
  import { currentDeck } from "$lib/stores/deckStore";
  import { api, type Question, type TestAnswer, type TestResult } from "$lib/tauri";

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

  function initCount() {
    questionCount = $currentDeck?.cards.length ?? 0;
  }

  $effect(() => {
    if ($currentDeck) initCount();
  });

  async function startTest() {
    if (!$currentDeck) return;
    questions = await api.generateTest(
      $currentDeck.id,
      questionCount > 0 ? questionCount : null,
      questionType
    );
    if (questions.length === 0) return;
    currentIndex = 0;
    answers = [];
    phase = "active";
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
    if (!currentQuestion) return;
    const isCorrect =
      writtenInput.trim().toLowerCase() ===
      currentQuestion.correct_answer.trim().toLowerCase();
    answers.push({
      card_id: currentQuestion.card_id,
      correct: isCorrect,
      given_answer: writtenInput.trim(),
    });
    writtenInput = "";
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
</script>

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
    </div>
  </div>
{:else if phase === "active" && currentQuestion}
  <div class="test-active">
    <div class="test-progress">
      Question {currentIndex + 1} of {questions.length}
    </div>
    <div class="question-card">
      <h3>{currentQuestion.prompt}</h3>

      {#if currentQuestion.question_type === "MultipleChoice" && currentQuestion.options}
        <div class="mc-options">
          {#each currentQuestion.options as option}
            <button class="mc-option" onclick={() => submitMcAnswer(option)}>
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
          <div class="review-question">{questions[i].prompt}</div>
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
  .setup-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 24px;
  }
  .setup-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .setup-form label span {
    font-size: 13px;
    color: var(--text-secondary);
  }
  select {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-primary);
    padding: 8px 12px;
    font-size: 14px;
  }
  .test-progress {
    color: var(--text-secondary);
    font-size: 14px;
    margin-bottom: 24px;
  }
  .question-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 32px;
    max-width: 600px;
  }
  .question-card h3 {
    margin-bottom: 24px;
    font-size: 18px;
  }
  .mc-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .mc-option {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 12px 16px;
    text-align: left;
    font-size: 14px;
    border: 1px solid var(--border);
  }
  .mc-option:hover {
    border-color: var(--accent);
    background: var(--bg-primary);
  }
  .written-form {
    display: flex;
    gap: 8px;
  }
  .score {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 32px 0;
  }
  .score-value {
    font-size: 48px;
    font-weight: 700;
    color: var(--accent);
  }
  .score-detail {
    color: var(--text-secondary);
    margin-top: 4px;
  }
  .review-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 16px 0 24px;
  }
  .review-item {
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }
  .review-item.incorrect {
    border-color: var(--danger);
  }
  .review-question {
    font-size: 14px;
    margin-bottom: 4px;
  }
  .correct-badge {
    color: var(--success);
    font-size: 13px;
  }
  .wrong-badge {
    color: var(--danger);
    font-size: 13px;
  }
  .correct-answer {
    color: var(--success);
    font-size: 13px;
    margin-left: 8px;
  }
  .empty {
    color: var(--text-muted);
  }
</style>
