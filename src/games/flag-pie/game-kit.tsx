"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, CornerDownLeft, X } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ProgressBar, RoundPill, ScorePill, TimerPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { scoreForAnswer } from "@/lib/scoring";
import { matchAnswer } from "@/lib/fuzzy";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { initialSession, recordVisualRound, visualResult } from "./session";

export type VisualPlayHandlers = PlayHandlers & { seed?: string; challenge?: boolean };

/** Finite, no-lives rounds. Practice points stay at zero; one result per run. */
export function useVisualSession({ total, hits, timeLimitMs = 20000, ...handlers }: VisualPlayHandlers & {
  total: number;
  hits: readonly (string | undefined)[];
  timeLimitMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState(initialSession);
  const [answer, setAnswer] = useState<{ correct: boolean; earned: number; timedOut: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState(timeLimitMs);
  const statsRef = useRef(stats);
  const recordedRef = useRef(false);
  const finishedRef = useRef(false);
  const startRef = useRef(Date.now());
  const roundStartRef = useRef(Date.now());

  const commit = useCallback((correct: boolean, points?: number, timedOut = false) => {
    if (recordedRef.current || finishedRef.current || total === 0) return;
    recordedRef.current = true;
    const earned = handlers.practice || !correct ? 0 : points ?? Math.max(0, scoreForAnswer({
      correct,
      difficulty: handlers.difficulty,
      timed: handlers.timed,
      timeMs: Date.now() - roundStartRef.current,
      timeLimitMs,
    }));
    const next = recordVisualRound(statsRef.current, index, total, correct, earned, hits[index]);
    statsRef.current = next;
    setStats(next);
    setAnswer({ correct, earned, timedOut });
    if (correct) sound.correct();
    else sound.wrong();
  }, [handlers.practice, handlers.difficulty, handlers.timed, hits, index, total, timeLimitMs]);

  useEffect(() => {
    if (!handlers.timed || answer || total === 0) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, timeLimitMs - (Date.now() - roundStartRef.current));
      setTimeLeft(remaining);
      if (remaining === 0) commit(false, 0, true);
    }, 100);
    return () => clearInterval(timer);
  }, [handlers.timed, answer, commit, total, timeLimitMs]);

  function next() {
    if (!recordedRef.current || finishedRef.current) return;
    if (index + 1 >= total) {
      finishedRef.current = true;
      handlers.onFinish(visualResult(statsRef.current, total, Date.now() - startRef.current, handlers.mode));
      return;
    }
    recordedRef.current = false;
    roundStartRef.current = Date.now();
    setIndex(index + 1);
    setAnswer(null);
    setTimeLeft(timeLimitMs);
  }

  return { index, stats, answer, timeLeft, commit, next, total };
}

export type VisualSessionUI = ReturnType<typeof useVisualSession>;

export function VisualGameFrame({ gameId, session, handlers, children, wide = false }: {
  gameId: string;
  session: VisualSessionUI;
  handlers: VisualPlayHandlers;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useT();
  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (session.index > 0) contentRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [session.index]);
  return (
    <div className="geo-workbench flex flex-1 flex-col">
      <GameTopBar title={t(`games.${gameId}.name`)} onExit={handlers.onExit} compactMobileTitle>
        {!handlers.practice && <ScorePill value={session.stats.score} />}
        <RoundPill current={session.index + 1} total={session.total} />
        {handlers.timed && <TimerPill ms={session.timeLeft} danger={session.timeLeft < 5000} />}
      </GameTopBar>
      <div className="mx-auto w-full max-w-3xl px-4 pt-3">
        <ProgressBar value={(session.index + Number(Boolean(session.answer))) / Math.max(1, session.total)} />
      </div>
      <section ref={contentRef} aria-label={t(`games.${gameId}.name`)} className={cn("mx-auto flex w-full flex-1 scroll-mt-16 flex-col gap-5 px-4 py-5 sm:py-7", wide ? "max-w-3xl" : "max-w-lg")}>
        {session.total === 0 ? (
          <div className="my-auto rounded-2xl border border-border bg-card p-6 text-center">
            <p className="mb-4 text-sm text-muted-foreground">{t("visualgames.empty")}</p>
            <Button onClick={handlers.onExit}>{t("nav.home")}</Button>
          </div>
        ) : children}
      </section>
    </div>
  );
}

export function AnswerPanel({ mode, options, correctId, accepted, answered, onAnswer, placeholderKey = "type.placeholder" }: {
  mode: "choice" | "type";
  options: { id: string; label: string }[];
  correctId: string;
  accepted: string[];
  answered: boolean;
  onAnswer: (correct: boolean) => void;
  placeholderKey?: string;
}) {
  const { t } = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  function submit() {
    if (answered || !typed.trim()) return;
    const result = matchAnswer(typed, accepted);
    if (result.status === "near") {
      setHint(t("type.almost", { guess: result.suggestion ?? typed }));
      return;
    }
    onAnswer(result.status === "correct");
  }

  if (mode === "choice") return (
    <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2" aria-label={t("visualgames.answers")}>
      {options.map((option, index) => (
        <button
          key={option.id}
          disabled={answered}
          onClick={() => { setSelected(option.id); onAnswer(option.id === correctId); }}
          className={cn(
            "flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            !answered && "border-border bg-card hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98]",
            answered && option.id === correctId && "border-emerald-600 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
            answered && selected === option.id && option.id !== correctId && "border-rose-600 bg-rose-500/10 text-rose-800 dark:text-rose-300",
            answered && option.id !== correctId && selected !== option.id && "border-border bg-card text-muted-foreground",
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">{String.fromCharCode(65 + index)}</span>
          <span className="min-w-0 flex-1 break-words">{option.label}</span>
          {answered && option.id === correctId && <Check className="h-4 w-4 shrink-0" aria-hidden />}
          {answered && selected === option.id && option.id !== correctId && <X className="h-4 w-4 shrink-0" aria-hidden />}
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <label className="sr-only" htmlFor="visual-answer">{t(placeholderKey)}</label>
      <div className="flex gap-2">
        <input id="visual-answer" value={typed} onChange={(event) => { setTyped(event.target.value); setHint(null); }}
          disabled={answered} autoComplete="off" autoCorrect="off" spellCheck={false} autoCapitalize="words"
          placeholder={t(placeholderKey)} className="h-14 min-w-0 flex-1 rounded-xl border-2 border-border bg-card px-4 text-base outline-none focus:border-primary disabled:opacity-60" />
        <Button type="submit" size="lg" disabled={answered || !typed.trim()} className="px-4" aria-label={t("type.submit")}>
          <CornerDownLeft className="h-5 w-5" aria-hidden />
        </Button>
      </div>
      {hint && !answered && <p role="status" className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-300">{hint}</p>}
    </form>
  );
}

export function RoundFeedback({ session, answerLabel, children }: { session: VisualSessionUI; answerLabel: string; children?: ReactNode }) {
  const { t } = useT();
  const feedbackRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!session.answer) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    feedbackRef.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }, [session.answer]);
  if (!session.answer) return null;
  const { correct, earned, timedOut } = session.answer;
  return (
    <section ref={feedbackRef} className={cn("scroll-mt-16 rounded-2xl border-2 p-4", correct ? "border-emerald-600/50 bg-emerald-500/10" : "border-rose-600/45 bg-rose-500/10")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div role="status" aria-live="polite" className="min-w-0 flex-1">
          <p className={cn("flex items-center gap-2 text-sm font-bold", correct ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300")}>
            {correct ? <Check className="h-5 w-5" aria-hidden /> : <X className="h-5 w-5" aria-hidden />}
            {t(correct ? "common.correct" : timedOut ? "common.timeUp" : "common.wrong")}
            {earned > 0 && <span className="rounded-md bg-amber-300/80 px-2 py-0.5 text-xs text-slate-900">+{earned}</span>}
          </p>
          <p className="mt-1 break-words text-base font-semibold">{answerLabel}</p>
        </div>
        <Button onClick={session.next} className="shrink-0 gap-2">
          {t(session.index + 1 >= session.total ? "common.continue" : "common.next")}<ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
