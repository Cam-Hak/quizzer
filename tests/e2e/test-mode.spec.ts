import { test, expect, type Page } from "@playwright/test";

test.describe("Test Mode", () => {
  async function createDeckWithCards(page: Page) {
    await page.goto("/");
    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', "Quiz Deck");
    await page.click("text=Create");

    const cards = [
      ["What is 1+1?", "2"],
      ["What is 2+2?", "4"],
      ["What is 3+3?", "6"],
      ["What is 4+4?", "8"],
    ];

    for (const [front, back] of cards) {
      await page.fill('input[placeholder="Front (question)"]', front);
      await page.fill('input[placeholder="Back (answer)"]', back);
      await page.locator(".card-form button").click();
    }

    await expect(page.locator(".card-row")).toHaveCount(4);
  }

  test("complete a multiple choice test", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Test");

    await page.click("text=Start Test");

    // Answer every question by finding and clicking the correct option.
    // The mock generates options as shuffle([correctAnswer, "Wrong 1", "Wrong 2", "Wrong 3"]).
    // Each question prompt is "What is X+Y?" and the correct answer is the numeric sum.
    for (let i = 0; i < 4; i++) {
      await expect(page.locator(".question-card h3")).toBeVisible();
      const prompt = await page.locator(".question-card h3").textContent();
      const match = prompt?.match(/(\d)\+(\d)/);
      if (!match) throw new Error(`Could not parse MC question prompt: "${prompt}"`);
      const correctAnswer = String(Number(match[1]) + Number(match[2]));

      // Options render as: <span class="key-hint">N</span> optionText
      // textContent is "N optionText" — strip first token (key-hint) to get the option value
      const options = page.locator(".mc-option");
      const count = await options.count();
      let clicked = false;
      for (let j = 0; j < count; j++) {
        const text = await options.nth(j).textContent();
        const optionValue = text?.trim().replace(/^\d+\s+/, "") ?? "";
        if (optionValue === correctAnswer) {
          await options.nth(j).click();
          clicked = true;
          break;
        }
      }
      if (!clicked) throw new Error(`Correct MC option "${correctAnswer}" not found`);
    }

    await expect(page.locator("h2")).toHaveText("Test Complete");
    // All 4 answers correct → 100% score
    await expect(page.locator(".score-value")).toHaveText("100%");
  });

  test("complete a written answer test", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Test");

    await page.locator("select").selectOption("written");
    await page.click("text=Start Test");

    for (let i = 0; i < 4; i++) {
      await page.fill('input[placeholder="Type your answer..."]', "guess");
      await page.locator(".written-form button").click();
      // After submitting, a judgment screen appears — "guess" is not the correct answer
      await expect(page.locator(".judge-card")).toBeVisible();
      await page.click("text=I was wrong");
    }

    await expect(page.locator("h2")).toHaveText("Test Complete");
  });

  test("shows missed questions in review", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Test");

    await page.locator("select").selectOption("written");
    await page.click("text=Start Test");

    for (let i = 0; i < 4; i++) {
      await page.fill('input[placeholder="Type your answer..."]', "wrong");
      await page.locator(".written-form button").click();
      // Handle the judgment step — user judges their answer as wrong
      await expect(page.locator(".judge-card")).toBeVisible();
      await page.click("text=I was wrong");
    }

    await expect(page.locator(".review-item.incorrect")).toHaveCount(4);
  });
});
