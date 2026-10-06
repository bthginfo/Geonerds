"use client";

import Link from "next/link";
import { Award, ChevronRight } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

export function GameCreatorAward() {
  const { t } = useT();
  return <section className="mt-4 flex min-w-0 items-start gap-3 rounded-xl border border-amber-500/45 bg-amber-500/10 p-4">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-400/20 text-amber-800 dark:text-amber-300"><Award className="h-6 w-6" aria-hidden /></span>
    <div className="min-w-0"><h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">{t("community.creatorTitle")}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("community.creatorDesc")}</p><Link href="/play/adastra" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("adastra.play")}<ChevronRight className="h-4 w-4" aria-hidden /></Link></div>
  </section>;
}
