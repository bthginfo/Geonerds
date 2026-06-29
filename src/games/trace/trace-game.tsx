"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { Loader2, Eraser, Check, ArrowRight } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ScorePill, StreakPill, RoundPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { loadCountries, type CountryFeature } from "@/lib/geo";
import { loadWaters, waterLabel, type Water } from "@/lib/waters";
import { scoreForDrawing } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { sample } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

const W = 360;
const H = 300;
const USER_COLOR = "#2563eb";
const TARGET_COLOR = "#0891b2";

type Pt = [number, number];

function longestLine(geom: GeoJSON.Geometry): number[][] {
  if (geom.type === "LineString") return geom.coordinates;
  if (geom.type === "MultiLineString") {
    let best: number[][] = [];
    for (const l of geom.coordinates) if (l.length > best.length) best = l;
    return best;
  }
  return [];
}

function chamfer(a: Pt[], b: Pt[]): number {
  if (!a.length || !b.length) return Infinity;
  const avgNearest = (from: Pt[], to: Pt[]) => {
    let sum = 0;
    for (const p of from) {
      let min = Infinity;
      for (const q of to) {
        const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
        if (d < min) min = d;
      }
      sum += Math.sqrt(min);
    }
    return sum / from.length;
  };
  return (avgNearest(a, b) + avgNearest(b, a)) / 2;
}

function downsample(pts: Pt[], n: number): Pt[] {
  if (pts.length <= n) return pts;
  const step = pts.length / n;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) out.push(pts[Math.floor(i * step)]);
  return out;
}

export function TraceGame({ difficulty, roundCount, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);
  const [rivers, setRivers] = useState<Water[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [matchPct, setMatchPct] = useState(0);
  const [hasStroke, setHasStroke] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Pt[]>([]);
  const drawingRef = useRef(false);
  const startRef = useRef(Date.now());
  const bestRef = useRef(0);

  useEffect(() => {
    loadCountries("50m").then(setCountries);
    loadWaters().then((w) => setRivers(w.filter((x) => x.kind === "river")));
  }, []);

  const targets = useMemo(() => {
    if (!rivers) return [];
    const pool = difficulty === "easy" ? rivers.filter((_, i) => i % 2 === 0) : rivers;
    const count = roundCount === 0 ? pool.length : roundCount;
    return sample(pool, Math.min(count, pool.length));
  }, [rivers, difficulty, roundCount]);

  const target = targets[idx];

  const { countryPaths, targetPx } = useMemo(() => {
    if (!countries || !target) return { countryPaths: [] as string[], targetPx: [] as Pt[] };
    const line = longestLine(target.geometry);
    const feat: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } };
    const projection = geoMercator().fitExtent([[24, 24], [W - 24, H - 24]], feat);
    const path = geoPath(projection);
    const cps = countries.filter((f) => String(f.id) !== "010").map((f) => path(f as unknown as GeoJSON.Feature) ?? "");
    const px = line.map((c) => projection([c[0], c[1]]) ?? [0, 0]) as Pt[];
    return { countryPaths: cps, targetPx: px };
  }, [countries, target]);

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    if (revealed && targetPx.length > 1) {
      ctx.beginPath();
      targetPx.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = TARGET_COLOR;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }
    const pts = pointsRef.current;
    if (pts.length > 1) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = USER_COLOR;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }, [revealed, targetPx]);

  useEffect(() => {
    redraw();
  }, [redraw, idx]);

  function toCanvas(e: React.PointerEvent): Pt {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H];
  }
  function onDown(e: React.PointerEvent) {
    if (revealed) return;
    drawingRef.current = true;
    pointsRef.current = [toCanvas(e)];
    setHasStroke(true);
    canvasRef.current?.setPointerCapture(e.pointerId);
    redraw();
  }
  function onMove(e: React.PointerEvent) {
    if (!drawingRef.current || revealed) return;
    pointsRef.current.push(toCanvas(e));
    redraw();
  }
  function onUp() {
    drawingRef.current = false;
  }
  function clear() {
    pointsRef.current = [];
    setHasStroke(false);
    redraw();
  }

  function done() {
    if (revealed || pointsRef.current.length < 2) return;
    const dist = chamfer(downsample(pointsRef.current, 120), downsample(targetPx, 120));
    const overlap = Math.max(0, 1 - dist / (0.16 * W));
    const pct = Math.round(overlap * 100);
    const earned = scoreForDrawing(overlap, difficulty, streak);
    setMatchPct(pct);
    setScore((s) => s + earned);
    if (overlap >= 0.5) {
      sound.correct();
      setCorrect((c) => c + 1);
      setStreak((s) => {
        const ns = s + 1;
        bestRef.current = Math.max(bestRef.current, ns);
        return ns;
      });
    } else {
      sound.wrong();
      setStreak(0);
    }
    setRevealed(true);
  }

  function next() {
    if (idx + 1 >= targets.length) {
      onFinish({
        score,
        correct,
        total: targets.length,
        bestStreak: bestRef.current,
        durationMs: Date.now() - startRef.current,
        mode: "trace",
      });
      return;
    }
    pointsRef.current = [];
    setHasStroke(false);
    setRevealed(false);
    setMatchPct(0);
    setIdx((i) => i + 1);
  }

  if (!countries || !rivers || !target) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.trace.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        <RoundPill current={idx + 1} total={targets.length} />
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-4">
        <div className="text-xl font-bold">{t("trace.prompt", { river: waterLabel(target, locale) })}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("trace.instruction")}</div>

        <div className="relative mt-4 w-full max-w-sm overflow-hidden rounded-2xl border-2 border-border" style={{ aspectRatio: `${W} / ${H}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
            <rect x={0} y={0} width={W} height={H} className="fill-sky-100/60 dark:fill-slate-800/40" />
            {countryPaths.map((d, i) => (
              <path key={i} d={d} className="fill-muted-foreground/15 stroke-slate-400/50 dark:stroke-slate-600/50" style={{ strokeWidth: 0.5 }} />
            ))}
          </svg>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="absolute inset-0 h-full w-full touch-none"
            style={{ touchAction: "none" }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
          />
          {revealed && (
            <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-foreground px-3 py-1 text-sm font-bold text-background">
              {t("draw.match", { percent: matchPct })}
            </div>
          )}
        </div>

        <div className="mt-5 flex w-full max-w-sm gap-2">
          {!revealed ? (
            <>
              <Button variant="outline" className="flex-1 gap-2" onClick={clear} disabled={!hasStroke}>
                <Eraser className="h-5 w-5" />
                {t("draw.clear")}
              </Button>
              <Button className="flex-1 gap-2" onClick={done} disabled={!hasStroke}>
                <Check className="h-5 w-5" />
                {t("draw.done")}
              </Button>
            </>
          ) : (
            <Button className="flex-1 gap-2" onClick={next}>
              {idx + 1 >= targets.length ? t("common.continue") : t("common.next")}
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
