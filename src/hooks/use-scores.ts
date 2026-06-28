"use client";

import { useCallback, useEffect, useState } from "react";
import { scoreStore } from "@/lib/leaderboard/local";
import type { ScoreEntry } from "@/lib/leaderboard/types";

export function useAllRuns() {
  const [runs, setRuns] = useState<ScoreEntry[] | null>(null);

  const refresh = useCallback(() => {
    scoreStore.allRuns().then(setRuns);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { runs, refresh };
}
