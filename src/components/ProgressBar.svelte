<script lang="ts">
  let { value = 0, max = 100 }: { value?: number; max?: number } = $props();
  let percentage = $derived(max > 0 ? Math.round((value / max) * 100) : 0);
</script>

<div class="progress-bar">
  <div class="progress-fill" style="width: {percentage}%"></div>
  <span class="progress-label">{percentage}%</span>
</div>

<style>
  .progress-bar {
    background: var(--bg-tertiary);
    border-radius: 4px;
    height: 8px;
    position: relative;
    overflow: hidden;
  }
  .progress-fill {
    background: var(--accent);
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s;
  }
  .progress-label {
    position: absolute;
    right: 0;
    top: 12px;
    font-size: 11px;
    color: var(--text-muted);
  }
</style>
