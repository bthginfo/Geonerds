import { COUNTRIES, countryName, getCountryByCca3, poolForDifficulty } from "@/data/countries";
import { capitalAccepted, capitalLabel, countryAccepted } from "@/games/aliases";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { createSeededRandom, seededShuffle } from "@/lib/random";
import type { Country, Difficulty, Locale } from "@/lib/types";
import { haversineKm } from "@/lib/utils";

export const MIN_LETTERS = 4;
export const MAX_LETTERS = 10;
/** A target is only fair when at least this many valid guesses share its length. */
export const MIN_DICTIONARY_WORDS = 6;
export const POINTS_PER_SPARE_TRY = 150;
export const HINT_COST = 100;
export const MAX_HINTS = 2;
const LOCALES: Locale[] = ["en", "de"];

export type LetterState = "correct" | "present" | "absent";

// ── Normalization ─────────────────────────────────────────────────────

const SPECIAL_LETTERS: Record<string, string> = { Æ: "AE", Œ: "OE", Ø: "O", Ł: "L", Đ: "D", Ð: "D", Þ: "TH", ı: "I" };

/** Letters only: uppercase, diacritics stripped (Ä→A, ß→SS), spaces and punctuation removed. */
export function normalizeLetters(input: string): string {
  return input
    .toUpperCase()
    .replace(/[ÆŒØŁĐÐÞı]/g, (char) => SPECIAL_LETTERS[char] ?? char)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Z]/g, "");
}

// ── Letter feedback ───────────────────────────────────────────────────

/**
 * Classic two-pass colouring: exact matches first, then "present" only while
 * unmatched copies of that letter remain in the target.
 */
export function scoreGuess(guess: string, target: string): LetterState[] {
  const result: LetterState[] = Array.from({ length: guess.length }, () => "absent");
  const remaining = new Map<string, number>();
  for (let index = 0; index < target.length; index++) {
    if (guess[index] === target[index]) result[index] = "correct";
    else remaining.set(target[index], (remaining.get(target[index]) ?? 0) + 1);
  }
  for (let index = 0; index < guess.length; index++) {
    if (result[index] === "correct") continue;
    const left = remaining.get(guess[index]) ?? 0;
    if (left > 0) {
      result[index] = "present";
      remaining.set(guess[index], left - 1);
    }
  }
  return result;
}

const STATE_RANK: Record<LetterState, number> = { absent: 1, present: 2, correct: 3 };

/** Best known state per letter for the on-screen keyboard. */
export function keyboardStates(rows: { word: string; states: LetterState[] }[]): Record<string, LetterState> {
  const keys: Record<string, LetterState> = {};
  for (const row of rows) {
    row.states.forEach((state, index) => {
      const letter = row.word[index];
      const known = keys[letter];
      if (!known || STATE_RANK[state] > STATE_RANK[known]) keys[letter] = state;
    });
  }
  return keys;
}

export const KEYBOARD_ROWS: Record<Locale, string[]> = {
  en: ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"],
  de: ["QWERTZUIOP", "ASDFGHJKL", "YXCVBNM"],
};

// ── Guess dictionary ──────────────────────────────────────────────────

export interface DictionaryEntry {
  word: string;
  cca3: string;
  kind: "country" | "capital";
  /** The locale's own name (not an alias). */
  primary: boolean;
}

export type Dictionary = Map<string, DictionaryEntry[]>;

const dictionaryCache = new Map<Locale, Dictionary>();

/** Abbreviations such as "UAE" or "DPRK" are not names and stay out of the guess list. */
function isAbbreviation(value: string): boolean {
  return !/\p{Ll}/u.test(value);
}

/** Every country and capital name (with common aliases) normalized to letters, for one locale. */
export function buildDictionary(locale: Locale): Dictionary {
  const cached = dictionaryCache.get(locale);
  if (cached) return cached;
  const dictionary: Dictionary = new Map();
  const add = (raw: string, entry: Omit<DictionaryEntry, "word">) => {
    const word = normalizeLetters(raw);
    if (word.length < MIN_LETTERS || word.length > MAX_LETTERS) return;
    const list = dictionary.get(word) ?? [];
    if (list.some((item) => item.cca3 === entry.cca3 && item.kind === entry.kind)) {
      if (entry.primary) for (const item of list) if (item.cca3 === entry.cca3 && item.kind === entry.kind) item.primary = true;
      return;
    }
    list.push({ word, ...entry });
    dictionary.set(word, list);
  };
  for (const country of COUNTRIES) {
    add(countryName(country, locale), { cca3: country.cca3, kind: "country", primary: true });
    const capital = capitalLabel(country, locale);
    if (capital) add(capital, { cca3: country.cca3, kind: "capital", primary: true });
  }
  for (const country of COUNTRIES) {
    for (const alias of countryAccepted(country)) if (!isAbbreviation(alias)) add(alias, { cca3: country.cca3, kind: "country", primary: false });
    for (const alias of capitalAccepted(country)) if (!isAbbreviation(alias)) add(alias, { cca3: country.cca3, kind: "capital", primary: false });
  }
  dictionaryCache.set(locale, dictionary);
  return dictionary;
}

export function dictionaryWordsOfLength(locale: Locale, length: number): string[] {
  return Array.from(buildDictionary(locale).keys()).filter((word) => word.length === length).sort();
}

export function isValidGuess(word: string, locale: Locale, length: number): boolean {
  return word.length === length && buildDictionary(locale).has(word);
}

/** Which country a guess points to; the target wins ties, then the locale's own names. */
export function resolveGuess(word: string, locale: Locale, targetCca3: string): DictionaryEntry | null {
  const entries = buildDictionary(locale).get(word);
  if (!entries?.length) return null;
  const rank = (entry: DictionaryEntry) => (entry.cca3 === targetCca3 ? 0 : 10) + (entry.primary ? 0 : 4) + (entry.kind === "country" ? 0 : 2);
  return [...entries].sort((a, b) => rank(a) - rank(b))[0];
}

// ── Targets ───────────────────────────────────────────────────────────

export function targetWord(country: Country, locale: Locale): string {
  return normalizeLetters(countryName(country, locale));
}

function eligibleIn(country: Country, locale: Locale): boolean {
  const length = targetWord(country, locale).length;
  if (length < MIN_LETTERS || length > MAX_LETTERS) return false;
  return dictionaryWordsOfLength(locale, length).length >= MIN_DICTIONARY_WORDS;
}

const targetCache = new Map<Difficulty, Country[]>();

/** Targets valid in BOTH locales, so a seed always names the same country in EN and DE. */
export function eligibleTargets(difficulty: Difficulty): Country[] {
  const cached = targetCache.get(difficulty);
  if (cached) return cached;
  const pool = poolForDifficulty(difficulty)
    .filter((country) => country.latlng && LOCALES.every((locale) => eligibleIn(country, locale)))
    .sort((a, b) => a.cca3.localeCompare(b.cca3));
  targetCache.set(difficulty, pool);
  return pool;
}

const DAILY_SEED = /^letter-atlas:daily:v\d+:(\d{4}-\d{2}-\d{2}):/;

/**
 * Locale-independent target for a seed. Daily seeds walk a shuffled cycle of
 * the pool, so a country does not return until the whole pool has been played.
 */
export function targetForSeed(seed: string, difficulty: Difficulty): Country {
  const pool = eligibleTargets(difficulty);
  const daily = DAILY_SEED.exec(seed);
  if (daily) {
    const day = Math.floor(Date.parse(`${daily[1]}T00:00:00Z`) / 86_400_000);
    const cycle = Math.floor(day / pool.length);
    const order = seededShuffle(pool, `letter-atlas:cycle:${difficulty}:${cycle}`);
    return order[((day % pool.length) + pool.length) % pool.length];
  }
  const random = createSeededRandom(`letter-atlas:target:${seed}`);
  return pool[Math.floor(random() * pool.length)];
}

export function maxTries(difficulty: Difficulty): number {
  return difficulty === "easy" ? 7 : 6;
}

// ── Geography clue ────────────────────────────────────────────────────

export type CompassPoint = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export const COMPASS_POINTS: CompassPoint[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const COMPASS_ARROWS: Record<CompassPoint, string> = { N: "↑", NE: "↗", E: "→", SE: "↘", S: "↓", SW: "↙", W: "←", NW: "↖" };
/** Roughly half the Earth's circumference: the farthest two places can be apart. */
const MAX_DISTANCE_KM = 20_015;

/** Initial great-circle bearing in degrees (0 = north, clockwise) between [lat, lng] points. */
export function initialBearing(from: [number, number], to: [number, number]): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const lat1 = toRad(from[0]);
  const lat2 = toRad(to[0]);
  const dLng = toRad(to[1] - from[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function compassPoint(bearing: number): CompassPoint {
  return COMPASS_POINTS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

export interface GeoClue {
  km: number;
  bearing: number;
  compass: CompassPoint | null;
  proximity: number;
}

/** Distance, direction and closeness from a guessed country to the target. */
export function geoClue(guess: Country, target: Country): GeoClue | null {
  if (guess.cca3 === target.cca3) return { km: 0, bearing: 0, compass: null, proximity: 100 };
  if (!guess.latlng || !target.latlng) return null;
  const km = Math.round(haversineKm([guess.latlng[1], guess.latlng[0]], [target.latlng[1], target.latlng[0]]));
  const bearing = initialBearing(guess.latlng, target.latlng);
  const proximity = Math.max(0, Math.min(99, Math.floor((1 - km / MAX_DISTANCE_KM) * 100)));
  return { km, bearing, compass: compassPoint(bearing), proximity };
}

// ── Guess evaluation ──────────────────────────────────────────────────

export interface GuessRow {
  word: string;
  states: LetterState[];
  entry: DictionaryEntry;
  clue: GeoClue | null;
}

export function evaluateGuess(word: string, target: Country, locale: Locale): GuessRow | null {
  const answer = targetWord(target, locale);
  if (!isValidGuess(word, locale, answer.length)) return null;
  const entry = resolveGuess(word, locale, target.cca3);
  const country = entry ? getCountryByCca3(entry.cca3) : undefined;
  if (!entry || !country) return null;
  return { word, states: scoreGuess(word, answer), entry, clue: geoClue(country, target) };
}

// ── Scoring and sharing ───────────────────────────────────────────────

/** Points for a solve on try `tryNumber` of `tries`; hints subtract a flat amount. Never negative. */
export function solvedScore(tryNumber: number, tries: number, hints: number, difficulty: Difficulty): number {
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty];
  const base = Math.max(0, tries - tryNumber + 1) * POINTS_PER_SPARE_TRY * multiplier;
  return Math.max(0, Math.round(base - HINT_COST * multiplier * hints));
}

const SHARE_SQUARES: Record<LetterState, string> = { correct: "🟩", present: "🟨", absent: "⬛" };

export function shareRow(row: GuessRow, formatKm: (km: number) => string): string {
  const squares = row.states.map((state) => SHARE_SQUARES[state]).join("");
  if (!row.clue) return squares;
  if (row.clue.km === 0) return `${squares} 🎯`;
  return `${squares} ${formatKm(row.clue.km)} km ${row.clue.compass ? COMPASS_ARROWS[row.clue.compass] : ""}`.trimEnd();
}
