import type { DuelStanding, FeedbackFilter, FeedbackStatus, FeedbackSubmission } from "@/lib/community";
import type { GeoChallengeGameId } from "@/lib/challenges";

export interface CommunityRequestError {
  ok: false;
  error: string;
  status: number;
  retryAfter?: number;
}

export type FeedbackResult = { ok: true; id: string } | CommunityRequestError;
export type AdminFeedbackResult = {
  ok: true;
  configured: true;
  submissions: FeedbackSubmission[];
  total: number;
  allCount: number;
  newCount: number;
  hasMore: boolean;
} | CommunityRequestError;
export type DuelStandingsResult = {
  ok: true;
  configured: boolean;
  standings: DuelStanding[];
  hasMore: boolean;
} | CommunityRequestError;

async function request<T extends object>(url: string, options: RequestInit = {}): Promise<({ ok: true } & T) | CommunityRequestError> {
  try {
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...options });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      const retryAfter = Number(data?.retryAfter ?? response.headers.get("Retry-After"));
      return {
        ok: false,
        error: data?.error ?? "service_unavailable",
        status: response.status,
        ...(Number.isFinite(retryAfter) && retryAfter > 0 ? { retryAfter } : {}),
      };
    }
    if (!data || typeof data !== "object") return { ok: false, error: "service_unavailable", status: response.status };
    return { ...data, ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof DOMException && error.name === "AbortError" ? "aborted" : "network_error", status: 0 };
  }
}

export function apiSubmitFeedback(id: string, message: string): Promise<FeedbackResult> {
  return request("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, message }),
  });
}

export function apiAdminFeedback(status: FeedbackFilter = "all", page = 0, signal?: AbortSignal): Promise<AdminFeedbackResult> {
  const params = new URLSearchParams({ status, limit: "50", offset: String(page * 50) });
  return request(`/api/admin/feedback?${params}`, { signal });
}

export function apiSetFeedbackStatus(id: string, status: FeedbackStatus): Promise<{ ok: true } | CommunityRequestError> {
  return request(`/api/admin/feedback/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export function apiDuelStandings(game: GeoChallengeGameId | "all", period: "all" | "month", page = 0, signal?: AbortSignal): Promise<DuelStandingsResult> {
  const params = new URLSearchParams({ game, period, limit: "100", offset: String(page * 100) });
  return request(`/api/leaderboard/duels?${params}`, { signal });
}
