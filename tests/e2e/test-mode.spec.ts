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

    for (let i = 0; i < 4; i++) {
      await expect(page.locator(".question-card h3")).toBeVisible();
      await page.locator(".mc-option").first().click();
    }

    await expect(page.locator("h2")).toHaveText("Test Complete");
    await expect(page.locator(".score-value")).toBeVisible();
  });

  test("complete a written answer test", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Test");

    await page.locator("select").selectOption("written");
    await page.click("text=Start Test");

    for (let i = 0; i < 4; i++) {
      await page.fill('input[placeholder="Type your answer..."]', "guess");
      await page.locator(".written-form button").click();
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
    }

    await expect(page.locator(".review-item.incorrect")).toHaveCount(4);
  });
});
