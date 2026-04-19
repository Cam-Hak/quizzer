<script lang="ts">
  import type { Deck, DeckReviewState } from "$lib/tauri";
  import ProgressBar from "./ProgressBar.svelte";

  let {
    deck,
    reviewState,
    onselect,
    ondelete,
  }: {
    deck: Deck;
    reviewState?: DeckReviewState;
    onselect: () => void;
    ondelete: () => void;
  } = $props();

  let mastered = $derived(() => {
    if (!reviewState || deck.cards.length === 0) return 0;
    const learned = Object.values(reviewState.cards).filter(
      (c) => c.repetitions >= 3
    ).length;
    return learned;
  });
</script>

<div class="deck-card" onclick={onselect} onkeydown={(e) => e.key === "Enter" && onselect()} role="button" tabindex="0">
  <div class="deck-header">
    <h3>{deck.title}</h3>
    <button class="delete-btn" onclick={(e) => { e.stopPropagation(); ondelete(); }}>×</button>
  </div>
  {#if deck.description}
    <p class="deck-desc">{deck.description}</p>
  {/if}
  <p class="card-count">{deck.cards.length} card{deck.cards.length !== 1 ? "s" : ""}</p>
  <ProgressBar value={mastered()} max={deck.cards.length} />
</div>

<style>
  .deck-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .deck-card:hover {
    border-color: var(--accent);
  }
  .deck-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .deck-header h3 {
    font-size: 16px;
  }
  .delete-btn {
    background: transparent;
    color: var(--text-muted);
    font-size: 18px;
    padding: 2px 6px;
    line-height: 1;
  }
  .delete-btn:hover {
    color: var(--danger);
  }
  .deck-desc {
    color: var(--text-secondary);
    font-size: 13px;
    margin-bottom: 8px;
  }
  .card-count {
    color: var(--text-muted);
    font-size: 12px;
    margin-bottom: 12px;
  }
</style>
