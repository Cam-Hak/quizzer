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
    background: rgba(39,39,42,0.5);
    border-radius: var(--radius-full);
    height: 8px;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.03);
  }
  .progress-fill {
    background: var(--gradient-accent);
    height: 100%;
    border-radius: var(--radius-full);
    transition: width var(--transition-slow);
    position: relative;
  }
  .progress-fill::after {
    content: '';
    position: absolute;
    right: 0;
    top: -2px;
    bottom: -2px;
    width: 8px;
    background: rgba(245,158,11,0.6);
    border-radius: 50%;
    filter: blur(4px);
  }
  .progress-label {
    position: absolute;
    right: 0;
    top: 14px;
    font-size: 11px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
</style>
