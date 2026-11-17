"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { Check, MoveVertical, RotateCcw, Target } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { Button } from "@/components/ui/button";
import { RoundFeedback, VisualGameFrame, useVisualSession, type VisualSessionUI } from "@/games/flag-pie/game-kit";
import { TravelMap } from "@/games/new-world/travel-map";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";
import { newRunSeed } from "@/lib/random";
import { cn } from "@/lib/utils";
import { buildLatitudeRounds, evaluateLatitude, type LatitudeAnswer, type LatitudeRound } from "./generator";

const LATITUDE_TICKS = [90, 60, 30, 0, -30, -60, -90];
const latitudePercent = (latitude: number) => 8 + (90 - latitude) / 180 * 84;

function latitudeLabel(latitude: number, locale: "en" | "de") {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Math.abs(latitude));
  return latitude === 0 ? "0°" : `${number}° ${latitude > 0 ? "N" : "S"}`;
}

export function LatitudeLabGame(handlers: PlayHandlers) {
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const rounds = useMemo(() => buildLatitudeRounds(handlers.difficulty, handlers.roundCount, seed), [handlers.difficulty, handlers.roundCount, seed]);
  const hits = useMemo(() => rounds.map(() => undefined), [rounds]);
  const successfulCountries = useRef<string[]>([]);
  const session = useVisualSession({
    ...handlers, mode: "choice", timed: false, total: rounds.length, hits,
    onFinish: (result) => handlers.onFinish({ ...result, countryHits: successfulCountries.current }),
  });
  const round = rounds[session.index];

  return <VisualGameFrame gameId="latitude-lab" session={session} handlers={{ ...handlers, timed: false }} wide>
    {round && <LatitudeBoard key={round.id} round={round} session={session} practicePack={handlers.roundCount === 0}
      onAnswer={(answer) => {
        successfulCountries.current.push(...answer.placements.filter((placement) => placement.withinTolerance).map((placement) => placement.city.cca3));
        session.commit(answer.correct, answer.points);
      }} />}
  </VisualGameFrame>;
}

function LatitudeBoard({ round, session, practicePack, onAnswer }: {
  round: LatitudeRound;
  session: VisualSessionUI;
  practicePack: boolean;
  onAnswer: (answer: LatitudeAnswer) => void;
}) {
  const { locale } = useT();
  const de = locale === "de";
  const [selectedId, setSelectedId] = useState(round.cities[0]?.id ?? "");
  const selectedRef = useRef(selectedId);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const positionsRef = useRef<Record<string, number>>({});
  const [answer, setAnswer] = useState<LatitudeAnswer | null>(null);
  const submittedRef = useRef(false);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; cityId: string; previous: number | undefined } | null>(null);
  const selectedCity = round.cities.find((city) => city.id === selectedId) ?? round.cities[0];
  const placedCount = round.cities.filter((city) => Number.isFinite(positions[city.id])).length;
  const required = Math.ceil(round.cities.length * 0.75);
  const format = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);

  function chooseCity(id: string) {
    if (submittedRef.current) return;
    selectedRef.current = id;
    setSelectedId(id);
    haptic.tap();
  }

  function placeCity(id: string, latitude: number) {
    if (submittedRef.current || !Number.isFinite(latitude)) return;
    const next = { ...positionsRef.current, [id]: Math.round(Math.max(-90, Math.min(90, latitude)) * 2) / 2 };
    positionsRef.current = next;
    setPositions(next);
  }

  function latitudeFromPointer(clientY: number) {
    const bounds = ribbonRef.current?.getBoundingClientRect();
    if (!bounds?.height) return null;
    return 90 - (((clientY - bounds.top) / bounds.height - 0.08) / 0.84) * 180;
  }

  function beginDrag(event: PointerEvent<HTMLElement>, id = selectedRef.current) {
    if (submittedRef.current || !id || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    const latitude = latitudeFromPointer(event.clientY);
    if (latitude === null) return;
    event.preventDefault();
    selectedRef.current = id;
    setSelectedId(id);
    dragRef.current = { pointerId: event.pointerId, cityId: id, previous: positionsRef.current[id] };
    ribbonRef.current?.setPointerCapture(event.pointerId);
    placeCity(id, latitude);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const latitude = latitudeFromPointer(event.clientY);
    if (latitude !== null) placeCity(drag.cityId, latitude);
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (cancelled) {
      const next = { ...positionsRef.current };
      if (drag.previous === undefined) delete next[drag.cityId];
      else next[drag.cityId] = drag.previous;
      positionsRef.current = next;
      setPositions(next);
    } else {
      const latitude = latitudeFromPointer(event.clientY);
      if (latitude !== null) placeCity(drag.cityId, latitude);
      haptic.tap();
    }
    dragRef.current = null;
    if (ribbonRef.current?.hasPointerCapture(event.pointerId)) ribbonRef.current.releasePointerCapture(event.pointerId);
  }

  function resetSelected() {
    if (submittedRef.current) return;
    const next = { ...positionsRef.current };
    delete next[selectedRef.current];
    positionsRef.current = next;
    setPositions(next);
  }

  function submit() {
    if (submittedRef.current) return;
    const result = evaluateLatitude(round, positionsRef.current);
    if (!result.valid) return;
    submittedRef.current = true;
    dragRef.current = null;
    setAnswer(result);
    onAnswer(result);
  }

  return <>
    <header>
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{de ? "Wie weit nördlich liegt die Stadt?" : "How far north is each city?"}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {de ? "Wähle eine Stadt und tippe auf die Breitengrad-Skala. Ziehe ihre Marke, um die Schätzung zu ändern. Der Längengrad spielt hier keine Rolle." : "Choose a city, then tap its latitude on the scale. Drag its marker to adjust your guess. East or west doesn’t matter here."}
      </p>
    </header>

    <section aria-label={de ? "Städte platzieren" : "Place the cities"} className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 shrink-0 text-primary" aria-hidden />{de ? `${required} von ${round.cities.length} mit höchstens ${round.tolerance}° Abweichung` : `${required} of ${round.cities.length} within ${round.tolerance}°`}</p>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground" aria-live="polite">{de ? `${placedCount}/${round.cities.length} platziert` : `${placedCount}/${round.cities.length} placed`}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {round.cities.map((city, index) => {
          const placed = Number.isFinite(positions[city.id]);
          return <button key={city.id} type="button" onClick={() => chooseCity(city.id)} disabled={Boolean(answer)} aria-pressed={selectedId === city.id}
            className={cn("flex min-h-16 min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none", selectedId === city.id && !answer ? "border-primary bg-primary/10" : "border-border bg-card", !answer && "hover:border-primary/60")}>
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", selectedId === city.id && !answer ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>{index + 1}</span>
            <span className="min-w-0"><span className="block break-words text-sm font-semibold leading-snug">{city.name[locale]}</span><span className="mt-1 block text-xs tabular-nums text-muted-foreground">{placed ? latitudeLabel(positions[city.id], locale) : de ? "Noch nicht platziert" : "Not placed yet"}</span></span>
          </button>;
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-xs font-semibold text-muted-foreground"><span>{de ? "Norden" : "North"}</span><span className="flex items-center gap-1.5"><MoveVertical className="h-3.5 w-3.5" aria-hidden />{de ? "Breitengrad" : "Latitude"}</span></div>
        <div ref={ribbonRef} className={cn("relative h-[352px] select-none sm:h-[420px]", !answer && "touch-none cursor-crosshair")}
          onPointerDown={(event) => beginDrag(event)} onPointerMove={moveDrag} onPointerUp={(event) => finishDrag(event)} onPointerCancel={(event) => finishDrag(event, true)} onLostPointerCapture={() => { dragRef.current = null; }}
          aria-label={de ? "Breitengrad-Skala von 90 Grad Nord bis 90 Grad Süd. Alternativ den Regler darunter verwenden." : "Latitude scale from 90 degrees north to 90 degrees south. The slider below offers an alternative."}>
          <svg viewBox="0 0 600 420" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            <rect x="68" y="33.6" width="516" height="352.8" rx="8" className="fill-primary/5" />
            {LATITUDE_TICKS.map((latitude) => <line key={latitude} x1="68" x2="584" y1={latitudePercent(latitude) * 4.2} y2={latitudePercent(latitude) * 4.2} className={latitude === 0 ? "stroke-primary/60" : "stroke-border"} strokeWidth={latitude === 0 ? 1.5 : 1} vectorEffect="non-scaling-stroke" />)}
            {round.cities.map((city, index) => {
              const x = (14 + (index + 0.5) / round.cities.length * 82) * 6;
              return <g key={city.id}>
                <line x1={x} x2={x} y1="33.6" y2="386.4" className="stroke-border/60" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
                {answer && <line x1={x} x2={x} y1={latitudePercent(positions[city.id]) * 4.2} y2={latitudePercent(city.lat) * 4.2} className="stroke-success" strokeWidth="2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
              </g>;
            })}
          </svg>
          {LATITUDE_TICKS.map((latitude) => <span key={latitude} className={cn("pointer-events-none absolute left-2 -translate-y-1/2 text-xs font-semibold tabular-nums", latitude === 0 ? "text-primary" : "text-muted-foreground")} style={{ top: `${latitudePercent(latitude)}%` }}>{latitudeLabel(latitude, locale)}</span>)}
          {round.cities.map((city, index) => {
            const left = `${14 + (index + 0.5) / round.cities.length * 82}%`;
            const placed = Number.isFinite(positions[city.id]);
            return <div key={city.id}>
              {answer && <span aria-hidden className="pointer-events-none absolute z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-success bg-card/80" style={{ left, top: `${latitudePercent(city.lat)}%` }}><Check className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-card text-success" /></span>}
              {placed && <button type="button" disabled={Boolean(answer)} data-city-marker={city.id}
                onPointerDown={(event) => { event.stopPropagation(); beginDrag(event, city.id); }} onClick={() => chooseCity(city.id)}
                aria-label={de ? `${city.name[locale]}: deine Schätzung ${latitudeLabel(positions[city.id], locale)}. Zum Verschieben ziehen.` : `${city.name[locale]}: your guess ${latitudeLabel(positions[city.id], locale)}. Drag to move.`}
                className={cn("absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card", selectedId === city.id && !answer ? "cursor-grab border-primary bg-primary text-primary-foreground active:cursor-grabbing" : "border-foreground/30 bg-card text-foreground")}
                style={{ left, top: `${latitudePercent(positions[city.id])}%` }}>{index + 1}</button>}
            </div>;
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs font-medium text-muted-foreground"><span>{de ? "Süden" : "South"}</span><span>{answer ? de ? "Zahl = Schätzung · Ring = tatsächliche Lage" : "Number = guess · ring = actual position" : de ? "0° = Äquator" : "0° = equator"}</span></div>
      </div>

      {!answer && selectedCity && <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <label htmlFor={`latitude-adjust-${round.id}`} className="min-w-0 break-words text-sm font-semibold">{de ? `${selectedCity.name[locale]} feinjustieren` : `Fine-tune ${selectedCity.name[locale]}`}</label>
          <span className="text-sm font-bold tabular-nums text-primary">{Number.isFinite(positions[selectedId]) ? latitudeLabel(positions[selectedId], locale) : de ? "Position wählen" : "Choose a position"}</span>
        </div>
        <input id={`latitude-adjust-${round.id}`} type="range" min={-90} max={90} step={0.5} value={positions[selectedId] ?? 0} onChange={(event) => placeCity(selectedId, Number(event.target.value))}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); placeCity(selectedId, positions[selectedId] ?? 0); } }}
          aria-valuetext={Number.isFinite(positions[selectedId]) ? latitudeLabel(positions[selectedId], locale) : de ? "Noch nicht platziert. Eingabetaste setzt die Stadt auf den Äquator." : "Not placed yet. Press Enter to place at the equator."}
          className="mt-1 block h-11 w-full cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>90° S</span><span>{de ? "Pfeiltasten zur Feinjustierung" : "Arrow keys for fine adjustment"}</span><span>90° N</span></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!Number.isFinite(positions[selectedId]) && <Button variant="secondary" onClick={() => placeCity(selectedId, 0)} className="whitespace-normal">{de ? "Auf den Äquator setzen" : "Place at the equator"}</Button>}
          <Button variant="ghost" onClick={resetSelected} disabled={!Number.isFinite(positions[selectedId])}><RotateCcw className="h-4 w-4 shrink-0" aria-hidden />{de ? "Position entfernen" : "Clear position"}</Button>
        </div>
        <Button className="mt-4 min-h-12 w-full whitespace-normal" onClick={submit} disabled={placedCount !== round.cities.length}>{de ? "Positionen prüfen" : "Check positions"}</Button>
        <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">{de ? "Alle Städte platzieren. Genauere Schätzungen bringen mehr Punkte." : "Place every city. More accurate guesses earn more points."}</p>
      </div>}
    </section>

    {answer && <RoundFeedback session={session} answerLabel={de ? `Mittlere Abweichung: ${format(answer.meanError)}°` : `Mean error: ${format(answer.meanError)}°`}>
      <p className="text-sm leading-relaxed">{de ? `${answer.placements.filter((placement) => placement.withinTolerance).length} von ${round.cities.length} Städten liegen innerhalb von ${round.tolerance}°. Du brauchst ${required}.` : `${answer.placements.filter((placement) => placement.withinTolerance).length} of ${round.cities.length} cities are within ${round.tolerance}°. You need ${required}.`}</p>
      <ul className="mt-3 divide-y divide-border/70">
        {answer.placements.map((placement, index) => <li key={placement.city.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words text-sm font-bold">{index + 1}. {placement.city.name[locale]}</p><span className={cn("shrink-0 text-xs font-semibold", placement.withinTolerance ? "text-success" : "text-danger")}>{placement.withinTolerance ? de ? "Im Zielbereich" : "Within range" : de ? "Außerhalb" : "Outside range"}</span></div>
          <p className="mt-1 text-xs leading-relaxed tabular-nums text-muted-foreground">{de ? `Geschätzt ${latitudeLabel(placement.guess, locale)} · Tatsächlich ${latitudeLabel(placement.actual, locale)} · ${format(placement.error)}° Abweichung` : `Guess ${latitudeLabel(placement.guess, locale)} · Actual ${latitudeLabel(placement.actual, locale)} · ${format(placement.error)}° error`}</p>
        </li>)}
      </ul>
    </RoundFeedback>}
    {answer && <section aria-label={de ? "Städte auf der Weltkarte" : "Cities on the world map"}><h2 className="mb-3 text-base font-bold">{de ? "Die tatsächliche Lage" : "Their real-world positions"}</h2><TravelMap cities={round.cities} revealed /></section>}
    {practicePack && <p className="text-xs leading-relaxed text-muted-foreground">{de ? "Diese Übung enthält 25 neu gemischte Aufgaben. Jede Stadt braucht eine eigene Schätzung." : "This practice pack contains 25 freshly mixed boards. Every city needs its own guess."}</p>}
  </>;
}
