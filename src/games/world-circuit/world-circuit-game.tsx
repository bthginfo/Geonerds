"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Flag, RotateCcw, Undo2, X } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { Button } from "@/components/ui/button";
import { RoundFeedback, VisualGameFrame, useVisualSession, type VisualSessionUI } from "@/games/flag-pie/game-kit";
import { TravelMap } from "@/games/new-world/travel-map";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";
import { newRunSeed } from "@/lib/random";
import { cn, haversineKm } from "@/lib/utils";
import { buildWorldCircuitRounds, evaluateCircuit, type CircuitAnswer, type CircuitRound } from "./generator";

export function WorldCircuitGame(handlers: PlayHandlers) {
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const rounds = useMemo(() => buildWorldCircuitRounds(handlers.difficulty, handlers.roundCount, seed), [handlers.difficulty, handlers.roundCount, seed]);
  const hits = useMemo(() => rounds.map(() => undefined), [rounds]);
  const countries = useRef<string[]>([]);
  const session = useVisualSession({ ...handlers, mode: "choice", timed: false, total: rounds.length, hits,
    onFinish: (result) => handlers.onFinish({ ...result, countryHits: [...new Set(countries.current)] }) });
  const round = rounds[session.index];
  return <VisualGameFrame gameId="world-circuit" session={session} handlers={{ ...handlers, timed: false }} wide>
    {round && <CircuitBoard key={round.id} round={round} handlers={handlers} session={session} onAnswer={(answer, stopIds) => {
      if (answer.correct) countries.current.push(round.hub.cca3, ...[...round.stops, ...(round.bonus ? [round.bonus] : [])].filter((city) => stopIds.includes(city.id)).map((city) => city.cca3));
      session.commit(answer.correct, answer.points);
    }} />}
  </VisualGameFrame>;
}

function CircuitBoard({ round, handlers, session, onAnswer }: {
  round: CircuitRound;
  handlers: PlayHandlers;
  session: VisualSessionUI;
  onAnswer: (answer: CircuitAnswer, stopIds: string[]) => void;
}) {
  const { locale } = useT();
  const de = locale === "de";
  const [route, setRoute] = useState<string[]>([]);
  const routeRef = useRef<string[]>([]);
  const [history, setHistory] = useState<string[][]>([]);
  const historyRef = useRef<string[][]>([]);
  const [answer, setAnswer] = useState<CircuitAnswer | null>(null);
  const [showOptimal, setShowOptimal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const submitted = useRef(false);
  const mapRef = useRef<HTMLElement>(null);
  const cities = useMemo(() => [round.hub, ...round.stops, ...(round.bonus ? [round.bonus] : [])], [round]);
  const byId = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities]);
  const name = (id: string) => { const city = byId.get(id); return city?.name[locale] || city?.name.en || id; };
  const format = (value: number) => `${Math.round(value).toLocaleString(locale)} km`;
  const missing = round.stops.filter((city) => !route.includes(city.id));
  const loop = route.length ? [round.hub.id, ...route, round.hub.id] : [round.hub.id];
  const distance = loop.slice(1).reduce((sum, id, index) => {
    const a = byId.get(loop[index]);
    const b = byId.get(id);
    return a && b ? sum + haversineKm([a.lng, a.lat], [b.lng, b.lat]) : sum;
  }, 0);
  const overBudget = distance > round.fuelKm + 0.001;
  const shownRoute = showOptimal ? [round.hub.id, ...round.optimalRoute.filter((id) => id !== round.hub.id), round.hub.id] : loop;
  const progress = Math.min(100, 100 * distance / Math.max(1, round.fuelKm));

  function replaceRoute(next: string[]) {
    if (submitted.current) return;
    historyRef.current = [...historyRef.current, [...routeRef.current]];
    setHistory(historyRef.current);
    routeRef.current = next;
    setRoute(next);
    setNotice(null);
    haptic.tap();
  }

  function select(id: string) {
    if (submitted.current || id === round.hub.id || !byId.has(id)) return;
    const current = routeRef.current;
    replaceRoute(current.includes(id) ? current.filter((city) => city !== id) : [...current, id]);
  }

  function move(id: string, direction: number) {
    if (submitted.current) return;
    const current = [...routeRef.current];
    const index = current.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;
    [current[index], current[nextIndex]] = [current[nextIndex], current[index]];
    replaceRoute(current);
  }

  function undo() {
    if (submitted.current || !historyRef.current.length) return;
    const previous = historyRef.current.at(-1)!;
    historyRef.current = historyRef.current.slice(0, -1);
    routeRef.current = previous;
    setHistory(historyRef.current);
    setRoute(previous);
    setNotice(null);
    haptic.tap();
  }

  function submit() {
    if (submitted.current) return;
    const result = evaluateCircuit(round, routeRef.current);
    if (!result.valid) { setNotice(de ? "Besuche jeden Pflichtstopp genau einmal, bevor du startest." : "Visit every required stop exactly once before starting."); return; }
    submitted.current = true;
    setAnswer(result);
    onAnswer(result, [...routeRef.current]);
  }

  function revealRoute(optimal: boolean) {
    setShowOptimal(optimal);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mapRef.current?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
  }

  return <>
    <header>
      <h1 className="text-xl font-bold sm:text-2xl">{de ? "Plane die clevere Rundreise" : "Plan the smarter round trip"}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{de ? "Tippe Städte in deiner gewünschten Reihenfolge an. Besuche alle Pflichtstopps und kehre innerhalb des Kilometerbudgets zurück." : "Tap cities in the order you want to visit them. Include every required stop and return within the distance budget."}</p>
      {handlers.roundCount === 0 && <p className="mt-2 text-xs text-muted-foreground">{de ? "Übungspaket: 25 Rundreisen ohne Punkte." : "Practice pack: 25 round trips, no points."}</p>}
    </header>

    <section ref={mapRef} className="scroll-mt-20" aria-label={de ? "Routenkarte und Kilometerbudget" : "Route map and distance budget"}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold"><Flag className="h-4 w-4 shrink-0 text-primary" aria-hidden /><span>{de ? "Start und Ziel:" : "Start and finish:"} {name(round.hub.id)}</span></div>
      <TravelMap cities={cities} route={shownRoute} revealed={Boolean(answer)} onSelectCity={answer ? undefined : select} />
      {answer && <p role="status" className="mt-2 text-sm font-semibold">{showOptimal ? (de ? "Karte: kürzeste Pflichtstrecke, ohne Bonus" : "Map: shortest required-stop trip, no bonus") : (de ? "Karte: deine bestätigte Route" : "Map: your confirmed route")}</p>}
      <div className="mt-3 rounded-xl bg-card p-3" aria-live="polite" aria-atomic="true">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm"><p className="font-semibold tabular-nums">{answer && <span className="mr-1 font-normal">{de ? "Deine Route:" : "Your trip:"}</span>}{format(distance)} <span className="font-normal text-muted-foreground">/ {format(round.fuelKm)}</span></p><span className={cn("text-xs font-semibold", overBudget ? "text-danger" : "text-muted-foreground")}>{overBudget ? (de ? "Budget überschritten" : "Over budget") : (de ? "Inklusive Rückweg" : "Includes the return leg")}</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-muted" aria-hidden="true"><div className={cn("h-full rounded transition-[width] duration-150 motion-reduce:transition-none", overBudget ? "bg-danger" : "bg-primary")} style={{ width: `${progress}%` }} /></div>
        {!answer && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{missing.length ? (de ? `Noch ${missing.length} Pflichtstopps offen.` : `${missing.length} required stops still to add.`) : (de ? "Alle Pflichtstopps eingeplant. Du kannst die Reihenfolge noch ändern." : "Every required stop is included. You can still change the order.")}</p>}
      </div>
    </section>

    {!answer && <section aria-label={de ? "Stopps hinzufügen oder entfernen" : "Add or remove stops"}>
      <h2 className="mb-3 text-sm font-bold">{de ? "Wähle deine Stopps" : "Choose your stops"}</h2>
      <div className="grid grid-cols-2 gap-2">{[...round.stops, ...(round.bonus ? [round.bonus] : [])].map((city) => {
        const included = route.includes(city.id);
        const bonus = city.id === round.bonus?.id;
        return <button key={city.id} type="button" onClick={() => select(city.id)} aria-pressed={included} className={cn("flex min-h-16 min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none", included ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted")}>
          <span aria-hidden className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums", included ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>{cities.findIndex((item) => item.id === city.id) + 1}</span>
          <span className="min-w-0"><span className="block break-words text-sm font-semibold">{name(city.id)}</span><span className="mt-0.5 block text-xs text-muted-foreground">{bonus ? (de ? "Optionaler Bonus" : "Optional bonus") : (de ? "Pflichtstopp" : "Required stop")}</span></span>
          {included && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" aria-hidden />}
        </button>;
      })}</div>
    </section>}

    <section aria-label={de ? "Reihenfolge deiner Route" : "Your route order"}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">{de ? "Deine Route" : "Your route"}</h2>{!answer && <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={undo} disabled={!history.length}><Undo2 className="h-4 w-4" aria-hidden />{de ? "Zurück" : "Undo"}</Button><Button size="icon" variant="ghost" onClick={() => replaceRoute([])} disabled={!route.length} aria-label={de ? "Route leeren" : "Clear route"}><RotateCcw className="h-4 w-4" aria-hidden /></Button></div>}</div>
      {!route.length ? <p className="rounded-xl bg-muted px-4 py-4 text-sm leading-relaxed text-muted-foreground">{de ? "Wähle oben deinen ersten Stopp. Die Reihenfolge bestimmt, wie weit du reist." : "Choose your first stop above. The order determines how far you travel."}</p> : <ol className="divide-y divide-border rounded-xl bg-card px-2">{route.map((id, index) => <li key={id} className="flex min-w-0 items-center gap-2 py-2 pl-1"><span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 break-words text-sm font-semibold">{name(id)}{id === round.bonus?.id && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{de ? "Bonus" : "Bonus"}</span>}</span>{!answer && <div className="flex shrink-0"><Button size="icon" variant="ghost" disabled={index === 0} onClick={() => move(id, -1)} aria-label={de ? `${name(id)} nach vorne` : `Move ${name(id)} earlier`}><ArrowUp className="h-4 w-4" aria-hidden /></Button><Button size="icon" variant="ghost" disabled={index === route.length - 1} onClick={() => move(id, 1)} aria-label={de ? `${name(id)} nach hinten` : `Move ${name(id)} later`}><ArrowDown className="h-4 w-4" aria-hidden /></Button><Button size="icon" variant="ghost" onClick={() => select(id)} aria-label={de ? `${name(id)} entfernen` : `Remove ${name(id)}`}><X className="h-4 w-4" aria-hidden /></Button></div>}</li>)}</ol>}
      {route.length > 0 && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{de ? "Danach zurück nach" : "Then return to"} {name(round.hub.id)}.</p>}
      {!answer && <><Button onClick={submit} disabled={missing.length > 0} className="mt-4 min-h-12 w-full">{de ? "Route bestätigen" : "Confirm route"}<Check className="h-4 w-4" aria-hidden /></Button><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{de ? "Innerhalb des Budgets zählt die Effizienz. Ein mitgenommener Bonusstopp bringt Extrapunkte, solange du im Budget bleibst." : "Stay within budget to score for efficiency. Including the bonus stop adds points if your whole trip stays within budget."}</p></>}
      {notice && <p role="alert" className="mt-3 text-sm text-danger">{notice}</p>}
    </section>

    {answer && <RoundFeedback session={session} answerLabel={answer.correct ? (de ? "Rundreise im Budget" : "Round trip within budget") : (de ? "Deine Rundreise war zu lang" : "Your round trip was too long")}>
      <dl className="space-y-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt>{de ? "Deine Strecke" : "Your distance"}</dt><dd className="font-semibold tabular-nums">{format(answer.distanceKm)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt>{de ? "Kürzeste Pflichtstrecke" : "Shortest required-stop trip"}</dt><dd className="font-semibold tabular-nums">{format(round.optimalKm)}</dd></div>{answer.bonusIncluded && <div className="flex flex-wrap justify-between gap-2"><dt>{de ? "Kürzeste Strecke mit Bonus" : "Shortest trip including bonus"}</dt><dd className="font-semibold tabular-nums">{format(answer.optimalKm)}</dd></div>}<div className="flex flex-wrap justify-between gap-2"><dt>{de ? "Budget genutzt" : "Budget used"}</dt><dd className="font-semibold tabular-nums">{Math.round(100 * answer.distanceKm / round.fuelKm)}%</dd></div><div className="flex flex-wrap justify-between gap-2"><dt>{de ? "Effizienz bei deinen Stopps" : "Efficiency for your chosen stops"}</dt><dd className="font-semibold tabular-nums">{Math.round(100 * answer.ratio)}%</dd></div></dl>
      <p className="mt-3 text-sm leading-relaxed">{answer.correct ? (de ? "Geschafft. Prüfe auf der Karte, welche Umwege du mit einer anderen Reihenfolge vermeiden könntest." : "Made it. Compare the routes on the map to spot detours you could avoid with a different order.") : (de ? "Du hast alle Pflichtstopps besucht, aber zu viele Kilometer verbraucht. Vermeide Kreuzungen und weite Rücksprünge zwischen den Stopps." : "You visited every required stop but used too many kilometres. Look for crossings and long backtracks between stops.")}</p>
      {round.bonus && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{answer.bonusIncluded ? (de ? `Bonusstopp ${name(round.bonus.id)} enthalten. Die Effizienz vergleicht dieselben Stopps; die Pflichtstrecke auf der Karte lässt den Bonus weg.` : `Bonus stop ${name(round.bonus.id)} included. Efficiency compares the same stops; the required route on the map excludes the bonus.`) : (de ? `Optionaler Bonusstopp: ${name(round.bonus.id)}. Für eine gültige Route war er nicht nötig.` : `Optional bonus stop: ${name(round.bonus.id)}. It was not needed for a valid trip.`)}</p>}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={de ? "Route auf der Karte anzeigen" : "Route to show on the map"}><Button variant={showOptimal ? "outline" : "secondary"} aria-pressed={!showOptimal} onClick={() => revealRoute(false)}>{de ? "Meine Route" : "My route"}</Button><Button variant={showOptimal ? "secondary" : "outline"} aria-pressed={showOptimal} onClick={() => revealRoute(true)}>{de ? "Kürzeste Pflichtstrecke" : "Shortest required trip"}</Button></div>
      <p className="mt-3 break-words text-xs leading-relaxed text-muted-foreground">{shownRoute.map(name).join(" → ")}</p>
    </RoundFeedback>}
    <p className="text-xs leading-relaxed text-muted-foreground">{de ? "Das Spiel nutzt Großkreisentfernungen. Die Linien sind keine Flugverbindungen oder realen Verkehrsangebote." : "This game uses great-circle distances. Lines do not represent available flights or real transport services."}</p>
  </>;
}
