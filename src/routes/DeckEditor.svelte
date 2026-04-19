<script lang="ts">
  import { currentDeck } from "$lib/stores/deckStore";
  import { api } from "$lib/tauri";

  let editingId = $state<string | null>(null);
  let editFront = $state("");
  let editBack = $state("");
  let newFront = $state("");
  let newBack = $state("");

  async function addCard() {
    if (!newFront.trim() || !newBack.trim() || !$currentDeck) return;
    await api.addCard($currentDeck.id, newFront.trim(), newBack.trim());
    $currentDeck = await api.getDeck($currentDeck.id);
    newFront = "";
    newBack = "";
  }

  async function deleteCard(cardId: string) {
    if (!$currentDeck) return;
    await api.removeCard($currentDeck.id, cardId);
    $currentDeck = await api.getDeck($currentDeck.id);
  }

  function startEdit(cardId: string, front: string, back: string) {
    editingId = cardId;
    editFront = front;
    editBack = back;
  }

  async function saveEdit() {
    if (!$currentDeck || !editingId) return;
    await api.updateCard($currentDeck.id, editingId, editFront.trim(), editBack.trim());
    $currentDeck = await api.getDeck($currentDeck.id);
    editingId = null;
  }

  function cancelEdit() {
    editingId = null;
  }
</script>

{#if $currentDeck}
  <div class="editor">
    <h2>{$currentDeck.title}</h2>
    {#if $currentDeck.description}
      <p class="desc">{$currentDeck.description}</p>
    {/if}

    <div class="add-card">
      <h3>Add Card</h3>
      <div class="card-form">
        <input bind:value={newFront} placeholder="Front (question)" />
        <input bind:value={newBack} placeholder="Back (answer)" />
        <button class="primary" onclick={addCard}>Add</button>
      </div>
    </div>

    <div class="card-list">
      <h3>Cards ({$currentDeck.cards.length})</h3>
      {#each $currentDeck.cards as card (card.id)}
        <div class="card-row">
          {#if editingId === card.id}
            <input bind:value={editFront} />
            <input bind:value={editBack} />
            <div class="card-actions">
              <button class="primary" onclick={saveEdit}>Save</button>
              <button class="secondary" onclick={cancelEdit}>Cancel</button>
            </div>
          {:else}
            <div class="card-front">{card.front}</div>
            <div class="card-back">{card.back}</div>
            <div class="card-actions">
              <button class="secondary" onclick={() => startEdit(card.id, card.front, card.back)}>Edit</button>
              <button class="danger" onclick={() => deleteCard(card.id)}>Delete</button>
            </div>
          {/if}
        </div>
      {/each}
      {#if $currentDeck.cards.length === 0}
        <p class="empty">No cards yet. Add some above.</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .editor h2 {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.3px;
    margin-bottom: 4px;
  }
  .desc {
    color: var(--text-secondary);
    margin-bottom: 24px;
  }
  .add-card {
    margin-bottom: 32px;
    padding: 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
  }
  .add-card h3 {
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
  .card-form {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .card-list h3 {
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
  .card-row {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 8px;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }
  .card-row:hover {
    border-color: rgba(255,255,255,0.08);
    box-shadow: var(--shadow-sm);
  }
  .card-front, .card-back {
    flex: 1;
    font-size: 14px;
  }
  .card-front {
    color: var(--text-primary);
    font-weight: 500;
  }
  .card-back {
    color: var(--text-secondary);
  }
  .card-row input {
    flex: 1;
  }
  .card-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity var(--transition-fast);
  }
  .card-row:hover .card-actions {
    opacity: 1;
  }
  .empty {
    color: var(--text-muted);
    text-align: center;
    padding: 24px 16px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: rgba(24,24,27,0.5);
  }
</style>
