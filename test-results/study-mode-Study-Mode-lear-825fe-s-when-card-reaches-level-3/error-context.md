# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: study-mode.spec.ts >> Study Mode >> learned celebration shows when card reaches level 3
- Location: tests/e2e/study-mode.spec.ts:147:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.feedback-text')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.feedback-text')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - heading "Quizard" [level=1] [ref=e5]
    - button "Home" [ref=e7] [cursor=pointer]
    - button "Edit Deck" [ref=e8] [cursor=pointer]
    - button "Flashcards" [ref=e9] [cursor=pointer]
    - button "Study" [ref=e10] [cursor=pointer]
    - button "Test" [ref=e11] [cursor=pointer]
  - main [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Section 1 of 1 — 0 of 2 mastered
          - progressbar "Progress" [ref=e17]:
            - generic [ref=e18]: 0%
        - generic [ref=e19]:
          - generic "Capital of France?" [ref=e20]
          - generic "Capital of Japan?" [ref=e21]
      - generic [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e24]: 0/3
          - generic [ref=e25]: Written Answer
        - generic [ref=e30]: 0/3
        - heading "Capital of France?" [level=3] [ref=e31]:
          - paragraph [ref=e32]: Capital of France?
        - generic [ref=e33]:
          - heading "Compare your answer" [level=4] [ref=e34]
          - generic [ref=e35]:
            - generic [ref=e36]:
              - generic [ref=e37]: Your answer
              - paragraph [ref=e38]: Paris
            - generic [ref=e39]:
              - generic [ref=e40]: Correct answer
              - paragraph [ref=e41]: Paris
          - generic [ref=e42]:
            - button "1 I was right" [ref=e43] [cursor=pointer]:
              - generic [ref=e44]: "1"
              - text: I was right
            - button "2 I was wrong" [ref=e45] [cursor=pointer]:
              - generic [ref=e46]: "2"
              - text: I was wrong
```

# Test source

```ts
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
  163 |       await page.locator(".written-form button").click();
  164 | 
  165 |       const isLearned = await page.locator(".learned-celebration").isVisible();
  166 |       if (isLearned) {
  167 |         await expect(page.locator(".learned-text")).toHaveText("Learned!");
  168 |         await expect(page.locator(".learned-check")).toBeVisible();
  169 |         await page.click("text=Continue");
  170 |         break;
  171 |       }
  172 | 
> 173 |       await expect(page.locator(".feedback-text")).toBeVisible();
      |                                                    ^ Error: expect(locator).toBeVisible() failed
  174 |       await page.click("text=Continue");
  175 |     }
  176 |   });
  177 | 
  178 |   test("study again button restarts the session", async ({ page }) => {
  179 |     await createDeckWithCards(page, "Again Deck", [
  180 |       ["Capital of France?", "Paris"],
  181 |       ["Capital of Japan?", "Tokyo"],
  182 |     ]);
  183 |     await page.click("text=Study");
  184 | 
  185 |     // Complete session (2 cards x 3 correct written answers = 6 answers)
  186 |     for (let i = 0; i < 20; i++) {
  187 |       const isComplete = await page.locator("h2:has-text('Session Complete')").isVisible();
  188 |       if (isComplete) break;
  189 | 
  190 |       const prompt = await page.locator(".question-card h3").textContent();
  191 |       const answer = prompt?.includes("France") ? "Paris" : "Tokyo";
  192 |       await page.fill('input[placeholder="Type your answer..."]', answer);
  193 |       await page.locator(".written-form button").click();
  194 |       await expect(page.locator(".feedback-text")).toBeVisible();
  195 |       await page.click("text=Continue");
  196 |     }
  197 | 
  198 |     await expect(page.locator("h2")).toHaveText("Session Complete");
  199 |     await page.click("text=Study Again");
  200 |     await expect(page.locator(".question-card h3")).toBeVisible();
  201 |   });
  202 | });
  203 | 
```