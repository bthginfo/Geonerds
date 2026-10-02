"use client";

import { useCallback, useEffect, useRef } from "react";

/** Round transitions must never finish a game after its board is reset/exited. */
export function useGameTimeouts() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const mounted = useRef(true);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimers(); };
  }, [clearTimers]);
  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      if (mounted.current) callback();
    }, delay);
    timers.current.add(timer);
    return timer;
  }, []);
  return { schedule, clearTimers };
}
