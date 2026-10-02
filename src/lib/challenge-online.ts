import type { CreateGeoChallengeInput, GeoChallenge, GeoChallengeAction, GeoChallengeRunInput } from "@/lib/challenges";

interface MutationResult { ok: boolean; error?: string }

async function request<T extends object>(path: string, method = "GET", body?: unknown): Promise<T> {
  try {
    const response = await fetch(`/api/challenges${path}`, {
      method, cache: "no-store", credentials: "same-origin",
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
