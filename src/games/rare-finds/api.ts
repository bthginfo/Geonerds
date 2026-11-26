import type { RareDistribution, RareSubmission } from "./validate";

/** Result of asking the server; anything but "live" falls back to the estimate. */
export type RareLookup =
  | { kind: "live"; distribution: RareDistribution }
  | { kind: "offline"; reason: "not_configured" | "network" | "rejected" };

const TIMEOUT_MS = 6000;

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Defensive parse of the route's JSON. */
export function parseDistribution(data: unknown): RareDistribution | null {
  if (!data || typeof data !== "object") return null;
  const body = data as Record<string, unknown>;
  if (body.ok !== true || !isCount(body.total) || !isCount(body.count) || !Array.isArray(body.top)) return null;
  const top = body.top
    .filter((row): row is { answer: string; count: number } => Boolean(row) && typeof row.answer === "string" && /^[A-Z]{3}$/.test(row.answer) && isCount(row.count))
    .slice(0, 5)
    .map((row) => ({ answer: row.answer, count: Math.floor(row.count) }));
  return { counted: body.counted === true, total: Math.floor(body.total), count: Math.floor(body.count), top };
}

async function request(input: string, init: RequestInit): Promise<RareLookup> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal, cache: "no-store" });
    const data: unknown = await response.json().catch(() => null);
    if (data && typeof data === "object" && (data as { configured?: unknown }).configured === false) return { kind: "offline", reason: "not_configured" };
    if (!response.ok) return { kind: "offline", reason: response.status >= 500 || response.status === 429 ? "network" : "rejected" };
    const distribution = parseDistribution(data);
    return distribution ? { kind: "live", distribution } : { kind: "offline", reason: "network" };
  } catch {
    return { kind: "offline", reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}

/** Counts a valid daily answer (at most once per prompt and day) and returns the distribution. */
export function postRareAnswer(submission: RareSubmission): Promise<RareLookup> {
  return request("/api/rare-finds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });
}

/** Today's most common answers for a prompt, without counting anything. */
export function fetchRareDistribution(day: string, promptIndex: number): Promise<RareLookup> {
  return request(`/api/rare-finds?day=${encodeURIComponent(day)}&prompt=${promptIndex}`, { method: "GET" });
}
