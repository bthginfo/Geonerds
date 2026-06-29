"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Play, HelpCircle } from "lucide-react";
import type { AnswerMode, Difficulty, GameId, RunResult } from "@/lib/types";
import { getGame } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { scoreStore } from "@/lib/leaderboard/local";
import { apiSubmitScore } from "@/lib/online";
import { useAuth } from "@/store/auth";
import { ResultScreen } from "./result-screen";
import { cn } from "@/lib/utils";

export interface PlayResult {
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  durationMs: number;
  mode?: string;
}

export interface PlayHandlers {
  difficulty: Difficulty;
  mode: AnswerMode;
  /** Number of rounds; 0 means "all available". */
  roundCount: number;
  /** Whether the optional countdown timer is enabled. */
  timed: boolean;
  /** Game-specific variant id (e.g. flag scope); "" if none. */
  variant: string;
  onFinish: (r: PlayResult) => void;
  onExit: () => void;
}

type Phase = "setup" | "playing" | "result";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function GameShell({
  gameId,
  children,
}: {
  gameId: GameId;
  children: (h: PlayHandlers) => React.ReactNode;
}) {
  const { t } = useT();
  const config = getGame(gameId);
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mode, setMode] = useState<AnswerMode>(config?.modes?.[0] ?? "choice");
  const [roundCount, setRoundCount] = useState<number>(config?.countOptions?.[0] ?? 12);
  const [timed, setTimed] = useState<boolean>(config?.defaultTimed ?? false);
  const [variant, setVariant] = useState<string>(config?.variants?.default ?? "");
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [isRecord, setIsRecord] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  if (!config) return null;

  async function handleFinish(r: PlayResult) {
    const run: RunResult = {
      gameId,
      difficulty,
      mode: r.mode ?? mode,
      score: r.score,
      correct: r.correct,
      total: r.total,
      bestStreak: r.bestStreak,
      durationMs: r.durationMs,
      createdAt: Date.now(),
    };
    const prevBest = await scoreStore.bestScore(gameId);
    await scoreStore.saveRun(run);
    // Submit to the global leaderboard when signed in (fire-and-forget).
    if (useAuth.getState().user && r.score > 0) {
      apiSubmitScore(run);
    }
    setResult(run);
    setIsRecord(r.score > 0 && r.score > prevBest);
    setPhase("result");
  }

  function startPlaying() {
    setRunKey((k) => k + 1);
    setPhase("playing");
  }

  if (phase === "playing") {
    return (
      <div key={runKey} className="flex flex-1 flex-col">
        {children({
          difficulty,
          mode,
          roundCount,
          timed,
          variant,
          onFinish: handleFinish,
          onExit: () => setPhase("setup"),
        })}
      </div>
    );
  }

  if (phase === "result" && result) {
    return <ResultScreen result={result} isRecord={isRecord} onReplay={startPlaying} />;
  }

  const Icon = config.icon;

  return (
    <div className="geo-aurora flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("nav.home")}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          <span
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
              config.gradient
            )}
          >
            <Icon className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-bold">{t(`games.${gameId}.name`)}</h1>
          <button
            onClick={() => setHowOpen(true)}
            className="mt-1.5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4" />
            {t("nav.howto")}
          </button>
        </motion.div>

        <div className="mt-8 space-y-5">
          {config.variants && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(config.variants.labelKey)}
              </h2>
              <div className="flex flex-wrap gap-2">
                {config.variants.options.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariant(v)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all",
                      variant === v
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {t(`scope.${v}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {config.supportsDifficulty && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("common.difficulty")}
              </h2>
              <div className="grid gap-2">
                {DIFFICULTIES.map((d) => (
                  <OptionRow
                    key={d}
                    active={difficulty === d}
                    title={t(`difficulty.${d}`)}
                    desc={t(`difficulty.${d}.desc`)}
                    onClick={() => setDifficulty(d)}
                  />
                ))}
              </div>
            </div>
          )}

          {config.modes && config.modes.length > 1 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("common.mode")}
              </h2>
              <div className="grid gap-2">
                {config.modes.map((m) => (
                  <OptionRow
                    key={m}
                    active={mode === m}
                    title={t(`mode.${m}`)}
                    desc={t(`mode.${m}.desc`)}
                    onClick={() => setMode(m)}
                  />
                ))}
              </div>
            </div>
          )}

          {config.countOptions && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("setup.rounds")}
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {config.countOptions.map((n) => (
                  <button
                    key={n}
                    onClick={() => setRoundCount(n)}
                    className={cn(
                      "rounded-xl border-2 py-2.5 text-sm font-semibold transition-all",
                      roundCount === n
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {n === 0 ? t("setup.all") : n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {config.supportsTimed && (
            <button
              onClick={() => setTimed((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border-2 border-border bg-card px-4 py-3 text-left"
            >
              <div>
                <div className="font-semibold">{t("setup.timed")}</div>
                <div className="text-xs text-muted-foreground">{t("setup.timed.desc")}</div>
              </div>
              <span
                className={cn(
                  "inline-flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors",
                  timed ? "bg-primary" : "bg-input"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200",
                    timed ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </span>
            </button>
          )}
        </div>

        <div className="mt-auto pt-8">
          <Button size="lg" className="w-full gap-2" onClick={startPlaying}>
            <Play className="h-5 w-5" />
            {t("common.start")}
          </Button>
        </div>
      </div>

      <Modal open={howOpen} onClose={() => setHowOpen(false)} title={t(`games.${gameId}.name`)}>
        <p className="text-sm leading-relaxed text-muted-foreground">{t(`howto.${gameId}`)}</p>
        <Button className="mt-4 w-full" onClick={() => setHowOpen(false)}>
          {t("common.gotIt")}
        </Button>
      </Modal>
    </div>
  );
}

function OptionRow({
  active,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all",
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-border/80 hover:bg-muted/40"
      )}
    >
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <span
        className={cn(
          "ml-3 h-4 w-4 shrink-0 rounded-full border-2",
          active ? "border-primary bg-primary" : "border-muted-foreground/40"
        )}
      />
    </button>
  );
}
