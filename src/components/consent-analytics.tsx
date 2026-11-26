"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { useConsent } from "@/store/consent";

/**
 * Vercel Web Analytics (cookieless, aggregated page views) loads only after the
 * visitor chose "Accept all". Query strings are dropped so invitation links and
 * other parameters never reach the analytics service.
 */
export function ConsentAnalytics() {
  const choice = useConsent((state) => state.choice);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || choice !== "accepted") return null;
  return (
    <Analytics
      beforeSend={(event) => {
        try {
          const url = new URL(event.url);
          url.search = "";
          url.hash = "";
          return { ...event, url: url.toString() };
        } catch {
          return event;
        }
      }}
    />
  );
}
