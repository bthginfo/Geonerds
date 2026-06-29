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
      className="group mx-auto mt-8 flex w-full max-w-md items-center gap-4 rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/10 to-rose-500/10 p-4 transition-all hover:border-orange-500/50"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow">
        <CalendarDays className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-bold">
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
