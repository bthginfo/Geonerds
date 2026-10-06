import type { CommunityRewards } from "./community-rewards";

export async function apiCommunityRewards(signal?: AbortSignal): Promise<CommunityRewards> {
  const response = await fetch("/api/account/community", {
    cache: "no-store", credentials: "same-origin", signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "service_unavailable");
  return data as CommunityRewards;
}

export async function apiReadCommunityNotification(id: string): Promise<void> {
  const response = await fetch(`/api/account/notifications/${encodeURIComponent(id)}`, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) throw new Error("service_unavailable");
}
