"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Eye, Lightbulb } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ProgressBar, ScorePill, StreakPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { cn, formatNumber } from "@/lib/utils";
import { dailyPuzzleNumber, dailyStreak, isDailyVariant, puzzleSeed, readDailyRecord, writeDailyRecord } from "@/games/puzzle-kit";
import { PuzzleWrapUp } from "@/games/puzzle-wrapup";
import {
  PENALTY,
  answerName,
  bracketScore,
  chainNames,
  cluePrompt,
  generatePuzzle,
  isSolvable,
  judgeAnswer,
  parentOf,
  renderSentence,
  shareGrid,
  solvableClues,
  type BracketPuzzle,
  type Clue,
  type ClueOutcome,
  type Segment,
} from "./generator";

const GAME_ID = "geo-brackets" as const;

interface ClueState extends ClueOutcome {
  nearUsed: boolean;
  status?: "typed" | "revealed";
}

type Feedback = { tone: "success" | "danger" | "warning" | "info"; text: string } | null;

const EMPTY_STATE: ClueState = { revealed: false, mistakes: 0, peeked: false, nearUsed: false };

export function GeoBracketsGame(handlers: PlayHandlers) {
  const { t } = useT();
  const [seed] = useState(() => puzzleSeed(GAME_ID, { variant: handlers.variant, difficulty: handlers.difficulty, seed: handlers.seed, challenge: handlers.challenge }));
  const puzzle = useMemo(() => {
    try {
      return generatePuzzle(seed, handlers.difficulty);
    } catch {
      return null;
    }
  }, [seed, handlers.difficulty]);

  if (!puzzle) {
    return (
      <div className="flex flex-1 flex-col">
        <GameTopBar title={t("games.geo-brackets.name")} onExit={handlers.onExit} />
        <p role="alert" className="mx-auto mt-10 max-w-sm px-4 text-center text-sm text-muted-foreground">{t("geobrackets.loadError")}</p>
      </div>
    );
  }
  return <BracketsBoard handlers={handlers} puzzle={puzzle} />;
}

function BracketsBoard({ handlers, puzzle }: { handlers: PlayHandlers; puzzle: BracketPuzzle }) {
  const { t, locale } = useT();
  const { difficulty, practice, onExit, onFinish } = handlers;
  const daily = isDailyVariant(handlers.variant) && !handlers.challenge;
  const reducedMotion = useReducedMotion();
  const shake = useAnimationControls();
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty];

  const [states, setStates] = useState<Record<string, ClueState>>({});
  const [selectedId, setSelectedId] = useState<string | null>(() => solvableClues(puzzle, new Set())[0]?.id ?? null);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [tally, setTally] = useState({ wrong: 0, peeks: 0, reveals: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lastSolved, setLastSolved] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [previous] = useState(() => (daily && !practice ? readDailyRecord(GAME_ID, difficulty) : null));
  const [dailyDays, setDailyDays] = useState(0);

  const startedAt = useRef(Date.now());
  const finishGuard = useRef(false);
  const recordGuard = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRefs = useRef(new Map<string, HTMLElement>());

  const solved = useMemo(() => new Set(Object.entries(states).filter(([, s]) => s.status).map(([id]) => id)), [states]);
  const selected = puzzle.clues.find((clue) => clue.id === selectedId) ?? null;
  const selectedState = (selected && states[selected.id]) || EMPTY_STATE;
  const score = practice ? 0 : bracketScore(tally, difficulty);
  const allSolved = solved.size === puzzle.clues.length;

  // Autofocus the answer field on devices with a fine pointer (desktop).
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches) inputRef.current?.focus();
  }, []);

  // Let the last answer settle into the sentence before the wrap-up appears.
  useEffect(() => {
    if (!allSolved || done) return;
    const id = window.setTimeout(() => setDone(true), reducedMotion ? 150 : 700);
    return () => window.clearTimeout(id);
  }, [allSolved, done, reducedMotion]);

  const outcomes = useMemo(() => Object.fromEntries(Object.entries(states).map(([id, s]) => [id, { revealed: s.revealed, mistakes: s.mistakes, peeked: s.peeked }])), [states]);
  const anyRevealed = tally.reveals > 0;
  const difficultyLabel = t(`difficulty.${difficulty}`);
  const share = useMemo(() => {
    if (practice) return undefined;
    const name = t("games.geo-brackets.name");
    const header = daily ? `GeoNerds ${name} #${dailyPuzzleNumber()} (${difficultyLabel})` : `GeoNerds ${name} · ${t("geobrackets.shareEndless")} (${difficultyLabel})`;
    return [header, t("geobrackets.sharePoints", { score: formatNumber(score, locale) }), shareGrid(puzzle, outcomes), "geo-nerds.com"].join("\n");
  }, [practice, t, daily, difficultyLabel, score, locale, puzzle, outcomes]);

  useEffect(() => {
    if (!done || recordGuard.current) return;
    recordGuard.current = true;
    sound.finish();
    haptic.success();
    if (daily && !practice && share) {
      writeDailyRecord(GAME_ID, difficulty, { solved: !anyRevealed, score, share, at: Date.now() });
      setDailyDays(dailyStreak(GAME_ID));
    }
  }, [done, daily, practice, share, difficulty, anyRevealed, score]);

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const selectClue = useCallback((id: string, focus: boolean) => {
    setSelectedId(id);
    setGuess("");
    setFeedback(null);
    haptic.tap();
    if (focus) focusInput();
  }, [focusInput]);

  const markSolved = (clue: Clue, how: "typed" | "revealed") => {
    const nextStates = { ...states, [clue.id]: { ...(states[clue.id] ?? EMPTY_STATE), status: how, revealed: how === "revealed" } };
    const nextSolved = new Set(solved).add(clue.id);
    setStates(nextStates);
    setLastSolved(clue.id);
    setGuess("");
    const parent = parentOf(puzzle, clue.id);
    const next = parent && isSolvable(parent, nextSolved) ? parent : solvableClues(puzzle, nextSolved)[0];
    setSelectedId(next?.id ?? null);
  };

  const submit = () => {
    if (!selected || done || solved.has(selected.id)) return;
    const value = guess.trim();
    if (!value) return;
    const status = judgeAnswer(value, selected);
    const current = states[selected.id] ?? EMPTY_STATE;
    if (status === "correct") {
      const clean = current.mistakes === 0;
      const nextStreak = clean ? streak + 1 : 0;
      setStreak(nextStreak);
      setBestStreak((best) => Math.max(best, nextStreak));
      sound.correct();
      haptic.success();
      setFeedback({ tone: "success", text: t("geobrackets.correct", { answer: answerName(selected, locale, t) }) });
      markSolved(selected, "typed");
      return;
    }
    if (status === "near" && !current.nearUsed) {
      setStates({ ...states, [selected.id]: { ...current, nearUsed: true } });
      setFeedback({ tone: "warning", text: t("geobrackets.near") });
      return;
    }
    setStates({ ...states, [selected.id]: { ...current, mistakes: current.mistakes + 1 } });
    setTally((v) => ({ ...v, wrong: v.wrong + 1 }));
    setStreak(0);
    sound.wrong();
    haptic.error();
    setFeedback({ tone: "danger", text: t("geobrackets.wrong", { guess: value }) });
    if (!reducedMotion) void shake.start({ x: [0, -9, 9, -6, 6, -2, 0], transition: { duration: 0.38 } });
  };

  const peek = () => {
    if (!selected || selectedState.peeked || solved.has(selected.id)) return;
    setStates({ ...states, [selected.id]: { ...selectedState, peeked: true } });
    setTally((v) => ({ ...v, peeks: v.peeks + 1 }));
    haptic.tap();
    setFeedback({ tone: "info", text: t("geobrackets.peekHint", { letter: firstLetter(selected, locale, t) }) });
    inputRef.current?.focus();
  };

  const reveal = () => {
    if (!selected || solved.has(selected.id)) return;
    setTally((v) => ({ ...v, reveals: v.reveals + 1 }));
    setStreak(0);
    haptic.tap();
    setFeedback({ tone: "info", text: t("geobrackets.revealed", { answer: answerName(selected, locale, t) }) });
    markSolved(selected, "revealed");
  };

  const finish = () => {
    if (finishGuard.current) return;
    finishGuard.current = true;
    const typed = puzzle.clues.filter((clue) => states[clue.id]?.status === "typed");
    const countryHits = Array.from(new Set(typed.flatMap((clue) => (clue.answer.kind === "country" ? [clue.answer.cca3] : []))));
    onFinish({
      score: practice ? 0 : score,
      correct: typed.length,
      total: puzzle.clues.length,
      bestStreak: Math.min(bestStreak, typed.length),
      durationMs: Math.max(500, Date.now() - startedAt.current),
      countryHits,
      mode: daily ? "daily" : "endless",
    });
  };

  const onChipKey = (event: KeyboardEvent<HTMLElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectClue(id, true);
      return;
    }
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const open = solvableClues(puzzle, solved);
    const index = open.findIndex((clue) => clue.id === id);
    const target = open[(index + delta + open.length) % open.length];
    if (target) chipRefs.current.get(target.id)?.focus();
  };

  const sentence = renderSentence(puzzle, locale, t, solved);
  const prompt = selected ? cluePrompt(selected, locale, t, solved) : null;
  const peekLetter = selected && selectedState.peeked ? firstLetter(selected, locale, t) : null;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.geo-brackets.name")} onExit={onExit}>
        {!practice && <ScorePill value={score} />}
        <StreakPill value={streak} />
        <div aria-label={t("geobrackets.cluesLabel", { solved: solved.size, total: puzzle.clues.length })} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground min-[420px]:text-sm">
          {solved.size}/{puzzle.clues.length}
        </div>
      </GameTopBar>

      <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-3">
        <ProgressBar value={solved.size / puzzle.clues.length} />

        {!done ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("geobrackets.intro")}</p>
            {previous && <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">{t("geobrackets.alreadyPlayed", { score: formatNumber(previous.score, locale) })}</p>}

            <div lang={locale} className="mt-4 rounded-3xl border border-border bg-card p-4 text-[17px] leading-[2.15] text-foreground [overflow-wrap:anywhere] [hyphens:auto] sm:p-6 sm:text-xl sm:leading-[2.2]">
              <SentenceView
                segments={sentence}
                solved={solved}
                puzzle={puzzle}
                selectedId={selectedId}
                lastSolved={lastSolved}
                reducedMotion={Boolean(reducedMotion)}
                states={states}
                onSelect={(id) => selectClue(id, true)}
                onKey={onChipKey}
                chipRef={(id, el) => (el ? chipRefs.current.set(id, el) : chipRefs.current.delete(id))}
                t={t}
              />
            </div>

            <section aria-label={t("geobrackets.yourClue")} className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground">{t("geobrackets.yourClue")}</p>
              <p id="gb-prompt" className="mt-1 min-h-6 text-base font-semibold leading-snug">{prompt ?? t("geobrackets.pickClue")}</p>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
              >
                <motion.div className="min-w-0 flex-1" animate={shake}>
                  <label htmlFor="gb-input" className="sr-only">{t("geobrackets.inputLabel")}</label>
                  <input
                    ref={inputRef}
                    id="gb-input"
                    value={guess}
                    onChange={(event) => setGuess(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && selectedId) chipRefs.current.get(selectedId)?.focus();
                    }}
                    disabled={!selected}
                    placeholder={peekLetter ? t("geobrackets.placeholderStarts", { letter: peekLetter }) : t("geobrackets.placeholder")}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="words"
                    spellCheck={false}
                    enterKeyHint="done"
                    aria-describedby="gb-prompt gb-feedback"
                    className="h-12 w-full rounded-xl border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                  />
                </motion.div>
                <Button type="submit" className="h-12 shrink-0" disabled={!selected || !guess.trim()}>
                  {t("geobrackets.check")}
                </Button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={peek} disabled={!selected || selectedState.peeked} aria-describedby={practice ? undefined : "gb-peek-cost"}>
                  <Lightbulb className="h-4 w-4" aria-hidden />
                  {t("geobrackets.peek")}
                  {!practice && <span id="gb-peek-cost" className="tabular-nums text-muted-foreground">{t("geobrackets.cost", { points: formatNumber(PENALTY.peek * multiplier, locale) })}</span>}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={reveal} disabled={!selected} aria-describedby={practice ? undefined : "gb-reveal-cost"}>
                  <Eye className="h-4 w-4" aria-hidden />
                  {t("geobrackets.reveal")}
                  {!practice && <span id="gb-reveal-cost" className="tabular-nums text-muted-foreground">{t("geobrackets.cost", { points: formatNumber(PENALTY.reveal * multiplier, locale) })}</span>}
                </Button>
              </div>
              <p
                id="gb-feedback"
                role="status"
                aria-live="polite"
                className={cn(
                  "mt-3 min-h-5 text-sm font-medium leading-snug",
                  feedback?.tone === "success" && "text-success",
                  feedback?.tone === "danger" && "text-danger",
                  feedback?.tone === "warning" && "text-foreground",
                  feedback?.tone === "info" && "text-muted-foreground",
                )}
              >
                {feedback?.text}
              </p>
            </section>
          </>
        ) : (
          <EndView
            puzzle={puzzle}
            sentence={sentence}
            solved={solved}
            states={states}
            t={t}
            locale={locale}
            title={anyRevealed ? t("geobrackets.helpedTitle") : t("geobrackets.solvedTitle")}
            detail={
              practice
                ? t("geobrackets.detail", { mistakes: tally.wrong, peeks: tally.peeks, reveals: tally.reveals })
                : t("geobrackets.detailScore", { score: formatNumber(score, locale), mistakes: tally.wrong, peeks: tally.peeks, reveals: tally.reveals })
            }
            share={share}
            daily={daily}
            dailyDays={dailyDays}
            solvedClean={!anyRevealed}
            onContinue={finish}
          />
        )}
      </div>
    </div>
  );
}

type T = (key: string, vars?: Record<string, string | number>) => string;

function firstLetter(clue: Clue, locale: "en" | "de", t: T) {
  return answerName(clue, locale, t).charAt(0).toUpperCase();
}

function SentenceView({
  segments,
  solved,
  puzzle,
  selectedId,
  lastSolved,
  reducedMotion,
  states,
  onSelect,
  onKey,
  chipRef,
  t,
}: {
  segments: Segment[];
  solved: ReadonlySet<string>;
  puzzle: BracketPuzzle;
  selectedId?: string | null;
  lastSolved?: string | null;
  reducedMotion: boolean;
  states: Record<string, ClueState>;
  onSelect?: (id: string) => void;
  onKey?: (event: KeyboardEvent<HTMLElement>, id: string) => void;
  chipRef?: (id: string, el: HTMLElement | null) => void;
  t: T;
}) {
  const byId = useMemo(() => new Map(puzzle.clues.map((clue) => [clue.id, clue])), [puzzle]);
  const render = (segment: Segment, key: string): ReactNode => {
    if (segment.type === "text") return <span key={key}>{segment.text}</span>;
    if (segment.type === "given") return <span key={key} className="font-semibold">{segment.text}</span>;
    if (segment.type === "answer") {
      const revealed = states[segment.id]?.revealed;
      const animate = segment.id === lastSolved;
      return (
        <span key={key}>
          {segment.prefix}
          <motion.span
            initial={animate ? (reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.55, y: 4 }) : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0.15 } : { type: "spring", stiffness: 520, damping: 22 }}
            className={cn(
              "inline-block rounded-md px-1 font-semibold leading-snug",
              revealed ? "bg-muted text-foreground underline decoration-dotted underline-offset-4" : "bg-success/15 text-success",
            )}
          >
            {revealed && <Eye className="mr-0.5 inline h-3.5 w-3.5 -translate-y-px" aria-hidden />}
            {segment.name}
            {revealed && <span className="sr-only"> ({t("geobrackets.revealedMark")})</span>}
          </motion.span>
          {segment.suffix}
        </span>
      );
    }
    const clue = byId.get(segment.id);
    const open = clue ? isSolvable(clue, solved) && Boolean(onSelect) : false;
    const isSelected = open && segment.id === selectedId;
    const children = segment.children.map((child, i) => render(child, `${key}.${i}`));
    const bracket = (char: string) => (
      <span aria-hidden className={cn("font-semibold", isSelected ? "text-primary-foreground/75" : open ? "text-primary" : "text-muted-foreground")}>{char}</span>
    );
    const chipClass = "rounded-lg border px-1 py-0.5 [-webkit-box-decoration-break:clone] [box-decoration-break:clone] transition-colors duration-200";
    if (!open) {
      return (
        <span key={key} className={cn(chipClass, "border-dashed border-foreground/25 bg-foreground/[0.035]")}>
          {bracket("[")}
          {children}
          {bracket("]")}
        </span>
      );
    }
    return (
      <span
        key={key}
        ref={(el) => chipRef?.(segment.id, el)}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        onClick={() => onSelect?.(segment.id)}
        onKeyDown={(event) => onKey?.(event, segment.id)}
        className={cn(
          chipClass,
          "cursor-pointer font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          isSelected ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "border-primary/60 bg-primary/10 hover:bg-primary/20",
        )}
      >
        {bracket("[")}
        {children}
        {bracket("]")}
      </span>
    );
  };
  return <p className="m-0">{segments.map((segment, i) => render(segment, String(i)))}</p>;
}

function EndView({
  puzzle,
  sentence,
  solved,
  states,
  t,
  locale,
  title,
  detail,
  share,
  daily,
  dailyDays,
  solvedClean,
  onContinue,
}: {
  puzzle: BracketPuzzle;
  sentence: Segment[];
  solved: ReadonlySet<string>;
  states: Record<string, ClueState>;
  t: T;
  locale: "en" | "de";
  title: string;
  detail: string;
  share?: string;
  daily: boolean;
  dailyDays: number;
  solvedClean: boolean;
  onContinue: () => void;
}) {
  const mark = (id: string) => {
    const s = states[id];
    if (!s || s.revealed) return { icon: <Eye className="h-3.5 w-3.5" aria-hidden />, label: t("geobrackets.revealedMark"), className: "bg-muted text-foreground" };
    if (s.mistakes > 0 || s.peeked) return { icon: <Check className="h-3.5 w-3.5" aria-hidden />, label: s.mistakes > 0 ? t("geobrackets.mistakeMark") : t("geobrackets.peekedMark"), className: "bg-warning/15 text-foreground" };
    return { icon: <Check className="h-3.5 w-3.5" aria-hidden />, label: t("geobrackets.cleanMark"), className: "bg-success/15 text-success" };
  };
  return (
    <div className="mt-4 space-y-4">
      <section aria-labelledby="gb-final" className="rounded-3xl border border-border bg-card p-4 sm:p-6">
        <h2 id="gb-final" className="text-xs font-semibold text-muted-foreground">{t("geobrackets.finalSentence")}</h2>
        <div lang={locale} className="mt-2 text-lg leading-relaxed [overflow-wrap:anywhere] sm:text-xl">
          <SentenceView segments={sentence} solved={solved} puzzle={puzzle} reducedMotion states={states} t={t} lastSolved={null} />
        </div>
      </section>

      <section aria-labelledby="gb-chains" className="rounded-2xl border border-border bg-card p-4">
        <h2 id="gb-chains" className="text-sm font-semibold">{t("geobrackets.chains")}</h2>
        <ol className="mt-3 space-y-3">
          {puzzle.chains.map((top, index) => (
            <li key={top.id} className="flex gap-3">
              <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold uppercase text-primary">{String.fromCharCode(97 + index)}</span>
              <p className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1.5 text-sm leading-snug">
                {chainNames(top, locale, t).map((step, i) => {
                  const m = step.id ? mark(step.id) : null;
                  return (
                    <span key={`${top.id}-${i}`} className="inline-flex items-center gap-1">
                      {i > 0 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="→" />}
                      {m ? (
                        <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold", m.className)}>
                          {m.icon}
                          {step.name}
                          <span className="sr-only"> ({m.label})</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{step.name}</span>
                      )}
                    </span>
                  );
                })}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <PuzzleWrapUp solved={solvedClean} title={title} detail={detail} share={share} daily={daily} onContinue={onContinue} />
      {daily && dailyDays > 0 && <p className="text-center text-xs font-medium text-muted-foreground">{t("geobrackets.streak", { days: dailyDays })}</p>}
    </div>
  );
}
