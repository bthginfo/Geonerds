"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Play, HelpCircle, Info, Loader2, Swords, LockKeyhole, BookOpen, Trophy } from "lucide-react";
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
import { cn, formatNumber } from "@/lib/utils";
import { GameArt } from "@/components/home/game-art";
import { useProgression } from "@/store/progression";
import { newRunSeed } from "@/lib/random";
import type { GeoChallenge } from "@/lib/challenges";
import { apiGeoChallenge, apiStartGeoChallenge, apiSubmitGeoChallengeAttempt } from "@/lib/challenge-online";
import { AccountPanel } from "@/components/account/account-panel";
import { ChallengeRules, ChallengeSummary } from "@/components/challenges/challenge-summary";
import { AdastraSetupPhoto } from "@/components/community/adastra-feature";
import { challengeAttemptStorageKey, challengeBotLabel, challengeError, challengePlayBlock, isBotChallenge, readSavedAttempt, writeSavedAttempt, type SavedChallengeAttempt } from "@/components/challenges/challenge-ui";
import { notifyChallengeMutation } from "@/hooks/use-challenge-notifications";
import { GameHelpContent, GameHelpProvider } from "./game-help";
import { trackPlay } from "@/lib/play-stats-client";

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
  const [bestScore, setBestScore] = useState(0);
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
  const storageKey = challenge && challengeId ? challengeAttemptStorageKey(challenge, user?.id) : null;
  const authorizedGuest = Boolean(!user && challenge?.viewerIsGuest && challenge.viewerRole === "opponent" && challenge.viewerKey);
  const authorizedParticipant = Boolean((user && challenge?.viewerRole !== "visitor") || authorizedGuest);

  useEffect(() => {
    if (!isChallenge || !loaded) return;
    if (!configured || !challengeId) {
      setChallengeFailure(!configured ? "not_configured" : "not_found");
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
      if (record.viewerRole === "visitor" || (!user && (!record.viewerIsGuest || record.viewerRole !== "opponent" || !record.viewerKey))) {
        setChallengeFailure(!user && record.invitationType === "link" ? "not_active" : "not_participant");
        return;
      }
      if (block === "wrong_game") { setChallengeFailure(block); return; }
      const key = challengeAttemptStorageKey(record, user?.id);
      const saved = key ? readSavedAttempt(key) : null;
      if (saved?.run && saved.run.gameId === gameId && saved.run.difficulty === record.difficulty && saved.run.mode === record.mode && ["active", "resolved", "expired"].includes(record.status)) {
        completedAttempt.current = saved;
        attemptToken.current = saved.attemptToken;
        finishGuard.current = true;
        setResult(saved.run);
        setPhase("result");
        setSubmitStatus(record.viewerAttempted ? "saved" : "error");
        setSubmitError(record.viewerAttempted ? undefined : "submission_pending");
        if (!saved.localSaved) void saveProgress(saved.run, { countryHits: saved.countryHits ?? [] }, key);
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
    window.addEventListener("focus", refresh);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, [isChallenge, challengeId, phase, submitStatus, challenge?.status]);

  useEffect(() => {
    let active = true;
    void scoreStore.bestScore(gameId).then((best) => { if (active) setBestScore(best); }).catch(() => undefined);
    return () => { active = false; };
  }, [gameId, phase]);

  if (!config) return null;

  async function handleFinish(r: PlayResult) {
    if (finishGuard.current) return;
    finishGuard.current = true;
    trackPlay(gameId, "finish");
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

  async function saveProgress(run: RunResult, r: Pick<PlayResult, "countryHits">, recoveredStorageKey?: string | null) {
    if (progressGuard.current || (isChallenge && completedAttempt.current?.localSaved)) return;
    progressGuard.current = true;
    // Mark before any side effects. Submission retries never touch local progress.
    if (isChallenge && completedAttempt.current) {
      completedAttempt.current = { ...completedAttempt.current, localSaved: true };
      const key = recoveredStorageKey ?? storageKey;
      if (key) writeSavedAttempt(key, completedAttempt.current);
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
    trackPlay(gameId, "start");
    setIsRecord(false);
    setNewBadges([]);
    setLevelUp(null);
    setNewCountries({ discovered: [], researched: [], unlocked: [], mastered: [] });
    activeRunKey.current++;
    setRunKey(activeRunKey.current);
    setPhase("playing");
  }

  async function startChallenge() {
    if (startLock.current || !challenge || !challengeId || !authorizedParticipant || challengePlayBlock(challenge, gameId)) return;
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
      notifyChallengeMutation();
      finishGuard.current = false;
      progressGuard.current = false;
      setSeed(challenge.seed ?? undefined);
      trackPlay(gameId, "start");
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
        notifyChallengeMutation();
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
  if (isChallenge && (!configured || !authorizedParticipant || !challenge || (challengeFailure && phase !== "playing" && phase !== "result" && challengeFailure !== "network_error"))) {
    return <div className="geo-aurora flex flex-1 items-center justify-center px-4 py-8"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-5"><Swords className="h-8 w-8 text-primary" /><h1 className="mt-3 text-xl font-bold">{locale === "de" ? "Herausforderung nicht spielbar" : "Challenge unavailable"}</h1><p role="alert" className="mt-3 text-sm leading-relaxed text-muted-foreground">{challengeError(challengeFailure ?? (!configured ? "not_configured" : !authorizedParticipant ? "not_participant" : "not_found"), locale)}</p>{challengeId && <Link href={`/challenges?invite=${encodeURIComponent(challengeId)}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Einladung und Zugang öffnen" : "Open invitation and access"}</Link>}{configured && !user && !authorizedGuest && <div className="mt-5"><AccountPanel /></div>}<Link href="/challenges" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" />{locale === "de" ? "Zur Herausforderungen-Übersicht" : "Back to challenges"}</Link></div></div>;
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
    return <GameHelpProvider key={runKey} gameId={gameId} timed={isChallenge ? challenge!.timed : !practice && timed}><div className="flex flex-1 flex-col">{content}</div></GameHelpProvider>;
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
        onSettings={isChallenge ? undefined : () => setPhase("setup")}
        challenge={isChallenge && challenge ? { challenge, status: submitStatus, error: submitError, onRetry: () => void submitCompletedAttempt() } : undefined}
      />
    );
  }


  if (isChallenge && challenge) {
    return <div className="geo-aurora flex flex-1 flex-col"><div className="mx-auto w-full max-w-md px-4 py-8">
      <Link href={`/challenges?invite=${encodeURIComponent(challenge.id)}`} className="mb-6 inline-flex min-h-11 items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" aria-hidden />{locale === "de" ? "Zur Herausforderung" : "Back to challenge"}</Link>
      <h1 className="text-2xl font-extrabold">{t(`games.${gameId}.name`)}</h1>
      <p className="mt-2 break-words text-sm text-muted-foreground">{locale === "de" ? "Gegen" : "Against"} <strong className="text-foreground">{challenge.opponentName}</strong>{challenge.opponentIsGuest && <span> ({locale === "de" ? "Gast" : "Guest"})</span>}</p>
      {isBotChallenge(challenge) && <p className="mt-2 text-xs font-semibold text-primary">{challengeBotLabel(challenge, locale)} · {locale === "de" ? "Training ohne Duell-Ranglistenwertung" : "Training · No duel ranking impact"}</p>}
      {(challenge.viewerIsGuest || challenge.opponentIsGuest) && <p className="mt-2 text-xs font-semibold text-primary">{locale === "de" ? "Gastspiel · Ohne Duell-Ranglistenwertung" : "Guest game · Casual, unranked duel"}</p>}
      {authorizedGuest && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Dein Gastzugang gilt in diesem Browser. Bewahre den Einladungslink auf, um später dein Ergebnis zu sehen." : "Your guest access works in this browser. Keep the invitation link to return to your result later."}</p>}
      <div className="mt-5"><ChallengeSummary challenge={challenge} locked /></div>
      <div className="mt-4"><ChallengeRules bot={isBotChallenge(challenge)} /></div>
      <p className="mt-5 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />{locale === "de" ? "Mit dem Start beginnt dein einziger Versuch. Einstellungen, Übungsmodus und Neustart sind danach gesperrt. Verlasse die Seite erst nach dem Ergebnis." : "Starting uses your one attempt. Settings, practice and replay are locked. Stay on this page until your result is saved."}</p>
      {challengeFailure && <p role="alert" className="mt-4 text-sm text-danger">{challengeError(challengeFailure, locale)}</p>}
      <Button size="lg" className="mt-6 h-auto min-h-14 w-full gap-2 px-4 py-3" disabled={starting || Boolean(challengePlayBlock(challenge, gameId))} onClick={() => void startChallenge()}>{starting ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden /> : <Play className="h-5 w-5 shrink-0" aria-hidden />}<span className="whitespace-normal">{starting ? (locale === "de" ? "Versuch startet…" : "Starting attempt…") : (locale === "de" ? "Herausforderung starten" : "Start challenge")}</span></Button>
    </div></div>;
  }

  const variantIsPuzzle = config.variants?.labelKey === "puzzle.variantLabel";
  const segmentClass = "geo-segment min-h-11 px-2 text-sm font-semibold";

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8 pt-4 sm:pt-6">
        <Link
          href="/"
          className="mb-3 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("nav.home")}
        </Link>

        <div className="overflow-hidden rounded-3xl bg-card shadow-sm">
          <GameArt game={config} className="h-28 sm:h-36" />
          <div className="px-4 pb-4 pt-4 sm:px-5">
            <h1 className="text-2xl font-extrabold tracking-tight">{t(`games.${gameId}.name`)}</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(`games.${gameId}.short`)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <button
                onClick={() => setHowOpen(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <HelpCircle className="h-4 w-4" />
                {t("nav.howto")}
              </button>
              {bestScore > 0 && <span className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums text-muted-foreground"><Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />{locale === "de" ? "Bestwert" : "Best"} {formatNumber(bestScore, locale)}</span>}
            </div>
          </div>
        </div>

        {config.setupNoteKey && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground ring-1 ring-inset ring-primary/20">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{t(config.setupNoteKey)}</span>
          </div>
        )}

        <section className="geo-surface mt-4 space-y-5 rounded-3xl p-4 sm:p-5" aria-label={locale === "de" ? "Spiel einrichten" : "Set up the game"}>
          <div>
            <div className="geo-segmented grid grid-cols-2 gap-1">
              <button type="button" className={cn(segmentClass, "gap-2")} aria-pressed={!practice} onClick={() => setPractice(false)}><Play className="h-4 w-4" aria-hidden />{locale === "de" ? "Spielen" : "Play"}</button>
              <button type="button" className={cn(segmentClass, "gap-2")} aria-pressed={practice} onClick={() => setPractice(true)}><BookOpen className="h-4 w-4" aria-hidden />{locale === "de" ? "Üben" : "Practice"}</button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{practice ? t("setup.practice.desc") : locale === "de" ? "Sammle Punkte und erweitere deine Länder-Sammlung." : "Earn points and grow your country collection."}</p>
          </div>

          {config.variants && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t(config.variants.labelKey)}</legend>
              {variantIsPuzzle ? (
                <>
                  <div className="geo-segmented grid grid-cols-2 gap-1">
                    {config.variants.options.map((v) => <button key={v} type="button" aria-pressed={variant === v} onClick={() => setVariant(v)} className={segmentClass}>{t(`scope.${v}`)}</button>)}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(`puzzle.${variant}.desc`)}</p>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {config.variants.options.map((v) => (
                    <button key={v} type="button" aria-pressed={variant === v} onClick={() => setVariant(v)} className={cn("min-h-11 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", variant === v ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground")}>{t(`scope.${v}`)}</button>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {config.supportsDifficulty && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t("common.difficulty")}</legend>
              <div className="geo-segmented grid grid-cols-3 gap-1">{DIFFICULTIES.map((d) => <button key={d} type="button" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)} className={segmentClass}>{t(`difficulty.${d}`)}</button>)}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(gameId === "adastra" ? `adastra.difficulty.${difficulty}` : `difficulty.${difficulty}.desc`)}</p>
            </fieldset>
          )}

          {config.modes && config.modes.length > 1 && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t("common.mode")}</legend>
              <div className="geo-segmented grid grid-cols-2 gap-1">{config.modes.map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={segmentClass}>{t(`mode.${m}`)}</button>)}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(`mode.${mode}.desc`)}</p>
            </fieldset>
          )}

          {config.countOptions && !practice && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t("setup.rounds")}</legend>
              <div className="geo-segmented grid gap-1" style={{ gridTemplateColumns: `repeat(${config.countOptions.length}, minmax(0, 1fr))` }}>
                {config.countOptions.map((n) => <button key={n} type="button" aria-pressed={roundCount === n} onClick={() => setRoundCount(n)} className={segmentClass}>{n === 0 ? t(gameId === "adastra" ? "adastra.allPhotos" : "setup.all") : n}</button>)}
              </div>
            </fieldset>
          )}

          {config.supportsTimed && !practice && (
            <button
              type="button"
              role="switch"
              aria-checked={timed}
              onClick={() => setTimed((v) => !v)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span>
                <span className="block text-sm font-semibold">{t("setup.timed")}</span>
                <span className="block text-xs text-muted-foreground">{t("setup.timed.desc")}</span>
              </span>
              <span className={cn("inline-flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition-colors", timed ? "bg-primary" : "bg-input")}>
                <span className={cn("inline-block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200", timed ? "translate-x-5" : "translate-x-0")} />
              </span>
            </button>
          )}

          <Button size="lg" className="sticky bottom-[max(12px,env(safe-area-inset-bottom))] z-10 h-auto min-h-14 w-full gap-2 rounded-2xl px-4 py-3 text-base shadow-lg shadow-primary/25" onClick={startPlaying}><Play className="h-5 w-5 shrink-0 fill-current" aria-hidden /><span className="whitespace-normal">{practice ? (locale === "de" ? "Übungsrunde starten" : "Start practice") : t("common.start")}</span></Button>
        </section>
        {gameId === "adastra" && <details className="mt-4"><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-primary">{locale === "de" ? "Bildvorschau ansehen" : "See photo preview"}</summary><AdastraSetupPhoto /></details>}
      </div>

      <Modal open={howOpen} onClose={() => setHowOpen(false)} title={t(`games.${gameId}.name`)}>
        <GameHelpContent gameId={gameId} />
        <Button className="mt-4 w-full" onClick={() => setHowOpen(false)}>
          {t("common.gotIt")}
        </Button>
      </Modal>
    </div>
  );
}

function ShellLoading() {
  const { t } = useT();
  return <div className="geo-aurora flex flex-1 items-center justify-center px-4 py-16"><p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{t("common.loading")}</p></div>;
}
