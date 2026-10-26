"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Globe2, RotateCcw, X } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ProgressBar, RoundPill, ScorePill } from "@/components/game/hud";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { countryName, poolForDifficulty } from "@/data/countries";
import { capitalLabel } from "@/games/aliases";
import { useT } from "@/i18n/I18nProvider";
import { getFlagPolicyNote } from "@/lib/flag-policy";
import { haptic } from "@/lib/haptics";
import { newRunSeed } from "@/lib/random";
import { sound } from "@/lib/sound";
import type { Country } from "@/lib/types";
import { cn } from "@/lib/utils";
import { atlasMatchPoints, buildAtlasMatchBoards, isAtlasMatch } from "./generator";

interface MatchState {
  boardIndex: number;
  open: string[];
  solved: string[];
  mistakes: Record<string, number>;
  matched: number;
  turns: number;
  marks: boolean[];
  score: number;
  streak: number;
  bestStreak: number;
  countryHits: string[];
  feedback: { kind: "match"; country: Country; earned: number } | { kind: "miss" } | null;
}

function initialState(): MatchState {
  return { boardIndex: 0, open: [], solved: [], mistakes: {}, matched: 0, turns: 0, marks: [], score: 0, streak: 0, bestStreak: 0, countryHits: [], feedback: null };
}

export function AtlasMatchGame(handlers: PlayHandlers) {
  const { t, locale } = useT();
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const boards = useMemo(() => buildAtlasMatchBoards(poolForDifficulty(handlers.difficulty), handlers.difficulty, handlers.roundCount, seed), [handlers.difficulty, handlers.roundCount, seed]);
  const total = useMemo(() => boards.reduce((count, board) => count + board.countries.length, 0), [boards]);
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const finishedRef = useRef(false);
  const startRef = useRef(Date.now());
  const boardRef = useRef<HTMLElement>(null);
  const feedbackRef = useRef<HTMLElement>(null);
  const board = boards[state.boardIndex];
  const boardComplete = Boolean(board && state.solved.length === board.countries.length);
  const isLast = state.boardIndex + 1 === boards.length;
  const flagPolicyNote = state.feedback?.kind === "match" ? getFlagPolicyNote(state.feedback.country.flag, locale) : null;

  useEffect(() => {
    if (state.boardIndex === 0) return;
    boardRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    boardRef.current?.focus({ preventScroll: true });
  }, [state.boardIndex]);

  useEffect(() => {
    if (!state.feedback) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    feedbackRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [state.feedback]);

  function commit(next: MatchState) {
    stateRef.current = next;
    setState(next);
  }

  function flip(cardId: string) {
    const current = stateRef.current;
    const currentBoard = boards[current.boardIndex];
    if (finishedRef.current || !currentBoard || current.open.length >= 2 || current.open.includes(cardId)) return;
    const card = currentBoard.cards.find((item) => item.id === cardId);
    if (!card || current.solved.includes(card.country.cca3)) return;
    haptic.tap();
    if (current.open.length === 0) {
      commit({ ...current, open: [cardId], feedback: null });
      return;
    }
    const first = currentBoard.cards.find((item) => item.id === current.open[0]);
    if (!first) return;
    if (isAtlasMatch(first, card)) {
      const earned = handlers.practice ? 0 : atlasMatchPoints(current.mistakes[card.country.cca3] ?? 0);
      const streak = current.streak + 1;
      commit({ ...current, open: [], solved: [...current.solved, card.country.cca3], matched: current.matched + 1,
        turns: current.turns + 1, marks: [...current.marks, true], score: current.score + earned, streak, bestStreak: Math.max(current.bestStreak, streak),
        countryHits: [...current.countryHits, card.country.cca3], feedback: { kind: "match", country: card.country, earned } });
      sound.correct();
      haptic.success();
    } else {
      commit({ ...current, open: [...current.open, cardId], turns: current.turns + 1, marks: [...current.marks, false], streak: 0,
        mistakes: { ...current.mistakes, [first.country.cca3]: (current.mistakes[first.country.cca3] ?? 0) + 1, [card.country.cca3]: (current.mistakes[card.country.cca3] ?? 0) + 1 }, feedback: { kind: "miss" } });
      sound.wrong();
      haptic.error();
    }
  }

  function turnBack() {
    const current = stateRef.current;
    if (current.open.length !== 2 || current.feedback?.kind !== "miss" || finishedRef.current) return;
    commit({ ...current, open: [], feedback: null });
    haptic.tap();
    boardRef.current?.focus({ preventScroll: true });
  }

  function next() {
    const current = stateRef.current;
    if (finishedRef.current || current.solved.length !== boards[current.boardIndex]?.countries.length) return;
    if (current.boardIndex + 1 < boards.length) {
      commit({ ...current, boardIndex: current.boardIndex + 1, open: [], solved: [], mistakes: {}, feedback: null });
      haptic.tap();
      return;
    }
    finishedRef.current = true;
    handlers.onFinish({ score: current.score, correct: current.matched, total: current.turns, bestStreak: current.bestStreak,
      durationMs: Date.now() - startRef.current, mode: "choice", marks: current.marks, countryHits: current.countryHits });
  }

  return (
    <div className="geo-workbench flex flex-1 flex-col">
      <GameTopBar title={t("games.atlas-match.name")} onExit={handlers.onExit} compactMobileTitle>
        {!handlers.practice && <ScorePill value={state.score} />}
        <RoundPill current={state.matched} total={total} />
      </GameTopBar>
      <div className="mx-auto w-full max-w-2xl px-4 pt-3"><ProgressBar value={state.matched / Math.max(1, total)} /></div>
      <section ref={boardRef} tabIndex={-1} aria-label={t("games.atlas-match.name")} className="mx-auto flex w-full max-w-2xl scroll-mt-16 flex-1 flex-col gap-4 px-4 py-5 outline-none sm:py-7">
        {!board ? <div className="my-auto rounded-2xl border border-border bg-card p-6 text-center"><p className="mb-4 text-sm text-muted-foreground">{t("atlasmatch.empty")}</p><Button onClick={handlers.onExit}>{t("nav.home")}</Button></div> : <>
          <header>
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">{t(handlers.difficulty === "easy" ? "atlasmatch.objectiveCountry" : "atlasmatch.objectiveCapital")}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("atlasmatch.instruction")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
              <span>{t("atlasmatch.board", { n: state.boardIndex + 1 })} · {t("atlasmatch.turns", { n: state.turns })}</span>
              <span>{t("atlasmatch.collected", { found: state.matched, total })}</span>
            </div>
          </header>
          <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-label={t("atlasmatch.board", { n: state.boardIndex + 1 })}>
            {board.cards.map((card, index) => {
              const solved = state.solved.includes(card.country.cca3);
              const open = solved || state.open.includes(card.id);
              const label = handlers.difficulty === "easy" ? countryName(card.country, locale) : capitalLabel(card.country, locale);
              const accessibleLabel = solved ? t("atlasmatch.solvedCard", { country: countryName(card.country, locale), capital: capitalLabel(card.country, locale) || "—" }) : !open ? t("atlasmatch.faceDown", { n: index + 1 }) : card.face === "flag" ? t("atlasmatch.flagCard", { n: index + 1 }) : t("atlasmatch.labelCard", { n: index + 1, label });
              return <button key={card.id} onClick={() => flip(card.id)} disabled={solved || (state.open.length === 2 && !open)} aria-label={accessibleLabel} aria-pressed={open}
                className={cn("relative flex min-h-[100px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border-2 px-1.5 py-3 text-center transition-[background-color,border-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none sm:min-h-[122px] sm:px-3",
                  !open && "border-border bg-card hover:border-primary/60 hover:bg-primary/5 active:scale-[0.97]",
                  open && !solved && "border-primary bg-primary/5",
                  solved && "border-emerald-600/55 bg-emerald-500/10")}
              >
                {!open ? <><Globe2 className="h-7 w-7 text-primary/80 sm:h-8 sm:w-8" aria-hidden /><span className="mt-2 text-[10px] font-semibold tabular-nums text-muted-foreground" aria-hidden>{String(index + 1).padStart(2, "0")}</span></> : card.face === "flag" ? <FlagImage code={card.country.flag} alt="" className="w-full max-w-[100px]" /> : <span className="w-full break-words text-[11px] font-bold leading-snug min-[390px]:text-xs sm:text-base">{label}</span>}
                {solved && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white dark:bg-emerald-400 dark:text-slate-950"><Check className="h-3.5 w-3.5" aria-hidden /></span>}
              </button>;
            })}
          </div>
          <section ref={feedbackRef} aria-live="polite" aria-atomic="true" className={cn("scroll-mt-16 rounded-xl border p-4", state.feedback?.kind === "miss" ? "border-amber-600/45 bg-amber-500/10" : state.feedback?.kind === "match" ? "border-emerald-600/40 bg-emerald-500/10" : "border-border bg-card")}>
            {state.feedback?.kind === "miss" ? <>
              <p className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200"><X className="h-4 w-4 shrink-0" aria-hidden />{t("atlasmatch.notPair")}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("atlasmatch.missHint")}</p>
              <Button onClick={turnBack} variant="outline" className="mt-3 h-auto min-h-11 w-full whitespace-normal py-2"><RotateCcw className="h-4 w-4 shrink-0" aria-hidden />{t("atlasmatch.turnBack")}</Button>
            </> : state.feedback?.kind === "match" ? <>
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-200"><Check className="h-4 w-4 shrink-0" aria-hidden />{t(boardComplete ? "atlasmatch.boardCleared" : "atlasmatch.match")}</p>{state.feedback.earned > 0 && <span className="text-sm font-bold tabular-nums text-emerald-900 dark:text-emerald-200">+{state.feedback.earned}</span>}</div>
              <p className="mt-2 break-words font-bold">{countryName(state.feedback.country, locale)}</p>
              {state.feedback.country.capital && <p className="mt-1 text-sm text-muted-foreground">{t("atlasmatch.capital", { capital: capitalLabel(state.feedback.country, locale) })}</p>}
              {flagPolicyNote && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{flagPolicyNote}</p>}
              {boardComplete && <Button onClick={next} className="mt-4 h-auto min-h-11 w-full whitespace-normal py-2">{t(isLast ? "atlasmatch.finish" : "atlasmatch.nextBoard")}<ArrowRight className="h-4 w-4 shrink-0" aria-hidden /></Button>}
            </> : <p className="text-sm leading-relaxed text-muted-foreground">{t(state.open.length === 1 ? "atlasmatch.firstCard" : handlers.practice ? "atlasmatch.practiceHint" : "atlasmatch.scoreHint")}</p>}
          </section>
        </>}
      </section>
    </div>
  );
}
