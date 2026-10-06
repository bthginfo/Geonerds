"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Lightbulb, MapPin, MoonStar } from "lucide-react";
import { ADASTRA_CREDIT, ADASTRA_USAGE_URL } from "@/data/adastra";
import { countryName, getCountryByCca3 } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { newRunSeed } from "@/lib/random";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { getAdastraCatalogVersion } from "@/lib/adastra-catalog-version";
import { AnswerPanel, RoundFeedback, VisualGameFrame, useVisualSession, type VisualPlayHandlers, type VisualSessionUI } from "@/games/flag-pie/game-kit";
import { adastraAnswerScore, makeAdastraRounds, type AdastraRound } from "./rounds";
import { NightPhotoViewer } from "./photo-viewer";

export function AdastraGame(handlers: VisualPlayHandlers) {
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const rounds = useMemo(() => makeAdastraRounds({ seed, rounds: handlers.roundCount, difficulty: handlers.difficulty, catalogVersion: getAdastraCatalogVersion(seed, handlers.challenge) }), [seed, handlers.roundCount, handlers.difficulty, handlers.challenge]);
  const hits = useMemo(() => rounds.map((round) => (round.city.countryCodes?.length ?? 0) > 1 ? undefined : round.city.cca3), [rounds]);
  const session = useVisualSession({ ...handlers, timed: false, total: rounds.length, hits });
  const round = rounds[session.index];
  const nextSrc = rounds[session.index + 1]?.photo.src;
  useEffect(() => {
    if (!nextSrc) return;
    const preload = new window.Image();
    preload.src = nextSrc;
  }, [nextSrc]);

  return <VisualGameFrame gameId="adastra" session={session} handlers={{ ...handlers, timed: false }} wide>
    {round && <NightObservation key={`${session.index}:${round.photo.id}`} round={round} session={session} handlers={handlers} />}
  </VisualGameFrame>;
}

function NightObservation({ round, session, handlers }: { round: AdastraRound; session: VisualSessionUI; handlers: VisualPlayHandlers }) {
  const { t, locale } = useT();
  const [ready, setReady] = useState(false);
  const [regionalHint, setRegionalHint] = useState(handlers.difficulty === "easy");
  const [clue, setClue] = useState(false);
  const hints = Number(regionalHint && handlers.difficulty !== "easy") + Number(clue);
  const points = adastraAnswerScore(handlers.difficulty, hints, handlers.practice);
  const answered = Boolean(session.answer);
  const country = (round.city.countryCodes?.length ?? 0) > 1 ? undefined : getCountryByCca3(round.city.cca3);
  const kind = round.city.kind ?? "city";

  function answer(correct: boolean) {
    if (!ready || answered) return;
    if (correct) haptic.success();
    else haptic.error();
    session.commit(correct, points);
  }

  return <>
    <header>
      <p className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold tracking-wide text-amber-800 dark:text-amber-300"><MoonStar className="h-4 w-4" aria-hidden />{t("adastra.kicker")}<span className="max-w-full rounded-md border border-amber-600/25 bg-amber-500/10 px-2 py-1 leading-relaxed">{t(`adastra.kind.${kind}`)}</span></p>
      <h1 className="text-xl font-extrabold tracking-tight sm:text-3xl">{t(`adastra.prompt.${kind}`)}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(kind === "city" ? "adastra.instruction" : "adastra.networkTip")}</p>
    </header>
    <NightPhotoViewer photo={round.photo} revealed={answered} onReady={setReady} onExit={handlers.onExit} />
    <a href={ADASTRA_USAGE_URL} target="_blank" rel="noopener noreferrer" title={ADASTRA_CREDIT} className="-mt-3 inline-flex w-fit max-w-full items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground underline decoration-border underline-offset-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("adastra.credit")}<ExternalLink className="h-3 w-3 shrink-0" aria-hidden /></a>
    {ready && <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <p className="text-sm font-bold tabular-nums text-amber-800 dark:text-amber-300" aria-live="polite">{handlers.practice ? t("adastra.practice") : t("adastra.points", { n: points })}</p>
        {!answered && <div className="flex flex-wrap gap-2">
          {!regionalHint && <HintButton icon="region" title={t("adastra.region")} cost={t("adastra.hintCost")} onClick={() => { setRegionalHint(true); haptic.tap(); }} />}
          {!clue && <HintButton icon="clue" title={t("adastra.clue")} cost={t("adastra.hintCost")} onClick={() => { setClue(true); haptic.tap(); }} />}
        </div>}
      </div>
      {(regionalHint || clue) && <div className="-mt-2 grid gap-2 sm:grid-cols-2" aria-live="polite">
        {regionalHint && <div className="rounded-xl border border-sky-600/25 bg-sky-500/5 p-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-sky-800 dark:text-sky-300"><MapPin className="h-3.5 w-3.5" aria-hidden />{t("adastra.region")}</p><p className="mt-1 text-sm font-semibold">{round.city.regionHint[locale]}</p>{handlers.difficulty === "easy" && <p className="mt-1 text-[11px] text-muted-foreground">{t("adastra.freeHint")}</p>}</div>}
        {clue && <div className="rounded-xl border border-amber-600/25 bg-amber-500/5 p-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300"><Lightbulb className="h-3.5 w-3.5" aria-hidden />{t("adastra.clue")}</p><p className="mt-1 text-sm leading-relaxed">{round.city.clue[locale]}</p></div>}
      </div>}
      <AnswerPanel key={round.photo.id} mode={handlers.mode} options={round.options.map((city) => ({ id: city.id, label: city.name[locale] }))}
        correctId={round.city.id} accepted={[round.city.name.en, round.city.name.de, ...round.city.aliases]} answered={answered} onAnswer={answer} placeholderKey={`adastra.typePlaceholder.${kind}`} />
    </>}
    <RoundFeedback session={session} answerLabel={`${round.city.name[locale]}${country ? ` · ${countryName(country, locale)}` : ""}`}>
      <p className="text-sm leading-relaxed">{round.city.explanation[locale]}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <span className="font-mono text-[11px] text-muted-foreground">{round.photo.id}{round.photo.capturedAt && ` · ${round.photo.capturedAt.slice(0, 10)}`}</span>
        <a href={round.photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("adastra.record")}<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
      </div>
      <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">{ADASTRA_CREDIT}</p>
    </RoundFeedback>
  </>;
}

function HintButton({ icon, title, cost, onClick }: { icon: "region" | "clue"; title: string; cost: string; onClick: () => void }) {
  const Icon = icon === "region" ? MapPin : Lightbulb;
  return <button type="button" onClick={onClick} className={cn("flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:border-amber-600/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
    <Icon className="h-4 w-4 shrink-0 text-amber-800 dark:text-amber-300" aria-hidden /><span className="min-w-0"><span className="block text-xs font-semibold">{title}</span><span className="block text-[10px] text-muted-foreground">{cost}</span></span>
  </button>;
}
