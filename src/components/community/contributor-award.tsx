"use client";

import Link from "next/link";
import { Award, ChevronRight } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

export function ContributorAward() {
  const { locale } = useT();
  return <section className="mt-4 flex min-w-0 items-start gap-3 rounded-xl border border-amber-500/45 bg-amber-500/10 p-4">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-400/20 text-amber-800 dark:text-amber-300"><Award className="h-6 w-6" aria-hidden /></span>
    <div className="min-w-0"><h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">Contributor</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Deine Idee hat GeoNerds verändert. Dank dir können GeoNerds jetzt Menschen aus der ganzen Community herausfordern, nicht nur ihre Freunde." : "Your idea changed GeoNerds. Thanks to you, GeoNerds can now challenge people across the whole community, not just their friends."}</p><Link href="/challenges" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Herausforderungen öffnen" : "Explore challenges"}<ChevronRight className="h-4 w-4 shrink-0" aria-hidden /></Link></div>
  </section>;
}
