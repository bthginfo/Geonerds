"use client";

import { useMemo, useState } from "react";
import { Eye, Plus, Scan } from "lucide-react";
import { countryName, poolForDifficulty } from "@/data/countries";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { newRunSeed } from "@/lib/random";
import { getFlagPolicyNote } from "@/lib/flag-policy";
import { countryAccepted } from "@/games/aliases";
import { AnswerPanel, RoundFeedback, VisualGameFrame, useVisualSession, type VisualPlayHandlers, type VisualSessionUI } from "@/games/flag-pie/game-kit";
import { buildMosaicRounds, mosaicScore, revealNextTiles, type MosaicRound } from "./generator";

function MosaicRoundView({ round, session, handlers }: { round: MosaicRound; session: VisualSessionUI; handlers: VisualPlayHandlers }) {
  const { t, locale } = useT();
  const [revealed, setRevealed] = useState(() => new Set(round.tileOrder.slice(0, round.initialTiles)));
  const [revealCount, setRevealCount] = useState(1);
  const totalTiles = round.columns * round.rows;
  const remaining = totalTiles - revealed.size;
  const points = mosaicScore(revealed.size, totalTiles, round.initialTiles, handlers.difficulty);
  const answered = Boolean(session.answer);

  function revealTile(tile: number) {
    if (answered || revealed.has(tile)) return;
    setRevealed((current) => new Set([...current, tile]));
  }

  return <>
    <header className="text-center">
      <p className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Scan className="h-4 w-4" aria-hidden />{t("flagmosaic.kicker")}</p>
      <h1 className="text-xl font-bold sm:text-2xl">{t("flagmosaic.prompt")}</h1>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{t("flagmosaic.instruction")}</p>
    </header>
    <div className="rounded-3xl border border-border bg-card/90 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold" aria-live="polite">
        <span className="flex items-center gap-1.5 text-muted-foreground"><Eye className="h-4 w-4" aria-hidden />{t("flagmosaic.visible", { n: answered ? totalTiles : revealed.size, total: totalTiles })}</span>
        {!handlers.practice && !answered && <span className="rounded-md border border-amber-400/50 bg-amber-300/20 px-2 py-1 text-amber-900 dark:text-amber-200">{t("flagmosaic.points", { n: points })}</span>}
      </div>
      <div className="relative mx-auto w-full max-w-[340px] overflow-hidden rounded-lg bg-slate-100 shadow-md dark:bg-slate-900">
        <div aria-hidden={!answered}><FlagImage code={round.answer.flag} alt={answered ? countryName(round.answer, locale) : ""} rounded={false} className="w-full" /></div>
        {!answered && <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${round.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${round.rows}, minmax(0, 1fr))` }}>
          {Array.from({ length: totalTiles }, (_, tile) => <button
            key={tile}
            disabled={revealed.has(tile)}
            onClick={() => revealTile(tile)}
            aria-label={t(revealed.has(tile) ? "flagmosaic.tileRevealed" : "flagmosaic.revealTile", { n: tile + 1 })}
            className={revealed.has(tile)
              ? "border border-white/60 bg-transparent"
              : "flex items-center justify-center border border-slate-500/40 bg-slate-800 text-white transition hover:bg-slate-700 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-sky-300 active:bg-slate-600"}
          >{!revealed.has(tile) && <span className="flex flex-col items-center gap-0.5"><Plus className="h-4 w-4 text-sky-300" aria-hidden /><span className="text-[10px] tabular-nums text-slate-300">{String(tile + 1).padStart(2, "0")}</span></span>}</button>)}
        </div>}
      </div>
      {!answered && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <label className="text-xs font-semibold text-muted-foreground" htmlFor="mosaic-reveal-count">{t("flagmosaic.revealCount")}</label>
        <select id="mosaic-reveal-count" value={revealCount} onChange={(event) => setRevealCount(Number(event.target.value))} disabled={remaining === 0}
          className="h-11 rounded-lg border border-border bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary disabled:opacity-50">
          {[1, 2, 4].map((count) => <option key={count} value={count}>{count}</option>)}
        </select>
        <Button variant="outline" disabled={remaining === 0} onClick={() => setRevealed((current) => revealNextTiles(current, round.tileOrder, revealCount))}>
          <Eye className="h-4 w-4" aria-hidden />{t("flagmosaic.revealMore", { n: Math.min(revealCount, remaining) })}
        </Button>
        <p className="w-full text-center text-[11px] text-muted-foreground">{t("flagmosaic.remaining", { n: remaining })}</p>
      </div>}
    </div>
    <AnswerPanel mode={handlers.mode} options={round.options.map((country) => ({ id: country.cca3, label: countryName(country, locale) }))}
      correctId={round.answer.cca3} accepted={countryAccepted(round.answer)} answered={answered}
      onAnswer={(correct) => session.commit(correct, correct ? points : 0)} />
    <RoundFeedback session={session} answerLabel={countryName(round.answer, locale)}>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("flagmosaic.revealNote", { n: revealed.size, total: totalTiles })}</p>
      {getFlagPolicyNote(round.answer.flag, locale) && <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-muted-foreground">{getFlagPolicyNote(round.answer.flag, locale)}</p>}
    </RoundFeedback>
  </>;
}

export function FlagMosaicGame(handlers: VisualPlayHandlers) {
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const rounds = useMemo(() => buildMosaicRounds(poolForDifficulty(handlers.difficulty), handlers.difficulty, handlers.roundCount, seed), [handlers.difficulty, handlers.roundCount, seed]);
  const hits = useMemo(() => rounds.map((round) => round.answer.cca3), [rounds]);
  const session = useVisualSession({ ...handlers, total: rounds.length, hits, timeLimitMs: 40000 });
  const round = rounds[session.index];
  return <VisualGameFrame gameId="flag-mosaic" session={session} handlers={handlers}>
    {round && <MosaicRoundView key={round.answer.cca3} round={round} session={session} handlers={handlers} />}
  </VisualGameFrame>;
}
