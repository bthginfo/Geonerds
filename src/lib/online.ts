import type { RunResult } from "./types";

export interface OnlineUser {
  id: string;
  name: string;
}

export interface OnlineScore {
  name: string;
  game_id: string;
  difficulty: string | null;
  mode: string | null;
  score: number;
  correct: number | null;
  total: number | null;
  best_streak: number | null;
  duration_ms: number | null;
  created_at: string;
}

export interface AuthError {
  error: string;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiMe(): Promise<{ configured: boolean; user: OnlineUser | null }> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    return await res.json();
  } catch {
    return { configured: false, user: null };
  }
}

export async function apiSignup(name: string, passcode: string) {
  return postJson("/api/auth/signup", { name, passcode });
}

export async function apiLogin(name: string, passcode: string) {
  return postJson("/api/auth/login", { name, passcode });
}

export async function apiLogout() {
  await postJson("/api/auth/logout", {});
}

export async function apiSubmitScore(run: RunResult): Promise<boolean> {
  try {
    const { ok } = await postJson("/api/scores", run);
    return ok;
  } catch {
    return false;
  }
}

export interface PublicProfile {
  name: string;
  totalScore: number;
  totalRuns: number;
  bestStreak: number;
  games: { game_id: string; best: number; runs: number }[];
}

export async function apiUserProfile(
  name: string
): Promise<{ configured: boolean; found: boolean; profile?: PublicProfile }> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(name)}`, { cache: "no-store" });
    return await res.json();
  } catch {
    return { configured: false, found: false };
  }
}

export async function apiTopScores(
  game?: string,
  period: "all" | "month" = "all"
): Promise<{ configured: boolean; scores: OnlineScore[] }> {
  try {
    const params = new URLSearchParams();
    if (game && game !== "all") params.set("game", game);
    if (period === "month") params.set("period", "month");
    const qs = params.toString();
    const res = await fetch(`/api/scores${qs ? `?${qs}` : ""}`, { cache: "no-store" });
    return await res.json();
  } catch {
    return { configured: false, scores: [] };
  }
}
