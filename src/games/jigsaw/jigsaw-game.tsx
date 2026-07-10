"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { motion } from "framer-motion";
import { Accessibility, Eye, Grip, Lightbulb, Loader2, MapPinned, Puzzle, RefreshCw } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ProgressBar, ScorePill, StreakPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { COUNTRIES, countryName } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { featuresByCcn3, type CountryFeature } from "@/lib/geo";
import { prepareOutlineGeometry } from "@/lib/geometry";
import { haptic } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { JIGSAW_PRESENTATION, isRealBoardDrop, nearestJigsawTarget, selectJigsawPuzzle, type JigsawTarget } from "./puzzle";

const BOARD_W = 760;
const BOARD_H = 440;
interface BoardShape extends JigsawTarget {
  country: (typeof COUNTRIES)[number];
  d: string;
  selected: boolean;
}

function cleanFeature(feature: CountryFeature): GeoJSON.Feature<GeoJSON.Geometry> {
  return { type: "Feature", properties: feature.properties, geometry: prepareOutlineGeometry(feature.geometry) };
}

export function JigsawGame({ difficulty, practice, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const presentation = JIGSAW_PRESENTATION[difficulty];
  const [features, setFeatures] = useState<Map<string, CountryFeature> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<"wrong" | "hint" | null>(null);
  const [hintCode, setHintCode] = useState<string | null>(null);
  const [markersAssist, setMarkersAssist] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number; startX: number; startY: number; code: string; moved: boolean } | null>(null);
  const boardRef = useRef<SVGSVGElement>(null);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    featuresByCcn3("10m").then(setFeatures).catch(() => setLoadError(true));
    return () => { if (feedbackTimerRef.current != null) window.clearTimeout(feedbackTimerRef.current); };
  }, []);

  const puzzle = useMemo(() => {
    if (!features) return null;
    void generation;
    return selectJigsawPuzzle(COUNTRIES, new Set(features.keys()), difficulty);
  }, [features, difficulty, generation]);

  const board = useMemo(() => {
    if (!features || !puzzle) return { shapes: [] as BoardShape[], pieceShapes: new Map<string, BoardShape>() };
    const entries = puzzle.context
      .map((country) => ({ country, feature: country.ccn3 ? features.get(String(country.ccn3)) : undefined }))
      .filter((entry): entry is { country: (typeof COUNTRIES)[number]; feature: CountryFeature } => Boolean(entry.feature));
    const collection: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: entries.map((entry) => cleanFeature(entry.feature)) };
    const projection = geoMercator().fitExtent([[32, 26], [BOARD_W - 32, BOARD_H - 26]], collection);
    const path = geoPath(projection);
    const chosen = new Set(puzzle.pieces.map((country) => country.cca3));
    const shapes: BoardShape[] = entries.flatMap((entry) => {
      const cleaned = cleanFeature(entry.feature);
      const d = path(cleaned) ?? "";
      if (!d) return [];
      const bounds = path.bounds(cleaned);
      const centroid = path.centroid(cleaned);
      return [{
        country: entry.country,
        code: entry.country.cca3,
        d,
        cx: centroid[0],
        cy: centroid[1],
        tiny: Math.max(bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]) < 18,
        selected: chosen.has(entry.country.cca3),
      }];
    });
    return { shapes, pieceShapes: new Map(shapes.filter((shape) => shape.selected).map((shape) => [shape.code, shape])) };
  }, [features, puzzle]);

  const remaining = useMemo(() => puzzle?.pieces.filter((piece) => !placed.includes(piece.cca3)) ?? [], [puzzle, placed]);
  const active = remaining.find((piece) => piece.cca3 === selectedCode) ?? (presentation.sequential ? remaining[0] : null);

  useEffect(() => {
    if (presentation.sequential) setSelectedCode(remaining[0]?.cca3 ?? null);
    else if (remaining.length && !remaining.some((piece) => piece.cca3 === selectedCode)) setSelectedCode(remaining[0].cca3);
  }, [remaining, presentation.sequential, selectedCode]);

  function announceFeedback(kind: "wrong" | "hint") {
    setFeedback(kind);
    if (feedbackTimerRef.current != null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => { setFeedback(null); if (kind === "hint") setHintCode(null); }, 1800);
  }

  function resetPuzzle() {
    setGeneration((value) => value + 1);
    setPlaced([]); setSelectedCode(null); setScore(0); setStreak(0); setBestStreak(0); setMistakes(0);
    setFeedback(null); setHintCode(null); setMarkersAssist(false); setDrag(null);
    finishedRef.current = false; startRef.current = Date.now();
  }

  function miss() {
    sound.wrong(); haptic.error(); setMistakes((value) => value + 1); setStreak(0);
    setScore((value) => Math.max(0, value - (difficulty === "hard" ? 22 : 12)));
    announceFeedback("wrong");
  }

  function place(targetCode: string | null) {
    if (!active || !puzzle || !targetCode || targetCode !== active.cca3) { miss(); return; }
    sound.correct(); haptic.success();
    const nextStreak = streak + 1;
    const earned = practice ? 0 : 120 + nextStreak * 24 + (difficulty === "hard" ? 80 : difficulty === "medium" ? 35 : 0);
    const nextScore = score + earned;
    const nextPlaced = [...placed, active.cca3];
    const nextBest = Math.max(bestStreak, nextStreak);
    setPlaced(nextPlaced); setScore(nextScore); setStreak(nextStreak); setBestStreak(nextBest);
    setHintCode(null); setFeedback(null);
    const next = puzzle.pieces.find((piece) => !nextPlaced.includes(piece.cca3));
    setSelectedCode(next?.cca3 ?? null);
    if (nextPlaced.length === puzzle.pieces.length && !finishedRef.current) {
      finishedRef.current = true;
      window.setTimeout(() => onFinish({
        score: Math.round(nextScore * (markersAssist ? 0.8 : 1)), correct: puzzle.pieces.length, total: puzzle.pieces.length,
        bestStreak: nextBest, durationMs: Date.now() - startRef.current, mode: markersAssist ? "jigsaw-markers" : "jigsaw",
        countryHits: puzzle.pieces.map((country) => country.cca3),
      }), 600);
    }
  }

  function pointFromClient(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: (clientX - rect.left) * BOARD_W / rect.width, y: (clientY - rect.top) * BOARD_H / rect.height };
  }

  function tryPoint(clientX: number, clientY: number) {
    const point = pointFromClient(clientX, clientY);
    if (!point) return miss();
    const targets = [...board.pieceShapes.values()].filter((target) => !placed.includes(target.code));
    place(nearestJigsawTarget(point, targets, difficulty)?.code ?? null);
  }

  function revealHint() {
    if (!active || mistakes < 2) return;
    setHintCode(active.cca3); setScore((value) => Math.max(0, value - 80)); haptic.tap(); announceFeedback("hint");
  }

  if (!features && !loadError) return <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t("common.loading")}</div>;
  if (loadError || !puzzle || board.pieceShapes.size !== puzzle.pieces.length) return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center"><Puzzle className="h-9 w-9 text-primary" /><p className="max-w-sm text-sm text-muted-foreground">{t("jigsaw.loadError")}</p><Button variant="outline" onClick={resetPuzzle}><RefreshCw className="h-4 w-4" />{t("jigsaw.newPuzzle")}</Button></div>
  );

  const showMarkers = presentation.positionMarkers || markersAssist;
  return (
    <div className="geo-workbench flex flex-1 flex-col">
      <GameTopBar title={t("games.jigsaw.name")} onExit={onExit}><StreakPill value={streak} /><ScorePill value={score} /></GameTopBar>
      <ProgressBar value={placed.length / puzzle.pieces.length} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-4 px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:px-5 lg:pb-4">
        <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[#f3eddf] shadow-xl dark:bg-slate-900" aria-label={t("jigsaw.boardLabel")}>
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:repeating-radial-gradient(circle_at_18%_14%,transparent_0,transparent_24px,rgba(14,116,144,.14)_25px,transparent_26px)]" />
          <svg ref={boardRef} viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="relative block aspect-[19/11] w-full touch-none" role="group" onClick={(event) => { if (active) tryPoint(event.clientX, event.clientY); }}>
            {board.shapes.map((shape) => {
              const isPlaced = placed.includes(shape.code);
              const isExactSlot = presentation.exactSlots && shape.selected && !isPlaced;
              return <g key={shape.code}>
                <path d={shape.d} className={cn("pointer-events-none transition-colors", isPlaced ? "fill-success/60 stroke-success" : isExactSlot ? "fill-white/40 stroke-primary/65" : "fill-slate-400/12 stroke-slate-500/35 dark:fill-slate-500/10 dark:stroke-slate-400/25")} strokeWidth={isPlaced ? 1.8 : 0.85} strokeDasharray={isExactSlot ? "5 4" : undefined} />
                {shape.selected && !isPlaced && showMarkers && (
                  <g role="button" tabIndex={0} aria-label={t("jigsaw.position", { n: puzzle.pieces.findIndex((piece) => piece.cca3 === shape.code) + 1 })} onClick={(event) => { event.stopPropagation(); place(shape.code); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); place(shape.code); } }} className="cursor-pointer outline-none">
                    <circle cx={shape.cx} cy={shape.cy} r={shape.tiny ? 18 : 13} className={cn("fill-card/85 stroke-slate-500/55", presentation.exactSlots && "fill-primary/10 stroke-primary/70")} strokeWidth={1.5} />
                    <text x={shape.cx} y={shape.cy + 4} textAnchor="middle" className="pointer-events-none fill-slate-700 text-[11px] font-black dark:fill-slate-100">{puzzle.pieces.findIndex((piece) => piece.cca3 === shape.code) + 1}</text>
                  </g>
                )}
                {hintCode === shape.code && <circle cx={shape.cx} cy={shape.cy} r={52} className="pointer-events-none fill-primary/10 stroke-primary/80" strokeWidth={3} strokeDasharray="8 6" />}
              </g>;
            })}
          </svg>
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-black/10 bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950/85 dark:text-slate-200"><MapPinned className="h-4 w-4 text-primary" />{puzzle.subregion}</div>
          {difficulty === "hard" && <button className="absolute bottom-3 left-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-white/90 px-3 text-xs font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-950/85 dark:text-slate-200" onClick={() => setMarkersAssist((value) => !value)}><Accessibility className="h-4 w-4" />{markersAssist ? t("jigsaw.hideMarkers") : t("jigsaw.showMarkers")}</button>}
        </section>

        <aside className="rounded-3xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{presentation.sequential ? t("jigsaw.nextPiece") : t("jigsaw.pieceTray")}</p><span className="text-xs font-semibold text-muted-foreground">{t("jigsaw.progress", { current: placed.length, total: puzzle.pieces.length })}</span></div>
          <div className={cn("mt-3 grid gap-2 pr-1 lg:max-h-[42vh] lg:overflow-y-auto lg:pb-3", presentation.sequential ? "grid-cols-1" : "grid-cols-3 lg:grid-cols-2")}>
            {remaining.map((piece) => {
              const shape = board.pieceShapes.get(piece.cca3)!;
              const isActive = active?.cca3 === piece.cca3;
              const relativeScale = Math.max(0.42, Math.min(1, Math.sqrt(piece.area / Math.max(...puzzle.pieces.map((country) => country.area || 1))) * 1.8));
              return <motion.button layout key={piece.cca3} aria-label={presentation.namedPieces ? t("jigsaw.dragPiece", { country: countryName(piece, locale) }) : t("jigsaw.unnamedPiece")} aria-pressed={isActive} className={cn("relative flex min-h-24 touch-none flex-col items-center justify-center rounded-2xl border-2 p-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", isActive ? "border-primary bg-primary/10" : "border-border bg-muted/25 hover:border-primary/50")} onClick={() => { setSelectedCode(piece.cca3); haptic.tap(); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedCode(piece.cca3); } }} onPointerDown={(event) => {
                if (event.pointerType === "mouse" && event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                setSelectedCode(piece.cca3);
                setDrag({ x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, code: piece.cca3, moved: false });
                haptic.tap();
              }} onPointerMove={(event) => {
                setDrag((value) => value?.code === piece.cca3 ? { ...value, x: event.clientX, y: event.clientY, moved: value.moved || Math.hypot(event.clientX - value.startX, event.clientY - value.startY) >= 8 } : value);
              }} onPointerUp={(event) => {
                const gesture = drag?.code === piece.cca3 ? drag : null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                setDrag(null);
                const rect = boardRef.current?.getBoundingClientRect();
                if (gesture && rect && isRealBoardDrop({ x: gesture.startX, y: gesture.startY }, { x: event.clientX, y: event.clientY }, rect)) tryPoint(event.clientX, event.clientY);
              }} onPointerCancel={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                setDrag(null);
              }}>
                <Grip className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="h-16 w-full overflow-visible" style={{ transform: `scale(${relativeScale})` }}><path d={shape.d} className="fill-primary stroke-card" strokeWidth={2.5} /></svg>
                {presentation.namedPieces && <span className="mt-1 text-center text-sm font-extrabold">{countryName(piece, locale)}</span>}
              </motion.button>;
            })}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t(`jigsaw.instructions.${difficulty}`)}</p>
          <div className="mt-3 min-h-10" aria-live="polite">{feedback === "wrong" && <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-bold text-amber-800 dark:text-warning">{t("jigsaw.wrongSlot")}</div>}{feedback === "hint" && <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary">{t("jigsaw.hintShown")}</div>}</div>
          <div className="mt-2 flex gap-2 border-t border-border pt-3"><span className="flex-1 text-xs font-semibold text-muted-foreground">{t("jigsaw.mistakes", { n: mistakes })}</span>{difficulty === "hard" && <Button variant="outline" size="sm" className="gap-1.5" disabled={mistakes < 2 || !active} onClick={revealHint}><Lightbulb className="h-4 w-4" />{t("jigsaw.hint")}</Button>}</div>
        </aside>
      </main>
      {drag?.moved && <div className="pointer-events-none fixed z-[80] w-28 -translate-x-1/2 -translate-y-1/2 opacity-80" style={{ left: drag.x, top: drag.y }}><Eye className="mx-auto h-8 w-8 rounded-full bg-primary p-1.5 text-primary-foreground shadow-xl" /></div>}
    </div>
  );
}
