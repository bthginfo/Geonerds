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
      className="group mx-auto mt-3 flex w-full max-w-md items-center gap-4 rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 p-4 transition-all hover:border-violet-500/50"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow">
        <Swords className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-bold">{t("weekly.title")}</div>
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
