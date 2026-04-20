# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: study-mode.spec.ts >> Study Mode >> study session starts with multiple choice questions
- Location: tests/e2e/study-mode.spec.ts:56:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.progress-text')
Expected substring: "0 of 4 learned"
Received string:    "Section 1 of 1 — 0 of 4 mastered"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('.progress-text')
    9 × locator resolved to <span class="progress-text s-J2ZULa0zlQOS">Section 1 of 1 — 0 of 4 mastered</span>
      - unexpected value "Section 1 of 1 — 0 of 4 mastered"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - heading "Quizard" [level=1] [ref=e5]
    - button "Home" [ref=e7] [cursor=pointer]
    - button "Edit Deck" [ref=e8] [cursor=pointer]
    - button "Flashcards" [ref=e9] [cursor=pointer]
    - button "Study" [active] [ref=e10] [cursor=pointer]
    - button "Test" [ref=e11] [cursor=pointer]
  - main [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Section 1 of 1 — 0 of 4 mastered
          - progressbar "Progress" [ref=e17]:
            - generic [ref=e18]: 0%
        - generic [ref=e19]:
          - generic "What is 1+1?" [ref=e20]
          - generic "What is 2+2?" [ref=e21]
          - generic "What is 3+3?" [ref=e22]
          - generic "What is 4+4?" [ref=e23]
      - generic [ref=e24]:
        - generic [ref=e25]:
          - generic [ref=e26]: 0/3
          - generic [ref=e27]: Multiple Choice
        - generic [ref=e32]: 0/3
        - heading "What is 1+1?" [level=3] [ref=e33]:
          - paragraph [ref=e34]: What is 1+1?
        - generic [ref=e35]:
          - button "1 2" [ref=e36] [cursor=pointer]:
            - generic [ref=e37]: "1"
            - text: "2"
          - button "2 Wrong 1" [ref=e38] [cursor=pointer]:
            - generic [ref=e39]: "2"
            - text: Wrong 1
          - button "3 Wrong 2" [ref=e40] [cursor=pointer]:
            - generic [ref=e41]: "3"
            - text: Wrong 2
          - button "4 Wrong 3" [ref=e42] [cursor=pointer]:
            - generic [ref=e43]: "4"
            - text: Wrong 3
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | 
  3   | test.describe("Study Mode", () => {
  4   |   async function createDeckWithCards(page: Page, name: string, cards: [string, string][]) {
  5   |     await page.goto("/");
  6   |     await page.click("text=+ New Deck");
  7   |     await page.fill('input[placeholder="Deck title"]', name);
  8   |     await page.click("text=Create");
  9   | 
  10  |     for (const [front, back] of cards) {
  11  |       await page.fill('input[placeholder="Front (question)"]', front);
  12  |       await page.fill('input[placeholder="Back (answer)"]', back);
  13  |       await page.locator(".card-form button").click();
  14  |     }
  15  | 
  16  |     await expect(page.locator(".card-row")).toHaveCount(cards.length);
  17  |   }
  18  | 
  19  |   const fourCards: [string, string][] = [
  20  |     ["What is 1+1?", "2"],
  21  |     ["What is 2+2?", "4"],
  22  |     ["What is 3+3?", "6"],
  23  |     ["What is 4+4?", "8"],
  24  |   ];
  25  | 
  26  |   async function answerCurrentQuestion(page: Page) {
  27  |     const hasWritten = await page.locator('input[placeholder="Type your answer..."]').isVisible();
  28  |     if (hasWritten) {
  29  |       const prompt = await page.locator(".question-card h3").textContent();
  30  |       const match = prompt?.match(/(\d)\+(\d)/);
  31  |       const answer = match ? String(Number(match[1]) + Number(match[2])) : "guess";
  32  |       await page.fill('input[placeholder="Type your answer..."]', answer);
  33  |       await page.locator(".written-form button").click();
  34  |     } else {
  35  |       // Find and click the correct MC option
  36  |       const prompt = await page.locator(".question-card h3").textContent();
  37  |       const match = prompt?.match(/(\d)\+(\d)/);
  38  |       const correctAnswer = match ? String(Number(match[1]) + Number(match[2])) : "";
  39  |       const options = page.locator(".mc-option");
  40  |       const count = await options.count();
  41  |       let clicked = false;
  42  |       for (let i = 0; i < count; i++) {
  43  |         const text = await options.nth(i).textContent();
  44  |         if (text?.trim() === correctAnswer) {
  45  |           await options.nth(i).click();
  46  |           clicked = true;
  47  |           break;
  48  |         }
  49  |       }
  50  |       if (!clicked) await options.first().click();
  51  |     }
  52  |     await expect(page.locator(".feedback-text")).toBeVisible();
  53  |     await page.click("text=Continue");
  54  |   }
  55  | 
  56  |   test("study session starts with multiple choice questions", async ({ page }) => {
  57  |     await createDeckWithCards(page, "MC Deck", fourCards);
  58  |     await page.click("text=Study");
  59  | 
  60  |     await expect(page.locator(".question-card h3")).toBeVisible();
  61  |     await expect(page.locator(".mc-option")).toHaveCount(4);
> 62  |     await expect(page.locator(".progress-text")).toContainText("0 of 4 learned");
      |                                                  ^ Error: expect(locator).toContainText(expected) failed
  63  |   });
  64  | 
  65  |   test("correct MC answer shows feedback and continues", async ({ page }) => {
  66  |     await createDeckWithCards(page, "Feedback Deck", fourCards);
  67  |     await page.click("text=Study");
  68  | 
  69  |     await expect(page.locator(".mc-option")).toHaveCount(4);
  70  | 
  71  |     // Find and click the correct answer
  72  |     const prompt = await page.locator(".question-card h3").textContent();
  73  |     const match = prompt?.match(/(\d)\+(\d)/);
  74  |     const correctAnswer = match ? String(Number(match[1]) + Number(match[2])) : "";
  75  |     await page.locator(".mc-option").filter({ hasText: new RegExp(`^${correctAnswer}$`) }).click();
  76  | 
  77  |     await expect(page.locator(".feedback-text")).toContainText("Correct");
  78  |     await page.click("text=Continue");
  79  |     await expect(page.locator(".question-card h3")).toBeVisible();
  80  |   });
  81  | 
  82  |   test("wrong MC answer shows incorrect feedback and highlights options", async ({ page }) => {
  83  |     await createDeckWithCards(page, "Wrong MC Deck", fourCards);
  84  |     await page.click("text=Study");
  85  | 
  86  |     await expect(page.locator(".mc-option")).toHaveCount(4);
  87  | 
  88  |     // Click a wrong answer (one of the "Wrong N" distractors)
  89  |     await page.locator('.mc-option:has-text("Wrong")').first().click();
  90  | 
  91  |     await expect(page.locator(".feedback-text")).toContainText("Incorrect");
  92  |     await expect(page.locator(".correct-answer")).toBeVisible();
  93  |     await expect(page.locator(".option-selected-wrong")).toBeVisible();
  94  |     await expect(page.locator(".option-correct")).toBeVisible();
  95  |     await page.click("text=Continue");
  96  |     await expect(page.locator(".question-card h3")).toBeVisible();
  97  |   });
  98  | 
  99  |   test("session completes when all cards are learned", async ({ page }) => {
  100 |     await createDeckWithCards(page, "Complete Deck", fourCards);
  101 |     await page.click("text=Study");
  102 | 
  103 |     // Each card needs 3 correct answers to reach level 3
  104 |     // 4 cards x 3 answers = 12 answers minimum, but interleaving adds more
  105 |     for (let i = 0; i < 30; i++) {
  106 |       const isComplete = await page.locator("h2:has-text('Session Complete')").isVisible();
  107 |       if (isComplete) break;
  108 |       await answerCurrentQuestion(page);
  109 |     }
  110 | 
  111 |     await expect(page.locator("h2")).toHaveText("Session Complete");
  112 |     await expect(page.locator(".stat-value").first()).toBeVisible();
  113 |   });
  114 | 
  115 |   test("small deck uses written questions only", async ({ page }) => {
  116 |     await createDeckWithCards(page, "Small Deck", [
  117 |       ["Capital of France?", "Paris"],
  118 |       ["Capital of Japan?", "Tokyo"],
  119 |     ]);
  120 |     await page.click("text=Study");
  121 | 
  122 |     await expect(page.locator(".question-card h3")).toBeVisible();
  123 |     await expect(page.locator('input[placeholder="Type your answer..."]')).toBeVisible();
  124 |     await expect(page.locator(".mc-option")).toHaveCount(0);
  125 |   });
  126 | 
  127 |   test("card chips and level steps show progress", async ({ page }) => {
  128 |     await createDeckWithCards(page, "Progress Deck", fourCards);
  129 |     await page.click("text=Study");
  130 | 
  131 |     await expect(page.locator(".card-chip")).toHaveCount(4);
  132 |     await expect(page.locator(".level-step")).toHaveCount(3);
  133 |     await expect(page.locator(".level-steps-label")).toHaveText("0/3");
  134 | 
  135 |     // Answer first question correctly by finding the right option
  136 |     const prompt = await page.locator(".question-card h3").textContent();
  137 |     const match = prompt?.match(/(\d)\+(\d)/);
  138 |     const correctAnswer = match ? String(Number(match[1]) + Number(match[2])) : "";
  139 |     await page.locator(".mc-option").filter({ hasText: new RegExp(`^${correctAnswer}$`) }).click();
  140 |     await expect(page.locator(".feedback-text")).toBeVisible();
  141 |     await page.click("text=Continue");
  142 | 
  143 |     // After one correct, level steps label should reflect progress on current card
  144 |     await expect(page.locator(".level-steps-label")).toBeVisible();
  145 |   });
  146 | 
  147 |   test("learned celebration shows when card reaches level 3", async ({ page }) => {
  148 |     await createDeckWithCards(page, "Celebrate Deck", [
  149 |       ["Capital of France?", "Paris"],
  150 |       ["Capital of Japan?", "Tokyo"],
  151 |     ]);
  152 |     await page.click("text=Study");
  153 | 
  154 |     // Answer same card 3 times correctly to reach level 3
  155 |     // Written-only since <4 cards
  156 |     for (let i = 0; i < 6; i++) {
  157 |       const isComplete = await page.locator("h2:has-text('Session Complete')").isVisible();
  158 |       if (isComplete) break;
  159 | 
  160 |       const prompt = await page.locator(".question-card h3").textContent();
  161 |       const answer = prompt?.includes("France") ? "Paris" : "Tokyo";
  162 |       await page.fill('input[placeholder="Type your answer..."]', answer);
```