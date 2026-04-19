import { test, expect } from "@playwright/test";

test.describe("Deck Management", () => {
  test("create a new deck", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h2")).toHaveText("My Decks");

    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', "Test Deck");
    await page.fill('input[placeholder="Description (optional)"]', "A test");
    await page.click("text=Create");

    await expect(page.locator("h2")).toHaveText("Test Deck");
  });

  test("add and delete a card", async ({ page }) => {
    await page.goto("/");
    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', "Card Test");
    await page.click("text=Create");

    await page.fill('input[placeholder="Front (question)"]', "Q1");
    await page.fill('input[placeholder="Back (answer)"]', "A1");
    await page.locator(".card-form button").click();

    await expect(page.locator(".card-row")).toHaveCount(1);
    await expect(page.locator(".card-front")).toHaveText("Q1");

    await page.locator(".card-actions button.danger").click();
    await expect(page.locator(".card-row")).toHaveCount(0);
  });

  test("edit a card", async ({ page }) => {
    await page.goto("/");
    await page.click("text=+ New Deck");
    await page.fill('input[placeholder="Deck title"]', "Edit Test");
    await page.click("text=Create");

    await page.fill('input[placeholder="Front (question)"]', "Original Q");
    await page.fill('input[placeholder="Back (answer)"]', "Original A");
    await page.locator(".card-form button").click();

    await page.locator(".card-actions button.secondary").click();
    const inputs = page.locator(".card-row input");
    await inputs.first().fill("Updated Q");
    await inputs.last().fill("Updated A");
    await page.locator(".card-actions button.primary").click();

    await expect(page.locator(".card-front")).toHaveText("Updated Q");
    await expect(page.locator(".card-back")).toHaveText("Updated A");
  });
});
