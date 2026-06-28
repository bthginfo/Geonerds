"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSettings } from "@/store/settings";
import { translate } from "./messages";
import type { Locale } from "@/lib/types";

interface I18nContextValue {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: (key) => translate("en", key),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const storedLocale = useSettings((s) => s.locale);
  // Avoid hydration mismatch: render English on first paint, then switch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const locale: Locale = mounted ? storedLocale : "en";

  useEffect(() => {
    if (mounted) document.documentElement.lang = locale;
  }, [mounted, locale]);

  const value: I18nContextValue = {
    locale,
    t: (key, vars) => translate(locale, key, vars),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext);
}
