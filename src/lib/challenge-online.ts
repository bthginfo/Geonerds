import type { CreateGeoChallengeInput, GeoChallenge, GeoChallengeAction, GeoChallengeRunInput } from "@/lib/challenges";

interface MutationResult { ok: boolean; error?: string }

async function request<T extends object>(path: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  try {
    const response = await fetch(`/api/challenges${path}`, {
      method, cache: "no-store", credentials: "same-origin", signal,
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    const data = await response.json();
    return { ...data, ...(response.ok ? {} : { ok: false, error: data.error ?? "request_failed" }) } as T;
  } catch {
    return { ok: false, error: "network_error" } as T;
  }
}

export async function apiGeoChallenges(): Promise<{ configured: boolean; challenges: GeoChallenge[]; error?: string }> {
  const data = await request<{ configured?: boolean; challenges?: GeoChallenge[]; error?: string }>("");
  return { ...data, configured: data.configured !== false, challenges: data.challenges ?? [] };
}

export interface GeoChallengeUser { name: string }

export interface GeoChallengeUsersResponse {
  configured: boolean;
  users: GeoChallengeUser[];
  nextCursor: string | null;
  error?: string;
  retryAfter?: number;
}

/** Browse registered opponents, or search their public names without loading every account at once. */
export async function apiGeoChallengeUsers({ query = "", cursor = null, signal }: {
  query?: string; cursor?: string | null; signal?: AbortSignal;
} = {}): Promise<GeoChallengeUsersResponse> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (cursor) params.set("after", cursor);
  const suffix = params.size ? `?${params}` : "";
  const data = await request<Partial<GeoChallengeUsersResponse>>(`/users${suffix}`, "GET", undefined, signal);
  return {
    configured: data.configured !== false,
    users: Array.isArray(data.users) ? data.users.filter((user) => user && typeof user.name === "string").map((user) => ({ name: user.name })) : [],
    nextCursor: typeof data.nextCursor === "string" && data.nextCursor ? data.nextCursor : null,
    ...(typeof data.error === "string" ? { error: data.error } : {}),
    ...(typeof data.retryAfter === "number" ? { retryAfter: data.retryAfter } : {}),
  };
}

export function apiCreateGeoChallenge(input: CreateGeoChallengeInput): Promise<MutationResult & { id?: string }> {
  return request("", "POST", input);
}

export async function apiGeoChallenge(id: string): Promise<{ configured: boolean; challenge: GeoChallenge | null; error?: string }> {
  const data = await request<{ configured?: boolean; challenge?: GeoChallenge; error?: string }>(`/${encodeURIComponent(id)}`);
  return { ...data, configured: data.configured !== false, challenge: data.challenge ?? null };
}

export function apiActGeoChallenge(id: string, action: GeoChallengeAction): Promise<MutationResult> {
  return request(`/${encodeURIComponent(id)}`, "PATCH", { action });
}

export function apiStartGeoChallenge(id: string): Promise<MutationResult & { attemptToken?: string }> {
  return request(`/${encodeURIComponent(id)}/start`, "POST", {});
}

export function apiSubmitGeoChallengeAttempt(id: string, result: GeoChallengeRunInput): Promise<MutationResult & { resolved?: boolean; challenge?: GeoChallenge }> {
  return request(`/${encodeURIComponent(id)}/attempt`, "POST", result);
}
