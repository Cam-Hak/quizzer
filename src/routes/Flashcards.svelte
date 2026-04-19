<script lang="ts">
  import { currentDeck } from "$lib/stores/deckStore";
  import type { Card } from "$lib/tauri";
  import Flashcard from "../components/Flashcard.svelte";

  let cards = $state<Card[]>([]);
  let currentIndex = $state(0);
  let flipped = $state(false);
  let shuffled = $state(false);

  $effect(() => {
    if ($currentDeck) {
      resetCards($currentDeck.cards, shuffled);
    }
  });

  function resetCards(source: Card[], shuffle: boolean) {
    const copy = [...source];
    if (shuffle) {
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
    }
    cards = copy;
    currentIndex = 0;
    flipped = false;
  }

  function toggleShuffle() {
    shuffled = !shuffled;
  }

  function flip() {
    flipped = !flipped;
  }

  function next() {
    if (currentIndex < cards.length - 1) {
      currentIndex++;
      flipped = false;
    }
  }

  function prev() {
    if (currentIndex > 0) {
      currentIndex--;
      flipped = false;
    }
  }

  let currentCard = $derived(cards[currentIndex] ?? null);
</script>

{#if !$currentDeck}
  <p>No deck selected.</p>
{:else if cards.length === 0}
  <div class="empty-state">
    <h2>{$currentDeck.title}</h2>
    <p class="empty">No cards in this deck. Add some in the editor.</p>
  </div>
{:else if currentCard}
  <div class="flashcards-view">
    <div class="flashcards-header">
      <h2>{$currentDeck.title}</h2>
      <button
        class="shuffle-btn"
        class:active={shuffled}
        onclick={toggleShuffle}
      >
        Shuffle {shuffled ? "on" : "off"}
      </button>
    </div>

    <div class="progress">
      {currentIndex + 1} / {cards.length}
    </div>

    <div class="card-area" role="button" tabindex="0" onclick={flip} onkeydown={(e) => e.key === "Enter" && flip()}>
      <Flashcard
        front={currentCard.front}
        back={currentCard.back}
        {flipped}
      />
    </div>

    <div class="nav-buttons">
      <button class="secondary" onclick={prev} disabled={currentIndex === 0}>
        Previous
      </button>
      <button class="secondary" onclick={flip}>
        Flip
      </button>
      <button class="secondary" onclick={next} disabled={currentIndex === cards.length - 1}>
        Next
      </button>
    </div>
  </div>
{/if}

<style>
  .flashcards-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding-top: 24px;
  }
  .flashcards-header {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    max-width: 500px;
    justify-content: space-between;
  }
  .flashcards-header h2 {
    margin: 0;
    font-weight: 700;
    letter-spacing: -0.3px;
  }
  .shuffle-btn {
    font-size: 13px;
    padding: 6px 12px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    transition: all var(--transition-fast);
  }
  .shuffle-btn:hover {
    border-color: var(--accent);
    color: var(--text-primary);
  }
  .shuffle-btn.active {
    background: var(--gradient-accent);
    color: #09090b;
    border-color: transparent;
    box-shadow: var(--shadow-glow-accent);
  }
  .progress {
    color: var(--text-secondary);
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }
  .card-area {
    cursor: pointer;
    width: 100%;
    max-width: 500px;
    transition: transform var(--transition-fast);
  }
  .card-area:hover {
    transform: scale(1.01);
  }
  .nav-buttons {
    display: flex;
    gap: 12px;
  }
  .empty-state {
    text-align: center;
    padding-top: 64px;
  }
  .empty {
    color: var(--text-muted);
    margin-top: 16px;
  }
</style>
