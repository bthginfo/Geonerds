/** Deterministic helpers for the Daily & Weekly Challenges. */

export const DAILY_COUNT = 8;
/** The Weekly Challenge is longer and harder than the daily. */
export const WEEKLY_COUNT = 20;

export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ISO-week key, e.g. "2026-W27" — stable for the whole week, resets Monday. */
export function weekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // ISO week: Thursday determines the year/week number.
  const day = (date.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Milliseconds until next local Monday 00:00. */
export function msUntilNextWeek(now: Date = new Date()): number {
  const next = new Date(now);
  const daysToMonday = ((8 - next.getDay()) % 7) || 7; // Sun=0 → 1, Mon=1 → 7
  next.setDate(next.getDate() + daysToMonday);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** Seedable PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffleWith<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sampleWith<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  return shuffleWith(arr, rng).slice(0, n);
}

/** Longest run of consecutive days ending today (or yesterday, so the streak survives until the day passes). */
export function streakFromDates(keys: string[]): number {
  const set = new Set(keys);
  const cursor = new Date();
  if (!set.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Milliseconds until the next local midnight. */
export function msUntilTomorrow(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
