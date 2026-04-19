<script lang="ts">
  let { front, back, flipped = false }: { front: string; back: string; flipped?: boolean } = $props();
</script>

<div
  class="flashcard"
  class:flipped
>
  <div class="flashcard-inner">
    <div class="flashcard-face flashcard-front">
      <p>{front}</p>
      <span class="flip-hint">Click to flip</span>
    </div>
    <div class="flashcard-face flashcard-back">
      <p>{back}</p>
    </div>
  </div>
</div>

<style>
  .flashcard {
    perspective: 1000px;
    cursor: pointer;
    width: 100%;
    max-width: 500px;
    height: 300px;
    margin: 0 auto;
  }
  .flashcard-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.5s;
    transform-style: preserve-3d;
  }
  .flipped .flashcard-inner {
    transform: rotateY(180deg);
  }
  .flashcard-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
  }
  .flashcard-front {
    background: var(--bg-secondary);
  }
  .flashcard-back {
    background: var(--bg-tertiary);
    transform: rotateY(180deg);
  }
  .flashcard-face p {
    font-size: 20px;
    text-align: center;
  }
  .flip-hint {
    position: absolute;
    bottom: 16px;
    color: var(--text-muted);
    font-size: 12px;
  }
</style>
