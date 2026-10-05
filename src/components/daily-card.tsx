"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Flame, Check, ChevronRight } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useDaily } from "@/store/daily";
import { dateKey, streakFromDates } from "@/lib/daily";

export function DailyCard() {
  const { t } = useT();
  const results = useDaily((s) => s.results);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const today = dateKey();
  const done = mounted ? !!results[today] : false;
  const streak = useMemo(() => (mounted ? streakFromDates(Object.keys(results)) : 0), [mounted, results]);

  return (
    <Link
      href="/daily"
      className="group flex w-full items-center gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 transition-colors hover:border-orange-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-300">
        <CalendarDays aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          {t("daily.title")}
          {streak > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-500">
              <Flame className="h-3.5 w-3.5" />
              {streak}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {done ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="h-3.5 w-3.5" />
              {t("daily.doneShort")}
            </span>
          ) : (
            t("daily.cardCta")
          )}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
