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
      className="geo-game-row group flex min-h-20 w-full items-center gap-3 px-4 py-3 focus-visible:outline-offset-[-3px]"
    >
      <span className="shrink-0 text-primary">
        <Swords aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{t("weekly.title")}</div>
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
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
      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
