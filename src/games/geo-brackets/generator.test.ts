import { describe, expect, it } from "vitest";
import { DIFFICULTY_MAX_TIER } from "@/data/countries";
import { capitalLabel } from "@/games/aliases";
import { normalize } from "@/lib/fuzzy";
import type { Difficulty, Locale } from "@/lib/types";
import {
  DEPTH_RANGE,
  GROUPS,
  SUPERLATIVE_MARGIN,
  UNIVERSE,
  answerName,
  bracketScore,
  capitalUsable,
  chainNames,
  countryOf,
  cluePrompt,
  flattenClues,
  generatePuzzle,
  groupMembers,
  isClue,
  judgeAnswer,
  neighborsOf,
  regionIdOf,
  renderSentence,
  segmentText,
  shareGrid,
  solvableClues,
  entityName,
  type Clue,
  type Entity,
  type Translate,
} from "./generator";
import { GEO_BRACKETS_MESSAGES } from "./messages";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const LOCALES: Locale[] = ["en", "de"];
const SEEDS = Array.from({ length: 200 }, (_, i) => `seed-${i}`);

/** Strict translator: a missing key in the requested locale fails the test. */
function strictT(locale: Locale): Translate {
  return (key, vars) => {
    let value = GEO_BRACKETS_MESSAGES[locale][key];
    if (value === undefined) throw new Error(`Missing ${locale} key ${key}`);
    for (const [k, v] of Object.entries(vars ?? {})) value = value.replaceAll(`{${k}}`, String(v));
    return value;
  };
}

const squash = (s: string) => normalize(s).replace(/\s/g, "");
const country = (e: Entity) => {
  if (e.kind !== "country") throw new Error(`expected country, got ${e.kind}`);
  return countryOf(e.cca3);
};

function ratioOk(values: number[], winner: number, smallest: boolean) {
  const sorted = [...values].sort((a, b) => (smallest ? a - b : b - a));
  expect(sorted[0]).toBe(winner);
  expect(smallest ? sorted[1] / sorted[0] : sorted[0] / sorted[1]).toBeGreaterThanOrEqual(SUPERLATIVE_MARGIN);
}

/** Recomputes every clue from the raw data and checks that exactly one answer fits. */
function verifyUnique(clue: Clue) {
  const input: Entity = isClue(clue.input) ? clue.input.answer : clue.input;
  switch (clue.relation) {
    case "capitalOf": {
      const c = country(input);
      expect(clue.answer).toEqual({ kind: "capital", cca3: c.cca3 });
      expect(capitalUsable(c)).toBe(true);
      break;
    }
    case "countryOfCapital": {
      expect(input.kind).toBe("capital");
      const cca3 = (input as { cca3: string }).cca3;
      const matches = UNIVERSE.filter((c) => c.capital && squash(c.capital) === squash(countryOf(cca3).capital!));
      expect(matches.map((c) => c.cca3)).toEqual([cca3]);
      expect(clue.answer).toEqual({ kind: "country", cca3 });
      break;
    }
    case "onlyNeighbor": {
      const c = country(input);
      expect(c.borders).toHaveLength(1);
      expect(neighborsOf(c).map((n) => n.cca3)).toEqual([country(clue.answer).cca3]);
      break;
    }
    case "largestNeighbor":
    case "populousNeighbor": {
      const c = country(input);
      const neighbors = neighborsOf(c);
      expect(neighbors.length).toBeGreaterThanOrEqual(2);
      const value = (n: typeof c) => (clue.relation === "populousNeighbor" ? n.population : n.area);
      ratioOk(neighbors.map(value), value(country(clue.answer)), false);
      break;
    }
    case "regionOf": {
      const c = country(input);
      expect(clue.answer).toEqual({ kind: "region", region: regionIdOf(c) });
      break;
    }
    default: {
      const groupId = input.kind === "group" ? input.group : input.kind === "region" ? input.region : null;
      const group = GROUPS.find((g) => g.id === groupId);
      expect(group).toBeDefined();
      const smallest = clue.relation === "smallestIn";
      const value = (n: ReturnType<typeof countryOf>) => (clue.relation === "populousIn" ? n.population : n.area);
      ratioOk(groupMembers(group!).map(value), value(country(clue.answer)), smallest);
    }
  }
}

describe("Geo Brackets generator", () => {
  it("is deterministic per seed and varies between seeds", () => {
    for (const difficulty of DIFFICULTIES) {
      expect(generatePuzzle("same", difficulty)).toEqual(generatePuzzle("same", difficulty));
      const boards = new Set(SEEDS.slice(0, 30).map((seed) => JSON.stringify(generatePuzzle(seed, difficulty))));
      expect(boards.size).toBeGreaterThan(25);
    }
  });

  it.each(DIFFICULTIES)("builds valid, uniquely solvable chains on %s", (difficulty) => {
    const [minDepth, maxDepth] = DEPTH_RANGE[difficulty];
    for (const seed of SEEDS) {
      const puzzle = generatePuzzle(seed, difficulty);
      expect([2, 3]).toContain(puzzle.chains.length);
      const depths = puzzle.chains.map((top) => flattenClues(top).length);
      depths.forEach((depth) => expect(depth).toBeGreaterThanOrEqual(minDepth));
      depths.forEach((depth) => expect(depth).toBeLessThanOrEqual(maxDepth));
      expect(depths).toContain(maxDepth);
      expect(new Set(puzzle.clues.map((c) => c.id)).size).toBe(puzzle.clues.length);

      const identities = new Set<string>();
      for (const top of puzzle.chains) {
        expect(["country", "capital"]).toContain(top.answer.kind);
        const chain = flattenClues(top);
        const local = new Set<string>();
        for (const clue of chain) {
          verifyUnique(clue);
          if (clue.answer.kind === "country" || clue.answer.kind === "capital") {
            expect(countryOf(clue.answer.cca3).difficulty).toBeLessThanOrEqual(DIFFICULTY_MAX_TIER[difficulty]);
          }
          const key = JSON.stringify(clue.answer);
          expect(local.has(key)).toBe(false);
          local.add(key);
        }
        const places = [chain[0].input as Entity, ...chain.map((c) => c.answer)].map((e) =>
          e.kind === "country" || e.kind === "capital" ? e.cca3 : e.kind === "region" ? e.region : e.group,
        );
        for (const place of new Set(places)) {
          expect(identities.has(place)).toBe(false);
          identities.add(place);
        }
      }
    }
  });

  it("uses names that identify exactly one place in both languages", () => {
    for (const locale of LOCALES) {
      const t = strictT(locale);
      const names = UNIVERSE.map((c) => squash(entityName({ kind: "country", cca3: c.cca3 }, locale, t)));
      expect(new Set(names).size).toBe(names.length);
      const capitals = UNIVERSE.filter(capitalUsable).map((c) => squash(capitalLabel(c, locale)));
      expect(new Set(capitals).size).toBe(capitals.length);
    }
  });

  it("accepts English and German answers and rejects other places", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS.slice(0, 80)) {
        const puzzle = generatePuzzle(seed, difficulty);
        for (const clue of puzzle.clues) {
          for (const locale of LOCALES) expect(judgeAnswer(answerName(clue, locale, strictT(locale)), clue)).toBe("correct");
          const other = puzzle.clues.find((c) => c.answer.kind === clue.answer.kind && JSON.stringify(c.answer) !== JSON.stringify(clue.answer));
          if (other) expect(judgeAnswer(answerName(other, "en", strictT("en")), clue)).not.toBe("correct");
        }
      }
    }
  });

  it("handles continents, typos and close but different places", () => {
    const peru: Clue = { id: "a", relation: "regionOf", input: { kind: "country", cca3: "PER" }, answer: { kind: "region", region: "americas" }, accepted: ["Americas", "the Americas", "America", "Amerika", "South America", "Südamerika"], chain: 0 };
    expect(judgeAnswer("südamerika", peru)).toBe("correct");
    expect(judgeAnswer("Amerika", peru)).toBe("correct");
    expect(judgeAnswer("Africa", peru)).toBe("wrong");
    expect(judgeAnswer("North America", peru)).toBe("wrong");
    const puzzle = generatePuzzle("typo", "easy");
    const spain = puzzle.clues[0];
    expect(judgeAnswer("", spain)).toBe("wrong");
    const kingston: Clue = { id: "a", relation: "capitalOf", input: { kind: "country", cca3: "JAM" }, answer: { kind: "capital", cca3: "JAM" }, accepted: ["Kingston"], chain: 0 };
    expect(judgeAnswer("Kingstown", kingston)).toBe("wrong");
    expect(judgeAnswer("Kingstn", kingston)).toBe("correct");
  });

  it("renders every board in both locales without missing strings", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const puzzle = generatePuzzle(seed, difficulty);
        for (const locale of LOCALES) {
          const t = strictT(locale);
          const solved = new Set<string>();
          const texts = [segmentText(renderSentence(puzzle, locale, t, solved))];
          // Solve inside-out, checking the prompt of every clue when it opens up.
          while (solved.size < puzzle.clues.length) {
            const open = solvableClues(puzzle, solved);
            expect(open.length).toBeGreaterThan(0);
            for (const clue of open) {
              const prompt = cluePrompt(clue, locale, t, solved);
              expect(prompt.length).toBeGreaterThan(5);
              texts.push(prompt);
            }
            open.forEach((clue) => solved.add(clue.id));
            texts.push(segmentText(renderSentence(puzzle, locale, t, solved)));
          }
          const final = texts[texts.length - 1];
          const finalSegments = renderSentence(puzzle, locale, t, solved);
          expect(finalSegments.some((segment) => segment.type === "clue")).toBe(false);
          expect(finalSegments.filter((segment) => segment.type === "answer")).toHaveLength(puzzle.chains.length);
          expect(final.length).toBeGreaterThan(10);
          for (const top of puzzle.chains) chainNames(top, locale, t).forEach((step) => texts.push(step.name));
          for (const text of texts) {
            expect(text).not.toMatch(/[{}]|geobrackets\.|undefined|null|\s{2}/);
          }
        }
      }
    }
  });

  it("generates quickly", () => {
    const start = performance.now();
    let count = 0;
    for (const difficulty of DIFFICULTIES) for (const seed of SEEDS) { generatePuzzle(`speed-${seed}`, difficulty); count++; }
    expect((performance.now() - start) / count).toBeLessThan(50);
  });

  it("scores with a floor of zero and builds a spoiler-free share grid", () => {
    expect(bracketScore({ wrong: 0, peeks: 0, reveals: 0 }, "medium")).toBe(1500);
    expect(bracketScore({ wrong: 2, peeks: 1, reveals: 1 }, "hard")).toBe(2 * (1000 - 100 - 100 - 200));
    expect(bracketScore({ wrong: 30, peeks: 5, reveals: 5 }, "easy")).toBe(0);
    const puzzle = generatePuzzle("share", "medium");
    const outcomes = Object.fromEntries(puzzle.clues.map((clue, i) => [clue.id, { revealed: i === 0, mistakes: i === 1 ? 1 : 0, peeked: false }]));
    const grid = shareGrid(puzzle, outcomes);
    expect(grid.split("\n")).toHaveLength(puzzle.chains.length);
    expect(grid).toContain("🟥");
    expect(grid).not.toMatch(/[A-Za-z]/);
  });
});
