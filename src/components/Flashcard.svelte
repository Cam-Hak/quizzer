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
    </div>
    <div class="flashcard-face flashcard-back">
      <p>{back}</p>
    </div>
  </div>
</div>

<style>
  .flashcard {
    perspective: 1000px;
    width: 100%;
    max-width: 500px;
    height: 300px;
    margin: 0 auto;
  }
  .flashcard-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
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
    border-radius: var(--radius-xl);
    border: 1px solid var(--bg-glass-border);
    box-shadow: var(--shadow-lg);
  }
  .flashcard-front {
    background: var(--bg-secondary);
    background-image: var(--gradient-surface);
  }
  .flashcard-back {
    background: var(--bg-tertiary);
    background-image: var(--gradient-surface);
    transform: rotateY(180deg);
  }
  .flashcard-face p {
    font-size: 20px;
    text-align: center;
    line-height: 1.5;
  }
</style>
