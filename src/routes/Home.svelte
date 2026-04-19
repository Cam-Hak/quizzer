<script lang="ts">
  import { onMount } from "svelte";
  import { api, type DeckReviewState } from "$lib/tauri";
  import { decks, currentDeck } from "$lib/stores/deckStore";
  import { currentView } from "$lib/stores/sessionStore";
  import DeckCard from "../components/DeckCard.svelte";

  let reviewStates = $state<Record<string, DeckReviewState>>({});
  let showCreate = $state(false);
  let newTitle = $state("");
  let newDescription = $state("");

  onMount(async () => {
    await loadDecks();
  });

  async function loadDecks() {
    $decks = await api.listDecks();
    for (const deck of $decks) {
      reviewStates[deck.id] = await api.getReviewState(deck.id);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const deck = await api.createDeck(newTitle.trim(), newDescription.trim());
    newTitle = "";
    newDescription = "";
    showCreate = false;
    $currentDeck = deck;
    $currentView = "editor";
  }

  function selectDeck(deck: typeof $decks[0]) {
    $currentDeck = deck;
    $currentView = "editor";
  }

  async function deleteDeck(deckId: string) {
    await api.deleteDeck(deckId);
    await loadDecks();
  }
</script>

<div class="home">
  <div class="home-header">
    <h2>My Decks</h2>
    <button class="primary" onclick={() => (showCreate = !showCreate)}>
      {showCreate ? "Cancel" : "+ New Deck"}
    </button>
  </div>

  {#if showCreate}
    <div class="create-form">
      <input bind:value={newTitle} placeholder="Deck title" />
      <input bind:value={newDescription} placeholder="Description (optional)" />
      <button class="primary" onclick={handleCreate}>Create</button>
    </div>
  {/if}

  {#if $decks.length === 0}
    <p class="empty">No decks yet. Create one to get started.</p>
  {:else}
    <div class="deck-grid">
      {#each $decks as deck (deck.id)}
        <DeckCard
          {deck}
          reviewState={reviewStates[deck.id]}
          onselect={() => selectDeck(deck)}
          ondelete={() => deleteDeck(deck.id)}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .home-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }
  .home-header h2 {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.3px;
  }
  .create-form {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    align-items: center;
    padding: 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }
  .create-form input {
    max-width: 300px;
  }
  .empty {
    color: var(--text-muted);
    margin-top: 40px;
    text-align: center;
    font-size: 15px;
    padding: 48px 16px;
    border: 1px dashed var(--border);
    border-radius: var(--radius-lg);
    background: rgba(24,24,27,0.5);
  }
  .deck-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
</style>
