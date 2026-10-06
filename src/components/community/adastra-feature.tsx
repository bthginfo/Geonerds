"use client";

import Link from "next/link";
import { ArrowUpRight, MoonStar } from "lucide-react";
import { ADASTRA_PHOTOS } from "@/data/adastra";
import { useT } from "@/i18n/I18nProvider";

export function AdastraFeature() {
  const { t } = useT();
  const photo = ADASTRA_PHOTOS[0];
  return <Link href="/play/adastra" className="group grid overflow-hidden rounded-2xl border border-sky-900/70 bg-[#071524] text-slate-50 shadow-sm transition hover:border-sky-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
    <div className="relative min-w-0 overflow-hidden bg-[#02070d]">
      {photo && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt={t("adastra.photoAlt")} loading="lazy" className="aspect-[2/1] h-full w-full object-cover sm:aspect-auto sm:min-h-56" />
        <span className="absolute bottom-2 left-3 text-[10px] font-medium text-white [text-shadow:0_1px_3px_#000]">NASA / JSC</span>
      </>}
    </div>
    <div className="min-w-0 p-5 sm:p-6">
      <p className="flex items-center gap-2 text-xs font-semibold text-amber-300"><MoonStar className="h-4 w-4" aria-hidden />Adastra <span className="font-normal text-slate-400">· {t("adastra.kicker")}</span></p>
      <h3 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">{t("adastra.homeTitle")}</h3>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300">{t("adastra.homeDesc")}</p>
      <p className="mt-3 text-xs text-sky-200">{t("adastra.idea")}</p>
      <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/15 px-4 text-sm font-bold text-sky-100 transition-colors group-hover:bg-sky-500/25">{t("adastra.play")}<ArrowUpRight className="h-4 w-4" aria-hidden /></span>
    </div>
  </Link>;
}

export function AdastraSetupPhoto() {
  const { t } = useT();
  const photo = ADASTRA_PHOTOS[0];
  if (!photo) return null;
  return <figure className="mt-4 overflow-hidden rounded-xl border border-sky-900/50 bg-[#061221]">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photo.src} alt={t("adastra.photoAlt")} className="aspect-[2/1] w-full object-cover" />
    <figcaption className="flex flex-wrap justify-between gap-1 px-3 py-2 text-[11px] text-slate-300"><span>NASA / JSC</span><span>{t("adastra.idea")}</span></figcaption>
  </figure>;
}
