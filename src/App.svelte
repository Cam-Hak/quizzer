<script lang="ts">
  import { currentView, type View } from "$lib/stores/sessionStore";
  import { currentDeck } from "$lib/stores/deckStore";
  import Home from "./routes/Home.svelte";
  import DeckEditor from "./routes/DeckEditor.svelte";
  import Study from "./routes/Study.svelte";
  import Test from "./routes/Test.svelte";

  function navigate(view: View) {
    if (view === "home") {
      $currentDeck = null;
    }
    $currentView = view;
  }
</script>

<div class="app-layout">
  <nav class="sidebar">
    <h1>Quizard</h1>
    <button class:active={$currentView === "home"} onclick={() => navigate("home")}>
      Home
    </button>
    {#if $currentDeck}
      <button class:active={$currentView === "editor"} onclick={() => navigate("editor")}>
        Edit Deck
      </button>
      <button class:active={$currentView === "study"} onclick={() => navigate("study")}>
        Study
      </button>
      <button class:active={$currentView === "test"} onclick={() => navigate("test")}>
        Test
      </button>
    {/if}
  </nav>

  <main class="main-content">
    {#if $currentView === "home"}
      <Home />
    {:else if $currentView === "editor"}
      <DeckEditor />
    {:else if $currentView === "study"}
      <Study />
    {:else if $currentView === "test"}
      <Test />
    {/if}
  </main>
</div>
