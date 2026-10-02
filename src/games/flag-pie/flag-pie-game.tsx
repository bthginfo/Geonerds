"use client";

import { useMemo, useState } from "react";
import { ChartPie } from "lucide-react";
import palettes from "@/data/flag-palettes.json";
import { countryName, poolForDifficulty } from "@/data/countries";
import { FlagImage } from "@/components/flag-image";
import { useT } from "@/i18n/I18nProvider";
import { newRunSeed } from "@/lib/random";
import { getFlagPolicyNote } from "@/lib/flag-policy";
import { AnswerPanel, RoundFeedback, VisualGameFrame, useVisualSession, type VisualPlayHandlers } from "./game-kit";
import { buildFlagPieRounds, colorFamily, donutSlicePath, type FlagPalettes } from "./generator";

export function FlagPieGame(handlers: VisualPlayHandlers) {
  const { t, locale } = useT();
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const rounds = useMemo(() => buildFlagPieRounds(poolForDifficulty(handlers.difficulty), palettes as FlagPalettes,
    handlers.difficulty, handlers.roundCount, seed), [handlers.difficulty, handlers.roundCount, seed]);
  const hits = useMemo(() => rounds.map((round) => round.answer.cca3), [rounds]);
  const session = useVisualSession({ ...handlers, mode: "choice", total: rounds.length, hits });
  const round = rounds[session.index];
  const percent = (share: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(share);
  let cursor = 0;

  return (
    <VisualGameFrame gameId="flag-pie" session={session} handlers={handlers}>
      {round && <>
        <header className="text-center">
          <p className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><ChartPie className="h-4 w-4" aria-hidden />{t("flagpie.kicker")}</p>
          <h1 className="text-xl font-bold sm:text-2xl">{t("flagpie.prompt")}</h1>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{t("flagpie.measured")}</p>
        </header>
        <div className="rounded-3xl border border-border bg-card/90 p-5 shadow-sm">
          <div className="relative mx-auto w-full max-w-[255px]">
            <svg viewBox="0 0 240 240" role="img" aria-label={t("flagpie.chartLabel")} className="w-full overflow-visible drop-shadow-sm">
              <circle cx="120" cy="120" r="109" className="fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-600" strokeWidth="1" />
              {round.palette.colors.map((color, index) => {
                const start = cursor;
                cursor += color.share;
                return <path key={`${color.hex}-${index}`} d={donutSlicePath(start, cursor)} fill={color.hex} stroke="#ffffff" strokeWidth="0.85">
                  <title>{color.hex}: {percent(color.share)}</title>
                </path>;
              })}
              <circle cx="120" cy="120" r="57" className="fill-card" />
              <text x="120" y="115" textAnchor="middle" className="fill-foreground text-[28px] font-bold">?</text>
              <text x="120" y="139" textAnchor="middle" className="fill-muted-foreground text-[10px] font-semibold">{t("flagpie.ink")}</text>
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label={t("flagpie.paletteLabel")}>
            {round.palette.colors.slice(0, 8).map((color, index) => <div key={`${color.hex}-${index}`} className="flex items-center gap-1.5 text-xs tabular-nums">
              <span className="h-3.5 w-3.5 rounded-sm border border-slate-400/70" style={{ backgroundColor: color.hex }} aria-hidden />
              <span className="font-semibold">{percent(color.share)}</span>
              <span className="sr-only">{t(`flagpie.color.${colorFamily(color.hex)}`)} ({color.hex})</span>
            </div>)}
          </div>
          {round.palette.colors.length > 8 && <details className="mt-3 text-xs text-muted-foreground">
            <summary className="min-h-11 cursor-pointer content-center text-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t("flagpie.allColors", { n: round.palette.colors.length })}</summary>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">{round.palette.colors.slice(8).map((color, index) => <span key={`${color.hex}-${index}`} className="flex items-center gap-1.5 tabular-nums">
              <span className="h-3.5 w-3.5 rounded-sm border border-slate-400/70" style={{ backgroundColor: color.hex }} aria-hidden />{percent(color.share)}<span className="sr-only">{t(`flagpie.color.${colorFamily(color.hex)}`)} ({color.hex})</span>
            </span>)}</div>
          </details>}
        </div>
        <AnswerPanel key={round.answer.cca3} mode="choice" options={round.options.map((country) => ({ id: country.cca3, label: countryName(country, locale) }))}
          correctId={round.answer.cca3} accepted={[]} answered={Boolean(session.answer)} onAnswer={session.commit} />
        <RoundFeedback session={session} answerLabel={countryName(round.answer, locale)}>
          <FlagImage code={round.answer.flag} alt={countryName(round.answer, locale)} className="mx-auto w-full max-w-[190px] shadow-sm" />
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">{t("flagpie.revealNote")}</p>
          {getFlagPolicyNote(round.answer.flag, locale) && <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-muted-foreground">{getFlagPolicyNote(round.answer.flag, locale)}</p>}
        </RoundFeedback>
      </>}
    </VisualGameFrame>
  );
}
