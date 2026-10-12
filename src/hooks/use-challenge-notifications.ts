"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGeoChallengeNotifications, apiReadGeoChallengeNotification } from "@/lib/challenge-online";
import type { GeoChallengeNotification } from "@/lib/challenges";
import { useAuth } from "@/store/auth";

export const CHALLENGE_CHANGED_EVENT = "geonerds:challenges-changed";

export function notifyChallengeMutation() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHALLENGE_CHANGED_EVENT));
}

const EMPTY: GeoChallengeNotification[] = [];
type Snapshot = { ownerId: string; notifications: GeoChallengeNotification[]; error?: string };

/** Durable notifications are server-owned; no account data is stored globally or locally. */
export function useChallengeNotifications() {
  const { user, loaded, configured } = useAuth();
  const ownerId = user?.id;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [pendingOwner, setPendingOwner] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const reads = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (!ownerId || !loaded || !configured || document.visibilityState !== "visible" || useAuth.getState().user?.id !== ownerId) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const requestId = ++sequence.current;
    setPendingOwner(ownerId);
    const current = () => !request.signal.aborted && sequence.current === requestId && useAuth.getState().user?.id === ownerId;
    try {
      const data = await apiGeoChallengeNotifications(request.signal);
      if (!current()) return;
      setSnapshot((previous) => ({ ownerId, notifications: data.error ? previous?.ownerId === ownerId ? previous.notifications : [] : data.notifications.slice(0, 50), error: data.error }));
      if (data.error === "unauthorized") void useAuth.getState().refresh().catch(() => undefined);
    } catch {
      if (current()) setSnapshot((previous) => ({ ownerId, notifications: previous?.ownerId === ownerId ? previous.notifications : [], error: "network_error" }));
    } finally { if (current()) { setPendingOwner(null); controller.current = null; } }
  }, [ownerId, loaded, configured]);

  useEffect(() => {
    if (!ownerId || !loaded || !configured) return;
    const check = () => { if (document.visibilityState === "visible") void refresh(); };
    check();
    const timer = window.setInterval(check, 30_000);
    window.addEventListener("focus", check);
    window.addEventListener(CHALLENGE_CHANGED_EVENT, check);
    document.addEventListener("visibilitychange", check);
    return () => {
      sequence.current += 1;
      controller.current?.abort();
      controller.current = null;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener(CHALLENGE_CHANGED_EVENT, check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [ownerId, loaded, configured, refresh]);

  // Mask a previous account synchronously; effects are too late for this boundary.
  const data = loaded && configured && ownerId && snapshot?.ownerId === ownerId ? snapshot : null;
  const notifications = data?.notifications ?? EMPTY;

  async function markRead(id: string): Promise<boolean> {
    if (!ownerId || useAuth.getState().user?.id !== ownerId || reads.current.has(id)) return false;
    reads.current.add(id);
    sequence.current += 1;
    controller.current?.abort();
    controller.current = null;
    try {
      const result = await apiReadGeoChallengeNotification(id);
      if (!result.ok || useAuth.getState().user?.id !== ownerId) return false;
      setSnapshot((previous) => previous?.ownerId === ownerId ? { ...previous, notifications: previous.notifications.map((item) => id === "all" || item.id === id ? { ...item, readAt: new Date().toISOString() } : item) } : previous);
      notifyChallengeMutation();
      return true;
    } catch { return false; }
    finally { reads.current.delete(id); if (useAuth.getState().user?.id === ownerId) setPendingOwner(null); }
  }

  return { notifications, unreadCount: notifications.filter((item) => !item.readAt).length, error: data?.error, loading: Boolean(ownerId && pendingOwner === ownerId), refresh, markRead };
}
