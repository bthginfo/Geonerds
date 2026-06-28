"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator } from "d3-geo";
import { Loader2, Eraser, Check, ArrowRight } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { poolForDifficulty, countryName } from "@/data/countries";
import { pickQuestions } from "@/games/round-utils";
import { featuresByCcn3, type CountryFeature } from "@/lib/geo";
import { largestRing, shapeOverlap, type Point } from "@/lib/draw-score";
import { scoreForDrawing } from "@/lib/scoring";
import { GameTopBar, ScorePill, StreakPill, RoundPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { sound } from "@/lib/sound";
import { useT } from "@/i18n/I18nProvider";

const R = 360;
const DRAW_ROUNDS = 6;
const USER_COLOR = "#3b82f6";
const TARGET_FILL = "rgba(16,185,129,0.22)";
const TARGET_STROKE = "#10b981";

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

export function DrawGame({ difficulty, onFinish, onExit }: PlayHandlers) {
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
  const [hasStroke, setHasStroke] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    featuresByCcn3("50m").then((feats) => {
      const pool = poolForDifficulty(difficulty, { requireGeometry: true }).filter(
        (c) => c.ccn3 && feats.has(String(c.ccn3))
      );
      setFeatures(feats);
      setTargets(pickQuestions(pool, DRAW_ROUNDS));
    });
  }, [difficulty]);

  const target = targets[idx];

  const targetRing = useMemo<Point[]>(() => {
    if (!features || !target?.ccn3) return [];
    const feat = features.get(String(target.ccn3));
    if (!feat) return [];
    const projection = geoMercator().fitExtent(
      [[10, 10], [R - 10, R - 10]],
      feat as unknown as GeoJSON.Feature
    );
    return largestRing(feat.geometry, (c) => projection(c) ?? null);
  }, [features, target]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, R, R);

    if (revealed) {
      // Show target (normalized) and user's drawing (normalized) overlaid.
      const tg = normalizeToBox(targetRing, R);
      if (tg.length > 2) {
        ctx.beginPath();
        tg.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = TARGET_FILL;
        ctx.fill();
        ctx.strokeStyle = TARGET_STROKE;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      const us = normalizeToBox(pointsRef.current, R);
      if (us.length > 1) {
        ctx.beginPath();
        us.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.strokeStyle = USER_COLOR;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.stroke();
      }
      return;
    }

    const pts = pointsRef.current;
    if (pts.length > 1) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = USER_COLOR;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }, [revealed, targetRing]);

  useEffect(() => {
    redraw();
  }, [redraw, idx]);

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
    if (revealed || pointsRef.current.length < 3) return;
    const overlap = shapeOverlap(targetRing, pointsRef.current);
    const pct = Math.round(overlap * 100);
    const earned = scoreForDrawing(overlap, difficulty);
    setMatchPct(pct);
    setScore((s) => s + earned);
    const good = overlap >= 0.5;
    if (good) {
      sound.correct();
      setCorrect((c) => c + 1);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
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
        bestStreak,
        durationMs: Date.now() - startRef.current,
        mode: "draw",
      });
      return;
    }
    pointsRef.current = [];
    setHasStroke(false);
    setRevealed(false);
    setMatchPct(0);
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
        <div className="mt-1 text-sm text-muted-foreground">{t("draw.instruction")}</div>

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
