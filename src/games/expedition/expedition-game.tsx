"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronRight, Compass, Crown, Flag, Heart, Map, RotateCcw, Route, Shield, Sparkles, Star, Stamp, Zap } from "lucide-react";
import type { PlayHandlers, PlayResult } from "@/components/game/game-shell";
import { GameTopBar } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { FlagGame } from "@/games/flags/flag-game";
import { CapitalsGame } from "@/games/capitals/capitals-game";
import { OutlineGame } from "@/games/outline/outline-game";
import { TriviaGame } from "@/games/trivia/trivia-game";
import { RankingGame } from "@/games/ranking/ranking-game";
import { LanguagesGame } from "@/games/languages/languages-game";
import { NeighborsGame } from "@/games/neighbors/neighbors-game";
import { EXPEDITION_ROUTES, energyLossForAccuracy, getExpeditionRoute, normalizedStageScore, starsForAccuracy, type ExpeditionRoute, type ExpeditionRouteId, type ExpeditionStage, type ExpeditionStageGame } from "./routes";
import { isValidExpeditionRun, useExpedition, type ExpeditionRunState } from "@/store/expedition";

type Phase = "select" | "resume" | "journal" | "stage" | "debrief" | "complete" | "failed";

const CHILDREN: Record<ExpeditionStageGame, React.ComponentType<PlayHandlers>> = {
  flags: FlagGame,
  capitals: CapitalsGame,
  outline: OutlineGame,
  trivia: TriviaGame,
  ranking: RankingGame,
  languages: LanguagesGame,
  neighbors: NeighborsGame,
};

interface Debrief {
  stars: number;
  energyLoss: number;
  gained: number;
  correct: number;
  total: number;
}

export function ExpeditionGame({ onFinish, onExit }: PlayHandlers) {
  const { t } = useT();
  const active = useExpedition((state) => state.active);
  const records = useExpedition((state) => state.records);
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedStage, setSelectedStage] = useState<ExpeditionStage | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [finalRun, setFinalRun] = useState<ExpeditionRunState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const stageFinishedRef = useRef(false);

  useEffect(() => {
    const stored = useExpedition.getState().active;
    if (stored && !isValidExpeditionRun(stored)) {
      useExpedition.getState().setActive(null);
      setPhase("select");
    } else if (stored) setPhase("resume");
  }, []);

  const route = useMemo(() => getExpeditionRoute(active?.routeId ?? finalRun?.routeId), [active?.routeId, finalRun?.routeId]);

  function startRoute(routeId: ExpeditionRouteId) {
    useExpedition.getState().start(routeId);
    setSelectedStage(null); setDebrief(null); setFinalRun(null); setAttempt((value) => value + 1); setPhase("journal");
    haptic.tap();
  }

  function resume() {
    if (!isValidExpeditionRun(useExpedition.getState().active)) return setPhase("select");
    setPhase("journal"); haptic.tap();
  }

  function startOver() {
    if (!confirm(t("expedition.startOverConfirm"))) return;
    useExpedition.getState().setActive(null); setPhase("select");
  }

  function chooseStage(stage: ExpeditionStage) {
    const run = useExpedition.getState().active;
    if (!run || run.energy <= 0 || run.checkpointIndex >= 6) return;
    const next = { ...run, branches: { ...run.branches, [run.checkpointIndex]: stage.id } };
    useExpedition.getState().setActive(next);
    stageFinishedRef.current = false; setSelectedStage(stage); setAttempt((value) => value + 1); setPhase("stage"); haptic.tap();
  }

  function handleStageFinish(result: PlayResult) {
    if (stageFinishedRef.current) return;
    stageFinishedRef.current = true;
    const run = useExpedition.getState().active;
    if (!run || !selectedStage) return;
    const stars = starsForAccuracy(result.correct, result.total);
    const energyLoss = energyLossForAccuracy(result.correct, result.total);
    const gained = normalizedStageScore(result.correct, result.total, stars);
    const next: ExpeditionRunState = {
      ...run,
      checkpointIndex: run.checkpointIndex + 1,
      energy: Math.max(0, run.energy - energyLoss),
      score: run.score + gained,
      correct: run.correct + result.correct,
      total: run.total + result.total,
      bestStreak: Math.max(run.bestStreak, result.bestStreak),
      durationMs: run.durationMs + result.durationMs,
      stars: [...run.stars, stars],
      countryHits: [...new Set([...run.countryHits, ...(result.countryHits ?? [])])],
    };
    useExpedition.getState().setActive(next);
    setDebrief({ stars, energyLoss, gained, correct: result.correct, total: result.total });
    setPhase("debrief");
    if (energyLoss) { sound.wrong(); haptic.error(); } else { sound.correct(); haptic.success(); }
  }

  function continueFromDebrief() {
    const run = useExpedition.getState().active;
    if (!run) return setPhase("select");
    if (run.energy <= 0) { setFinalRun(run); setPhase("failed"); }
    else if (run.checkpointIndex >= 6) {
      const completed = { ...run, score: run.score + 1500 + run.energy * 300 };
      useExpedition.getState().setActive(completed); setFinalRun(completed); setPhase("complete"); sound.finish(); haptic.success();
    } else { setSelectedStage(null); setDebrief(null); setPhase("journal"); }
  }

  function finishJourney(completed: boolean) {
    const run = finalRun ?? useExpedition.getState().active;
    if (!run) return;
    if (completed) useExpedition.getState().finish(run); else useExpedition.getState().setActive(null);
    onFinish({ score: run.score, correct: run.correct, total: run.total, bestStreak: run.bestStreak, durationMs: run.durationMs, mode: run.routeId, countryHits: run.countryHits });
  }

  if (phase === "resume" && active && route) return <ResumeState route={route} run={active} onResume={resume} onStartOver={startOver} onExit={onExit} />;
  if (phase === "select") return <RouteSelection records={records} onChoose={startRoute} onExit={onExit} />;
  if (!active || !route) return <RouteSelection records={records} onChoose={startRoute} onExit={onExit} />;

  if (phase === "stage" && selectedStage) {
    const StageComponent = CHILDREN[selectedStage.gameId];
    const handlers: PlayHandlers = {
      difficulty: selectedStage.difficulty, mode: selectedStage.mode, roundCount: 3, timed: false,
      variant: selectedStage.variant ?? "world", scope: route.scope, practice: false,
      onFinish: handleStageFinish, onExit,
    };
    return <div className="flex flex-1 flex-col bg-background">
      <div className="flex min-h-11 items-center gap-3 border-b border-emerald-700/20 bg-emerald-950 px-3 text-xs font-bold text-emerald-50">
        <Route className="h-4 w-4 text-emerald-300" /><span className="truncate">{t(`expedition.route.${route.id}.name`)}</span><span className="ml-auto">{t("expedition.checkpointOf", { current: active.checkpointIndex + 1, total: 6 })}</span><EnergyDots energy={active.energy} />
      </div>
      <div key={`${selectedStage.id}-${attempt}`} className="flex flex-1 flex-col"><StageComponent {...handlers} /></div>
    </div>;
  }

  if (phase === "debrief" && debrief) return <DebriefState route={route} run={active} debrief={debrief} onContinue={continueFromDebrief} onExit={onExit} />;
  if (phase === "complete" && finalRun) return <FinalState completed route={route} run={finalRun} onFinish={() => finishJourney(true)} onRestart={() => startRoute(route.id)} />;
  if (phase === "failed" && finalRun) return <FinalState completed={false} route={route} run={finalRun} onFinish={() => finishJourney(false)} onRestart={() => startRoute(route.id)} />;
  return <Journal route={route} run={active} onChoose={chooseStage} onExit={onExit} />;
}

function RouteSelection({ records, onChoose, onExit }: { records: ReturnType<typeof useExpedition.getState>["records"]; onChoose: (id: ExpeditionRouteId) => void; onExit: () => void }) {
  const { t } = useT();
  return <div className="geo-aurora flex flex-1 flex-col"><GameTopBar title={t("games.expedition.name")} onExit={onExit} />
    <main className="mx-auto w-full max-w-5xl px-4 py-7 pb-16">
      <div className="mx-auto max-w-2xl text-center"><span className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/25 bg-emerald-950 px-3 py-1.5 text-xs font-black uppercase tracking-[.18em] text-emerald-100"><Compass className="h-4 w-4" />{t("expedition.fieldJournal")}</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t("expedition.chooseRoute")}</h1><p className="mt-2 text-sm text-muted-foreground sm:text-base">{t("expedition.chooseRouteDesc")}</p></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{EXPEDITION_ROUTES.map((route, index) => { const record = records[route.id]; return <motion.button key={route.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} onClick={() => onChoose(route.id)} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: route.accent }} /><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-extrabold">{t(`expedition.route.${route.id}.name`)}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(`expedition.route.${route.id}.desc`)}</p></div><Map className="h-7 w-7 shrink-0 opacity-60" style={{ color: route.accent }} /></div>
        <div className="mt-5 flex items-center justify-between border-t border-dashed border-border pt-3 text-xs font-bold"><span className="text-muted-foreground">{t("expedition.sixCheckpoints")}</span>{record ? <span className="inline-flex items-center gap-1 text-amber-600"><Star className="h-4 w-4 fill-current" />{record.bestStars}/18</span> : <span className="text-primary">{t("expedition.newRoute")}</span>}</div>
      </motion.button>; })}</div>
    </main></div>;
}

function Journal({ route, run, onChoose, onExit }: { route: ExpeditionRoute; run: ExpeditionRunState; onChoose: (stage: ExpeditionStage) => void; onExit: () => void }) {
  const { t } = useT();
  const checkpoint = route.checkpoints[run.checkpointIndex];
  return <div className="geo-workbench flex flex-1 flex-col"><GameTopBar title={t(`expedition.route.${route.id}.name`)} onExit={onExit}><EnergyDots energy={run.energy} /></GameTopBar>
    <main className="mx-auto w-full max-w-5xl px-4 py-6"><div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/15 bg-[#f4efdf] p-5 text-slate-800 shadow-xl dark:bg-slate-900 dark:text-slate-100">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:repeating-radial-gradient(circle_at_30%_20%,transparent_0,transparent_30px,rgba(5,150,105,.15)_31px,transparent_32px)]" />
        <div className="relative flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-[.18em] text-emerald-700 dark:text-emerald-300">{t("expedition.fieldJournal")}</div><h1 className="mt-1 text-2xl font-black">{t("expedition.routeMap")}</h1></div><div className="rounded-xl border border-slate-900/10 bg-white/60 px-3 py-2 text-right dark:border-white/10 dark:bg-slate-950/50"><div className="text-[10px] font-bold uppercase tracking-wide opacity-60">{t("common.score")}</div><div className="font-black tabular-nums">{run.score}</div></div></div>
        <div className="relative mt-8 grid grid-cols-3 gap-x-4 gap-y-10 sm:grid-cols-6">{route.checkpoints.map((node, index) => { const done = index < run.checkpointIndex; const current = index === run.checkpointIndex; const boss = index === 5; return <div key={node.id} className={cn("relative flex flex-col items-center text-center", index % 2 ? "sm:translate-y-8" : "")}>{index < 5 && <div className={cn("absolute left-[55%] top-6 hidden h-0.5 w-[90%] origin-left sm:block", index % 2 ? "-rotate-[14deg]" : "rotate-[14deg]", index < run.checkpointIndex ? "bg-emerald-500" : "border-t-2 border-dashed border-slate-400/50")} />}
          <div className={cn("relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-black shadow", done ? "border-emerald-700 bg-emerald-600 text-white" : current ? "border-emerald-700 bg-white text-emerald-800 ring-4 ring-emerald-500/20 dark:bg-slate-950 dark:text-emerald-300" : "border-slate-400/50 bg-[#f4efdf] text-slate-500 dark:bg-slate-900", boss && "h-14 w-14 border-amber-600")}>{done ? <Check className="h-5 w-5" /> : boss ? <Crown className="h-6 w-6" /> : index + 1}</div><span className="mt-2 text-[10px] font-extrabold uppercase tracking-wide">{boss ? t("expedition.boss") : t("expedition.checkpoint", { n: index + 1 })}</span>{done && <div className="mt-1 flex">{Array.from({ length: run.stars[index] ?? 0 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />)}</div>}</div>; })}</div>
      </section>
      <aside className="rounded-3xl border border-border bg-card p-5 shadow-lg"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-muted-foreground">{run.checkpointIndex === 5 ? <Crown className="h-4 w-4 text-amber-500" /> : <Route className="h-4 w-4 text-primary" />}{run.checkpointIndex === 5 ? t("expedition.bossAhead") : t("expedition.chooseBranch")}</div><h2 className="mt-2 text-xl font-black">{t("expedition.checkpoint", { n: run.checkpointIndex + 1 })}</h2><p className="mt-1 text-sm text-muted-foreground">{run.checkpointIndex === 5 ? t("expedition.bossDesc") : t("expedition.branchDesc")}</p>
        <div className="mt-5 space-y-3">{checkpoint.options.map((stage, index) => <button key={stage.id} onClick={() => onChoose(stage)} className="group flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-border bg-background p-3 text-left transition-all hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: route.accent }}>{stage.boss ? <Crown className="h-5 w-5" /> : index ? <Compass className="h-5 w-5" /> : <Flag className="h-5 w-5" />}</span><span className="min-w-0 flex-1"><span className="block font-extrabold">{t(`games.${stage.gameId}.name`)}</span><span className="block text-xs text-muted-foreground">{t(`difficulty.${stage.difficulty}`)} · 3 {t("expedition.questions")}</span></span><ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" /></button>)}</div>
        <div className="mt-5 flex items-center justify-between border-t border-dashed border-border pt-4 text-xs font-bold text-muted-foreground"><span>{t("expedition.energy")}</span><EnergyDots energy={run.energy} /></div>
      </aside>
    </div></main></div>;
}

function DebriefState({ route, run, debrief, onContinue, onExit }: { route: ExpeditionRoute; run: ExpeditionRunState; debrief: Debrief; onContinue: () => void; onExit: () => void }) {
  const { t } = useT();
  return <div className="geo-workbench flex flex-1 flex-col"><GameTopBar title={t("expedition.checkpointDebrief")} onExit={onExit} /><main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-8"><motion.section initial={{ opacity: 0, scale: .94, rotate: -1 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} className="relative w-full overflow-hidden rounded-3xl border border-emerald-900/20 bg-[#f5efdf] p-6 text-slate-800 shadow-2xl dark:bg-slate-900 dark:text-slate-100"><div className="absolute -right-4 -top-4 flex h-24 w-24 rotate-12 items-center justify-center rounded-full border-4 border-double border-emerald-700/50 text-emerald-700/60"><Stamp className="h-10 w-10" /></div><div className="text-xs font-black uppercase tracking-[.2em] text-emerald-700 dark:text-emerald-300">{t(`expedition.route.${route.id}.name`)}</div><h1 className="mt-2 text-3xl font-black">{t("expedition.checkpointStamped")}</h1><div className="mt-5 flex gap-2">{[1,2,3].map((n) => <Star key={n} className={cn("h-9 w-9", n <= debrief.stars ? "fill-amber-500 text-amber-500" : "fill-slate-300 text-slate-300 dark:fill-slate-700 dark:text-slate-700")} />)}</div><div className="mt-6 grid grid-cols-2 gap-3"><DebriefStat label={t("common.accuracy")} value={`${debrief.correct}/${debrief.total}`} /><DebriefStat label={t("expedition.scoreGained")} value={`+${debrief.gained}`} /><DebriefStat label={t("expedition.energy")} value={debrief.energyLoss ? "−1" : t("expedition.energySafe")} /><DebriefStat label={t("expedition.progressLabel")} value={`${run.checkpointIndex}/6`} /></div>{debrief.energyLoss > 0 && <p className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold"><Shield className="h-4 w-4 shrink-0 text-rose-600" />{t("expedition.energyLost")}</p>}<Button size="lg" className="mt-6 w-full gap-2" onClick={onContinue}>{run.energy <= 0 ? t("expedition.seeReport") : run.checkpointIndex >= 6 ? t("expedition.finishRoute") : t("expedition.continueJourney")}<ArrowRight className="h-5 w-5" /></Button></motion.section></main></div>;
}

function ResumeState({ route, run, onResume, onStartOver, onExit }: { route: ExpeditionRoute; run: ExpeditionRunState; onResume: () => void; onStartOver: () => void; onExit: () => void }) { const { t } = useT(); return <div className="geo-aurora flex flex-1 flex-col"><GameTopBar title={t("games.expedition.name")} onExit={onExit} /><main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-8"><section className="w-full rounded-3xl border border-border bg-card p-6 text-center shadow-xl"><Compass className="mx-auto h-12 w-12 text-primary" /><div className="mt-3 text-xs font-black uppercase tracking-[.18em] text-primary">{t("expedition.savedJourney")}</div><h1 className="mt-2 text-2xl font-black">{t(`expedition.route.${route.id}.name`)}</h1><p className="mt-2 text-sm text-muted-foreground">{t("expedition.resumeDesc", { current: run.checkpointIndex + 1, total: 6 })}</p><div className="mt-5 flex items-center justify-center gap-5 text-sm font-bold"><span>{run.checkpointIndex}/6</span><EnergyDots energy={run.energy} /><span>{run.score} {t("common.points")}</span></div><Button size="lg" className="mt-6 w-full gap-2" onClick={onResume}>{t("expedition.resume")}<ArrowRight className="h-5 w-5" /></Button><Button variant="ghost" className="mt-2 w-full gap-2" onClick={onStartOver}><RotateCcw className="h-4 w-4" />{t("expedition.startOver")}</Button></section></main></div>; }

function FinalState({ completed, route, run, onFinish, onRestart }: { completed: boolean; route: ExpeditionRoute; run: ExpeditionRunState; onFinish: () => void; onRestart: () => void }) { const { t } = useT(); const stars = run.stars.reduce((sum, value) => sum + value, 0); return <div className="geo-aurora flex flex-1 flex-col"><main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-10"><motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-3xl border border-border bg-card p-7 text-center shadow-2xl"><span className={cn("mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg", completed ? "bg-emerald-600" : "bg-rose-600")}>{completed ? <Sparkles className="h-10 w-10" /> : <Heart className="h-10 w-10" />}</span><div className="mt-5 text-xs font-black uppercase tracking-[.18em] text-primary">{t(`expedition.route.${route.id}.name`)}</div><h1 className="mt-2 text-3xl font-black">{completed ? t("expedition.completeTitle") : t("expedition.failedTitle")}</h1><p className="mt-2 text-sm text-muted-foreground">{completed ? t("expedition.completeDesc") : t("expedition.failedDesc")}</p><div className="mt-6 grid grid-cols-3 gap-2"><DebriefStat label={t("common.score")} value={String(run.score)} /><DebriefStat label={t("expedition.stars")} value={`${stars}/18`} /><DebriefStat label={t("expedition.energy")} value={String(run.energy)} /></div><Button size="lg" className="mt-6 w-full" onClick={onFinish}>{t("expedition.seeResults")}</Button><Button variant="ghost" className="mt-2 w-full gap-2" onClick={onRestart}><RotateCcw className="h-4 w-4" />{t("expedition.tryAgain")}</Button></motion.section></main></div>; }

function EnergyDots({ energy }: { energy: number }) { return <span className="inline-flex items-center gap-1" aria-label={`${energy} energy`}>{[0,1,2].map((index) => <Zap key={index} className={cn("h-4 w-4", index < energy ? "fill-amber-400 text-amber-400" : "text-slate-500/50")} />)}</span>; }
function DebriefStat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-900/10 bg-white/55 p-3 text-center dark:border-white/10 dark:bg-slate-950/45"><div className="text-lg font-black tabular-nums">{value}</div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide opacity-60">{label}</div></div>; }
