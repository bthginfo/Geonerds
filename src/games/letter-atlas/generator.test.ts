import { describe, expect, it } from "vitest";
import { COUNTRIES, getCountryByCca3, poolForDifficulty } from "@/data/countries";
import { puzzleSeed } from "@/games/puzzle-kit";
import type { Difficulty, Locale } from "@/lib/types";
import {
  MAX_LETTERS, MIN_DICTIONARY_WORDS, MIN_LETTERS, buildDictionary, compassPoint, dictionaryWordsOfLength, eligibleTargets,
  evaluateGuess, geoClue, initialBearing, isValidGuess, keyboardStates, maxTries, normalizeLetters, resolveGuess, scoreGuess,
  shareRow, solvedScore, targetForSeed, targetWord,
} from "./generator";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const LOCALES: Locale[] = ["en", "de"];
const country = (cca3: string) => getCountryByCca3(cca3)!;

describe("normalizeLetters", () => {
  it("keeps letters only and strips diacritics", () => {
    expect(normalizeLetters("Österreich")).toBe("OSTERREICH");
    expect(normalizeLetters("Côte d'Ivoire")).toBe("COTEDIVOIRE");
    expect(normalizeLetters("São Tomé und Príncipe")).toBe("SAOTOMEUNDPRINCIPE");
    expect(normalizeLetters("Guinea-Bissau")).toBe("GUINEABISSAU");
    expect(normalizeLetters("St. Lucia")).toBe("STLUCIA");
    expect(normalizeLetters("Chișinău")).toBe("CHISINAU");
    expect(normalizeLetters("Gießen")).toBe("GIESSEN");
    expect(normalizeLetters("Türkiye")).toBe("TURKIYE");
    expect(normalizeLetters("ä")).toBe("A");
  });
});

describe("scoreGuess", () => {
  it("marks exact, misplaced and absent letters", () => {
    expect(scoreGuess("KENIA", "KENYA")).toEqual(["correct", "correct", "correct", "absent", "correct"]);
    expect(scoreGuess("NEPAL", "JAPAN")).toEqual(["present", "absent", "correct", "correct", "absent"]);
  });

  it("does not count a duplicate letter more often than the target has it", () => {
    // ACCRA vs KENYA: the final A is exact, so the first A has no copy left.
    expect(scoreGuess("ACCRA", "KENYA")).toEqual(["absent", "absent", "absent", "absent", "correct"]);
    // ACCRA vs JAPAN: both As are misplaced and JAPAN has two As.
    expect(scoreGuess("ACCRA", "JAPAN")).toEqual(["present", "absent", "absent", "absent", "present"]);
    // ACCRA vs CHINA: one C is misplaced, the second C has no copy left.
    expect(scoreGuess("ACCRA", "CHINA")).toEqual(["absent", "present", "absent", "absent", "correct"]);
    // HAVANA vs PANAMA: three exact As, the N is misplaced.
    expect(scoreGuess("HAVANA", "PANAMA")).toEqual(["absent", "correct", "absent", "correct", "present", "correct"]);
    // An exact match later in the word wins over an earlier misplaced copy: MALTA vs KENYA.
    expect(scoreGuess("MALTA", "KENYA")).toEqual(["absent", "absent", "absent", "absent", "correct"]);
    // ANGOLA vs GUYANA: the last A is exact, the first A still finds the other unmatched A.
    expect(scoreGuess("ANGOLA", "GUYANA")).toEqual(["present", "present", "present", "absent", "absent", "correct"]);
  });

  it("all-correct only for the answer itself", () => {
    expect(scoreGuess("CHILE", "CHILE").every((state) => state === "correct")).toBe(true);
  });

  it("keeps the best state per key", () => {
    const rows = [
      { word: "ACCRA", states: scoreGuess("ACCRA", "KENYA") },
      { word: "KENIA", states: scoreGuess("KENIA", "KENYA") },
    ];
    expect(keyboardStates(rows)).toMatchObject({ A: "correct", C: "absent", K: "correct", I: "absent" });
  });
});

describe("dictionary", () => {
  it("accepts country and capital names of the right length only", () => {
    expect(isValidGuess("KENYA", "en", 5)).toBe(true);
    expect(isValidGuess("ACCRA", "en", 5)).toBe(true);
    expect(isValidGuess("WIEN", "de", 4)).toBe(true);
    expect(isValidGuess("OSTERREICH", "de", 10)).toBe(true);
    expect(isValidGuess("KENYA", "en", 6)).toBe(false);
    expect(isValidGuess("HELLO", "en", 5)).toBe(false);
    for (const locale of LOCALES) {
      for (const [word, entries] of buildDictionary(locale)) {
        expect(word).toMatch(/^[A-Z]+$/);
        expect(word.length).toBeGreaterThanOrEqual(MIN_LETTERS);
        expect(word.length).toBeLessThanOrEqual(MAX_LETTERS);
        expect(entries.length).toBeGreaterThan(0);
      }
    }
  });

  it("leaves abbreviations such as DPRK out", () => {
    expect(buildDictionary("en").has("DPRK")).toBe(false);
  });

  it("resolves capitals to their country and prefers the target on shared names", () => {
    expect(resolveGuess("ACCRA", "en", "KEN")).toMatchObject({ cca3: "GHA", kind: "capital" });
    expect(resolveGuess("KONGO", "de", "COD")?.cca3).toBe("COD");
    expect(resolveGuess("KONGO", "de", "COG")?.cca3).toBe("COG");
  });
});

describe("targets", () => {
  it("every target fits 4–10 letters and has at least six same-length guesses in both locales", () => {
    for (const difficulty of DIFFICULTIES) {
      const pool = eligibleTargets(difficulty);
      expect(pool.length).toBeGreaterThanOrEqual(30);
      const allowed = new Set(poolForDifficulty(difficulty).map((entry) => entry.cca3));
      for (const target of pool) {
        expect(allowed.has(target.cca3)).toBe(true);
        expect(target.latlng).not.toBeNull();
        for (const locale of LOCALES) {
          const word = targetWord(target, locale);
          expect(word.length).toBeGreaterThanOrEqual(MIN_LETTERS);
          expect(word.length).toBeLessThanOrEqual(MAX_LETTERS);
          expect(dictionaryWordsOfLength(locale, word.length).length).toBeGreaterThanOrEqual(MIN_DICTIONARY_WORDS);
          expect(isValidGuess(word, locale, word.length)).toBe(true);
          expect(evaluateGuess(word, target, locale)?.clue?.km).toBe(0);
        }
      }
    }
  });

  it("skips countries whose name breaks the rules in either locale", () => {
    const hard = new Set(eligibleTargets("hard").map((entry) => entry.cca3));
    expect(hard.has("USA")).toBe(false); // "United States" is 12 letters
    expect(hard.has("AUT")).toBe(true); // Austria / Österreich
  });

  it("daily target is deterministic, locale-independent and does not repeat within a cycle", () => {
    for (const difficulty of DIFFICULTIES) {
      const pool = eligibleTargets(difficulty);
      const seen = new Set<string>();
      const start = Date.UTC(2026, 10, 26);
      // Days aligned to the start of one cycle never repeat a country.
      const day0 = Math.floor(start / 86_400_000);
      const cycleStart = (Math.floor(day0 / pool.length) + 1) * pool.length;
      for (let offset = 0; offset < pool.length; offset++) {
        const now = new Date((cycleStart + offset) * 86_400_000 + 3_600_000);
        const seed = puzzleSeed("letter-atlas", { variant: "daily", difficulty, now });
        const target = targetForSeed(seed, difficulty);
        expect(targetForSeed(seed, difficulty).cca3).toBe(target.cca3);
        seen.add(target.cca3);
      }
      expect(seen.size).toBe(pool.length);
      const later = puzzleSeed("letter-atlas", { variant: "daily", difficulty, now: new Date(start + 5 * 3_600_000) });
      const earlier = puzzleSeed("letter-atlas", { variant: "daily", difficulty, now: new Date(start + 3_600_000) });
      expect(targetForSeed(later, difficulty).cca3).toBe(targetForSeed(earlier, difficulty).cca3);
    }
  });

  it("endless seeds are deterministic and valid over many seeds in both locales", () => {
    const started = performance.now();
    let runs = 0;
    for (const difficulty of DIFFICULTIES) {
      const pool = new Set(eligibleTargets(difficulty).map((entry) => entry.cca3));
      const picked = new Set<string>();
      for (let index = 0; index < 200; index++) {
        const seed = `seed-${index}`;
        const target = targetForSeed(seed, difficulty);
        expect(targetForSeed(seed, difficulty).cca3).toBe(target.cca3);
        expect(pool.has(target.cca3)).toBe(true);
        picked.add(target.cca3);
        for (const locale of LOCALES) {
          const word = targetWord(target, locale);
          const row = evaluateGuess(word, target, locale);
          expect(row?.states.every((state) => state === "correct")).toBe(true);
          runs++;
        }
      }
      expect(picked.size).toBeGreaterThan(Math.min(20, pool.size / 2));
    }
    expect((performance.now() - started) / runs).toBeLessThan(5);
  });
});

describe("geography clue", () => {
  it("computes bearings on the compass", () => {
    expect(compassPoint(initialBearing([0, 0], [10, 0]))).toBe("N");
    expect(compassPoint(initialBearing([0, 0], [0, 10]))).toBe("E");
    expect(compassPoint(initialBearing([0, 0], [-10, 0]))).toBe("S");
    expect(compassPoint(initialBearing([0, 0], [0, -10]))).toBe("W");
    expect(compassPoint(350)).toBe("N");
    expect(compassPoint(22)).toBe("N");
    expect(compassPoint(23)).toBe("NE");
  });

  it("points the right way between real countries", () => {
    expect(geoClue(country("ESP"), country("FRA"))?.compass).toBe("NE");
    expect(geoClue(country("DEU"), country("KEN"))?.compass).toBe("SE");
    expect(geoClue(country("ARG"), country("BRA"))?.compass).toBe("N");
    expect(geoClue(country("BRA"), country("AUS"))?.compass).not.toBeNull();
    expect(geoClue(country("JPN"), country("CHN"))?.compass).toBe("W");
    expect(geoClue(country("FIN"), country("EST"))?.compass).toBe("S");
  });

  it("reports distance and closeness; the same country is 0 km", () => {
    const clue = geoClue(country("ESP"), country("FRA"))!;
    expect(clue.km).toBeGreaterThan(500);
    expect(clue.km).toBeLessThan(1200);
    expect(clue.proximity).toBeGreaterThan(90);
    expect(clue.proximity).toBeLessThan(100);
    expect(geoClue(country("KEN"), country("KEN"))).toMatchObject({ km: 0, compass: null, proximity: 100 });
    // A capital counts as its country: Nairobi measures from Kenya.
    const capitalGuess = evaluateGuess("NAIROBI", country("ECU"), "en")!;
    expect(capitalGuess.entry).toMatchObject({ cca3: "KEN", kind: "capital" });
    expect(capitalGuess.clue?.km).toBe(geoClue(country("KEN"), country("ECU"))?.km);
    expect(capitalGuess.clue?.compass).toBe("W");
  });
});

describe("scoring and sharing", () => {
  it("rewards early solves and charges hints, never negative", () => {
    expect(maxTries("easy")).toBe(7);
    expect(maxTries("hard")).toBe(6);
    expect(solvedScore(1, 6, 0, "medium")).toBe(1350);
    expect(solvedScore(3, 6, 0, "hard")).toBe(1200);
    expect(solvedScore(6, 6, 1, "easy")).toBe(50);
    expect(solvedScore(6, 6, 2, "hard")).toBe(0);
    expect(solvedScore(1, 7, 0, "easy")).toBe(1050);
  });

  it("builds spoiler-free share rows", () => {
    const row = evaluateGuess("NEPAL", country("JPN"), "en")!;
    expect(shareRow(row, (km) => km.toLocaleString("en"))).toMatch(/^🟨⬛🟩🟩⬛ [\d,]+ km [↑↗→↘↓↙←↖]$/u);
    const exact = evaluateGuess("JAPAN", country("JPN"), "en")!;
    expect(shareRow(exact, String)).toBe("🟩🟩🟩🟩🟩 🎯");
  });

  it("covers every country in the dataset once in each dictionary", () => {
    for (const locale of LOCALES) {
      const covered = new Set(Array.from(buildDictionary(locale).values()).flat().map((entry) => entry.cca3));
      for (const target of eligibleTargets("hard")) expect(covered.has(target.cca3)).toBe(true);
      expect(covered.size).toBeLessThanOrEqual(COUNTRIES.length);
    }
  });
});
