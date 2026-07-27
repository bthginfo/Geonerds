"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Apple,
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Crosshair,
  Keyboard,
  MousePointer2,
  ShieldPlus,
  Sparkles,
  Wind,
  X,
} from "lucide-react";
import {
  captureTierForSpecies,
  classifyThrow,
  generateCaptureEncounters,
  resolveCaptureAttempt,
  type CaptureBall,
  type CaptureTier,
  type ThrowMetrics,
  type ThrowQuality,
} from "@/poke/capture";
import { localizedType } from "@/poke/type-chart";
import { RunHud, type GameProps } from "../gameplay";
import { PokemonSprite } from "../pokemon-sprite";
import { emitGameFeel } from "../game-feel";

type FlightState = "ready" | "flight" | "shake";
interface Point {
  x: number;
  y: number;
  t: number;
}
interface ThrowResult {
  quality: ThrowQuality;
  curve: boolean;
  caught: boolean;
  escaped: boolean;
  attemptsLeft: number;
  removed: number;
  remaining: number;
}
interface FlightPath {
  start: { x: number; y: number };
  impact: { x: number; y: number };
}

const TIER_SCORE: Record<CaptureTier, number> = {
  common: 420,
  uncommon: 620,
  rare: 900,
  ultra: 1350,
  legendary: 2100,
};
const TIER_RESISTANCE: Record<CaptureTier, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  ultra: 4,
  legendary: 5,
};

export function FieldCapture({
  locale,
  difficulty,
  generationCap,
  roundCount,
  runSeed,
  onFinish,
}: GameProps) {
  const encounters = useMemo(
    () => generateCaptureEncounters(generationCap, roundCount, runSeed),
    [generationCap, roundCount, runSeed],
  );
  const [round, setRound] = useState(0);
  const current = encounters[round];
  const tier = current ? captureTierForSpecies(current) : "common";
  const maxAttempts = difficulty === "easy" ? 4 : 3;
  const [phase, setPhase] = useState<"encounter" | "summary">("encounter");
  const [score, setScore] = useState(0);
  const [caughtCount, setCaughtCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [inventory, setInventory] = useState({ advanced: 1, berries: 1 });
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttempts);
  const [ball, setBall] = useState<CaptureBall>("field");
  const [berry, setBerry] = useState(false);
  const [ring, setRing] = useState(1);
  const [aim, setAim] = useState(50);
  const [flight, setFlight] = useState<FlightState>("ready");
  const [flightPath, setFlightPath] = useState<FlightPath>({
    start: { x: 50, y: 90 },
    impact: { x: 50, y: 40 },
  });
  const [drag, setDrag] = useState<{
    active: boolean;
    pointerId: number | null;
    start: Point | null;
    current: Point | null;
    points: Point[];
  }>({
    active: false,
    pointerId: null,
    start: null,
    current: null,
    points: [],
  });
  const [result, setResult] = useState<ThrowResult | null>(null);
  const [resistance, setResistance] = useState(
    TIER_RESISTANCE[tier] ?? TIER_RESISTANCE.common,
  );
  const [hasThrown, setHasThrown] = useState(false);
  const [caughtLog, setCaughtLog] = useState<
    { id: number; tier: CaptureTier; quality: ThrowQuality; curve: boolean }[]
  >([]);
  const [encounterLog, setEncounterLog] = useState<
    { id: number; caught: boolean; tier: CaptureTier }[]
  >([]);
  const clearingRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (phase !== "encounter" || result || drag.active) return;
    const started = performance.now();
    const tierSpeed =
      {
        common: 2600,
        uncommon: 2300,
        rare: 1950,
        ultra: 1650,
        legendary: 1400,
      }[tier] * (difficulty === "easy" ? 1.18 : 1);
    const id = window.setInterval(() => {
      const elapsed = performance.now() - started;
      setRing(0.3 + Math.abs(Math.sin((elapsed / tierSpeed) * Math.PI)) * 0.7);
    }, 35);
    return () => window.clearInterval(id);
  }, [difficulty, drag.active, phase, result, round, tier]);

  useEffect(
    () => () => timers.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );

  const localPoint = (
    event: React.PointerEvent<HTMLDivElement>,
  ): Point | null => {
    if (!clearingRef.current) return null;
    const rect = clearingRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
      t: performance.now(),
    };
  };

  const resetDrag = () =>
    setDrag({
      active: false,
      pointerId: null,
      start: null,
      current: null,
      points: [],
    });

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      result ||
      flight !== "ready" ||
      !(event.target as HTMLElement).closest("[data-capture-ball]")
    )
      return;
    const point = localPoint(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setHasThrown(true);
    setDrag({
      active: true,
      pointerId: event.pointerId,
      start: point,
      current: point,
      points: [point],
    });
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    const point = localPoint(event);
    if (!point) return;
    event.preventDefault();
    setDrag((value) => ({
      ...value,
      current: point,
      points: [...value.points.slice(-20), point],
    }));
  };

  const releaseDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !drag.active ||
      drag.pointerId !== event.pointerId ||
      !drag.start ||
      !clearingRef.current
    )
      return;
    const end = localPoint(event);
    if (!end) {
      resetDrag();
      return;
    }
    event.preventDefault();
    const rect = clearingRef.current.getBoundingClientRect();
    const points = [...drag.points, end];
    const recent =
      points.filter((point) => point.t >= end.t - 120).slice(-7).length >= 2
        ? points.filter((point) => point.t >= end.t - 120).slice(-7)
        : points.slice(-3);
    const first = recent[0] ?? drag.start;
    const elapsed = Math.max(16, end.t - first.t);
    const velocity = {
      x: (end.x - first.x) / elapsed,
      y: (end.y - first.y) / elapsed,
    };
    const upwardSpeed = Math.max(0, -velocity.y);
    const projectionMs = Math.max(300, Math.min(650, 320 + upwardSpeed * 250));
    const curvature = signedCurveAmount(points, drag.start, end);
    const projected = {
      x: end.x + velocity.x * projectionMs + curvature * 0.42,
      y: end.y + velocity.y * projectionMs,
    };
    const target = { x: rect.width / 2, y: rect.height * 0.4 };
    const targetRadius = Math.min(rect.width, rect.height) * 0.19;
    const distance = Math.hypot(projected.x - target.x, projected.y - target.y);
    const firstThrowAssist =
      round === 0 &&
      attemptsLeft === maxAttempts &&
      distance < targetRadius * 1.7
        ? 0.08
        : 0;
    const accuracy = Math.min(
      1,
      Math.max(0, 1 - distance / (targetRadius * 1.55)) + firstThrowAssist,
    );
    const speed = Math.min(1, Math.hypot(velocity.x, velocity.y) / 1.15);
    const direction = Math.min(1, upwardSpeed / 0.7);
    const curve = Math.abs(curvature) > Math.max(18, rect.width * 0.055);
    const startPercent = {
      x: (end.x / rect.width) * 100,
      y: (end.y / rect.height) * 100,
    };
    const impact = {
      x: Math.max(3, Math.min(97, (projected.x / rect.width) * 100)),
      y: Math.max(5, Math.min(94, (projected.y / rect.height) * 100)),
    };
    resetDrag();
    performThrow(
      { accuracy, ring, direction, speed, curve },
      { start: startPercent, impact },
    );
  };

  const cancelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.pointerId === event.pointerId) resetDrag();
  };

  const fallbackThrow = () => {
    if (result || flight !== "ready") return;
    setHasThrown(true);
    const accuracy = Math.max(0, 1 - Math.abs(aim - 50) / 36);
    performThrow(
      {
        accuracy,
        ring,
        direction: 0.88,
        speed: 0.38,
        curve: false,
      },
      {
        start: { x: 50, y: 90 },
        impact: { x: aim, y: 40 },
      },
    );
  };

  const performThrow = (metrics: ThrowMetrics, path: FlightPath) => {
    if (!current || result || flight !== "ready") return;
    const quality = classifyThrow(metrics);
    const attempt = maxAttempts - attemptsLeft + 1;
    const usedBall = ball;
    const usedBerry = berry;
    const resolved = resolveCaptureAttempt({
      speciesId: current.id,
      tier,
      quality,
      curve: metrics.curve,
      ball: usedBall,
      berry: usedBerry,
      attempt,
      seed: `${runSeed}:${round}`,
    });
    const baseRemoved = { miss: 0, nice: 1, great: 2, excellent: 3 }[quality];
    const removed =
      baseRemoved +
      (metrics.curve ? 1 : 0) +
      (usedBall === "advanced" ? 1 : 0) +
      (usedBerry ? 1 : 0);
    const remaining = Math.max(0, resistance - removed);
    const caught = remaining === 0 || (remaining === 1 && resolved.caught);
    const nextAttempts = Math.max(0, attemptsLeft - 1);
    const escaped = !caught && (resolved.fled || nextAttempts <= 0);
    if (usedBall === "advanced")
      setInventory((value) => ({
        ...value,
        advanced: Math.max(0, value.advanced - 1),
      }));
    if (usedBerry)
      setInventory((value) => ({
        ...value,
        berries: Math.max(0, value.berries - 1),
      }));
    setBall("field");
    setBerry(false);
    setFlightPath(path);
    setFlight("flight");
    timers.current.push(
      window.setTimeout(
        () => setFlight(quality === "miss" ? "flight" : "shake"),
        520,
      ),
    );
    timers.current.push(
      window.setTimeout(
        () => {
          setAttemptsLeft(nextAttempts);
          setResistance(remaining);
          setResult({
            quality,
            curve: metrics.curve,
            caught,
            escaped,
            attemptsLeft: nextAttempts,
            removed,
            remaining,
          });
          emitGameFeel({
            id: `capture-flick-${runSeed}-${round}-${attempt}-${quality}`,
            type: caught ? "success" : quality === "miss" ? "error" : "impact",
            label: `${metrics.curve ? "CURVE · " : ""}${quality.toUpperCase()}`,
            value: removed ? -removed : undefined,
            focus: ".poke-capture-resolution",
            particles: caught,
          });
          if (caught) {
            const nextStreak = streak + 1;
            const multiplier =
              quality === "excellent" ? 1.45 : quality === "great" ? 1.22 : 1;
            setScore(
              (value) =>
                value +
                Math.round(
                  TIER_SCORE[tier] * multiplier +
                    (metrics.curve ? 120 : 0) +
                    nextStreak * 80,
                ),
            );
            setCaughtCount((value) => value + 1);
            setStreak(nextStreak);
            setCaughtLog((items) => [
              ...items,
              { id: current.id, tier, quality, curve: metrics.curve },
            ]);
            setEncounterLog((items) => [
              ...items,
              { id: current.id, caught: true, tier },
            ]);
            setInventory((value) =>
              (current.id + round) % 2 === 0
                ? { ...value, berries: value.berries + 1 }
                : { ...value, advanced: value.advanced + 1 },
            );
          } else if (escaped) {
            setStreak(0);
            setEncounterLog((items) => [
              ...items,
              { id: current.id, caught: false, tier },
            ]);
          }
          setFlight("ready");
        },
        quality === "miss" ? 720 : 1450,
      ),
    );
  };

  const retry = () => {
    setResult(null);
    setFlight("ready");
    resetDrag();
  };

  const advance = () => {
    if (!result || (!result.caught && !result.escaped)) return;
    if (round + 1 >= encounters.length) {
      setPhase("summary");
      return;
    }
    const nextRound = round + 1;
    const nextTier = captureTierForSpecies(encounters[nextRound]);
    setRound(nextRound);
    setAttemptsLeft(maxAttempts);
    setResistance(TIER_RESISTANCE[nextTier]);
    setBall("field");
    setBerry(false);
    setResult(null);
    setFlight("ready");
    resetDrag();
  };

  const archive = () =>
    onFinish(
      score,
      caughtCount,
      encounters.length,
      encounters.map((entry) => entry.id),
      encounters.length,
    );

  if (!current) return null;

  if (phase === "summary") {
    const rarest = [...caughtLog].sort(
      (a, b) => tierRank(b.tier) - tierRank(a.tier),
    )[0];
    return (
      <section className="poke-capture-summary">
        <div className="poke-capture-summary-mark">
          <Crosshair />
          <i />
        </div>
        <p className="poke-kicker">FIELD SURVEY ARCHIVED</p>
        <h2>
          {locale === "de" ? "Fanglauf abgeschlossen" : "Capture run complete"}
        </h2>
        <p>
          {locale === "de"
            ? "Alle Sichtungen wurden protokolliert – gefangen oder entkommen."
            : "Every sighting was logged—caught or escaped."}
        </p>
        <div className="poke-capture-summary-stats">
          <span>
            <b>
              {caughtCount}/{roundCount}
            </b>
            {locale === "de" ? "GEFANGEN" : "CAUGHT"}
          </span>
          <span>
            <b>{score}</b>SCORE
          </span>
          <span>
            <b>
              {caughtLog.filter((item) => item.quality === "excellent").length}
            </b>
            EXCELLENT
          </span>
          <span>
            <b>{caughtLog.filter((item) => item.curve).length}</b>CURVE
          </span>
        </div>
        <div className="poke-capture-log">
          {encounterLog.map((item, index) => (
            <span
              key={`${item.id}-${index}`}
              className={item.caught ? "is-caught" : "is-escaped"}
            >
              <i>{String(index + 1).padStart(2, "0")}</i>
              <PokemonSprite entry={encounters[index]} size={72} />
              <b>{encounters[index].name[locale]}</b>
              <small>
                {tierLabel(item.tier, locale)} ·{" "}
                {item.caught
                  ? locale === "de"
                    ? "GEFANGEN"
                    : "CAUGHT"
                  : locale === "de"
                    ? "ENTKOMMEN"
                    : "ESCAPED"}
              </small>
            </span>
          ))}
        </div>
        {rarest && (
          <div className="poke-rarest-lock">
            <Sparkles />
            <span>
              <small>
                {locale === "de" ? "SELTENSTER FUND" : "RAREST DISCOVERY"}
              </small>
              <b>
                {
                  encounters.find((entry) => entry.id === rarest.id)?.name[
                    locale
                  ]
                }
              </b>
              <em>{tierLabel(rarest.tier, locale)}</em>
            </span>
          </div>
        )}
        <button className="poke-primary" onClick={archive}>
          <Archive />
          {locale === "de" ? "Feldlog archivieren" : "Archive field log"}
        </button>
      </section>
    );
  }

  const terminal = !!result && (result.caught || result.escaped);
  const tierName = current.mythical
    ? locale === "de"
      ? "MYTHISCH"
      : "MYTHICAL"
    : current.legendary
      ? locale === "de"
        ? "LEGENDÄR"
        : "LEGENDARY"
      : tierLabel(tier, locale).toUpperCase();
  const fleePressure = maxAttempts - attemptsLeft;
  const fleeName = (
    locale === "de"
      ? ["NIEDRIG", "NIEDRIG", "STEIGEND", "HOCH"]
      : ["LOW", "LOW", "RISING", "HIGH"]
  )[Math.min(3, fleePressure)];
  const ballPosition = drag.current
    ? {
        left: `${drag.current.x}px`,
        top: `${drag.current.y}px`,
      }
    : undefined;

  return (
    <div className={`poke-capture-game tier-${tier}`}>
      <RunHud
        score={score}
        round={round + 1}
        total={roundCount}
        resource={streak}
        label="STREAK"
      />
      <div className="poke-capture-hud">
        <span>
          {locale === "de" ? "STUFE" : "TIER"} <b>{tierName}</b>
        </span>
        <span>
          {locale === "de" ? "WIDERSTAND" : "RESIST"}{" "}
          <b className="poke-resistance-pips">
            {Array.from({ length: TIER_RESISTANCE[tier] }, (_, index) => (
              <i
                key={index}
                className={index < resistance ? "is-live" : "is-cleared"}
              />
            ))}
          </b>
        </span>
        <span>
          {locale === "de" ? "WÜRFE" : "THROWS"}{" "}
          <b>
            {attemptsLeft}/{maxAttempts}
          </b>
        </span>
        <span>
          {locale === "de" ? "FLUCHT" : "FLEE"} <b>{fleeName}</b>
        </span>
      </div>
      <section
        ref={clearingRef}
        className={`poke-capture-clearing poke-direct-capture ${drag.active ? "is-dragging" : ""}`}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={releaseDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setAim((value) => Math.max(12, value - 7));
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            setAim((value) => Math.min(88, value + 7));
          } else if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            fallbackThrow();
          }
        }}
        tabIndex={0}
        aria-label={
          locale === "de"
            ? "Fangszene. Ball halten, nach oben wischen und loslassen."
            : "Capture scene. Hold the ball, flick upward and release."
        }
      >
        <div className="poke-field-sky" />
        <div className="poke-field-grass is-back" />
        <div className="poke-field-grass is-front" />
        <header className="poke-capture-specimen">
          <span>
            #{String(current.id).padStart(4, "0")} · GEN {current.generation}
          </span>
          <h2>{current.name[locale]}</h2>
          <small>
            {current.types
              .map((type) => localizedType(type, locale))
              .join(" · ")}
          </small>
        </header>
        <p className="poke-direct-instruction">
          <MousePointer2 />
          <span>
            <b>
              {locale === "de"
                ? "BALL HALTEN · NACH OBEN WISCHEN"
                : "HOLD BALL · FLICK UPWARD"}
            </b>
            {locale === "de"
              ? "Im kleinen Ring treffen. Eine seitliche Bewegung gibt Curve-Bonus."
              : "Hit inside the small ring. Add sideways motion for a curve bonus."}
          </span>
        </p>
        <div
          className="poke-catch-aperture"
          style={{
            width: `${Math.round(220 * ring)}px`,
            height: `${Math.round(220 * ring)}px`,
          }}
        >
          <i />
        </div>
        <div className="poke-capture-reticle" />
        <PokemonSprite entry={current} size={260} />
        {!hasThrown && (
          <div className="poke-flick-ghost" aria-hidden="true">
            <i />
            <Wind />
            <span>{locale === "de" ? "WISCHEN" : "FLICK"}</span>
          </div>
        )}
        {drag.points.length > 1 && (
          <div className="poke-live-trajectory" aria-hidden="true">
            {drag.points.map((point, index) => (
              <i key={index} style={{ left: point.x, top: point.y }} />
            ))}
          </div>
        )}
        <div className="poke-capture-tools">
          <button
            type="button"
            aria-pressed={ball === "advanced"}
            disabled={!inventory.advanced || !!result || flight !== "ready"}
            onClick={(event) => {
              event.stopPropagation();
              setBall((value) => (value === "advanced" ? "field" : "advanced"));
            }}
          >
            <ShieldPlus />
            <span>
              <b>{locale === "de" ? "Power-Ball" : "Power Ball"}</b>
              <small>{inventory.advanced} · +1</small>
            </span>
          </button>
          <button
            type="button"
            aria-pressed={berry}
            disabled={!inventory.berries || !!result || flight !== "ready"}
            onClick={(event) => {
              event.stopPropagation();
              setBerry((value) => !value);
            }}
          >
            <Apple />
            <span>
              <b>{locale === "de" ? "Feldbeere" : "Field Berry"}</b>
              <small>{inventory.berries} · +1</small>
            </span>
          </button>
        </div>
        <button
          type="button"
          data-capture-ball
          className={`poke-direct-ball ${drag.active ? "is-held" : ""} ${flight !== "ready" ? "is-hidden" : ""}`}
          style={ballPosition}
          disabled={!!result || flight !== "ready"}
          aria-label={
            locale === "de"
              ? "Ball halten und nach oben werfen"
              : "Hold ball and flick upward"
          }
        >
          <CircleDot />
        </button>
        <div
          className={`poke-ball-flight is-${flight}`}
          style={
            {
              "--throw-start-x": `${flightPath.start.x}%`,
              "--throw-start-y": `${flightPath.start.y}%`,
              "--throw-impact-x": `${flightPath.impact.x}%`,
              "--throw-impact-y": `${flightPath.impact.y}%`,
            } as React.CSSProperties
          }
        >
          <CircleDot />
        </div>
        <div className="poke-keyboard-aim">
          <button
            type="button"
            aria-label={locale === "de" ? "Nach links zielen" : "Aim left"}
            disabled={!!result || flight !== "ready"}
            onClick={(event) => {
              event.stopPropagation();
              setAim((value) => Math.max(12, value - 7));
            }}
          >
            <ChevronLeft />
          </button>
          <div>
            <i style={{ left: `${aim}%` }} />
            <span style={{ left: `${aim}%` }} />
          </div>
          <button
            type="button"
            aria-label={locale === "de" ? "Nach rechts zielen" : "Aim right"}
            disabled={!!result || flight !== "ready"}
            onClick={(event) => {
              event.stopPropagation();
              setAim((value) => Math.min(88, value + 7));
            }}
          >
            <ChevronRight />
          </button>
          <button
            type="button"
            disabled={!!result || flight !== "ready"}
            onClick={(event) => {
              event.stopPropagation();
              fallbackThrow();
            }}
          >
            <Keyboard />
            {locale === "de" ? "WERFEN" : "THROW"}
          </button>
        </div>
        {result && (
          <div
            className={`poke-capture-resolution ${result.caught ? "is-caught" : result.escaped ? "is-escaped" : "is-breakout"}`}
          >
            {result.caught ? <Check /> : result.escaped ? <X /> : <CircleDot />}
            <span>
              <small>
                {throwLabel(result.quality, result.curve).toUpperCase()}
              </small>
              <b>
                {result.caught
                  ? locale === "de"
                    ? `${current.name.de} gefangen`
                    : `${current.name.en} caught`
                  : result.escaped
                    ? locale === "de"
                      ? `${current.name.de} ist entkommen`
                      : `${current.name.en} escaped`
                    : locale === "de"
                      ? "Ausgebrochen – noch einmal!"
                      : "Broke free—try again!"}
              </b>
              <em>
                {result.quality === "miss"
                  ? locale === "de"
                    ? "Wische schneller nach oben und ziele auf den Ring."
                    : "Flick upward faster and aim for the ring."
                  : `${result.removed} ${locale === "de" ? "Widerstand entfernt" : "resistance removed"} · ${result.attemptsLeft} ${locale === "de" ? "Würfe übrig" : "throws left"}`}
              </em>
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                terminal ? advance() : retry();
              }}
            >
              {terminal
                ? round + 1 >= roundCount
                  ? locale === "de"
                    ? "Zusammenfassung"
                    : "Summary"
                  : locale === "de"
                    ? "Nächste Sichtung"
                    : "Next encounter"
                : locale === "de"
                  ? "Noch einmal werfen"
                  : "Throw again"}{" "}
              →
            </button>
          </div>
        )}
      </section>
      <p className="poke-capture-access-note">
        <Keyboard />
        {locale === "de"
          ? "Tastatur: Pfeile zum Zielen, Leertaste zum Werfen."
          : "Keyboard: arrows to aim, Space to throw."}
      </p>
    </div>
  );
}

function signedCurveAmount(points: Point[], start: Point, end: Point) {
  if (points.length < 3) return 0;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  let strongest = 0;
  points.forEach((point) => {
    const distance =
      (dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) /
      length;
    if (Math.abs(distance) > Math.abs(strongest)) strongest = distance;
  });
  return strongest;
}

function tierLabel(tier: CaptureTier, locale: "en" | "de") {
  const labels = {
    common: { en: "common", de: "häufig" },
    uncommon: { en: "uncommon", de: "ungewöhnlich" },
    rare: { en: "rare", de: "selten" },
    ultra: { en: "ultra-rare", de: "ultra-selten" },
    legendary: {
      en: "legendary / mythical",
      de: "legendär / mythisch",
    },
  };
  return labels[tier][locale];
}

function throwLabel(quality: ThrowQuality, curve: boolean) {
  return `${curve ? "Curve " : ""}${quality}`;
}

function tierRank(tier: CaptureTier) {
  return ["common", "uncommon", "rare", "ultra", "legendary"].indexOf(tier);
}
