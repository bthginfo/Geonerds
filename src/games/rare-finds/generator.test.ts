import { describe, expect, it } from "vitest";
import { getCountryByCca3 } from "@/data/countries";
import { translate } from "@/i18n/messages";
import { puzzleSeed } from "@/games/puzzle-kit";
import { rareSuggestions, resolveTyped } from "./answer-input";
import { MIN_CERTAIN, PROMPTS_PER_BOARD, RARE_PROMPTS, commonExamples, generateRareBoard, getRarePrompt, isAcceptedAnswer, rareExamples } from "./generator";
import { EARLY_THRESHOLD, buildShareText, livePoints, longestValidRun, rarityEmoji, rarityFallback, rarityShare, scoreAnswer } from "./scoring";
import { acceptedDays, dailyBoardForDay, dailySeedForDay, isDayKey, summarizeDistribution, validateRareQuery, validateRareSubmission } from "./validate";

const SEEDS = Array.from({ length: 240 }, (_, index) => `seed-${index}`);

describe("Rare Finds prompts", () => {
  it("only offers prompts with at least eight certain, independent answers", () => {
    expect(RARE_PROMPTS.length).toBeGreaterThanOrEqual(25);
    for (const prompt of RARE_PROMPTS) {
      expect(prompt.certain.size, prompt.id).toBeGreaterThanOrEqual(MIN_CERTAIN);
      for (const code of prompt.certain) {
        expect(getCountryByCca3(code)?.independent, `${prompt.id} ${code}`).toBe(true);
        expect(prompt.accepted.has(code)).toBe(true);
        expect(prompt.borderline.has(code)).toBe(false);
      }
      for (const code of prompt.accepted) expect(getCountryByCca3(code), `${prompt.id} ${code}`).toBeDefined();
    }
  });

  it("has a label in both locales for every prompt", () => {
    for (const prompt of RARE_PROMPTS) {
      for (const locale of ["en", "de"] as const) expect(translate(locale, prompt.labelKey), `${locale} ${prompt.id}`).not.toBe(prompt.labelKey);
    }
  });

  it("never accepts the country a 'Borders X' prompt names", () => {
    for (const prompt of RARE_PROMPTS.filter((entry) => entry.id.startsWith("borders-"))) {
      expect(prompt.accepted.has(prompt.id.slice("borders-".length)), prompt.id).toBe(false);
    }
    const germany = getRarePrompt("borders-DEU")!;
    expect(isAcceptedAnswer(germany, "DEU")).toBe(false);
    expect(isAcceptedAnswer(germany, "AUT")).toBe(true);
    expect(isAcceptedAnswer(germany, "ITA")).toBe(false);
  });

  it("accepts defensible borderline cases but judges thresholds by the dataset value", () => {
    const france = getRarePrompt("borders-FRA")!;
    expect(isAcceptedAnswer(france, "BRA")).toBe(true); // French Guiana
    expect(france.borderline.has("BRA")).toBe(true);
    const equator = getRarePrompt("equator")!;
    expect(isAcceptedAnswer(equator, "KIR")).toBe(true);
    const large = getRarePrompt("area-over-2m")!;
    expect(isAcceptedAnswer(large, "MEX")).toBe(false); // 1.96 million km² in the dataset
    expect(large.fact).toBe("area");
  });

  it("keeps borderline answers out of the examples", () => {
    for (const prompt of RARE_PROMPTS) {
      const examples = [...rareExamples(prompt), ...commonExamples(prompt)];
      expect(examples.length).toBe(5);
      for (const code of examples) expect(prompt.certain.has(code), `${prompt.id} ${code}`).toBe(true);
    }
    const prompt = getRarePrompt("landlocked")!;
    const rare = rareExamples(prompt);
    expect(Math.min(...rare.map((code) => getCountryByCca3(code)!.difficulty))).toBeGreaterThanOrEqual(3);
    expect(rareExamples(prompt, new Set(rare))).not.toContain(rare[0]);
  });
});

describe("Rare Finds board", () => {
  it("deals five distinct prompts from five families, broad to tricky", () => {
    for (const seed of SEEDS) {
      const board = generateRareBoard(seed);
      expect(board.promptIds).toHaveLength(PROMPTS_PER_BOARD);
      expect(new Set(board.promptIds).size).toBe(PROMPTS_PER_BOARD);
      const prompts = board.promptIds.map((id) => getRarePrompt(id)!);
      expect(prompts.every(Boolean)).toBe(true);
      expect(new Set(prompts.map((prompt) => prompt.family)).size).toBe(PROMPTS_PER_BOARD);
      for (const prompt of prompts) expect(prompt.certain.size).toBeGreaterThanOrEqual(MIN_CERTAIN);
      const breadths = prompts.map((prompt) => prompt.breadth);
      expect([...breadths].sort()).toEqual(breadths);
      expect(breadths[0]).toBe(1);
      expect(breadths[4]).toBe(3);
    }
  });

  it("is deterministic per seed and varied across seeds", () => {
    for (const seed of SEEDS.slice(0, 40)) expect(generateRareBoard(seed)).toEqual(generateRareBoard(seed));
    const distinct = new Set(SEEDS.map((seed) => generateRareBoard(seed).promptIds.join(",")));
    expect(distinct.size).toBeGreaterThan(SEEDS.length * 0.8);
    const used = new Set(SEEDS.flatMap((seed) => generateRareBoard(seed).promptIds));
    expect(used.size).toBeGreaterThan(RARE_PROMPTS.length * 0.8);
  });

  it("deals the same daily board in English and German (the seed carries no locale)", () => {
    const day = "2026-11-26";
    const seed = puzzleSeed("rare-finds", { variant: "daily", difficulty: "medium", now: new Date(`${day}T08:00:00Z`) });
    expect(seed).toBe(dailySeedForDay(day));
    expect(generateRareBoard(seed)).toEqual(dailyBoardForDay(day));
    const labels = (locale: "en" | "de") => dailyBoardForDay(day).promptIds.map((id) => translate(locale, getRarePrompt(id)!.labelKey));
    expect(labels("en")).not.toEqual(labels("de"));
    expect(dailyBoardForDay("2026-11-27")).not.toEqual(dailyBoardForDay(day));
  });

  it("generates quickly", () => {
    const start = performance.now();
    for (const seed of SEEDS) generateRareBoard(`speed-${seed}`);
    expect((performance.now() - start) / SEEDS.length).toBeLessThan(5);
  });
});

describe("Rare Finds scoring", () => {
  it("scores 100 × (1 − share) with the player's answer included, at least 10", () => {
    expect(rarityShare({ count: 4, total: 100 })).toBeCloseTo(0.04);
    expect(livePoints({ count: 4, total: 100 })).toBe(96);
    expect(livePoints({ count: 50, total: 100 })).toBe(50);
    expect(livePoints({ count: 1, total: 3 })).toBe(67);
    expect(livePoints({ count: 95, total: 100 })).toBe(10);
    expect(livePoints({ count: 100, total: 100 })).toBe(10);
    // A count of 0 still contains the player's own answer.
    expect(livePoints({ count: 0, total: 40 })).toBe(98);
  });

  it("uses the tier estimate early, offline and off the daily board", () => {
    expect([1, 2, 3, 4].map(rarityFallback)).toEqual([40, 55, 70, 85]);
    expect(scoreAnswer({ valid: true, tier: 4, live: true, distribution: { count: 1, total: EARLY_THRESHOLD - 1 } })).toEqual({ points: 85, source: "early", share: 1 / 19 });
    expect(scoreAnswer({ valid: true, tier: 2, live: true, distribution: { count: 10, total: 20 } })).toEqual({ points: 50, source: "live", share: 0.5 });
    expect(scoreAnswer({ valid: true, tier: 3, live: true, distribution: null })).toEqual({ points: 70, source: "offline", share: null });
    expect(scoreAnswer({ valid: true, tier: 1, live: false, distribution: { count: 1, total: 500 } })).toEqual({ points: 40, source: "estimated", share: null });
  });

  it("gives invalid answers 0 points", () => {
    expect(scoreAnswer({ valid: false, tier: 4, live: true, distribution: { count: 1, total: 400 } }).points).toBe(0);
    expect(scoreAnswer({ valid: false, tier: 4, live: false }).points).toBe(0);
  });

  it("builds a spoiler-free share text and counts streaks", () => {
    expect([rarityEmoji(95, true), rarityEmoji(70, true), rarityEmoji(40, true), rarityEmoji(39, true), rarityEmoji(95, false)]).toEqual(["💎", "🟣", "🔵", "⚪", "❌"]);
    const text = buildShareText("GeoNerds Rare Finds #1", [
      { valid: true, points: 92 }, { valid: true, points: 55 }, { valid: false, points: 0 }, { valid: true, points: 10 }, { valid: true, points: 71 },
    ]);
    expect(text.split("\n")).toEqual(["GeoNerds Rare Finds #1", "1. 💎 92", "2. 🔵 55", "3. ❌ 0", "4. ⚪ 10", "5. 🟣 71", "228/500", "geo-nerds.com"]);
    expect(longestValidRun([true, true, false, true, true, true])).toBe(3);
    expect(longestValidRun([false, false])).toBe(0);
  });
});

describe("Rare Finds server validation", () => {
  const now = new Date("2026-11-26T10:00:00Z");
  const board = dailyBoardForDay("2026-11-26");
  const prompt = getRarePrompt(board.promptIds[0])!;
  const valid = [...prompt.certain][0];
  const invalid = [...RARE_PROMPTS.flatMap((entry) => [...entry.certain])].find((code) => !prompt.accepted.has(code))!;

  it("accepts a fitting cca3 for today's and yesterday's prompt", () => {
    expect(acceptedDays(now)).toEqual(["2026-11-26", "2026-11-25"]);
    expect(validateRareSubmission({ day: "2026-11-26", promptIndex: 0, promptId: prompt.id, answer: valid }, now)).toEqual({
      ok: true,
      value: { day: "2026-11-26", promptIndex: 0, promptId: prompt.id, answer: valid },
    });
    const yesterday = dailyBoardForDay("2026-11-25");
    const last = getRarePrompt(yesterday.promptIds[4])!;
    expect(validateRareSubmission({ day: "2026-11-25", promptIndex: 4, promptId: last.id, answer: [...last.certain][0] }, now).ok).toBe(true);
  });

  it("rejects answers outside the category, other days and unknown prompts", () => {
    expect(validateRareSubmission({ day: "2026-11-26", promptIndex: 0, promptId: prompt.id, answer: invalid }, now)).toEqual({ ok: false, error: "invalid_answer" });
    expect(validateRareSubmission({ day: "2026-11-26", promptIndex: 0, promptId: prompt.id, answer: "XYZ" }, now)).toEqual({ ok: false, error: "invalid_answer" });
    expect(validateRareSubmission({ day: "2026-11-26", promptIndex: 0, promptId: prompt.id, answer: "deu" }, now)).toEqual({ ok: false, error: "invalid_answer" });
    expect(validateRareSubmission({ day: "2026-11-24", promptIndex: 0, promptId: prompt.id, answer: valid }, now)).toEqual({ ok: false, error: "invalid_day" });
    expect(validateRareSubmission({ day: "2026-11-27", promptIndex: 0, promptId: prompt.id, answer: valid }, now)).toEqual({ ok: false, error: "invalid_day" });
    expect(validateRareSubmission({ day: "2026-11-26", promptIndex: 5, promptId: prompt.id, answer: valid }, now)).toEqual({ ok: false, error: "unknown_prompt" });
    expect(validateRareSubmission({ day: "2026-11-26", promptIndex: 1, promptId: prompt.id, answer: valid }, now)).toEqual({ ok: false, error: "unknown_prompt" });
    expect(validateRareSubmission({ day: "2026-11-26", promptIndex: 0, promptId: "made-up", answer: valid }, now)).toEqual({ ok: false, error: "unknown_prompt" });
    for (const body of [null, [], "x", { day: "2026-02-30", promptIndex: 0, promptId: prompt.id, answer: valid }, { day: "2026-11-26", promptIndex: "0", promptId: prompt.id, answer: valid }, { day: "2026-11-26", promptIndex: 0.5, promptId: prompt.id, answer: valid }]) {
      expect(validateRareSubmission(body, now)).toEqual({ ok: false, error: "bad_request" });
    }
  });

  it("validates the read-only query", () => {
    expect(validateRareQuery("2026-11-26", "3", now)).toEqual({ ok: true, value: { day: "2026-11-26", promptIndex: 3, promptId: board.promptIds[3] } });
    expect(validateRareQuery("2026-11-26", "7", now)).toEqual({ ok: false, error: "unknown_prompt" });
    expect(validateRareQuery("2026-11-26", null, now)).toEqual({ ok: false, error: "bad_request" });
    expect(validateRareQuery("2026-10-01", "0", now)).toEqual({ ok: false, error: "invalid_day" });
    expect(isDayKey("2026-11-26")).toBe(true);
    expect(isDayKey("2026-13-01")).toBe(false);
  });

  it("summarizes stored counts and always includes the player's own answer", () => {
    const rows = [{ answer: "AUT", count: 30 }, { answer: "FRA", count: 50 }, { answer: "CHE", count: 10 }, { answer: "POL", count: 5 }, { answer: "DNK", count: 3 }, { answer: "LUX", count: 2 }];
    const counted = summarizeDistribution(rows, "LUX", true);
    expect(counted).toEqual({ counted: true, total: 100, count: 2, top: [{ answer: "FRA", count: 50 }, { answer: "AUT", count: 30 }, { answer: "CHE", count: 10 }, { answer: "POL", count: 5 }, { answer: "DNK", count: 3 }] });
    const repeat = summarizeDistribution(rows, "BEL", false);
    expect(repeat.total).toBe(101);
    expect(repeat.count).toBe(1);
    expect(summarizeDistribution([], null, false)).toEqual({ counted: false, total: 0, count: 0, top: [] });
  });
});

describe("Rare Finds answer input", () => {
  it("suggests countries by localized names and aliases, never used ones", () => {
    expect(rareSuggestions("deu", new Set(), "de").map((country) => country.cca3)).toContain("DEU");
    expect(rareSuggestions("Schw", new Set(), "de").map((country) => country.cca3).slice(0, 3)).toEqual(expect.arrayContaining(["CHE", "SWE"]));
    expect(rareSuggestions("germ", new Set(["DEU"]), "en").map((country) => country.cca3)).not.toContain("DEU");
    expect(rareSuggestions("Gremany", new Set(), "en").map((country) => country.cca3)).toContain("DEU");
    expect(rareSuggestions("", new Set(), "en")).toEqual([]);
  });

  it("resolves typed text to exactly one country", () => {
    expect(resolveTyped("Germny")).toMatchObject({ kind: "country", country: { cca3: "DEU" } });
    expect(resolveTyped("Elfenbeinküste")).toMatchObject({ kind: "country", country: { cca3: "CIV" } });
    expect(resolveTyped("Niger")).toMatchObject({ kind: "country", country: { cca3: "NER" } });
    expect(resolveTyped("Kongo").kind).toBe("ambiguous");
    expect(resolveTyped("Paris").kind).not.toBe("country");
    expect(resolveTyped("qwxzv")).toEqual({ kind: "unknown" });
  });
});
