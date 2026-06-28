"use client";

import { useSettings } from "@/store/settings";
import { useT } from "@/i18n/I18nProvider";

export function LangToggle() {
  const { locale } = useT();
  const setLocale = useSettings((s) => s.setLocale);

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
      {(["en", "de"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          aria-label={l === "en" ? "English" : "Deutsch"}
          className={
            "rounded-md px-2.5 py-1.5 uppercase transition-colors " +
            (locale === l
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {l}
        </button>
      ))}
    </div>
  );
}
