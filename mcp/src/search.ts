import type { Page } from "./content.js";
import { fold, terms } from "./text.js";

export interface Hit {
  readonly slug: string;
  readonly title: string;
  readonly url: string;
  readonly score: number;
  readonly excerpt: string;
}

function count(haystack: string, term: string): number {
  let n = 0;
  for (let at = haystack.indexOf(term); at !== -1; at = haystack.indexOf(term, at + term.length)) n++;
  return n;
}

/** The line of the body where the first term shows up, as the excerpt of a hit. */
function excerpt(body: string, wanted: readonly string[]): string {
  const lines = body.split("\n").filter((line) => line.trim() !== "");
  const line = lines.find((l) => wanted.some((term) => fold(l).includes(term))) ?? lines[0] ?? "";
  return line.trim().slice(0, 280);
}

/** Every term counts: a match in the title weighs most, then the description, then the body. */
export function search(pages: readonly Page[], query: string, limit: number): Hit[] {
  const wanted = terms(query);
  if (wanted.length === 0) return [];
  return pages
    .map((page) => {
      const title = fold(page.title);
      const description = fold(page.description);
      const body = fold(page.body);
      let score = 0;
      for (const term of wanted) {
        score += 5 * count(title, term) + 3 * count(description, term) + count(body, term);
      }
      return { page, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ page, score }) => ({
      slug: page.slug,
      title: page.title,
      url: page.url,
      score,
      excerpt: excerpt(page.body, wanted),
    }));
}
