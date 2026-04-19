<script lang="ts">
  import { onMount } from "svelte";
  import { currentDeck } from "$lib/stores/deckStore";
  import { api, type Card } from "$lib/tauri";
  import Flashcard from "../components/Flashcard.svelte";
  import RatingButtons from "../components/RatingButtons.svelte";

  let queue = $state<Card[]>([]);
  let currentIndex = $state(0);
  let flipped = $state(false);
  let sessionComplete = $state(false);
  let reviewed = $state(0);
  let correct = $state(0);
  let againQueue = $state<Card[]>([]);

  let currentCard = $derived(queue[currentIndex] ?? null);

  onMount(async () => {
    if (!$currentDeck) return;
    const dueIds = await api.getDueCards($currentDeck.id);
    queue = $currentDeck.cards.filter((c) => dueIds.includes(c.id));
    if (queue.length === 0) sessionComplete = true;
  });

  async function handleRate(rating: number) {
    if (!$currentDeck || !currentCard) return;

    await api.submitRating($currentDeck.id, currentCard.id, rating);
    reviewed++;

    if (rating >= 2) {
      correct++;
    } else {
      againQueue.push(currentCard);
    }

    flipped = false;

    if (currentIndex < queue.length - 1) {
      currentIndex++;
    } else if (againQueue.length > 0) {
      queue = [...againQueue];
      againQueue = [];
      currentIndex = 0;
    } else {
      sessionComplete = true;
    }
  }
</script>

{#if !$currentDeck}
  <p>No deck selected.</p>
{:else if sessionComplete}
  <div class="session-summary">
    <h2>Session Complete</h2>
    {#if reviewed > 0}
      <div class="stats">
        <div class="stat">
          <span class="stat-value">{reviewed}</span>
          <span class="stat-label">Reviewed</span>
        </div>
        <div class="stat">
          <span class="stat-value">{Math.round((correct / reviewed) * 100)}%</span>
          <span class="stat-label">Accuracy</span>
        </div>
      </div>
    {:else}
      <p class="empty">No cards due for review. Come back later!</p>
    {/if}
  </div>
{:else if currentCard}
  <div class="study-view">
    <div class="study-progress">
      <span>{currentIndex + 1} / {queue.length}</span>
      {#if againQueue.length > 0}
        <span class="again-count">{againQueue.length} to repeat</span>
      {/if}
    </div>

    <Flashcard
      front={currentCard.front}
      back={currentCard.back}
      {flipped}
    />

    <div class="study-actions">
      {#if !flipped}
        <button class="primary" onclick={() => (flipped = true)}>Show Answer</button>
      {:else}
        <RatingButtons onrate={handleRate} />
      {/if}
    </div>
  </div>
{/if}

<style>
  .study-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding-top: 32px;
  }
  .study-progress {
    display: flex;
    gap: 16px;
    color: var(--text-secondary);
    font-size: 14px;
  }
  .again-count {
    color: var(--warning);
  }
  .study-actions {
    margin-top: 16px;
  }
  .session-summary {
    text-align: center;
    padding-top: 64px;
  }
  .stats {
    display: flex;
    gap: 48px;
    justify-content: center;
    margin-top: 32px;
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .stat-value {
    font-size: 36px;
    font-weight: 700;
    color: var(--accent);
  }
  .stat-label {
    color: var(--text-secondary);
    font-size: 14px;
    margin-top: 4px;
  }
  .empty {
    color: var(--text-muted);
    margin-top: 16px;
  }
</style>
