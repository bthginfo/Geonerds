"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Swords, Check, ChevronRight } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useWeekly } from "@/store/weekly";
import { weekKey } from "@/lib/daily";

export function WeeklyCard() {
  const { t } = useT();
  const results = useWeekly((s) => s.results);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const done = mounted ? !!results[weekKey()] : false;

  return (
    <Link
      href="/weekly"
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Swords aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{t("weekly.title")}</div>
        <div className="text-xs text-muted-foreground">
          {done ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="h-3.5 w-3.5" />
              {t("weekly.doneShort")}
            </span>
          ) : (
            t("weekly.cardCta")
          )}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
