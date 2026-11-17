"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { locale } = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={locale === "de" ? (isDark ? "Hellen Modus aktivieren" : "Dunklen Modus aktivieren") : (isDark ? "Switch to light mode" : "Switch to dark mode")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {mounted && isDark ? <Sun className="h-[19px] w-[19px]" aria-hidden="true" /> : <Moon className="h-[19px] w-[19px]" aria-hidden="true" />}
    </button>
  );
}
