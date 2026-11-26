"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, CircleDot, Eye, Info, Send, Shuffle, Sparkles, X } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ScorePill, StreakPill } from "@/components/game/hud";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { countryName, getCountryByCca3 } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { cn, formatNumber } from "@/lib/utils";
import { dailyPuzzleNumber, dailyStreak, isDailyVariant, puzzleSeed, readDailyRecord, writeDailyRecord } from "@/games/puzzle-kit";
import { PuzzleWrapUp } from "@/games/puzzle-wrapup";
import { useGameTimeouts } from "@/games/use-game-timeouts";
import {
  GROUP_LEVELS,
  MAX_MISTAKES,
  categoryLabelKey,
  evaluateGuess,
  generateBoard,
  geoGroupsScore,
  guessKey,
  shareRows,
  type GeoGroup,
  type GroupLevel,
} from "./generator";

const GAME_ID = "geo-groups" as const;

/** Category colours with dark-mode variants; text contrast stays well above 4.5:1. */
const LEVEL_SURFACE: Record<GroupLevel, string> = {
  0: "border-amber-300 bg-amber-200 text-amber-950 dark:border-amber-300/40 dark:bg-amber-400/20 dark:text-amber-50",
  1: "border-emerald-300 bg-emerald-200 text-emerald-950 dark:border-emerald-300/40 dark:bg-emerald-400/20 dark:text-emerald-50",
  2: "border-sky-300 bg-sky-200 text-sky-950 dark:border-sky-300/40 dark:bg-sky-400/20 dark:text-sky-50",
  3: "border-violet-300 bg-violet-200 text-violet-950 dark:border-violet-300/40 dark:bg-violet-400/25 dark:text-violet-50",
};

const LEVEL_SWATCH: Record<GroupLevel, string> = {
  0: "bg-amber-300 text-amber-950",
  1: "bg-emerald-300 text-emerald-950",
  2: "bg-sky-300 text-sky-950",
  3: "bg-violet-300 text-violet-950",
};

const TILE_HEIGHT = "h-[78px] min-[400px]:h-[86px] sm:h-24";

interface SolvedEntry {
  level: GroupLevel;
  byPlayer: boolean;
}

interface Feedback {
  tone: "success" | "warning" | "danger" | "muted";
  text: string;
}

interface Summary {
  won: boolean;
  perfect: boolean;
  found: number;
  mistakes: number;
  score: number;
  share: string;
  streak: number;
}

function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function LevelBadge({ level }: { level: GroupLevel }) {
  return (
    <span aria-hidden className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black tabular-nums", LEVEL_SWATCH[level])}>
      {level + 1}
    </span>
  );
}

function SolvedBar({ group, byPlayer }: { group: GeoGroup; byPlayer: boolean }) {
  const { t, locale } = useT();
  const label = t(categoryLabelKey(group.categoryId));
  const names = group.members.map((code) => {
    const country = getCountryByCca3(code);
    return country ? countryName(country, locale) : code;
  }).sort((a, b) => a.localeCompare(b, locale));
  return (
    <div
      role="group"
      aria-label={`${t("geogroups.levelBadge", { n: group.level + 1 })}, ${t(`geogroups.level.${group.level}`)}: ${label}`}
      className={cn(
        "flex min-h-[78px] w-full flex-col items-center justify-center rounded-xl border px-3 py-2 text-center min-[400px]:min-h-[86px] sm:min-h-24",
        LEVEL_SURFACE[group.level],
        !byPlayer && "border-2 border-dashed",
      )}
    >
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold uppercase tracking-wide opacity-90">
        <LevelBadge level={group.level} />
        <span>{t(`geogroups.level.${group.level}`)}</span>
        {!byPlayer && (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-1.5 py-px normal-case tracking-normal dark:bg-white/15">
            <Eye className="h-3 w-3" aria-hidden />
            {t("geogroups.revealed")}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-sm font-extrabold leading-snug sm:text-base">{label}</p>
      <p className="mt-0.5 text-xs leading-snug sm:text-sm" lang={locale}>{names.join(" · ")}</p>
    </div>
  );
}

export function GeoGroupsGame(handlers: PlayHandlers) {
  const { t, locale } = useT();
  const reducedMotion = useReducedMotion();
  const { schedule } = useGameTimeouts();
  const { difficulty, practice } = handlers;
  const daily = isDailyVariant(handlers.variant) && !handlers.challenge;

  const [seed] = useState(() => puzzleSeed(GAME_ID, { variant: handlers.variant, difficulty, seed: handlers.seed, challenge: handlers.challenge }));
  const [puzzleNumber] = useState(() => dailyPuzzleNumber());
  const [priorDaily] = useState(() => (daily && !practice ? readDailyRecord(GAME_ID, difficulty) : null));
  const board = useMemo(() => generateBoard(seed, difficulty), [seed, difficulty]);

  const [order, setOrder] = useState<string[]>(() => board.tiles);
  const [selected, setSelected] = useState<string[]>([]);
  const [solved, setSolved] = useState<SolvedEntry[]>([]);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [locking, setLocking] = useState<GroupLevel | null>(null);
  const [shaking, setShaking] = useState<{ codes: string[]; nonce: number } | null>(null);
  const [phase, setPhase] = useState<"playing" | "revealing" | "done">("playing");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  const startedAt = useRef(0);
  const finished = useRef(false);
  const reported = useRef(false);
  const restoreFocus = useRef(false);
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // After a group locks in, keep keyboard focus inside the grid.
  useEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;
    if (document.activeElement && document.activeElement !== document.body) return;
    const first = order[0];
    if (first) tileRefs.current.get(first)?.focus();
  }, [order]);

  const multiplier = DIFFICULTY_MULTIPLIER[difficulty];
  const solvedByPlayer = solved.filter((entry) => entry.byPlayer).length;
  const liveScore = practice ? 0 : geoGroupsScore({ solvedByPlayer, mistakes, multiplier });
  const busy = locking !== null || phase !== "playing";
  const mistakesLeft = Math.max(0, MAX_MISTAKES - mistakes);
  const groupByLevel = useMemo(() => new Map(board.groups.map((group) => [group.level, group])), [board]);
  const activeIndex = Math.min(focusIndex, Math.max(0, order.length - 1));
  const difficultyLabel = t(`difficulty.${difficulty}`);

  function finishBoard(final: { found: number; mistakes: number; guesses: string[][] }) {
    if (finished.current) return;
    finished.current = true;
    const won = final.found === 4;
    const score = practice ? 0 : geoGroupsScore({ solvedByPlayer: final.found, mistakes: final.mistakes, multiplier });
    const name = t("games.geo-groups.name");
    const header = daily
      ? `GeoNerds ${name} #${puzzleNumber} (${difficultyLabel})`
      : `GeoNerds ${name} · ${t("geogroups.shareEndless")} (${difficultyLabel})`;
    const share = [header, ...shareRows(board, final.guesses), "geo-nerds.com"].join("\n");
    if (daily && !practice) writeDailyRecord(GAME_ID, difficulty, { solved: won, score, share, at: Date.now() });
    setSummary({
      won,
      perfect: won && final.mistakes === 0,
      found: final.found,
      mistakes: final.mistakes,
      score,
      share,
      streak: daily && !practice ? dailyStreak(GAME_ID) : 0,
    });
    setPhase("done");
    sound.finish();
    if (won) haptic.success();
  }

  function revealRemaining(final: { found: number; mistakes: number; guesses: string[][] }, message: string) {
    setPhase("revealing");
    setSelected([]);
    setFeedback({ tone: "muted", text: message });
    const done = new Set(solved.map((entry) => entry.level));
    const remaining = board.groups.filter((group) => !done.has(group.level));
    remaining.forEach((group, index) => {
      schedule(() => {
        setOrder((current) => current.filter((code) => !group.members.includes(code)));
        setSolved((current) => [...current, { level: group.level, byPlayer: false }]);
        if (index === remaining.length - 1) finishBoard(final);
      }, reducedMotion ? 0 : 350 + index * 650);
    });
    if (!remaining.length) finishBoard(final);
  }

  function toggle(code: string) {
    if (busy) return;
    setFeedback(null);
    setSelected((current) => {
      if (current.includes(code)) return current.filter((value) => value !== code);
      if (current.length >= 4) return current;
      haptic.tap();
      return [...current, code];
    });
  }

  function submit() {
    if (busy || selected.length !== 4) return;
    const guess = [...selected];
    if (guesses.some((previous) => guessKey(previous) === guessKey(guess))) {
      setFeedback({ tone: "muted", text: t("geogroups.already") });
      return;
    }
    const nextGuesses = [...guesses, guess];
    setGuesses(nextGuesses);
    const outcome = evaluateGuess(board, guess);

    if (outcome.kind === "correct") {
      sound.correct();
      haptic.success();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((best) => Math.max(best, nextStreak));
      const group = groupByLevel.get(outcome.level)!;
      setFeedback({ tone: "success", text: t("geogroups.correct", { category: t(categoryLabelKey(group.categoryId)) }) });
      // Gather the four tiles in the first free row, then lock them in as a bar.
      setOrder((current) => [...guess, ...current.filter((code) => !guess.includes(code))]);
      setLocking(outcome.level);
      const found = solvedByPlayer + 1;
      const completes = solved.length + 1 === 4;
      schedule(() => {
        restoreFocus.current = true;
        setOrder((current) => current.filter((code) => !guess.includes(code)));
        setSolved((current) => [...current, { level: outcome.level, byPlayer: true }]);
        setSelected([]);
        setLocking(null);
        if (completes) finishBoard({ found, mistakes, guesses: nextGuesses });
      }, reducedMotion ? 150 : 560);
      return;
    }

    sound.wrong();
    haptic.error();
    setStreak(0);
    setShaking({ codes: guess, nonce: (shaking?.nonce ?? 0) + 1 });
    schedule(() => setShaking(null), 520);
    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    const left = MAX_MISTAKES - nextMistakes;
    if (outcome.kind === "one-away") setFeedback({ tone: "warning", text: t("geogroups.oneAway") });
    else if (practice) setFeedback({ tone: "danger", text: t("geogroups.wrongPractice") });
    else if (left > 0) setFeedback({ tone: "danger", text: left === 1 ? t("geogroups.wrongOne") : t("geogroups.wrong", { n: left }) });
    if (!practice && left <= 0) {
      setLocking(null);
      setPhase("revealing");
      schedule(() => revealRemaining({ found: solvedByPlayer, mistakes: nextMistakes, guesses: nextGuesses }, t("geogroups.outOfMistakes")), reducedMotion ? 400 : 900);
    }
  }

  function onTileKey(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    switch (event.key) {
      case "ArrowRight": next = index + 1; break;
      case "ArrowLeft": next = index - 1; break;
      case "ArrowDown": next = index + 4; break;
      case "ArrowUp": next = index - 4; break;
      case "Home": next = 0; break;
      case "End": next = order.length - 1; break;
      default: return;
    }
    event.preventDefault();
    next = Math.max(0, Math.min(order.length - 1, next));
    setFocusIndex(next);
    tileRefs.current.get(order[next])?.focus();
  }

  function handleContinue() {
    if (!summary || reported.current) return;
    reported.current = true;
    const countryHits = solved.filter((entry) => entry.byPlayer).flatMap((entry) => groupByLevel.get(entry.level)?.members ?? []);
    handlers.onFinish({
      score: summary.score,
      correct: summary.found,
      total: 4,
      bestStreak: Math.min(bestStreak, summary.found),
      durationMs: Math.max(500, Date.now() - (startedAt.current || Date.now())),
      countryHits,
    });
  }

  const layoutTransition = { duration: reducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] as const };
  const mistakesText = !summary ? "" : summary.mistakes === 1 ? t("geogroups.mistakeOne") : t("geogroups.mistakesMany", { n: summary.mistakes });
  const wrapTitle = !summary ? "" : practice ? t("geogroups.practiceTitle") : summary.perfect ? t("geogroups.perfectTitle") : summary.won ? t("geogroups.winTitle") : t("geogroups.lossTitle");
  const wrapDetail = !summary ? "" : [
    practice
      ? t("geogroups.detailPractice", { found: summary.found, mistakes: mistakesText })
      : t("geogroups.detail", { found: summary.found, mistakes: mistakesText, points: formatNumber(summary.score, locale) }),
    summary.streak > 0 ? t("geogroups.streak", { n: summary.streak }) : "",
  ].filter(Boolean).join(" · ");

  const FeedbackIcon = feedback?.tone === "success" ? Sparkles : feedback?.tone === "warning" ? CircleDot : feedback?.tone === "danger" ? AlertCircle : Info;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.geo-groups.name")} onExit={handlers.onExit}>
        {!practice && <ScorePill value={liveScore} />}
        <StreakPill value={streak} />
      </GameTopBar>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-10 pt-4 sm:pt-6">
        <header className="mb-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {daily ? t("geogroups.kickerDaily", { n: puzzleNumber }) : t("geogroups.kickerEndless")} · {difficultyLabel}
          </p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">{t("geogroups.prompt")}</h1>
          {priorDaily && phase === "playing" && (
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{t("geogroups.dailyDone")}</p>
          )}
        </header>

        <div className="grid grid-cols-4 gap-1.5 min-[400px]:gap-2" role="group" aria-label={t("geogroups.board")}>
          {solved.map((entry) => (
            <motion.div
              key={`bar-${entry.level}`}
              layout
              initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 28 }}
              className="col-span-4"
            >
              <SolvedBar group={groupByLevel.get(entry.level)!} byPlayer={entry.byPlayer} />
            </motion.div>
          ))}
          {order.map((code, index) => {
            const country = getCountryByCca3(code);
            if (!country) return null;
            const name = countryName(country, locale);
            const isSelected = selected.includes(code);
            const isLocking = locking !== null && isSelected;
            const isShaking = Boolean(shaking?.codes.includes(code));
            const long = name.length > 15;
            return (
              <motion.button
                key={code}
                layout
                type="button"
                ref={(element) => {
                  if (element) tileRefs.current.set(code, element);
                  else tileRefs.current.delete(code);
                }}
                tabIndex={index === activeIndex ? 0 : -1}
                aria-pressed={isSelected}
                aria-disabled={busy || undefined}
                aria-label={name}
                onClick={() => toggle(code)}
                onKeyDown={(event) => onTileKey(event, index)}
                onFocus={() => setFocusIndex(index)}
                animate={{
                  x: isShaking && !reducedMotion ? (shaking!.nonce % 2 ? [0, -7, 7, -5, 5, 0] : [0, 7, -7, 5, -5, 0]) : 0,
                  scale: isLocking && !reducedMotion ? [1, 1.06, 1] : 1,
                }}
                transition={{ layout: layoutTransition, x: { duration: 0.42 }, scale: { duration: 0.32 } }}
                className={cn(
                  TILE_HEIGHT,
                  "relative flex min-w-0 select-none flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 text-center font-semibold leading-tight shadow-sm transition-colors duration-150",
                  "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isLocking
                    ? LEVEL_SURFACE[locking]
                    : isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground hover:border-foreground/30 hover:bg-muted active:bg-muted",
                  isShaking && "ring-2 ring-danger",
                  busy && !isLocking && "cursor-default",
                )}
              >
                {isSelected && !isLocking && <Check className="absolute right-1 top-1 h-3 w-3 opacity-80" aria-hidden />}
                <FlagImage code={country.flag} rounded={false} className="h-4 w-auto max-w-[80%] shrink-0 rounded-[3px] min-[400px]:h-5" />
                <span
                  lang={locale}
                  className={cn(
                    "block w-full hyphens-auto break-words [overflow-wrap:anywhere]",
                    long ? "text-[10px] min-[400px]:text-[11px] sm:text-xs" : "text-[11px] min-[400px]:text-xs sm:text-sm",
                  )}
                >
                  {name}
                </span>
              </motion.button>
            );
          })}
        </div>

        {phase !== "done" && (
          <>
            <p role="status" aria-live="polite" className={cn(
              "mt-3 flex min-h-6 items-center justify-center gap-1.5 text-center text-sm font-semibold",
              feedback?.tone === "success" && "text-success",
              feedback?.tone === "warning" && "text-warning",
              feedback?.tone === "danger" && "text-danger",
              (!feedback || feedback.tone === "muted") && "text-muted-foreground",
            )}>
              {feedback && <FeedbackIcon className="h-4 w-4 shrink-0" aria-hidden />}
              <span>{feedback?.text ?? t("geogroups.selected", { n: selected.length })}</span>
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              {practice ? (
                <>
                  <span>{t("geogroups.mistakesPractice", { n: mistakes })}</span>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => revealRemaining({ found: solvedByPlayer, mistakes, guesses }, t("geogroups.revealedAll"))}>
                    <Eye className="h-4 w-4" aria-hidden />
                    {t("geogroups.revealAll")}
                  </Button>
                </>
              ) : (
                <span className="flex items-center gap-2" role="img" aria-label={t("geogroups.mistakesAria", { n: mistakesLeft })}>
                  <span aria-hidden>{t("geogroups.mistakesLeft")}</span>
                  <span className="flex items-center gap-1.5" aria-hidden>
                    {Array.from({ length: MAX_MISTAKES }, (_, index) => (
                      <motion.span
                        key={index}
                        initial={false}
                        animate={{ scale: index < mistakesLeft ? 1 : 0.8 }}
                        transition={{ duration: reducedMotion ? 0 : 0.25 }}
                        className={cn("h-3 w-3 rounded-full", index < mistakesLeft ? "bg-foreground/80" : "border-2 border-muted-foreground/70")}
                      />
                    ))}
                  </span>
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button variant="outline" className="px-2" disabled={busy} onClick={() => { setOrder((current) => shuffled(current)); setFeedback(null); }}>
                <Shuffle className="h-4 w-4 shrink-0" aria-hidden />
                {t("geogroups.shuffle")}
              </Button>
              <Button variant="outline" className="px-2" disabled={busy || selected.length === 0} onClick={() => { setSelected([]); setFeedback(null); }}>
                <X className="h-4 w-4 shrink-0 max-[399px]:hidden" aria-hidden />
                {t("geogroups.deselect")}
              </Button>
              <Button className="px-2" disabled={busy || selected.length !== 4} onClick={submit}>
                <Send className="h-4 w-4 shrink-0" aria-hidden />
                {t("geogroups.submit")}
              </Button>
            </div>

            <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1" aria-hidden>
                {GROUP_LEVELS.map((level) => <LevelBadge key={level} level={level} />)}
              </span>
              <span>{t("geogroups.legend")}</span>
            </p>
          </>
        )}

        {phase === "done" && summary && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.35 }}
            className="mt-5"
          >
            <PuzzleWrapUp
              solved={summary.won}
              title={wrapTitle}
              detail={wrapDetail}
              share={practice ? undefined : summary.share}
              daily={daily && !practice}
              onContinue={handleContinue}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
