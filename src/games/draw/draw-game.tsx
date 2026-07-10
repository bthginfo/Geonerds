"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator } from "d3-geo";
import { Loader2, Eraser, Check, ArrowRight } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { poolForDifficulty, countryName } from "@/data/countries";
import { pickQuestions } from "@/games/round-utils";
import { featuresByCcn3, type CountryFeature } from "@/lib/geo";
import { isRecognizableOutline, largestPolygonGeometry, prepareOutlineGeometry } from "@/lib/geometry";
import { largestRing, shapeOverlap, type Point } from "@/lib/draw-score";
import { scoreForDrawing } from "@/lib/scoring";
import { GameTopBar, ScorePill, StreakPill, RoundPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { sound } from "@/lib/sound";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";

const R = 360;
const USER_COLOR = "#3b82f6";
const TARGET_FILL = "rgba(16,185,129,0.22)";
const TARGET_STROKE = "#10b981";

function smoothStroke(ctx: CanvasRenderingContext2D, points: Point[], close = false) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length - 1; index++) {
    const current = points[index];
    const next = points[index + 1];
    ctx.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last[0], last[1]);
  if (close) ctx.closePath();
}

function closurePercent(points: Point[]) {
  if (points.length < 2) return 0;
  const first = points[0];
  const last = points[points.length - 1];
  const distance = Math.hypot(first[0] - last[0], first[1] - last[1]);
  return Math.round(Math.max(0, 1 - distance / (R * 0.34)) * 100);
}

function normalizeToBox(points: Point[], size: number): Point[] {
  if (points.length === 0) return [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const pad = size * 0.08;
  const scale = Math.min((size - 2 * pad) / w, (size - 2 * pad) / h);
  const offX = (size - w * scale) / 2;
  const offY = (size - h * scale) / 2;
  return points.map(([x, y]) => [(x - minX) * scale + offX, (y - minY) * scale + offY]);
}

function largestPolygonFeature(geometry: GeoJSON.Geometry): GeoJSON.Feature<GeoJSON.Geometry> {
  return {
    type: "Feature",
    properties: {},
    geometry: largestPolygonGeometry(geometry) ?? geometry,
  };
}

export function DrawGame({ difficulty, roundCount, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [features, setFeatures] = useState<Map<string, CountryFeature> | null>(null);
  const [targets, setTargets] = useState<Country[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [matchPct, setMatchPct] = useState(0);
  const [closurePct, setClosurePct] = useState(0);
  const [hasStroke, setHasStroke] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const startRef = useRef(Date.now());
  const dprRef = useRef(1);
  const hitsRef = useRef<string[]>([]);

  useEffect(() => {
    featuresByCcn3("10m").then((feats) => {
      const pool = poolForDifficulty(difficulty, { requireGeometry: true }).filter(
        (country) => {
          if (!country.ccn3) return false;
          const feature = feats.get(String(country.ccn3));
          return feature ? isRecognizableOutline(feature.geometry) : false;
        }
      );
      setFeatures(feats);
      const count = roundCount === 0 ? pool.length : roundCount;
      setTargets(pickQuestions(pool, count));
    });
  }, [difficulty, roundCount]);

  const target = targets[idx];

  const targetRing = useMemo<Point[]>(() => {
    if (!features || !target?.ccn3) return [];
    const feat = features.get(String(target.ccn3));
    if (!feat) return [];
    // Fit to the main landmass so the shape fills the canvas and reads clearly.
    const mainland = largestPolygonFeature(prepareOutlineGeometry(feat.geometry));
    const projection = geoMercator().fitExtent([[12, 12], [R - 12, R - 12]], mainland);
    return largestRing(mainland.geometry, (c) => projection(c) ?? null);
  }, [features, target]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, R, R);

    if (revealed) {
      // Show target (normalized) and user's drawing (normalized) overlaid.
      const tg = normalizeToBox(targetRing, R);
      if (tg.length > 2) {
        smoothStroke(ctx, tg, true);
        ctx.fillStyle = TARGET_FILL;
        ctx.fill();
        ctx.strokeStyle = TARGET_STROKE;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      const us = normalizeToBox(pointsRef.current, R);
      if (us.length > 1) {
        smoothStroke(ctx, us, true);
        ctx.strokeStyle = USER_COLOR;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.stroke();
      }
      return;
    }

    const pts = pointsRef.current;
    if (pts.length > 1) {
      smoothStroke(ctx, pts);
      ctx.strokeStyle = USER_COLOR;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      const first = pts[0];
      const last = pts[pts.length - 1];
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(100,116,139,.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(last[0], last[1]);
      ctx.lineTo(first[0], first[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(first[0], first[1], 7, 0, Math.PI * 2);
      ctx.fillStyle = closurePercent(pts) >= 75 ? "rgba(16,185,129,.25)" : "rgba(59,130,246,.18)";
      ctx.fill();
      ctx.strokeStyle = closurePercent(pts) >= 75 ? TARGET_STROKE : USER_COLOR;
      ctx.stroke();
      ctx.restore();
    }
  }, [revealed, targetRing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      dprRef.current = dpr;
      canvas.width = R * dpr;
      canvas.height = R * dpr;
    }
    redraw();
  }, [redraw, idx, target]);

  function toCanvas(e: React.PointerEvent): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * R, ((e.clientY - rect.top) / rect.height) * R];
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
    const point = toCanvas(e);
    const previous = pointsRef.current.at(-1);
    if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) >= 1.5) pointsRef.current.push(point);
    redraw();
  }
  function onUp(e?: React.PointerEvent) {
    drawingRef.current = false;
    if (e && canvasRef.current?.hasPointerCapture(e.pointerId)) canvasRef.current.releasePointerCapture(e.pointerId);
    redraw();
  }

  function clear() {
    pointsRef.current = [];
    setHasStroke(false);
    redraw();
  }

  function done() {
    if (revealed || pointsRef.current.length < 3) return;
    const overlap = shapeOverlap(targetRing, pointsRef.current);
    const pct = Math.round(overlap * 100);
    const closed = closurePercent(pointsRef.current);
    const earned = scoreForDrawing(overlap, difficulty);
    setMatchPct(pct);
    setClosurePct(closed);
    setScore((s) => s + earned);
    const good = overlap >= 0.5;
    if (good) {
      sound.correct();
      haptic.success();
      if (target.cca3) hitsRef.current.push(target.cca3);
      setCorrect((c) => c + 1);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        return ns;
      });
    } else {
      sound.wrong();
      haptic.error();
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
        bestStreak,
        durationMs: Date.now() - startRef.current,
        mode: "draw",
        countryHits: hitsRef.current,
      });
      return;
    }
    pointsRef.current = [];
    setHasStroke(false);
    setRevealed(false);
    setMatchPct(0);
    setClosurePct(0);
    setIdx((i) => i + 1);
  }

  if (!features || !target) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.draw.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        <RoundPill current={idx + 1} total={targets.length} />
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 py-4">
        <div className="text-xl font-bold">
          {t("draw.prompt", { country: countryName(target, locale) })}
        </div>
        <div className="mt-1 text-center text-sm text-muted-foreground">{t("draw.instruction")}</div>
        <div className="mt-1 text-center text-xs text-muted-foreground">{t("draw.mainlandNote")}</div>

        <div className="relative mt-4 aspect-square w-full max-w-sm overflow-hidden rounded-2xl border-2 border-border bg-card">
          <canvas
            ref={canvasRef}
            width={R}
            height={R}
            className="h-full w-full touch-none"
            style={{ touchAction: "none" }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
          {revealed && (
            <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
              <div className="rounded-xl border border-border bg-card/95 px-3 py-2 text-center shadow-lg backdrop-blur">
                <div className="text-sm font-extrabold text-primary">{t(`draw.tier.${matchPct >= 75 ? "excellent" : matchPct >= 50 ? "good" : "practice"}`)}</div>
                <div className="mt-1 flex gap-3 text-[11px] font-semibold text-muted-foreground">
                  <span>{t("draw.shapeScore", { percent: matchPct })}</span>
                  <span>{t("draw.closureScore", { percent: closurePct })}</span>
                </div>
              </div>
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
