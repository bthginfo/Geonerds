"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { AnimatePresence, motion } from "framer-motion";
import { Grip, Loader2, MapPinned, MousePointer2, Puzzle, RefreshCw } from "lucide-react";
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
import { selectJigsawPuzzle } from "./puzzle";

const BOARD_W = 760;
const BOARD_H = 440;
const PIECE_W = 168;
const PIECE_H = 116;

interface BoardShape {
  country: (typeof COUNTRIES)[number];
  d: string;
  cx: number;
  cy: number;
  tiny: boolean;
}

function cleanFeature(feature: CountryFeature): GeoJSON.Feature<GeoJSON.Geometry> {
  return { type: "Feature", properties: feature.properties, geometry: prepareOutlineGeometry(feature.geometry) };
}

export function JigsawGame({ difficulty, practice, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [features, setFeatures] = useState<Map<string, CountryFeature> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrongSlot, setWrongSlot] = useState<string | null>(null);
  const [placementFeedback, setPlacementFeedback] = useState<"wrong" | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const startRef = useRef(Date.now());
  const wrongTimerRef = useRef<number | null>(null);

  useEffect(() => {
    featuresByCcn3("10m").then(setFeatures).catch(() => setLoadError(true));
    return () => {
      if (wrongTimerRef.current != null) window.clearTimeout(wrongTimerRef.current);
    };
  }, []);

  const puzzle = useMemo(() => {
    if (!features) return null;
    void generation; // explicit regeneration token for a fresh random atlas sheet
    return selectJigsawPuzzle(COUNTRIES, new Set(features.keys()), difficulty);
  }, [features, difficulty, generation]);

  const active = puzzle?.pieces[placed.length] ?? null;

  const board = useMemo(() => {
    if (!features || !puzzle) return { shapes: [] as BoardShape[], contextPaths: [] as string[] };
    const context = puzzle.context
      .map((country) => ({ country, feature: country.ccn3 ? features.get(String(country.ccn3)) : undefined }))
      .filter((entry): entry is { country: (typeof COUNTRIES)[number]; feature: CountryFeature } => Boolean(entry.feature));
    const collection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: context.map((entry) => cleanFeature(entry.feature)),
    };
    const projection = geoMercator().fitExtent([[34, 28], [BOARD_W - 34, BOARD_H - 28]], collection);
    const path = geoPath(projection);
    const selected = new Set(puzzle.pieces.map((country) => country.cca3));
    const shapes: BoardShape[] = [];
    const contextPaths: string[] = [];
    for (const entry of context) {
      const cleaned = cleanFeature(entry.feature);
      const d = path(cleaned) ?? "";
      if (!d) continue;
      if (!selected.has(entry.country.cca3)) {
        contextPaths.push(d);
        continue;
      }
      const bounds = path.bounds(cleaned);
      const centroid = path.centroid(cleaned);
      shapes.push({
        country: entry.country,
        d,
        cx: centroid[0],
        cy: centroid[1],
        tiny: Math.max(bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]) < 18,
      });
    }
    return { shapes, contextPaths };
  }, [features, puzzle]);

  const previewPath = useMemo(() => {
    if (!active?.ccn3 || !features) return "";
    const feature = features.get(String(active.ccn3));
    if (!feature) return "";
    const cleaned = cleanFeature(feature);
    const projection = geoMercator().fitExtent([[10, 10], [PIECE_W - 10, PIECE_H - 10]], cleaned);
    return geoPath(projection)(cleaned) ?? "";
  }, [active, features]);

  function resetPuzzle() {
    if (loadError) {
      setLoadError(false);
      featuresByCcn3("10m").then(setFeatures).catch(() => setLoadError(true));
    }
    setGeneration((value) => value + 1);
    setPlaced([]);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setMistakes(0);
    setWrongSlot(null);
    setPlacementFeedback(null);
    setDrag(null);
    startRef.current = Date.now();
  }

  function place(slotCode: string) {
    if (!active || !puzzle) return;
    if (slotCode !== active.cca3) {
      sound.wrong();
      haptic.error();
      setMistakes((value) => value + 1);
      setStreak(0);
      setWrongSlot(slotCode);
      setPlacementFeedback("wrong");
      if (wrongTimerRef.current != null) window.clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = window.setTimeout(() => setWrongSlot(null), 1400);
      return;
    }
    if (wrongTimerRef.current != null) window.clearTimeout(wrongTimerRef.current);
    setWrongSlot(null);
    setPlacementFeedback(null);
    sound.correct();
    haptic.success();
    const nextStreak = streak + 1;
    const earned = practice ? 0 : 130 + nextStreak * 25 + (difficulty === "hard" ? 45 : difficulty === "medium" ? 20 : 0);
    const nextScore = Math.max(0, score + earned);
    const nextPlaced = [...placed, active.cca3];
    const nextBest = Math.max(bestStreak, nextStreak);
    setPlaced(nextPlaced);
    setScore(nextScore);
    setStreak(nextStreak);
    setBestStreak(nextBest);
    if (nextPlaced.length === puzzle.pieces.length) {
      window.setTimeout(() => {
        onFinish({
          score: Math.max(0, nextScore - mistakes * 10),
          correct: puzzle.pieces.length,
          total: puzzle.pieces.length,
          bestStreak: nextBest,
          durationMs: Date.now() - startRef.current,
          mode: "jigsaw",
          countryHits: puzzle.pieces.map((country) => country.cca3),
        });
      }, 650);
    }
  }

  useEffect(() => {
    if (!drag) return;
    function move(event: PointerEvent) {
      setDrag({ x: event.clientX, y: event.clientY });
    }
    function up(event: PointerEvent) {
      const element = document.elementFromPoint(event.clientX, event.clientY) as Element | null;
      const slot = element?.closest("[data-jigsaw-slot]")?.getAttribute("data-jigsaw-slot");
      setDrag(null);
      if (slot) place(slot);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    window.addEventListener("pointercancel", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // `place` intentionally reads the state captured when dragging starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  if (!features && !loadError) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t("common.loading")}</div>;
  }

  if (loadError || !puzzle || board.shapes.length !== puzzle.pieces.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
        <Puzzle className="h-9 w-9 text-primary" />
        <p className="max-w-sm text-sm text-muted-foreground">{t("jigsaw.loadError")}</p>
        <Button variant="outline" className="gap-2" onClick={resetPuzzle}><RefreshCw className="h-4 w-4" />{t("jigsaw.newPuzzle")}</Button>
      </div>
    );
  }

  return (
    <div className="geo-workbench flex flex-1 flex-col">
      <GameTopBar title={t("games.jigsaw.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
      </GameTopBar>
      <ProgressBar value={placed.length / puzzle.pieces.length} />

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-start items-start gap-4 px-3 py-4 lg:grid-cols-[minmax(0,1fr)_230px] lg:content-normal lg:items-center lg:px-5">
        <section className="relative self-start overflow-hidden rounded-3xl border border-primary/20 bg-[#f6f1e5] shadow-xl dark:bg-slate-900" aria-label={t("jigsaw.boardLabel")}>
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:repeating-radial-gradient(circle_at_20%_10%,transparent_0,transparent_24px,rgba(59,130,246,.10)_25px,transparent_26px)]" />
          <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="relative block aspect-[19/11] w-full" role="group">
            {board.contextPaths.map((d, index) => <path key={`context-${index}`} d={d} className="fill-slate-400/15 stroke-slate-400/30 dark:fill-slate-400/10" strokeWidth={0.8} />)}
            {board.shapes.map((shape, index) => {
              const isPlaced = placed.includes(shape.country.cca3);
              const isWrong = wrongSlot === shape.country.cca3;
              return (
                <g key={shape.country.cca3}>
                  {shape.tiny && !isPlaced && (
                    <g className="pointer-events-none">
                      <circle cx={shape.cx} cy={shape.cy} r={18} className="fill-primary/5 stroke-primary/65" strokeWidth={2} strokeDasharray="5 4" />
                      <circle cx={shape.cx} cy={shape.cy} r={4} className="fill-primary/70" />
                    </g>
                  )}
                  <path
                    d={shape.d}
                    data-jigsaw-slot={shape.country.cca3}
                    role="button"
                    tabIndex={isPlaced ? -1 : 0}
                    aria-label={t("jigsaw.slot", { n: index + 1 })}
                    onClick={() => !isPlaced && place(shape.country.cca3)}
                    onKeyDown={(event) => {
                      if (!isPlaced && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        place(shape.country.cca3);
                      }
                    }}
                    className={cn(
                      "cursor-pointer stroke-[1.5] outline-none transition-all focus-visible:stroke-primary focus-visible:stroke-[4]",
                      isPlaced ? "fill-success/55 stroke-success" : isWrong ? "animate-shake fill-warning/30 stroke-warning" : "fill-white/35 stroke-slate-500/70 hover:fill-primary/15 dark:fill-slate-700/40"
                    )}
                    strokeDasharray={isPlaced ? undefined : "4 3"}
                  />
                  {shape.tiny && !isPlaced && <circle data-jigsaw-slot={shape.country.cca3} cx={shape.cx} cy={shape.cy} r={40} className="cursor-pointer fill-transparent" onClick={() => place(shape.country.cca3)} />}
                  {isPlaced && (
                    <g className="pointer-events-none">
                      <circle cx={shape.cx} cy={shape.cy} r={10} className="fill-card stroke-success" strokeWidth={1.5} />
                      <text x={shape.cx} y={shape.cy + 3.5} textAnchor="middle" className="fill-success text-[9px] font-black">✓</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-200">
            <MapPinned className="h-4 w-4 text-primary" /> {puzzle.subregion}
          </div>
        </section>

        <aside className="rounded-3xl border border-border bg-card p-4 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t("jigsaw.nextPiece")}</p>
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div key={active.cca3} initial={{ opacity: 0, scale: 0.86, rotate: -3 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 1.08 }} className="mt-3">
                <button
                  className="group relative flex w-full cursor-grab touch-none flex-col items-center rounded-2xl border-2 border-primary/25 bg-primary/5 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    haptic.tap();
                    setDrag({ x: event.clientX, y: event.clientY });
                  }}
                  aria-label={t("jigsaw.dragPiece", { country: countryName(active, locale) })}
                >
                  <Grip className="absolute right-2 top-2 h-4 w-4 text-muted-foreground" />
                  <svg viewBox={`0 0 ${PIECE_W} ${PIECE_H}`} className="h-28 w-full drop-shadow-[0_6px_5px_rgba(15,23,42,.22)]">
                    <path d={previewPath} className="fill-primary stroke-white dark:stroke-slate-950" strokeWidth={2} />
                  </svg>
                  <span className="mt-1 text-center font-extrabold">{countryName(active, locale)}</span>
                </button>
                <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <MousePointer2 className="mt-0.5 h-4 w-4 shrink-0" /> {t("jigsaw.tapHint")}
                </p>
                <div className="mt-2 min-h-10" aria-live="polite" aria-atomic="true">
                  {placementFeedback === "wrong" && (
                    <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-bold text-amber-800 dark:text-warning">
                      {t("jigsaw.wrongSlot")}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : <div className="mt-8 text-center font-bold text-success">{t("jigsaw.complete")}</div>}
          </AnimatePresence>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs font-semibold text-muted-foreground">
            <span>{t("jigsaw.progress", { current: placed.length, total: puzzle.pieces.length })}</span>
            <span>{t("jigsaw.mistakes", { n: mistakes })}</span>
          </div>
        </aside>
      </main>

      {drag && active && (
        <div className="pointer-events-none fixed z-[80] w-36 -translate-x-1/2 -translate-y-1/2 opacity-90 drop-shadow-2xl" style={{ left: drag.x, top: drag.y }}>
          <svg viewBox={`0 0 ${PIECE_W} ${PIECE_H}`}><path d={previewPath} className="fill-primary stroke-white" strokeWidth={3} /></svg>
        </div>
      )}
    </div>
  );
}
