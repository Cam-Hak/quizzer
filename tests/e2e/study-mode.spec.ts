import { test, expect, type Page } from "@playwright/test";

test.describe("Study Mode", () => {
  async function createDeckWithCards(page: Page) {
    await page.goto("/");
    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', "Study Deck");
    await page.click("text=Create");

    await page.fill('input[placeholder="Front (question)"]', "Q1");
    await page.fill('input[placeholder="Back (answer)"]', "A1");
    await page.locator(".card-form button").click();

    await page.fill('input[placeholder="Front (question)"]', "Q2");
    await page.fill('input[placeholder="Back (answer)"]', "A2");
    await page.locator(".card-form button").click();

    await expect(page.locator(".card-row")).toHaveCount(2);
  }

  test("study session shows cards and accepts ratings", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Study");

    await expect(page.locator(".flashcard-front p")).toBeVisible();
    await page.click("text=Show Answer");
    await expect(page.locator(".rating-buttons")).toBeVisible();

    await page.locator(".rating-buttons button", { hasText: "Good" }).click();
    await expect(page.locator(".study-progress")).toContainText("2 /");
  });

  test("session completes when all cards reviewed", async ({ page }) => {
    await createDeckWithCards(page);
    await page.click("text=Study");

    for (let i = 0; i < 2; i++) {
      await page.click("text=Show Answer");
      await page.locator(".rating-buttons button", { hasText: "Good" }).click();
    }

    await expect(page.locator("h2")).toHaveText("Session Complete");
    await expect(page.locator(".stat-value").first()).toBeVisible();
  });
});
