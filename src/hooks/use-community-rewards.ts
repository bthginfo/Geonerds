"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/store/auth";
import { apiCommunityRewards, apiReadCommunityNotification } from "@/lib/community-rewards-online";
import type { CommunityRewards } from "@/lib/community-rewards";

const EMPTY: CommunityRewards = { configured: false, awards: [], notifications: [] };

/** Account-owned grants: never infer a reward from local progress or a username. */
export function useCommunityRewards() {
  const userId = useAuth((state) => state.user?.id);
  const loaded = useAuth((state) => state.loaded);
  const configured = useAuth((state) => state.configured);
  const [snapshot, setSnapshot] = useState<{ ownerId: string; data: CommunityRewards } | null>(null);
  const [failure, setFailure] = useState<{ ownerId: string; failed: boolean } | null>(null);
  const readLock = useRef(new Set<string>());

  useEffect(() => {
    if (!loaded || !configured || !userId) return;
    const controller = new AbortController();
    const ownerId = userId;
    void apiCommunityRewards(controller.signal).then((data) => {
      if (controller.signal.aborted || useAuth.getState().user?.id !== ownerId) return;
      setSnapshot({ ownerId, data });
      setFailure({ ownerId, failed: false });
    }).catch(() => {
      if (controller.signal.aborted || useAuth.getState().user?.id !== ownerId) return;
      setFailure({ ownerId, failed: true });
    });
    return () => controller.abort();
  }, [loaded, configured, userId]);

  // A previous user's reward is removed during render, before any cleanup effect.
  const data = loaded && configured && userId && snapshot?.ownerId === userId ? snapshot.data : EMPTY;
  const failed = Boolean(userId && failure?.ownerId === userId && failure.failed);
  const pending = Boolean(userId && configured && loaded && snapshot?.ownerId !== userId && !failed);
  const badgeIds = useMemo(() => [...new Set(data.awards.map((award) => award.badgeId))], [data.awards]);

  async function markRead(id: string): Promise<boolean> {
    const ownerId = userId;
    if (!ownerId || readLock.current.has(id) || !data.notifications.some((item) => item.id === id)) return false;
    readLock.current.add(id);
    try {
      await apiReadCommunityNotification(id);
      if (useAuth.getState().user?.id !== ownerId) return false;
      setSnapshot((previous) => previous?.ownerId === ownerId ? {
        ownerId,
        data: { ...previous.data, notifications: previous.data.notifications.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item) },
      } : previous);
      return true;
    } catch { return false; }
    finally { readLock.current.delete(id); }
  }

  return { ...data, badgeIds, pending, failed, markRead };
}
