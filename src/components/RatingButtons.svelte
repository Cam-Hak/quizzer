<script lang="ts">
  let { onrate }: { onrate: (rating: number) => void } = $props();
</script>

<div class="rating-buttons">
  <button class="rating again" onclick={() => onrate(1)}>
    <span class="rating-label">Again</span>
    <span class="rating-hint">Didn't know it</span>
  </button>
  <button class="rating hard" onclick={() => onrate(2)}>
    <span class="rating-label">Hard</span>
    <span class="rating-hint">Struggled</span>
  </button>
  <button class="rating good" onclick={() => onrate(3)}>
    <span class="rating-label">Good</span>
    <span class="rating-hint">Got it</span>
  </button>
  <button class="rating easy" onclick={() => onrate(4)}>
    <span class="rating-label">Easy</span>
    <span class="rating-hint">Instant</span>
  </button>
</div>

<style>
  .rating-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  .rating {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 20px;
    border-radius: var(--radius);
    min-width: 80px;
  }
  .rating-label {
    font-weight: 600;
    font-size: 14px;
  }
  .rating-hint {
    font-size: 11px;
    opacity: 0.7;
    margin-top: 2px;
  }
  .again { background: var(--danger); color: white; }
  .again:hover { background: #dc2626; }
  .hard { background: var(--warning); color: #1a1a2e; }
  .hard:hover { background: #f59e0b; }
  .good { background: var(--success); color: #1a1a2e; }
  .good:hover { background: #22c55e; }
  .easy { background: #3b82f6; color: white; }
  .easy:hover { background: #2563eb; }
</style>
