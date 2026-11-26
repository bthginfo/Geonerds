"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Eye, Info, Lightbulb, Route, X } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ProgressBar, ScorePill, StreakPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { FlagImage } from "@/components/flag-image";
import { countryName, getCountryByCca3 } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { PuzzleWrapUp } from "@/games/puzzle-wrapup";
import { dailyPuzzleNumber, dailyStreak, isDailyVariant, puzzleSeed, readDailyRecord, writeDailyRecord } from "@/games/puzzle-kit";
import { HINT_COST, WORD_POINTS, CLEAN_BONUS, areAdjacent, checkSelection, generateTrailPuzzle, trailScore, type TrailPuzzle } from "./generator";
import { PLACE_TRAILS_MESSAGES } from "./messages";

const GAME_ID = "place-trails";

/**
 * Trail colours: light tint with dark text, deep tint with light text in dark
 * mode (≥ 4.5:1 both). Places revealed without being found keep their colour
 * as a dashed ring joined by a thin line instead of a filled disc. (Outline,
 * not border: the global `* { border-color }` rule outranks border utilities.)
 */
const TRAIL_STYLES = [
  { cell: "bg-sky-200 text-sky-950 dark:bg-sky-800 dark:text-sky-50", line: "stroke-sky-200 dark:stroke-sky-800", missed: "bg-card text-foreground outline-2 -outline-offset-2 outline-dashed outline-sky-500 dark:outline-sky-400", missedLine: "stroke-sky-500 dark:stroke-sky-400" },
  { cell: "bg-emerald-200 text-emerald-950 dark:bg-emerald-800 dark:text-emerald-50", line: "stroke-emerald-200 dark:stroke-emerald-800", missed: "bg-card text-foreground outline-2 -outline-offset-2 outline-dashed outline-emerald-500 dark:outline-emerald-400", missedLine: "stroke-emerald-500 dark:stroke-emerald-400" },
  { cell: "bg-amber-200 text-amber-950 dark:bg-amber-700 dark:text-amber-50", line: "stroke-amber-200 dark:stroke-amber-700", missed: "bg-card text-foreground outline-2 -outline-offset-2 outline-dashed outline-amber-500 dark:outline-amber-400", missedLine: "stroke-amber-500 dark:stroke-amber-400" },
  { cell: "bg-rose-200 text-rose-950 dark:bg-rose-800 dark:text-rose-50", line: "stroke-rose-200 dark:stroke-rose-800", missed: "bg-card text-foreground outline-2 -outline-offset-2 outline-dashed outline-rose-500 dark:outline-rose-400", missedLine: "stroke-rose-500 dark:stroke-rose-400" },
  { cell: "bg-violet-200 text-violet-950 dark:bg-violet-800 dark:text-violet-50", line: "stroke-violet-200 dark:stroke-violet-800", missed: "bg-card text-foreground outline-2 -outline-offset-2 outline-dashed outline-violet-500 dark:outline-violet-400", missedLine: "stroke-violet-500 dark:stroke-violet-400" },
  { cell: "bg-lime-200 text-lime-950 dark:bg-lime-800 dark:text-lime-50", line: "stroke-lime-200 dark:stroke-lime-800", missed: "bg-card text-foreground outline-2 -outline-offset-2 outline-dashed outline-lime-500 dark:outline-lime-400", missedLine: "stroke-lime-500 dark:stroke-lime-400" },
  { cell: "bg-orange-200 text-orange-950 dark:bg-orange-800 dark:text-orange-50", line: "stroke-orange-200 dark:stroke-orange-800", missed: "bg-card text-foreground outline-2 -outline-offset-2 outline-dashed outline-orange-500 dark:outline-orange-400", missedLine: "stroke-orange-500 dark:stroke-orange-400" },
  { cell: "bg-fuchsia-200 text-fuchsia-950 dark:bg-fuchsia-800 dark:text-fuchsia-50", line: "stroke-fuchsia-200 dark:stroke-fuchsia-800", missed: "bg-card text-foreground outline-2 -outline-offset-2 outline-dashed outline-fuchsia-500 dark:outline-fuchsia-400", missedLine: "stroke-fuchsia-500 dark:stroke-fuchsia-400" },
];

interface FoundWord { id: number; hinted: boolean }
type FeedbackTone = "found" | "wrong" | "near" | "info";
interface Feedback { tone: FeedbackTone; text: string; points?: number; key: number }

function cellCentre(cell: number, cols: number) {
  return `${(cell % cols) + 0.5},${Math.floor(cell / cols) + 0.5}`;
}

function useThemeTitle(puzzle: TrailPuzzle) {
  const { t, locale } = useT();
  const { theme } = puzzle;
  const vars: Record<string, string> = {};
  if (theme.region) vars.region = t(`placetrails.region.${theme.region}`);
  if (theme.country) {
    const country = getCountryByCca3(theme.country);
    const override = PLACE_TRAILS_MESSAGES[locale]?.[`placetrails.of.${theme.country}`];
    vars.country = override ?? t("placetrails.ofDefault", { name: country ? countryName(country, locale) : theme.country });
  }
  return t(theme.titleKey, vars);
}

export function PlaceTrailsGame(handlers: PlayHandlers) {
  const { t, locale } = useT();
  const reducedMotion = useReducedMotion();
  const { difficulty, practice } = handlers;
  const daily = isDailyVariant(handlers.variant) && !handlers.challenge;
  const [boardLocale] = useState<Locale>(locale);
  const [seed] = useState(() => puzzleSeed(GAME_ID, { variant: handlers.variant, difficulty, seed: handlers.seed, challenge: handlers.challenge }));
  const puzzle = useMemo(() => generateTrailPuzzle(seed, difficulty, boardLocale), [seed, difficulty, boardLocale]);
  const { rows, cols, letters, words } = puzzle;
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty];
  const owner = useMemo(() => {
    const map = new Array<number>(rows * cols).fill(-1);
    for (const word of words) for (const cell of word.path) map[cell] = word.id;
    return map;
  }, [rows, cols, words]);
  const themeTitle = useThemeTitle(puzzle);

  const [found, setFound] = useState<FoundWord[]>([]);
  const [hinted, setHinted] = useState<number[]>([]);
  const [selection, setSelectionState] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [phase, setPhase] = useState<"play" | "done">("play");
  const [revealed, setRevealed] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [focusCell, setFocusCell] = useState(0);
  const [lastFound, setLastFound] = useState<number | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [alreadyPlayed] = useState(() => daily && !practice && !!readDailyRecord(GAME_ID, difficulty));

  const selectionRef = useRef<number[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const gestureRef = useRef<{ id: number; down: number; dragging: boolean; x: number; y: number } | null>(null);
  const feedbackKey = useRef(0);
  const startRef = useRef(Date.now());
  const endRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const completedRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const foundIds = useMemo(() => new Set(found.map((item) => item.id)), [found]);
  const hintedSet = useMemo(() => new Set(hinted), [hinted]);
  const outstandingHint = hinted.some((id) => !foundIds.has(id));
  const complete = phase === "done" && !revealed;
  const score = practice ? 0 : trailScore({ found: found.length, hints: hinted.length, complete, multiplier });
  const selectedSet = new Set(selection);
  const playing = phase === "play";

  useEffect(() => {
    if (phase !== "done") return;
    wrapRef.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }, [phase, reducedMotion]);

  function setSelection(next: number[]) {
    selectionRef.current = next;
    setSelectionState(next);
  }

  function say(tone: FeedbackTone, text: string, points?: number) {
    feedbackKey.current += 1;
    setFeedback({ tone, text, points, key: feedbackKey.current });
  }

  function isLocked(cell: number) {
    return owner[cell] >= 0 && foundIds.has(owner[cell]);
  }

  function shareFor(list: FoundWord[]) {
    const name = t(`games.${GAME_ID}.name`);
    const level = t(`difficulty.${difficulty}`);
    const header = daily ? t("placetrails.share.daily", { name, n: dailyPuzzleNumber(), difficulty: level }) : t("placetrails.share.endless", { name, difficulty: level });
    const marks = list.map((item) => (item.hinted ? "💡" : "🔵")).join("") + "⚪".repeat(Math.max(0, words.length - list.length));
    return `${header}\n${marks}\ngeo-nerds.com`;
  }

  function completeRun(list: FoundWord[], gaveUp: boolean) {
    if (completedRef.current) return;
    completedRef.current = true;
    endRef.current = Date.now();
    setSelection([]);
    setConfirmReveal(false);
    setRevealed(gaveUp);
    setPhase("done");
    if (!gaveUp) sound.finish();
    if (daily && !practice) {
      const finalScore = trailScore({ found: list.length, hints: hinted.length, complete: !gaveUp, multiplier });
      writeDailyRecord(GAME_ID, difficulty, { solved: !gaveUp, score: finalScore, share: shareFor(list), at: Date.now() });
      setStreakDays(dailyStreak(GAME_ID));
    }
  }

  function submit(cells: number[]) {
    if (!playing || cells.length === 0) return;
    setSelection([]);
    const result = checkSelection(puzzle, cells, foundIds);
    if (result.kind === "short") return say("info", t("placetrails.feedback.short"));
    if (result.kind === "already") return say("info", t("placetrails.feedback.already", { name: result.word.label }));
    if (result.kind === "other-path") return say("near", t("placetrails.feedback.otherPath", { name: result.word.label }));
    if (result.kind === "wrong") {
      setStreak(0);
      sound.wrong();
      haptic.error();
      return say("wrong", t(daily ? "placetrails.feedback.wrong" : "placetrails.feedback.wrongEndless"));
    }
    const word = result.word;
    const wasHinted = hintedSet.has(word.id);
    const next = [...found, { id: word.id, hinted: wasHinted }];
    setFound(next);
    setLastFound(word.id);
    if (!wasHinted) {
      const run = streak + 1;
      setStreak(run);
      setBestStreak((best) => Math.max(best, run));
    }
    sound.correct();
    haptic.success();
    say("found", t("placetrails.feedback.found", { name: word.label }), practice ? undefined : Math.round(WORD_POINTS * multiplier));
    if (next.length === words.length) completeRun(next, false);
  }

  /** Tap-to-build: extend, backtrack, restart, or submit by tapping the last letter again. */
  function tap(cell: number) {
    if (!playing || isLocked(cell)) return;
    setFocusCell(cell);
    const current = selectionRef.current;
    const last = current[current.length - 1];
    if (current.length && last === cell) return submit(current);
    const index = current.indexOf(cell);
    if (index >= 0) return setSelection(current.slice(0, index + 1));
    if (current.length && areAdjacent(last, cell, cols)) return setSelection([...current, cell]);
    setFeedback(null);
    setSelection([cell]);
  }

  function cellAt(clientX: number, clientY: number, strict: boolean): number | null {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const x = ((clientX - rect.left) / rect.width) * cols;
    const y = ((clientY - rect.top) / rect.height) * rows;
    const col = Math.floor(x);
    const row = Math.floor(y);
    if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
    // While dragging only the inner circle counts, so diagonal moves do not clip a neighbour.
    if (strict && (x - col - 0.5) ** 2 + (y - row - 0.5) ** 2 > 0.42 ** 2) return null;
    return row * cols + col;
  }

  function dragTo(cell: number) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    let current = selectionRef.current;
    if (!gesture.dragging) {
      if (cell === gesture.down) return;
      gesture.dragging = true;
      if (current[current.length - 1] !== gesture.down) current = [gesture.down];
      setFeedback(null);
    }
    const last = current[current.length - 1];
    if (current.length >= 2 && current[current.length - 2] === cell) current = current.slice(0, -1);
    else if (cell !== last && !current.includes(cell) && !isLocked(cell) && areAdjacent(last, cell, cols)) current = [...current, cell];
    if (current !== selectionRef.current) setSelection(current);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!playing || (event.pointerType === "mouse" && event.button !== 0)) return;
    const cell = cellAt(event.clientX, event.clientY, false);
    if (cell === null || isLocked(cell)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    gestureRef.current = { id: event.pointerId, down: cell, dragging: false, x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.id !== event.pointerId || !gridRef.current) return;
    const pitch = gridRef.current.getBoundingClientRect().width / cols;
    const distance = Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y);
    const steps = Math.max(1, Math.ceil(distance / (pitch / 4)));
    for (let step = 1; step <= steps; step++) {
      const cell = cellAt(gesture.x + ((event.clientX - gesture.x) * step) / steps, gesture.y + ((event.clientY - gesture.y) * step) / steps, true);
      if (cell !== null) dragTo(cell);
    }
    gesture.x = event.clientX;
    gesture.y = event.clientY;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    gestureRef.current = null;
    if (gesture.dragging) submit(selectionRef.current);
    else tap(gesture.down);
  }

  function moveFocus(cell: number) {
    setFocusCell(cell);
    cellRefs.current[cell]?.focus();
  }

  function onCellKeyDown(event: KeyboardEvent<HTMLButtonElement>, cell: number) {
    const row = Math.floor(cell / cols);
    const col = cell % cols;
    const moves: Record<string, number | null> = {
      ArrowUp: row > 0 ? cell - cols : null,
      ArrowDown: row < rows - 1 ? cell + cols : null,
      ArrowLeft: col > 0 ? cell - 1 : null,
      ArrowRight: col < cols - 1 ? cell + 1 : null,
      Home: row * cols,
      End: row * cols + cols - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      const target = moves[event.key];
      if (target !== null) moveFocus(target);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setSelection([]);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      setSelection(selectionRef.current.slice(0, -1));
    }
  }

  function takeHint() {
    if (!playing) return;
    if (outstandingHint) return say("info", t("placetrails.hintBusy"));
    const candidates = words.filter((word) => !foundIds.has(word.id) && !hintedSet.has(word.id));
    if (!candidates.length) return;
    // The trail that starts highest on the board: predictable, and it frees the top first.
    const target = candidates.reduce((best, word) => (Math.min(...word.path) < Math.min(...best.path) ? word : best));
    setHinted([...hinted, target.id]);
    haptic.tap();
    say("info", t("placetrails.feedback.hint"));
  }

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const correct = found.filter((item) => !item.hinted).length;
    handlers.onFinish({
      score: practice ? 0 : trailScore({ found: found.length, hints: hinted.length, complete: !revealed, multiplier }),
      correct,
      total: words.length,
      bestStreak: Math.min(bestStreak, correct),
      durationMs: Math.max(500, (endRef.current ?? Date.now()) - startRef.current),
      countryHits: [...new Set(found.map((item) => words[item.id].cca3))],
      mode: daily ? "daily" : "endless",
    });
  }

  const colourOf = (id: number) => TRAIL_STYLES[id % TRAIL_STYLES.length];
  
  const visibleTrails = phase === "done" ? words : words.filter((word) => foundIds.has(word.id));
  const selectionText = selection.map((cell) => letters[cell]).join("");
  const ratio = cols / rows;
  const hintsLabel = hinted.length === 0 ? t("placetrails.wrap.noHints") : hinted.length === 1 ? t("placetrails.wrap.oneHint") : t("placetrails.wrap.hints", { n: hinted.length });
  const capitalTheme = puzzle.theme.kind === "capitals";

  function placeLabel(id: number) {
    const word = words[id];
    if (!capitalTheme) return word.label;
    const country = getCountryByCca3(word.cca3);
    return country ? `${word.label} · ${countryName(country, locale)}` : word.label;
  }

  const wrapDetail = [
    t("placetrails.wrap.detail", { found: found.length, total: words.length, hints: hintsLabel }),
    complete && hinted.length === 0 && !practice ? t("placetrails.wrap.bonus", { n: Math.round(CLEAN_BONUS * multiplier) }) : null,
    daily && !practice && streakDays > 1 ? t("placetrails.wrap.streak", { n: streakDays }) : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="geo-workbench flex flex-1 flex-col">
      <GameTopBar title={t(`games.${GAME_ID}.name`)} onExit={handlers.onExit} compactMobileTitle>
        {!practice && <ScorePill value={score} />}
        <div aria-label={t("placetrails.foundPill", { found: found.length, total: words.length })} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground min-[420px]:text-sm">
          <Route className="h-3.5 w-3.5" aria-hidden />
          {found.length}/{words.length}
        </div>
        <StreakPill value={streak} />
      </GameTopBar>
      <div className="mx-auto w-full max-w-3xl px-4 pt-3">
        <ProgressBar value={found.length / words.length} />
      </div>

      <section aria-label={t(`games.${GAME_ID}.name`)} className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-8 pt-4 sm:pt-6">
        <header className="text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {daily ? t("placetrails.kicker.daily", { n: dailyPuzzleNumber() }) : t("placetrails.kicker.endless")} · {t(`difficulty.${difficulty}`)}
          </p>
          <h1 className="mt-1 text-balance text-xl font-bold leading-tight tracking-tight sm:text-2xl">{themeTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("placetrails.hidden", { n: words.length })}</p>
        </header>

        {/* Mobile: board, controls, list stacked. Desktop: board left; controls and list right. */}
        <div
          className="mt-4 grid grid-cols-1 items-start gap-4 [--pt-chrome:17.5rem] [--pt-max:24rem] md:grid-cols-[var(--pt-width)_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:gap-x-7 md:[--pt-chrome:18rem] md:[--pt-max:28rem]"
          style={{ "--pt-width": `min(100%, var(--pt-max), max(16.5rem, calc((100svh - var(--pt-chrome)) * ${ratio.toFixed(4)})))` } as CSSProperties}
        >
          <div className="mx-auto flex w-full max-w-[var(--pt-width)] flex-col items-center gap-3 md:row-span-2 md:mx-0">
            <p className="sr-only" role="status" aria-live="polite">{feedback?.text ?? ""}</p>
            {/* Selection preview and feedback */}
            {playing && <div className="flex min-h-12 w-full items-center gap-2 rounded-2xl border border-border bg-card px-2 py-1.5 shadow-sm">
              <motion.div
                key={feedback?.tone === "wrong" ? feedback.key : "preview"}
                animate={feedback?.tone === "wrong" && !reducedMotion && !selection.length ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}
                className="min-w-0 flex-1 px-2"
              >
                {selection.length > 0 ? (
                  <p aria-label={`${t("placetrails.selection")}: ${selectionText}`} className="truncate text-lg font-bold tracking-[0.12em] tabular-nums">{selectionText}</p>
                ) : (
                  <p aria-hidden={Boolean(feedback)} className={cn(
                    "flex min-w-0 items-center gap-1.5 text-sm font-semibold leading-snug",
                    !feedback && "font-medium text-muted-foreground",
                    feedback?.tone === "found" && "text-success",
                    feedback?.tone === "wrong" && "text-danger",
                    feedback?.tone === "near" && "text-warning",
                    feedback?.tone === "info" && "text-foreground",
                  )}>
                    {feedback?.tone === "found" && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                    {feedback?.tone === "wrong" && <X className="h-4 w-4 shrink-0" aria-hidden />}
                    {(feedback?.tone === "near" || feedback?.tone === "info") && <Info className="h-4 w-4 shrink-0" aria-hidden />}
                    <span className="min-w-0">{feedback?.text ?? t("placetrails.preview.empty")}</span>
                    {feedback?.points ? <span className="ml-1 shrink-0 rounded-md bg-success/15 px-1.5 py-0.5 text-xs tabular-nums">+{feedback.points}</span> : null}
                  </p>
                )}
              </motion.div>
              {selection.length > 0 && (
                <>
                  <Button variant="ghost" size="icon" aria-label={t("placetrails.clear")} onClick={() => setSelection([])}>
                    <X className="h-5 w-5" aria-hidden />
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => submit(selectionRef.current)}>
                    <Check className="h-4 w-4" aria-hidden />
                    {t("placetrails.check")}
                  </Button>
                </>
              )}
            </div>}

            {/* Letter grid */}
            <div className="relative w-full">
              <div
                ref={gridRef}
                role="group"
                aria-label={t("placetrails.grid", { cols, rows })}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => { gestureRef.current = null; }}
                onContextMenu={(event) => event.preventDefault()}
                className="@container relative w-full touch-none select-none rounded-3xl border border-border bg-card shadow-sm [-webkit-touch-callout:none]"
                style={{ aspectRatio: `${cols} / ${rows}` }}
              >
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none" aria-hidden>
                  {visibleTrails.map((word) => (
                    <motion.polyline
                      key={`trail-${word.id}`}
                      points={word.path.map((cell) => cellCentre(cell, cols)).join(" ")}
                      fill="none"
                      strokeWidth={foundIds.has(word.id) ? 0.3 : 0.08}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={foundIds.has(word.id) ? colourOf(word.id).line : colourOf(word.id).missedLine}
                      initial={reducedMotion ? false : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  ))}
                  {selection.length > 1 && (
                    <polyline points={selection.map((cell) => cellCentre(cell, cols)).join(" ")} fill="none" strokeWidth={0.22} strokeLinecap="round" strokeLinejoin="round" className="stroke-primary/70" />
                  )}
                </svg>
                <div className="relative grid h-full w-full" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
                  {letters.map((letter, cell) => {
                    const wordId = owner[cell];
                    const isFound = foundIds.has(wordId);
                    const shown = isFound || phase === "done";
                    const selected = selectedSet.has(cell);
                    const hint = !shown && hintedSet.has(wordId);
                    const pathIndex = words[wordId]?.path.indexOf(cell) ?? 0;
                    const state = [
                      selected && t("placetrails.cell.selected"),
                      isFound && t("placetrails.cell.found", { name: words[wordId].label }),
                      !isFound && phase === "done" && t("placetrails.cell.missed", { name: words[wordId].label }),
                      hint && t("placetrails.cell.hint"),
                    ].filter(Boolean).join(", ");
                    return (
                      <button
                        key={cell}
                        ref={(element) => { cellRefs.current[cell] = element; }}
                        type="button"
                        tabIndex={cell === focusCell ? 0 : -1}
                        aria-pressed={playing ? selected : undefined}
                        aria-label={`${t("placetrails.cell", { letter, row: Math.floor(cell / cols) + 1, col: (cell % cols) + 1 })}${state ? `, ${state}` : ""}`}
                        onFocus={() => setFocusCell(cell)}
                        onClick={(event) => { if (event.detail === 0) tap(cell); }}
                        onKeyDown={(event) => onCellKeyDown(event, cell)}
                        className="group flex items-center justify-center outline-none"
                      >
                        <motion.span
                          key={shown ? `shown-${cell}` : selected ? `sel-${cell}` : `idle-${cell}`}
                          initial={reducedMotion ? false : shown ? { scale: 0.7 } : selected ? { scale: 0.86 } : false}
                          animate={{ scale: 1 }}
                          transition={shown ? { type: "spring", stiffness: 420, damping: 18, delay: wordId === lastFound ? pathIndex * 0.04 : 0 } : { duration: 0.12 }}
                          className={cn(
                            "flex aspect-square w-[78%] items-center justify-center rounded-full text-[length:min(7.4cqw,1.85rem)] font-bold leading-none transition-colors",
                            "group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-card",
                            shown ? (isFound ? colourOf(wordId).cell : colourOf(wordId).missed) : selected ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground group-hover:bg-muted",
                            hint && "outline-2 outline-offset-1 outline-dashed outline-amber-600 dark:outline-amber-400",
                          )}
                        >
                          {letter}
                        </motion.span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {playing && (
              <div className="mx-auto flex w-full max-w-[var(--pt-width)] flex-wrap items-center justify-center gap-2 md:col-start-2 md:row-start-1 md:mx-0 md:max-w-none md:justify-start">
                <Button variant="outline" className="gap-2" onClick={takeHint} disabled={found.length + hinted.filter((id) => !foundIds.has(id)).length >= words.length} aria-label={practice ? t("placetrails.hint") : t("placetrails.hintCost", { n: Math.round(HINT_COST * multiplier) })}>
                  <Lightbulb className="h-4 w-4" aria-hidden />
                  {t("placetrails.hint")}
                  {!practice && <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">−{Math.round(HINT_COST * multiplier)}</span>}
                </Button>
                {!confirmReveal ? (
                  <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={() => setConfirmReveal(true)}>
                    <Eye className="h-4 w-4" aria-hidden />
                    {t("placetrails.reveal")}
                  </Button>
                ) : (
                  <div role="group" aria-label={t("placetrails.revealConfirm")} className="flex w-full flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center">
                    <p className="text-sm text-muted-foreground">{t("placetrails.revealConfirm")}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button variant="outline" onClick={() => setConfirmReveal(false)}>{t("placetrails.revealNo")}</Button>
                      <Button variant="danger" onClick={() => completeRun(found, true)}>{t("placetrails.revealYes")}</Button>
                    </div>
                  </div>
                )}
              </div>
          )}

          <aside className="flex min-w-0 flex-col gap-4 md:col-start-2">
            {playing && (
              <p className="flex gap-2 rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                <Route className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{t("placetrails.instruction")}</span>
              </p>
            )}
            {(alreadyPlayed || practice) && playing && (
              <p className="rounded-2xl border border-border p-3 text-xs leading-relaxed text-muted-foreground">{practice ? t("placetrails.practice") : t("placetrails.dailyDone")}</p>
            )}
            <div>
              <h2 className="text-sm font-semibold">{phase === "done" ? t("placetrails.placesHeading") : t("placetrails.foundHeading")}</h2>
              {phase === "play" && found.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">{t("placetrails.foundEmpty")}</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {(phase === "done" ? [...found.map((item) => item.id), ...words.filter((word) => !foundIds.has(word.id)).map((word) => word.id)] : found.map((item) => item.id)).map((id) => {
                    const item = found.find((entry) => entry.id === id);
                    const status = !item ? "missed" : item.hinted ? "hinted" : "found";
                    return (
                      <motion.li
                        key={id}
                        initial={reducedMotion || phase === "done" ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
                      >
                        <span aria-hidden className={cn("h-3 w-3 shrink-0 rounded-full", status === "missed" ? colourOf(id).missed : colourOf(id).cell)} />
                        <FlagImage code={words[id].flag} className="h-5 w-auto shrink-0 shadow-sm" />
                        <span className="min-w-0 flex-1 break-words text-sm font-semibold">{placeLabel(id)}</span>
                        <span className={cn("flex shrink-0 items-center gap-1 text-xs font-medium", status === "found" ? "text-success" : status === "hinted" ? "text-warning" : "text-muted-foreground")}>
                          {status === "found" ? <Check className="h-3.5 w-3.5" aria-hidden /> : status === "hinted" ? <Lightbulb className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
                          <span className={cn(status === "found" && "sr-only min-[420px]:not-sr-only")}>{t(`placetrails.status.${status}`)}</span>
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>

        {phase === "done" && (
          <div ref={wrapRef} className="mt-6 scroll-mt-20">
            <PuzzleWrapUp
              solved={!revealed}
              title={t(revealed ? "placetrails.wrap.revealed" : "placetrails.wrap.solved")}
              detail={wrapDetail}
              share={practice ? undefined : shareFor(found)}
              daily={daily}
              onContinue={finish}
            />
          </div>
        )}
      </section>
    </div>
  );
}
