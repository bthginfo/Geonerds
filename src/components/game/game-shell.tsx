"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Play, HelpCircle, Info, Loader2, Swords, LockKeyhole } from "lucide-react";
import type { AnswerMode, Difficulty, GameId, RunResult } from "@/lib/types";
import { getGame } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { scoreStore } from "@/lib/leaderboard/local";
import { apiSubmitScore } from "@/lib/online";
import { useAuth } from "@/store/auth";
import { useDex } from "@/store/dex";
import { dexStateOf } from "@/lib/dex";
import { levelFromXp } from "@/lib/level";
import { earnedIds } from "@/lib/badges";
import { ResultScreen } from "./result-screen";
import { cn } from "@/lib/utils";
import { useProgression } from "@/store/progression";
import { newRunSeed } from "@/lib/random";
import type { GeoChallenge } from "@/lib/challenges";
import { apiGeoChallenge, apiStartGeoChallenge, apiSubmitGeoChallengeAttempt } from "@/lib/challenge-online";
import { AccountPanel } from "@/components/account/account-panel";
import { ChallengeRules, ChallengeSummary } from "@/components/challenges/challenge-summary";
import { attemptStorageKey, challengeError, challengePlayBlock, readSavedAttempt, writeSavedAttempt, type SavedChallengeAttempt } from "@/components/challenges/challenge-ui";

export interface PlayResult {
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  durationMs: number;
  mode?: string;
  /** Optional per-question correctness (used by the Daily Challenge share grid). */
  marks?: boolean[];
  /** cca3 codes of countries answered correctly this run (feeds the collection). */
  countryHits?: string[];
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
  /** Optional regional constraint supplied by a parent campaign. */
  scope?: string;
  /** Practice/learn mode: no points, no lives, run through everything; nothing is saved. */
  practice: boolean;
  /** Fresh for normal runs; identical for both sides of an online challenge. */
  seed?: string;
  /** A locked, single-attempt run: games must not offer internal replay. */
  challenge?: boolean;
  onFinish: (r: PlayResult) => void;
  onExit: () => void;
}

type Phase = "setup" | "playing" | "result";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface GameShellProps {
  gameId: GameId;
  children: (h: PlayHandlers) => React.ReactNode;
}

export function GameShell(props: GameShellProps) {
  return <Suspense fallback={<ShellLoading />}><GameShellRoute {...props} /></Suspense>;
}

function GameShellRoute(props: GameShellProps) {
  const params = useSearchParams();
  const viewerId = useAuth((state) => state.user?.id ?? "guest");
  const isChallenge = params.has("challenge");
  const challengeId = params.get("challenge");
  return <GameShellContent key={`${props.gameId}:${isChallenge ? `${challengeId}:${viewerId}` : "normal"}`} {...props} challengeId={challengeId} isChallenge={isChallenge} />;
}

function GameShellContent({
  gameId,
  children,
  challengeId,
  isChallenge,
}: GameShellProps & { challengeId: string | null; isChallenge: boolean }) {
  const { t, locale } = useT();
  const config = getGame(gameId);
  const { user, loaded, configured } = useAuth();
  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mode, setMode] = useState<AnswerMode>(config?.modes?.[0] ?? "choice");
  const [roundCount, setRoundCount] = useState<number>(config?.countOptions?.[0] ?? 12);
  const [timed, setTimed] = useState<boolean>(config?.defaultTimed ?? false);
  const [practice, setPractice] = useState<boolean>(false);
  const [variant, setVariant] = useState<string>(config?.variants?.default ?? "");
  const [runKey, setRunKey] = useState(0);
  const [seed, setSeed] = useState<string>();
  const [result, setResult] = useState<RunResult | null>(null);
  const [isRecord, setIsRecord] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [newCountries, setNewCountries] = useState<{ discovered: string[]; researched: string[]; unlocked: string[]; mastered: string[] }>({ discovered: [], researched: [], unlocked: [], mastered: [] });
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [challenge, setChallenge] = useState<GeoChallenge | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(isChallenge);
  const [challengeFailure, setChallengeFailure] = useState<string>();
  const [starting, setStarting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"sending" | "saved" | "error">("sending");
  const [submitError, setSubmitError] = useState<string>();
  const finishGuard = useRef(false);
  const progressGuard = useRef(false);
  const startLock = useRef(false);
  const activeRunKey = useRef(0);
  const submitLock = useRef(false);
  const attemptToken = useRef<string | undefined>(undefined);
  const completedAttempt = useRef<SavedChallengeAttempt | null>(null);
  const storageKey = user && challengeId ? attemptStorageKey(user.id, challengeId) : null;

  useEffect(() => {
    if (!isChallenge || !loaded) return;
    if (!configured || !user || !challengeId) {
      setChallengeFailure(!configured ? "not_configured" : !user ? "unauthorized" : "not_found");
      setChallengeLoading(false);
      return;
    }
    let cancelled = false;
    setChallengeLoading(true);
    setChallengeFailure(undefined);
    void apiGeoChallenge(challengeId).then(async (response) => {
      if (cancelled) return;
      const record = response.challenge;
      if (!response.configured || !record) {
        setChallengeFailure(!response.configured ? "not_configured" : response.error ?? "not_found");
        if (response.error === "unauthorized") await useAuth.getState().refresh();
        return;
      }
      const block = challengePlayBlock(record, gameId);
      setChallenge(record);
      if (block === "wrong_game" || block === "expired") { setChallengeFailure(block); return; }
      const key = attemptStorageKey(user.id, challengeId);
      const saved = readSavedAttempt(key);
      if (saved?.run && saved.run.gameId === gameId && saved.run.difficulty === record.difficulty && saved.run.mode === record.mode && ["active", "resolved"].includes(record.status)) {
        completedAttempt.current = saved;
        attemptToken.current = saved.attemptToken;
        finishGuard.current = true;
        setResult(saved.run);
        setPhase("result");
        setSubmitStatus(record.viewerAttempted ? "saved" : "error");
        setSubmitError(record.viewerAttempted ? undefined : "submission_pending");
        if (!saved.localSaved) void saveProgress(saved.run, { countryHits: saved.countryHits ?? [] });
        return;
      }
      if (block) setChallengeFailure(block);
    }).catch(() => { if (!cancelled) setChallengeFailure("network_error"); }).finally(() => { if (!cancelled) setChallengeLoading(false); });
    return () => { cancelled = true; };
    // The run itself does not retrigger this fetch, so a started in-page attempt stays mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChallenge, challengeId, gameId, loaded, configured, user?.id]);

  useEffect(() => {
    if (!isChallenge || !challengeId || phase !== "result" || submitStatus !== "saved" || challenge?.status !== "active") return;
    let cancelled = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const latest = await apiGeoChallenge(challengeId);
        if (!cancelled && latest.challenge) setChallenge(latest.challenge);
        if (latest.error === "unauthorized") await useAuth.getState().refresh();
      } catch { /* A saved attempt stays saved when a comparison refresh fails. */ }
    };
    const timer = window.setInterval(() => void refresh(), 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [isChallenge, challengeId, phase, submitStatus, challenge?.status]);

  if (!config) return null;

  async function handleFinish(r: PlayResult) {
    if (finishGuard.current) return;
    finishGuard.current = true;
    // Practice runs never count: no XP, no badges, no leaderboard, no records.
    if (practice) {
      setPhase("setup");
      return;
    }
    const run: RunResult = {
      gameId,
      difficulty: challenge?.difficulty ?? difficulty,
      mode: isChallenge ? challenge?.mode ?? mode : r.mode ?? mode,
      score: r.score,
      correct: r.correct,
      total: r.total,
      bestStreak: r.bestStreak,
      durationMs: r.durationMs,
      createdAt: Date.now(),
    };
    setResult(run);
    if (isChallenge) setPhase("result");
    if (isChallenge && challengeId && attemptToken.current) {
      const saved: SavedChallengeAttempt = { attemptToken: attemptToken.current, run, countryHits: r.countryHits ?? [], localSaved: false };
      completedAttempt.current = saved;
      if (storageKey) writeSavedAttempt(storageKey, saved);
      void submitCompletedAttempt(saved);
    }
    await saveProgress(run, r);
  }

  async function saveProgress(run: RunResult, r: Pick<PlayResult, "countryHits">) {
    if (progressGuard.current || (isChallenge && completedAttempt.current?.localSaved)) return;
    progressGuard.current = true;
    // Mark before any side effects. Submission retries never touch local progress.
    if (isChallenge && completedAttempt.current) {
      completedAttempt.current = { ...completedAttempt.current, localSaved: true };
      if (storageKey) writeSavedAttempt(storageKey, completedAttempt.current);
    }
    try {
    // Feed the country collection (Geo-Dex) — capture state before/after to show
    // which countries this run newly discovered or fully unlocked.
    const hits = r.countryHits ?? [];
    const dexBefore = useDex.getState().hits;
    const beforeState = new Map(
      [...new Set(hits)].map((cca3) => [cca3, dexStateOf(dexBefore[cca3])] as const)
    );
    if (hits.length) useDex.getState().record(gameId, hits);
    const dexAfter = useDex.getState().hits;
    const discovered: string[] = [];
    const researched: string[] = [];
    const unlockedCountries: string[] = [];
    const mastered: string[] = [];
    for (const [cca3, before] of beforeState) {
      const after = dexStateOf(dexAfter[cca3]);
      if (before === "locked" && after !== "locked") discovered.push(cca3);
      if (!["researched", "unlocked", "mastered"].includes(before) && ["researched", "unlocked", "mastered"].includes(after)) researched.push(cca3);
      if (!["unlocked", "mastered"].includes(before) && ["unlocked", "mastered"].includes(after)) unlockedCountries.push(cca3);
      if (before !== "mastered" && after === "mastered") mastered.push(cca3);
    }

    const prevBest = await scoreStore.bestScore(gameId);
    const allBefore = await scoreStore.allRuns();
    const progressionBefore = useProgression.getState();
    const totalBefore = progressionBefore.totalScore;
    const before = earnedIds(allBefore, dexBefore, progressionBefore);
    await scoreStore.saveRun(run);
    const after = earnedIds(await scoreStore.allRuns(), dexAfter, useProgression.getState());
    const unlocked = [...after].filter((id) => !before.has(id));
    const lvlBefore = levelFromXp(totalBefore).level;
    const lvlAfter = levelFromXp(totalBefore + run.score).level;
    // Submit to the global leaderboard when signed in (fire-and-forget).
    if (!isChallenge && useAuth.getState().user && run.score > 0) {
      void apiSubmitScore(run).catch(() => false);
    }
    setResult(run);
    setIsRecord(run.score > 0 && run.score > prevBest);
    setNewBadges(unlocked);
    setNewCountries({ discovered, researched, unlocked: unlockedCountries, mastered });
    setLevelUp(lvlAfter > lvlBefore ? lvlAfter : null);
    setPhase("result");
    } catch {
      // A browser-storage failure must not erase the completed online attempt.
      setResult(run);
      setPhase("result");
    }
  }

  function startPlaying() {
    if (isChallenge) return;
    finishGuard.current = false;
    progressGuard.current = false;
    setSeed(newRunSeed());
    setIsRecord(false);
    setNewBadges([]);
    setLevelUp(null);
    setNewCountries({ discovered: [], researched: [], unlocked: [], mastered: [] });
    activeRunKey.current++;
    setRunKey(activeRunKey.current);
    setPhase("playing");
  }

  async function startChallenge() {
    if (startLock.current || !challenge || !challengeId || !user || challengePlayBlock(challenge, gameId)) return;
    startLock.current = true;
    setStarting(true);
    setChallengeFailure(undefined);
    try {
      const response = await apiStartGeoChallenge(challengeId);
      if (!response.ok || !response.attemptToken) {
        setChallengeFailure(response.error ?? "invalid_attempt");
        if (response.error === "unauthorized") await useAuth.getState().refresh();
        return;
      }
      attemptToken.current = response.attemptToken;
      completedAttempt.current = { attemptToken: response.attemptToken, localSaved: false };
      if (storageKey) writeSavedAttempt(storageKey, completedAttempt.current);
      finishGuard.current = false;
      progressGuard.current = false;
      setSeed(challenge.seed ?? undefined);
      activeRunKey.current++;
      setRunKey(activeRunKey.current);
      setPhase("playing");
    } catch { setChallengeFailure("network_error"); }
    finally { startLock.current = false; setStarting(false); }
  }

  async function submitCompletedAttempt(saved = completedAttempt.current) {
    if (submitLock.current || !saved?.run || !challengeId || !saved.attemptToken) return;
    submitLock.current = true;
    setSubmitStatus("sending");
    setSubmitError(undefined);
    try {
      const response = await apiSubmitGeoChallengeAttempt(challengeId, { ...saved.run, attemptToken: saved.attemptToken });
      if (response.ok) {
        if (response.challenge) setChallenge(response.challenge);
        setSubmitStatus("saved");
      } else if (response.error === "already_submitted") {
        const latest = await apiGeoChallenge(challengeId);
        if (latest.challenge?.viewerAttempted) { setChallenge(latest.challenge); setSubmitStatus("saved"); }
        else { setSubmitStatus("error"); setSubmitError(response.error); }
      } else {
        setSubmitStatus("error");
        setSubmitError(response.error ?? "request_failed");
        if (response.error === "unauthorized") await useAuth.getState().refresh();
      }
    } catch { setSubmitStatus("error"); setSubmitError("network_error"); }
    finally { submitLock.current = false; }
  }

  if (isChallenge && (!loaded || challengeLoading)) return <ShellLoading />;
  if (isChallenge && (!configured || !user || !challenge || (challengeFailure && phase !== "playing" && phase !== "result" && challengeFailure !== "network_error"))) {
    return <div className="geo-aurora flex flex-1 items-center justify-center px-4 py-8"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-5"><Swords className="h-8 w-8 text-primary" /><h1 className="mt-3 text-xl font-bold">{locale === "de" ? "Herausforderung nicht spielbar" : "Challenge unavailable"}</h1><p role="alert" className="mt-3 text-sm leading-relaxed text-muted-foreground">{challengeError(challengeFailure ?? (!configured ? "not_configured" : !user ? "unauthorized" : "not_found"), locale)}</p>{configured && !user && <div className="mt-5"><AccountPanel /></div>}<Link href="/challenges" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><ArrowLeft className="h-4 w-4" />{locale === "de" ? "Zur Herausforderungen-Übersicht" : "Back to challenges"}</Link></div></div>;
  }

  if (phase === "playing") {
    // A render prop receives event handlers; it does not invoke them while rendering.
    // eslint-disable-next-line react-hooks/refs
    const content = children({
          difficulty: challenge?.difficulty ?? difficulty,
          mode: challenge?.mode ?? mode,
          // Practice always runs through the whole set, untimed.
          roundCount: isChallenge ? challenge!.rounds : practice ? 0 : roundCount,
          timed: isChallenge ? challenge!.timed : practice ? false : timed,
          variant: challenge?.variant ?? variant,
          scope: undefined,
          practice: isChallenge ? false : practice,
          seed,
          challenge: isChallenge,
          onFinish: (run) => { if (activeRunKey.current === runKey) void handleFinish(run); },
          onExit: () => { if (activeRunKey.current !== runKey) return; setPhase("setup"); if (isChallenge) setChallengeFailure("already_started"); },
        });
    return <div key={runKey} className="flex flex-1 flex-col">{content}</div>;
  }

  if (phase === "result" && result) {
    return (
      <ResultScreen
        result={result}
        isRecord={isRecord}
        newBadges={newBadges}
        newCountries={newCountries}
        levelUp={levelUp}
        onReplay={isChallenge ? undefined : startPlaying}
        challenge={isChallenge && challenge ? { challenge, status: submitStatus, error: submitError, onRetry: () => void submitCompletedAttempt() } : undefined}
      />
    );
  }

  const Icon = config.icon;

  if (isChallenge && challenge) {
    return <div className="geo-aurora flex flex-1 flex-col"><div className="mx-auto w-full max-w-md px-4 py-8"><Link href="/challenges" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{locale === "de" ? "Herausforderungen" : "Challenges"}</Link><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Swords className="h-8 w-8" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-wider text-primary">{locale === "de" ? "Dein einziger Versuch" : "Your one attempt"}</p><h1 className="mt-2 text-2xl font-extrabold">{t(`games.${gameId}.name`)}</h1><p className="mt-2 break-words text-sm text-muted-foreground">{locale === "de" ? "Gegen" : "Against"} <strong className="text-foreground">{challenge.opponentName}</strong></p><div className="mt-6"><ChallengeSummary challenge={challenge} locked /></div><div className="mt-5"><ChallengeRules /></div><p className="mt-5 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />{locale === "de" ? "Mit dem Start beginnt dein Versuch. Einstellungen, Übungsmodus und Neustart sind danach gesperrt. Verlasse die Seite erst nach dem Ergebnis." : "Starting uses your attempt. Settings, practice and replay are locked. Stay on this page until your result is saved."}</p>{challengeFailure && <p role="alert" className="mt-4 text-sm text-danger">{challengeError(challengeFailure, locale)}</p>}<Button size="lg" className="mt-6 w-full gap-2" disabled={starting} onClick={() => void startChallenge()}>{starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}{starting ? (locale === "de" ? "Versuch startet…" : "Starting attempt…") : (locale === "de" ? "Herausforderung starten" : "Start challenge")}</Button></div></div>;
  }

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

        {config.setupNoteKey && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{t(config.setupNoteKey)}</span>
          </div>
        )}

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

          <button
            onClick={() => setPractice((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors",
              practice ? "border-primary bg-primary/5" : "border-border bg-card"
            )}
          >
            <div>
              <div className="font-semibold">{t("setup.practice")}</div>
              <div className="text-xs text-muted-foreground">{t("setup.practice.desc")}</div>
            </div>
            <span
              className={cn(
                "inline-flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors",
                practice ? "bg-primary" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "inline-block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200",
                  practice ? "translate-x-5" : "translate-x-0"
                )}
              />
            </span>
          </button>

          {config.countOptions && !practice && (
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

          {config.supportsTimed && !practice && (
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

function ShellLoading() {
  const { t } = useT();
  return <div className="geo-aurora flex flex-1 items-center justify-center px-4 py-16"><p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{t("common.loading")}</p></div>;
}
