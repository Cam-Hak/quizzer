import { test, expect, type Page } from "@playwright/test";

test.describe("Study Mode", () => {
  async function createDeckWithCards(page: Page, name: string, cards: [string, string][]) {
    await page.goto("/");
    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', name);
    await page.click("text=Create");

    for (const [front, back] of cards) {
      await page.fill('input[placeholder="Front (question)"]', front);
      await page.fill('input[placeholder="Back (answer)"]', back);
      await page.locator(".card-form button").click();
    }

    await expect(page.locator(".card-row")).toHaveCount(cards.length);
  }

  const fourCards: [string, string][] = [
    ["What is 1+1?", "2"],
    ["What is 2+2?", "4"],
    ["What is 3+3?", "6"],
    ["What is 4+4?", "8"],
  ];

  async function answerCurrentQuestion(page: Page) {
    const hasWritten = await page.locator('input[placeholder="Type your answer..."]').isVisible();
    if (hasWritten) {
      const prompt = await page.locator(".question-card h3").textContent();
      const match = prompt?.match(/(\d)\+(\d)/);
      if (!match) throw new Error(`Could not parse question prompt for written answer: "${prompt}"`);
      const answer = String(Number(match[1]) + Number(match[2]));
      await page.fill('input[placeholder="Type your answer..."]', answer);
      await page.locator(".written-form button").click();
      // After submitting a written answer, a judging screen appears — dismiss it
      await expect(page.locator(".judge-card")).toBeVisible();
      await page.click("text=I was right");
    } else {
      // Find and click the correct MC option
      const prompt = await page.locator(".question-card h3").textContent();
      const match = prompt?.match(/(\d)\+(\d)/);
      if (!match) throw new Error(`Could not parse question prompt for MC answer: "${prompt}"`);
      const correctAnswer = String(Number(match[1]) + Number(match[2]));
      const options = page.locator(".mc-option");
      const count = await options.count();
      let clicked = false;
      for (let i = 0; i < count; i++) {
        const text = await options.nth(i).textContent();
        // textContent is "N optionText" — strip key-hint prefix to get option value
        const optionValue = text?.trim().replace(/^\d+\s+/, "") ?? "";
        if (optionValue === correctAnswer) {
          await options.nth(i).click();
          clicked = true;
          break;
        }
      }
      if (!clicked) throw new Error(`Correct MC option "${correctAnswer}" not found among options`);
    }
    await expect(page.locator(".feedback-text")).toBeVisible();
    await page.click("text=Continue");
  }

  test("study session starts with multiple choice questions", async ({ page }) => {
    await createDeckWithCards(page, "MC Deck", fourCards);
    await page.click("text=Study");

    await expect(page.locator(".question-card h3")).toBeVisible();
    await expect(page.locator(".mc-option")).toHaveCount(4);
    await expect(page.locator(".progress-text")).toContainText("0 of 4 mastered");
  });

  test("correct MC answer shows feedback and continues", async ({ page }) => {
    await createDeckWithCards(page, "Feedback Deck", fourCards);
    await page.click("text=Study");

    await expect(page.locator(".mc-option")).toHaveCount(4);

    // Find and click the correct answer (buttons have key-hint prefix)
    const prompt = await page.locator(".question-card h3").textContent();
    const match = prompt?.match(/(\d)\+(\d)/);
    const correctAnswer = match ? String(Number(match[1]) + Number(match[2])) : "";
    const options = page.locator(".mc-option");
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text?.trim().replace(/^\d+\s+/, "") === correctAnswer) {
        await options.nth(i).click();
        break;
      }
    }

    await expect(page.locator(".feedback-text")).toContainText("Correct");
    await page.click("text=Continue");
    await expect(page.locator(".question-card h3")).toBeVisible();
  });

  test("wrong MC answer shows incorrect feedback and highlights options", async ({ page }) => {
    await createDeckWithCards(page, "Wrong MC Deck", fourCards);
    await page.click("text=Study");

    await expect(page.locator(".mc-option")).toHaveCount(4);

    // Click a wrong answer (one of the "Wrong N" distractors)
    await page.locator('.mc-option:has-text("Wrong")').first().click();

    await expect(page.locator(".feedback-text")).toContainText("Incorrect");
    await expect(page.locator(".correct-answer")).toBeVisible();
    await expect(page.locator(".option-selected-wrong")).toBeVisible();
    await expect(page.locator(".option-correct")).toBeVisible();
    await page.click("text=Continue");
    await expect(page.locator(".question-card h3")).toBeVisible();
  });

  test("session completes when all cards are learned", async ({ page }) => {
    await createDeckWithCards(page, "Complete Deck", fourCards);
    await page.click("text=Study");

    // Each card needs 3 correct answers to reach level 3. With 4 cards and possible
    // wrong-answer resets, allow up to 60 iterations to guarantee completion.
    for (let i = 0; i < 60; i++) {
      const isComplete = await page.locator("h2:has-text('Session Complete')").isVisible();
      if (isComplete) break;

      // A section-complete screen may appear between sections — advance past it
      const isSectionComplete = await page.locator("h2:has-text('Section')").isVisible();
      if (isSectionComplete) {
        await page.locator("button.primary").click();
        continue;
      }

      await answerCurrentQuestion(page);
    }

    await expect(page.locator("h2")).toHaveText("Session Complete");
    // Learned stat = 4 (all cards in the deck). The value is derived from manager.allCards.size
    // and must be reactive against the tick counter introduced in Study.svelte.
    await expect(page.locator(".stat-value").first()).toHaveText("4");
  });

  test("session-complete mastered and answer counts reflect actual progress", async ({ page }) => {
    await createDeckWithCards(page, "Stats Deck", [
      ["Capital of France?", "Paris"],
      ["Capital of Japan?", "Tokyo"],
    ]);
    await page.click("text=Study");

    // 2 cards × 3 correct written answers each = 6 total answers
    for (let i = 0; i < 20; i++) {
      const isComplete = await page.locator("h2:has-text('Session Complete')").isVisible();
      if (isComplete) break;

      const isSectionComplete = await page.locator("h2:has-text('Section')").isVisible();
      if (isSectionComplete) {
        await page.locator("button.primary").click();
        continue;
      }

      const prompt = await page.locator(".question-card h3").textContent();
      const answer = prompt?.includes("France") ? "Paris" : "Tokyo";
      await page.fill('input[placeholder="Type your answer..."]', answer);
      await page.locator(".written-form button").click();
      await expect(page.locator(".judge-card")).toBeVisible();
      await page.click("text=I was right");
      await expect(page.locator(".feedback")).toBeVisible();
      await page.click("text=Continue");
    }

    await expect(page.locator("h2")).toHaveText("Session Complete");
    // Learned = totalCards (2, constant). Answers = totalAnswered: 2 cards × 3 correct = 6.
    // Accuracy = 100% since all answers in the loop are marked correct via "I was right".
    // Both Learned and Answers flow through tick-gated $derived — stale zeros here would
    // indicate the reactivity fix has regressed.
    await expect(page.locator(".stat-value").nth(0)).toHaveText("2");
    await expect(page.locator(".stat-value").nth(1)).toHaveText("6");
    await expect(page.locator(".stat-value").nth(2)).toHaveText("100%");
  });

  test("small deck uses written questions only", async ({ page }) => {
    await createDeckWithCards(page, "Small Deck", [
      ["Capital of France?", "Paris"],
      ["Capital of Japan?", "Tokyo"],
    ]);
    await page.click("text=Study");

    await expect(page.locator(".question-card h3")).toBeVisible();
    await expect(page.locator('input[placeholder="Type your answer..."]')).toBeVisible();
    await expect(page.locator(".mc-option")).toHaveCount(0);
  });

  test("card chips and level steps show progress", async ({ page }) => {
    await createDeckWithCards(page, "Progress Deck", fourCards);
    await page.click("text=Study");

    await expect(page.locator(".card-chip")).toHaveCount(4);
    await expect(page.locator(".level-step")).toHaveCount(3);
    await expect(page.locator(".level-steps-label")).toHaveText("0/3");

    // Answer first question correctly (buttons have key-hint prefix)
    const prompt = await page.locator(".question-card h3").textContent();
    const match = prompt?.match(/(\d)\+(\d)/);
    const correctAnswer = match ? String(Number(match[1]) + Number(match[2])) : "";
    const options = page.locator(".mc-option");
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text?.trim().replace(/^\d+\s+/, "") === correctAnswer) {
        await options.nth(i).click();
        break;
      }
    }

    // During feedback, the current card still displays — its correctCount must update reactively
    await expect(page.locator(".feedback-text")).toBeVisible();
    await expect(page.locator(".level-steps-label")).toHaveText("1/3");
    await expect(page.locator(".level-step.step-done")).toHaveCount(1);
    await page.click("text=Continue");
  });

  test("card chip becomes chip-learned after mastery mid-section", async ({ page }) => {
    await createDeckWithCards(page, "Chip Deck", [
      ["Capital of France?", "Paris"],
      ["Capital of Japan?", "Tokyo"],
    ]);
    await page.click("text=Study");

    await expect(page.locator(".card-chip")).toHaveCount(2);
    await expect(page.locator(".card-chip.chip-learned")).toHaveCount(0);
    await expect(page.locator(".progress-text")).toContainText("0 of 2 mastered");

    // Coupled to SectionManager.nextCard's round-robin cycling (active[cardIndex % len]):
    // with 2 active cards and 5 sequential correct answers, the sequence is A,B,A,B,A,
    // so card A hits correctCount=3 and masters on answer 5. If nextCard ever randomizes,
    // this test must be rewritten.
    for (let i = 0; i < 5; i++) {
      const prompt = await page.locator(".question-card h3").textContent();
      const answer = prompt?.includes("France") ? "Paris" : "Tokyo";
      await page.fill('input[placeholder="Type your answer..."]', answer);
      await page.locator(".written-form button").click();
      await expect(page.locator(".judge-card")).toBeVisible();
      await page.click("text=I was right");
      await expect(page.locator(".feedback-text")).toBeVisible();
      await page.click("text=Continue");
    }

    await expect(page.locator(".card-chip.chip-learned")).toHaveCount(1);
    // sectionMastered derived (Map-backed) must also update alongside the chip
    await expect(page.locator(".progress-text")).toContainText("1 of 2 mastered");
  });

  test("level-steps label resets after a wrong answer", async ({ page }) => {
    await createDeckWithCards(page, "Reset Deck", [
      ["Capital of France?", "Paris"],
      ["Capital of Japan?", "Tokyo"],
    ]);
    await page.click("text=Study");

    // Coupled to SectionManager.nextCard's round-robin (active[cardIndex % len]):
    // with 2 active cards the order is A, B, A, B. We bring B to correctCount=1
    // first so the subsequent wrong answer exercises reset-from-non-zero, not a
    // trivial 0→0 no-op. If nextCard ever randomizes, this test must be rewritten.

    // Q1: card A correct → A=1/3
    const prompt1 = await page.locator(".question-card h3").textContent();
    const answer1 = prompt1?.includes("France") ? "Paris" : "Tokyo";
    await page.fill('input[placeholder="Type your answer..."]', answer1);
    await page.locator(".written-form button").click();
    await expect(page.locator(".judge-card")).toBeVisible();
    await page.click("text=I was right");
    await expect(page.locator(".level-steps-label")).toHaveText("1/3");
    await page.click("text=Continue");

    // Q2: card B correct → B=1/3
    const prompt2 = await page.locator(".question-card h3").textContent();
    const answer2 = prompt2?.includes("France") ? "Paris" : "Tokyo";
    await page.fill('input[placeholder="Type your answer..."]', answer2);
    await page.locator(".written-form button").click();
    await expect(page.locator(".judge-card")).toBeVisible();
    await page.click("text=I was right");
    await expect(page.locator(".level-steps-label")).toHaveText("1/3");
    await page.click("text=Continue");

    // Q3: card A correct → A=2/3 (advances cardIndex so Q4 lands on B)
    const prompt3 = await page.locator(".question-card h3").textContent();
    const answer3 = prompt3?.includes("France") ? "Paris" : "Tokyo";
    await page.fill('input[placeholder="Type your answer..."]', answer3);
    await page.locator(".written-form button").click();
    await expect(page.locator(".judge-card")).toBeVisible();
    await page.click("text=I was right");
    await page.click("text=Continue");

    // Q4: card B wrong → B resets from 1 to 0
    const prompt4 = await page.locator(".question-card h3").textContent();
    const wrongAnswer = prompt4?.includes("France") ? "Tokyo" : "Paris";
    await page.fill('input[placeholder="Type your answer..."]', wrongAnswer);
    await page.locator(".written-form button").click();
    await expect(page.locator(".judge-card")).toBeVisible();
    await page.click("text=I was wrong");
    await expect(page.locator(".feedback-text")).toContainText("Incorrect");
    // B's correctCount was 1 before — reset must propagate reactively to 0/3
    await expect(page.locator(".level-steps-label")).toHaveText("0/3");
    await expect(page.locator(".level-step.step-done")).toHaveCount(0);
  });

  test("learned celebration shows when card reaches level 3", async ({ page }) => {
    await createDeckWithCards(page, "Celebrate Deck", [
      ["Capital of France?", "Paris"],
      ["Capital of Japan?", "Tokyo"],
    ]);
    await page.click("text=Study");

    // Answer same card 3 times correctly to reach level 3
    // Written-only since <4 cards — each submit is followed by a judging step
    let celebrationSeen = false;
    for (let i = 0; i < 10; i++) {
      const isComplete = await page.locator("h2:has-text('Session Complete')").isVisible();
      if (isComplete) break;

      const prompt = await page.locator(".question-card h3").textContent();
      const answer = prompt?.includes("France") ? "Paris" : "Tokyo";
      await page.fill('input[placeholder="Type your answer..."]', answer);
      await page.locator(".written-form button").click();

      // Handle the judging step that always appears after a written submission
      await expect(page.locator(".judge-card")).toBeVisible();
      await page.click("text=I was right");

      const isLearned = await page.locator(".learned-celebration").isVisible();
      if (isLearned) {
        celebrationSeen = true;
        await expect(page.locator(".learned-text")).toHaveText("Mastered!");
        await expect(page.locator(".learned-check")).toBeVisible();
        await page.click("text=Continue");
        break;
      }

      await expect(page.locator(".feedback-text")).toBeVisible();
      await page.click("text=Continue");
    }

    expect(celebrationSeen).toBe(true);
  });

  test("study again button restarts the session", async ({ page }) => {
    await createDeckWithCards(page, "Again Deck", [
      ["Capital of France?", "Paris"],
      ["Capital of Japan?", "Tokyo"],
    ]);
    await page.click("text=Study");

    // Complete session (2 cards x 3 correct written answers each)
    for (let i = 0; i < 20; i++) {
      const isComplete = await page.locator("h2:has-text('Session Complete')").isVisible();
      if (isComplete) break;

      // A section-complete screen may appear — advance past it
      const isSectionComplete = await page.locator("h2:has-text('Section')").isVisible();
      if (isSectionComplete) {
        await page.locator("button.primary").click();
        continue;
      }

      const prompt = await page.locator(".question-card h3").textContent();
      const answer = prompt?.includes("France") ? "Paris" : "Tokyo";
      await page.fill('input[placeholder="Type your answer..."]', answer);
      await page.locator(".written-form button").click();

      // Handle the judging step
      await expect(page.locator(".judge-card")).toBeVisible();
      await page.click("text=I was right");

      await expect(page.locator(".feedback-text")).toBeVisible();
      await page.click("text=Continue");
    }

    await expect(page.locator("h2")).toHaveText("Session Complete");
    await page.click("text=Study Again");
    await expect(page.locator(".question-card h3")).toBeVisible();
  });

  test("study again resets session stats for the second run", async ({ page }) => {
    await createDeckWithCards(page, "Restart Stats Deck", [
      ["Capital of France?", "Paris"],
      ["Capital of Japan?", "Tokyo"],
    ]);
    await page.click("text=Study");

    // First session: 2 cards × 3 correct = 6 answers, 100% accuracy
    for (let i = 0; i < 20; i++) {
      const isComplete = await page.locator("h2:has-text('Session Complete')").isVisible();
      if (isComplete) break;

      const isSectionComplete = await page.locator("h2:has-text('Section')").isVisible();
      if (isSectionComplete) {
        await page.locator("button.primary").click();
        continue;
      }

      const prompt = await page.locator(".question-card h3").textContent();
      const answer = prompt?.includes("France") ? "Paris" : "Tokyo";
      await page.fill('input[placeholder="Type your answer..."]', answer);
      await page.locator(".written-form button").click();
      await expect(page.locator(".judge-card")).toBeVisible();
      await page.click("text=I was right");
      await expect(page.locator(".feedback")).toBeVisible();
      await page.click("text=Continue");
    }

    await expect(page.locator("h2")).toHaveText("Session Complete");
    await expect(page.locator(".stat-value").nth(1)).toHaveText("6");

    await page.click("text=Study Again");
    await expect(page.locator(".question-card h3")).toBeVisible();

    // Second session: answer first question wrong, then complete correctly.
    // Round-robin order A,B,A,B gives: wrong A, correct B,A,B,A,B,A = 7 answers.
    const firstPrompt = await page.locator(".question-card h3").textContent();
    const firstWrong = firstPrompt?.includes("France") ? "Tokyo" : "Paris";
    await page.fill('input[placeholder="Type your answer..."]', firstWrong);
    await page.locator(".written-form button").click();
    await expect(page.locator(".judge-card")).toBeVisible();
    await page.click("text=I was wrong");
    await expect(page.locator(".feedback-text")).toContainText("Incorrect");
    await page.click("text=Continue");

    for (let i = 0; i < 20; i++) {
      const isComplete = await page.locator("h2:has-text('Session Complete')").isVisible();
      if (isComplete) break;

      const isSectionComplete = await page.locator("h2:has-text('Section')").isVisible();
      if (isSectionComplete) {
        await page.locator("button.primary").click();
        continue;
      }

      const prompt = await page.locator(".question-card h3").textContent();
      const answer = prompt?.includes("France") ? "Paris" : "Tokyo";
      await page.fill('input[placeholder="Type your answer..."]', answer);
      await page.locator(".written-form button").click();
      await expect(page.locator(".judge-card")).toBeVisible();
      await page.click("text=I was right");
      await expect(page.locator(".feedback")).toBeVisible();
      await page.click("text=Continue");
    }

    await expect(page.locator("h2")).toHaveText("Session Complete");
    // Stats must reflect ONLY the second session (not stale values from the first,
    // not an accumulated sum). If studyAgain drops the tick++ bump, the tick-gated
    // deriveds would keep rendering the previous manager's snapshot.
    // Session 2 alone: 1 wrong + 6 correct = 7 answers, 6/7 ≈ 86% accuracy.
    await expect(page.locator(".stat-value").nth(0)).toHaveText("2");
    await expect(page.locator(".stat-value").nth(1)).toHaveText("7");
    await expect(page.locator(".stat-value").nth(2)).toHaveText("86%");
  });
});
