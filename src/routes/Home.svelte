<script lang="ts">
  import { onMount } from "svelte";
  import { api, type DeckReviewState } from "$lib/tauri";
  import { decks, currentDeck } from "$lib/stores/deckStore";
  import { currentView } from "$lib/stores/sessionStore";
  import DeckCard from "../components/DeckCard.svelte";

  let isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  let reviewStates = $state<Record<string, DeckReviewState>>({});
  let showCreate = $state(false);
  let newTitle = $state("");
  let newDescription = $state("");
  let errorMsg = $state("");

  onMount(async () => {
    await loadDecks();
  });

  async function loadDecks() {
    try {
      $decks = await api.listDecks();
      const states = await Promise.all(
        $decks.map(async (deck) => [deck.id, await api.getReviewState(deck.id)] as const)
      );
      reviewStates = Object.fromEntries(states);
      errorMsg = "";
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    try {
      const deck = await api.createDeck(newTitle.trim(), newDescription.trim());
      newTitle = "";
      newDescription = "";
      showCreate = false;
      $currentDeck = deck;
      $currentView = "editor";
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }
  }

  function selectDeck(deck: typeof $decks[0]) {
    $currentDeck = deck;
    $currentView = "editor";
  }

  async function deleteDeck(deckId: string) {
    if (!confirm("Delete this deck? This cannot be undone.")) return;
    try {
      await api.deleteDeck(deckId);
      await loadDecks();
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleImport() {
    if (!isTauri) return;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const filePath = await open({
        filters: [{ name: "CSV", extensions: ["csv", "tsv", "txt"] }],
      });
      if (!filePath) return;
      const fileName = (filePath as string).split(/[/\\]/).pop() ?? "Imported Deck";
      const title = fileName.replace(/\.(csv|tsv|txt)$/i, "");
      const deck = await api.importDeckCsv(filePath as string, title);
      await loadDecks();
      $currentDeck = deck;
      $currentView = "editor";
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<div class="home">
  <div class="home-header">
    <h2>My Decks</h2>
    <div class="header-actions">
      {#if isTauri}
        <button class="secondary" onclick={handleImport}>Import CSV</button>
      {/if}
      <button class="primary" onclick={() => (showCreate = !showCreate)}>
        {showCreate ? "Cancel" : "+ New Deck"}
      </button>
    </div>
  </div>

  {#if showCreate}
    <div class="create-form">
      <label class="inline-label">
        <span class="sr-only">Deck title</span>
        <input bind:value={newTitle} placeholder="Deck title" />
      </label>
      <label class="inline-label">
        <span class="sr-only">Description</span>
        <input bind:value={newDescription} placeholder="Description (optional)" />
      </label>
      <button class="primary" onclick={handleCreate}>Create</button>
    </div>
  {/if}

  {#if errorMsg}
    <p class="error-msg" role="alert">{errorMsg}</p>
  {/if}

  {#if $decks.length === 0 && !errorMsg}
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
  .header-actions {
    display: flex;
    gap: 8px;
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
  .error-msg {
    color: var(--danger);
    text-align: center;
    padding: 16px;
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
