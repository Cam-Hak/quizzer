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

  let mastered = $derived(
    (!reviewState || deck.cards.length === 0)
      ? 0
      : Object.values(reviewState.cards).filter((c) => c.repetitions >= 3).length
  );
</script>

<div class="deck-card" onclick={onselect} onkeydown={(e) => e.key === "Enter" && onselect()} role="button" tabindex="0" aria-label="Open {deck.title}">
  <div class="deck-header">
    <h3>{deck.title}</h3>
    <button class="delete-btn" aria-label="Delete {deck.title}" onclick={(e) => { e.stopPropagation(); ondelete(); }}>×</button>
  </div>
  {#if deck.description}
    <p class="deck-desc">{deck.description}</p>
  {/if}
  <p class="card-count">{deck.cards.length} card{deck.cards.length !== 1 ? "s" : ""}</p>
  <ProgressBar value={mastered} max={deck.cards.length} />
</div>

<style>
  .deck-card {
    background: var(--bg-secondary);
    background-image: var(--gradient-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
  }
  .deck-card:hover {
    border-color: var(--accent);
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg), var(--shadow-glow-accent);
  }
  .deck-card:active {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  .deck-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .deck-header h3 {
    font-size: 16px;
    font-weight: 600;
  }
  .delete-btn {
    background: transparent;
    color: var(--text-muted);
    font-size: 18px;
    padding: 2px 6px;
    line-height: 1;
    border-radius: var(--radius-sm);
    opacity: 0;
    transition: all var(--transition-fast);
  }
  .deck-card:hover .delete-btn {
    opacity: 1;
  }
  .delete-btn:hover {
    color: var(--danger);
    background: rgba(239,68,68,0.1);
  }
  .deck-desc {
    color: var(--text-secondary);
    font-size: 13px;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  .card-count {
    color: var(--text-muted);
    font-size: 12px;
    margin-bottom: 12px;
  }
</style>
