export function getMatchingWords(userAnswer: string, correctAnswer: string) {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
  const userWords = normalize(userAnswer);
  const correctWords = normalize(correctAnswer);
  const correctSet = new Set(correctWords);
  const matching = new Set(userWords.filter((w) => correctSet.has(w)));
  return { userWords, correctWords, matching };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function highlightMatches(words: string[], matching: Set<string>): string {
  return words
    .map((w) => {
      const escaped = escapeHtml(w);
      return matching.has(w.toLowerCase().replace(/[^\w]/g, ""))
        ? `<span class="word-match">${escaped}</span>`
        : `<span class="word-miss">${escaped}</span>`;
    })
    .join(" ");
}
