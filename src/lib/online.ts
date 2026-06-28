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

export async function apiTopScores(game?: string): Promise<{ configured: boolean; scores: OnlineScore[] }> {
  try {
    const url = game && game !== "all" ? `/api/scores?game=${encodeURIComponent(game)}` : "/api/scores";
    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  } catch {
    return { configured: false, scores: [] };
  }
}
