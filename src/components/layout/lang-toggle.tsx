"use client";

import { useSettings } from "@/store/settings";
import { useT } from "@/i18n/I18nProvider";

export function LangToggle() {
  const { locale } = useT();
  const setLocale = useSettings((s) => s.setLocale);

  return (
    <div role="group" aria-label={locale === "de" ? "Sprache" : "Language"} className="inline-flex shrink-0 items-center rounded-xl bg-muted/80 p-0.5 text-xs font-semibold">
      {(["en", "de"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          aria-label={l === "en" ? "English" : "Deutsch"}
          className={
            "inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] px-2 uppercase transition-colors " +
            (locale === l
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {l}
        </button>
      ))}
    </div>
  );
}
