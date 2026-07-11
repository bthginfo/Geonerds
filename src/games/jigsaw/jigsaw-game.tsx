"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Compass, GripVertical, Lightbulb, Loader2, Puzzle, RefreshCw } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ProgressBar, ScorePill, StreakPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { COUNTRIES, countryName } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { featuresByCcn3, type CountryFeature } from "@/lib/geo";
import { prepareOutlineGeometry } from "@/lib/geometry";
import { haptic } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import type { Country } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  JIGSAW_PRESENTATION,
  compassSector,
  dropMatchesTarget,
  isRealBoardDrop,
  neighborRunSummary,
  selectNeighborPuzzles,
  type CompassSector,
  type NeighborTarget,
} from "./puzzle";

const BOARD_W = 760;
const BOARD_H = 440;
const TRAY_W = 132;
const TRAY_H = 78;

interface BoardShape extends NeighborTarget {
  country: Country;
  d: string;
  trayD: string;
}

interface DragState {
  x: number;
  y: number;
  startX: number;
  startY: number;
  code: string;
  moved: boolean;
}

type Feedback = "wrong" | "correct" | "hint" | "round" | null;

function cleanFeature(feature: CountryFeature): GeoJSON.Feature<GeoJSON.Geometry> {
  return { type: "Feature", properties: feature.properties, geometry: prepareOutlineGeometry(feature.geometry) };
}

function trayPath(feature: CountryFeature): string {
  const cleaned = cleanFeature(feature);
  const projection = geoMercator().fitExtent([[7, 7], [TRAY_W - 7, TRAY_H - 7]], cleaned);
  return geoPath(projection)(cleaned) ?? "";
}

function requestedPuzzleCount(difficulty: PlayHandlers["difficulty"], roundCount: number): number {
  if (roundCount === 0) return difficulty === "hard" ? 2 : 3;
  // Three is the setup default; hard neighborhoods contain many more pieces.
  if (difficulty === "hard" && roundCount === 3) return 2;
  return roundCount;
}

export function JigsawGame({ difficulty, roundCount, practice, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const presentation = JIGSAW_PRESENTATION[difficulty];
  const [features, setFeatures] = useState<Map<string, CountryFeature> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [roundMistakes, setRoundMistakes] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [hintSector, setHintSector] = useState<CompassSector | null>(null);
  const [lastPlacedCode, setLastPlacedCode] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ x: BOARD_W / 2, y: BOARD_H / 2 });
  const [drag, setDrag] = useState<DragState | null>(null);
  const boardRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressTrayClickRef = useRef(false);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    featuresByCcn3("10m").then(setFeatures).catch(() => setLoadError(true));
    return () => { if (feedbackTimerRef.current != null) window.clearTimeout(feedbackTimerRef.current); };
  }, []);

  const puzzles = useMemo(() => {
    if (!features) return [];
    void generation;
    return selectNeighborPuzzles(
      COUNTRIES,
      new Set(features.keys()),
      difficulty,
      requestedPuzzleCount(difficulty, roundCount),
      Math.random
    );
  }, [features, difficulty, roundCount, generation]);

  const puzzle = puzzles[roundIndex] ?? null;

  const board = useMemo(() => {
    if (!features || !puzzle) return { anchor: null as BoardShape | null, neighbors: new Map<string, BoardShape>() };
    const countries = [puzzle.anchor, ...puzzle.neighbors];
    const entries = countries.flatMap((country) => {
      const feature = country.ccn3 ? features.get(String(country.ccn3)) : undefined;
      return feature ? [{ country, feature }] : [];
    });
    if (entries.length !== countries.length) return { anchor: null as BoardShape | null, neighbors: new Map<string, BoardShape>() };

    const collection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: entries.map((entry) => cleanFeature(entry.feature)),
    };
    const projection = geoMercator().fitExtent([[54, 42], [BOARD_W - 54, BOARD_H - 42]], collection);
    const path = geoPath(projection);
    const shapes = entries.flatMap(({ country, feature }) => {
      const cleaned = cleanFeature(feature);
      const d = path(cleaned) ?? "";
      const bounds = path.bounds(cleaned);
      const [cx, cy] = path.centroid(cleaned);
      if (!d || !Number.isFinite(cx) || !Number.isFinite(cy)) return [];
      const width = bounds[1][0] - bounds[0][0];
      const height = bounds[1][1] - bounds[0][1];
      return [{ country, code: country.cca3, d, trayD: trayPath(feature), cx, cy, bounds, tiny: Math.max(width, height) < 24 || width * height < 520 }];
    });
    return {
      anchor: shapes.find((shape) => shape.code === puzzle.anchor.cca3) ?? null,
      neighbors: new Map(shapes.filter((shape) => shape.code !== puzzle.anchor.cca3).map((shape) => [shape.code, shape])),
    };
  }, [features, puzzle]);

  const active = puzzle?.neighbors.find((country) => country.cca3 === selectedCode) ?? null;
  const remaining = puzzle?.neighbors.filter((country) => !placed.includes(country.cca3)) ?? [];
  const completedBefore = puzzles.slice(0, roundIndex).reduce((sum, item) => sum + item.neighbors.length, 0);
  const runSummary = useMemo(() => neighborRunSummary(puzzles), [puzzles]);
  const totalPieces = runSummary.total;
  const completedPieces = completedBefore + placed.length;

  useEffect(() => {
    if (!puzzle) return;
    setSelectedCode(null);
    setPlaced([]);
    setRoundMistakes(0);
    setHintSector(null);
    setLastPlacedCode(null);
    if (board.anchor) setCursor({ x: board.anchor.cx, y: board.anchor.cy });
  }, [puzzle, board.anchor]);

  function showFeedback(kind: Exclude<Feedback, null>, duration = 1600) {
    setFeedback(kind);
    if (feedbackTimerRef.current != null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), duration);
  }

  function resetGame() {
    if (loadError) {
      setLoadError(false);
      setFeatures(null);
      featuresByCcn3("10m").then(setFeatures).catch(() => setLoadError(true));
    }
    setGeneration((value) => value + 1);
    setRoundIndex(0); setPlaced([]); setSelectedCode(null); setScore(0); setStreak(0); setBestStreak(0);
    setMistakes(0); setRoundMistakes(0); setFeedback(null); setHintSector(null); setLastPlacedCode(null); setDrag(null);
    dragRef.current = null; finishedRef.current = false; startRef.current = Date.now();
  }

  function miss() {
    sound.wrong(); haptic.error();
    setMistakes((value) => value + 1);
    setRoundMistakes((value) => value + 1);
    setStreak(0);
    setScore((value) => Math.max(0, value - (difficulty === "hard" ? 24 : difficulty === "medium" ? 16 : 10)));
    showFeedback("wrong");
  }

  function finishRun(nextScore: number, nextBest: number) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    window.setTimeout(() => onFinish({
      score: nextScore,
      correct: totalPieces,
      total: totalPieces,
      bestStreak: nextBest,
      durationMs: Date.now() - startRef.current,
      mode: "neighbor-jigsaw",
      countryHits: runSummary.countryHits,
    }), 900);
  }

  function placeAt(point: { x: number; y: number }, code = selectedCode) {
    if (!puzzle || !code || placed.includes(code)) return;
    const placingPiece = puzzle.neighbors.find((country) => country.cca3 === code);
    if (!placingPiece) return;
    const target = board.neighbors.get(placingPiece.cca3);
    if (!target || !dropMatchesTarget(point, target, difficulty)) { miss(); return; }

    sound.correct(); haptic.success();
    const nextStreak = streak + 1;
    const earned = practice ? 0 : 110 + nextStreak * 20 + (difficulty === "hard" ? 70 : difficulty === "medium" ? 35 : 0);
    const nextScore = score + earned;
    const nextBest = Math.max(bestStreak, nextStreak);
    const nextPlaced = [...placed, placingPiece.cca3];
    setPlaced(nextPlaced); setSelectedCode(null); setScore(nextScore); setStreak(nextStreak); setBestStreak(nextBest);
    setHintSector(null); setLastPlacedCode(placingPiece.cca3); showFeedback("correct", 900);

    if (nextPlaced.length !== puzzle.neighbors.length) return;
    if (roundIndex + 1 < puzzles.length) {
      showFeedback("round", 1000);
      window.setTimeout(() => setRoundIndex((value) => value + 1), 1050);
    } else {
      finishRun(nextScore, nextBest);
    }
  }

  function pointFromClient(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (clientX - rect.left) * BOARD_W / rect.width, y: (clientY - rect.top) * BOARD_H / rect.height };
  }

  function tryClientPoint(clientX: number, clientY: number, code?: string) {
    const point = pointFromClient(clientX, clientY);
    if (point) placeAt(point, code);
  }

  function revealHint() {
    if (!active || !board.anchor || roundMistakes < 2) return;
    const target = board.neighbors.get(active.cca3);
    if (!target) return;
    setHintSector(compassSector(board.anchor, target));
    setScore((value) => Math.max(0, value - 70));
    haptic.tap(); showFeedback("hint", 2400);
  }

  function selectPiece(code: string) {
    setSelectedCode(code);
    setHintSector(null);
    haptic.tap();
  }

  function handleBoardKey(event: React.KeyboardEvent<SVGSVGElement>) {
    if (!active) return;
    const step = event.shiftKey ? 6 : 18;
    const movement: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    if (movement[event.key]) {
      event.preventDefault();
      const [dx, dy] = movement[event.key];
      setCursor((value) => ({ x: Math.max(8, Math.min(BOARD_W - 8, value.x + dx)), y: Math.max(8, Math.min(BOARD_H - 8, value.y + dy)) }));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault(); placeAt(cursor);
    } else if (event.key === "Escape") {
      event.preventDefault(); setSelectedCode(null); setHintSector(null);
    }
  }

  if (!features && !loadError) return <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t("common.loading")}</div>;
  if (loadError || !puzzle || !board.anchor || board.neighbors.size !== puzzle.neighbors.length) return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center"><Puzzle className="h-9 w-9 text-primary" /><p className="max-w-sm text-sm text-muted-foreground">{t("jigsaw.loadError")}</p><Button variant="outline" onClick={resetGame}><RefreshCw className="h-4 w-4" />{t("jigsaw.newPuzzle")}</Button></div>
  );

  const dragShape = drag ? board.neighbors.get(drag.code) : null;
  const lastPlaced = puzzle.neighbors.find((country) => country.cca3 === lastPlacedCode) ?? null;
  return (
    <div className="geo-workbench flex flex-1 flex-col">
      <GameTopBar title={t("games.jigsaw.name")} onExit={onExit}><StreakPill value={streak} /><ScorePill value={score} /></GameTopBar>
      <ProgressBar value={totalPieces ? completedPieces / totalPieces : 0} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-4 px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-center lg:px-5 lg:pb-5">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">{t("jigsaw.round", { current: roundIndex + 1, total: puzzles.length })}</p>
              <h2 className="mt-1 text-lg font-black tracking-tight sm:text-xl">{t("jigsaw.mission", { country: countryName(puzzle.anchor, locale) })}</h2>
            </div>
            <div className="flex gap-2 text-xs font-bold tabular-nums text-muted-foreground">
              <span>{t("jigsaw.remaining", { n: remaining.length })}</span><span aria-hidden="true">·</span><span>{t("jigsaw.mistakes", { n: mistakes })}</span>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[#e9e3d6] shadow-xl dark:bg-[#101823]" aria-label={t("jigsaw.boardLabel") }>
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(42,69,82,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(42,69,82,.1)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="pointer-events-none absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-500/20 bg-white/55 text-slate-600 shadow-sm dark:bg-slate-950/45 dark:text-slate-300"><Compass className="h-5 w-5" /><span className="absolute top-0.5 text-[8px] font-black">N</span></div>
            <svg
              ref={boardRef}
              viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
              className="relative block aspect-[19/11] w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              role="application"
              tabIndex={0}
              aria-label={active
                ? difficulty === "hard"
                  ? t("jigsaw.boardActiveUnnamed")
                  : t("jigsaw.boardActive", { country: countryName(active, locale) })
                : t("jigsaw.boardLabel")}
              onClick={(event) => { if (active) tryClientPoint(event.clientX, event.clientY); }}
              onKeyDown={handleBoardKey}
            >
              <defs>
                <filter id="anchor-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <path d={board.anchor.d} className="pointer-events-none fill-primary/80 stroke-cyan-100 dark:fill-primary/75" strokeWidth={2.2} filter="url(#anchor-glow)" />
              <AnimatePresence>
                {placed.map((code) => {
                  const shape = board.neighbors.get(code);
                  if (!shape) return null;
                  return <motion.g key={code} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "spring", stiffness: 240, damping: 22 }}>
                    <motion.path d={shape.d} className="pointer-events-none fill-emerald-500/70 stroke-emerald-100 dark:fill-emerald-400/55" strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.42 }} />
                    {!shape.tiny && countryName(shape.country, locale).length <= 14 && <text x={shape.cx} y={shape.cy} textAnchor="middle" dominantBaseline="central" className="pointer-events-none hidden fill-white text-[19px] font-black paint-order-stroke stroke-slate-950/90 stroke-[4px] sm:block">{countryName(shape.country, locale)}</text>}
                  </motion.g>;
                })}
              </AnimatePresence>
              <circle cx={board.anchor.cx} cy={board.anchor.cy} r={4} className="pointer-events-none fill-white/95" />
              {active && <g className="pointer-events-none" aria-hidden="true"><circle cx={cursor.x} cy={cursor.y} r={10} className="fill-amber-400/20 stroke-amber-500" strokeWidth={2} /><path d={`M ${cursor.x - 15} ${cursor.y} h 30 M ${cursor.x} ${cursor.y - 15} v 30`} className="stroke-amber-500" strokeWidth={1.5} /></g>}
            </svg>
            <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[80%] -translate-x-1/2 rounded-xl border border-cyan-100/50 bg-slate-950/88 px-3 py-2 text-center text-sm font-black text-white shadow-lg"><span className="mr-1.5 text-cyan-300">●</span>{countryName(puzzle.anchor, locale)}</div>
          </section>
          <div className="flex min-h-8 items-center px-1 pt-2" aria-live="polite">
            {lastPlaced && <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4 shrink-0" />{t("jigsaw.placedCaption", { country: countryName(lastPlaced, locale) })}</p>}
          </div>
        </div>

        <aside className="rounded-3xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t("jigsaw.pieceTray")}</p><span className="text-xs font-semibold tabular-nums text-muted-foreground">{t("jigsaw.progress", { current: placed.length, total: puzzle.neighbors.length })}</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2 pr-1 sm:grid-cols-3 lg:max-h-[48vh] lg:grid-cols-2 lg:overflow-y-auto lg:pb-3">
            {remaining.map((piece) => {
              const shape = board.neighbors.get(piece.cca3)!;
              const isActive = selectedCode === piece.cca3;
              return <motion.button
                layout
                key={piece.cca3}
                aria-label={presentation.namedPieces ? t("jigsaw.selectPiece", { country: countryName(piece, locale) }) : t("jigsaw.unnamedPiece")}
                aria-pressed={isActive}
                className={cn("relative flex min-h-28 touch-none flex-col items-center justify-center rounded-2xl border-2 p-2 outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring", isActive ? "border-amber-500 bg-amber-500/10 shadow-[0_0_0_2px_rgba(245,158,11,.12)]" : "border-border bg-muted/25 hover:border-primary/50")}
                onClick={() => { if (suppressTrayClickRef.current) { suppressTrayClickRef.current = false; return; } selectPiece(piece.cca3); }}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectPiece(piece.cca3); boardRef.current?.focus(); } }}
                onPointerDown={(event) => {
                  if (event.pointerType === "mouse" && event.button !== 0) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  selectPiece(piece.cca3);
                  const next = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, code: piece.cca3, moved: false };
                  dragRef.current = next; setDrag(next);
                }}
                onPointerMove={(event) => {
                  const current = dragRef.current;
                  if (!current || current.code !== piece.cca3) return;
                  const next = { ...current, x: event.clientX, y: event.clientY, moved: current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >= 8 };
                  dragRef.current = next; setDrag(next);
                }}
                onPointerUp={(event) => {
                  const gesture = dragRef.current?.code === piece.cca3 ? dragRef.current : null;
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                  dragRef.current = null; setDrag(null);
                  const rect = boardRef.current?.getBoundingClientRect();
                  if (gesture && rect && isRealBoardDrop({ x: gesture.startX, y: gesture.startY }, { x: event.clientX, y: event.clientY }, rect)) {
                    suppressTrayClickRef.current = true;
                    tryClientPoint(event.clientX, event.clientY, piece.cca3);
                  }
                }}
                onPointerCancel={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                  dragRef.current = null; setDrag(null);
                }}
              >
                <GripVertical className="absolute right-1.5 top-1.5 h-4 w-4 text-muted-foreground" />
                <svg viewBox={`0 0 ${TRAY_W} ${TRAY_H}`} className="h-[4.5rem] w-full overflow-visible" aria-hidden="true"><path d={shape.trayD} className={cn("stroke-card transition-colors", isActive ? "fill-amber-500" : "fill-primary")} strokeWidth={2.4} /></svg>
                {presentation.namedPieces && <span className="mt-1 text-center text-sm font-extrabold leading-tight">{countryName(piece, locale)}</span>}
              </motion.button>;
            })}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t(`jigsaw.instructions.${difficulty}`)}</p>
          <div className="mt-3 min-h-11" aria-live="polite">
            {feedback === "wrong" && <div className="rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">{t("jigsaw.wrongDirection")}</div>}
            {feedback === "correct" && <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">{t("jigsaw.correctPlacement")}</div>}
            {feedback === "round" && <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">{t("jigsaw.neighborhoodComplete")}</div>}
            {feedback === "hint" && hintSector && <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-300">{t("jigsaw.hintDirection", { direction: t(`jigsaw.sector.${hintSector}`) })}</div>}
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-3">
            <span className="flex-1 text-xs font-semibold text-muted-foreground">{active ? t("jigsaw.activePiece") : t("jigsaw.choosePiece")}</span>
            <Button variant="outline" size="sm" className="min-h-11 gap-1.5" disabled={roundMistakes < 2 || !active} onClick={revealHint}><Lightbulb className="h-4 w-4" />{t("jigsaw.hint")}</Button>
          </div>
        </aside>
      </main>
      {drag?.moved && dragShape && <div className="pointer-events-none fixed z-[80] w-36 -translate-x-1/2 -translate-y-1/2 opacity-75 drop-shadow-2xl" style={{ left: drag.x, top: drag.y }}><svg viewBox={`0 0 ${TRAY_W} ${TRAY_H}`} className="h-24 w-36 overflow-visible"><path d={dragShape.trayD} className="fill-amber-400 stroke-white" strokeWidth={2.6} /></svg></div>}
      <span className="sr-only" aria-live="polite">{active ? t("jigsaw.selectedAnnouncement", { country: presentation.namedPieces ? countryName(active, locale) : t("jigsaw.unnamedPiece") }) : ""}</span>
    </div>
  );
}
