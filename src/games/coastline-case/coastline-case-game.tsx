"use client";

import { useId, useMemo, useRef, useState } from "react";
import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import { ArrowUp, Expand, Lightbulb, MapPin } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { AnswerPanel, RoundFeedback, VisualGameFrame, useVisualSession, type VisualSessionUI } from "@/games/flag-pie/game-kit";
import { TravelMap } from "@/games/new-world/travel-map";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";
import { newRunSeed } from "@/lib/random";
import { cn } from "@/lib/utils";
import { buildCoastlineRounds, coastlinePoints, type CoastlineRound } from "./generator";

const INITIAL_ZOOM = { easy: 1.8, medium: 2.5, hard: 3.3 };

function degreeLabel(value: number, locale: "en" | "de") {
  if (value === 0) return "0°";
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.abs(value))}° ${value > 0 ? "N" : "S"}`;
}

export function CoastlineCaseGame(handlers: PlayHandlers) {
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const rounds = useMemo(() => buildCoastlineRounds(handlers.difficulty, handlers.roundCount, seed), [handlers.difficulty, handlers.roundCount, seed]);
  const hits = useMemo(() => rounds.map((round) => round.answer.cca3), [rounds]);
  const session = useVisualSession({ ...handlers, timed: false, total: rounds.length, hits });
  const round = rounds[session.index];

  return <VisualGameFrame gameId="coastline-case" session={session} handlers={{ ...handlers, timed: false }} wide>
    {round && <CoastlineBoard key={round.id} round={round} handlers={handlers} session={session} />}
  </VisualGameFrame>;
}

function CoastlineBoard({ round, handlers, session }: { round: CoastlineRound; handlers: PlayHandlers; session: VisualSessionUI }) {
  const { locale } = useT();
  const de = locale === "de";
  const clipId = useId().replace(/:/g, "");
  const [hints, setHints] = useState(0);
  const hintsRef = useRef(0);
  const lockedRef = useRef(false);
  const answered = Boolean(session.answer);
  const line = useMemo<GeoJSON.LineString>(() => ({ type: "LineString", coordinates: round.fragment.coordinates }), [round.fragment]);
  const geometry = useMemo(() => {
    const center = geoCentroid(line);
    const projection = geoMercator().rotate([-center[0], 0]).fitExtent([[36, 40], [564, 380]], line);
    const projected = round.fragment.coordinates.map((coordinate) => projection(coordinate))
      .filter((point): point is [number, number] => point !== null && point.every(Number.isFinite));
    const lengths = projected.slice(1).map((point, index) => Math.hypot(point[0] - projected[index][0], point[1] - projected[index][1]));
    const halfway = lengths.reduce((sum, length) => sum + length, 0) / 2;
    let travelled = 0;
    let focal = projected[0] ?? [300, 210];
    for (let index = 0; index < lengths.length; index++) {
      if (travelled + lengths[index] >= halfway) {
        // An actual coast vertex, not the centre of a closed island, must stay
        // in view even when a high-difficulty crop hides most of the outline.
        focal = halfway - travelled < lengths[index] / 2 ? projected[index] : projected[index + 1];
        break;
      }
      travelled += lengths[index];
    }
    return { path: geoPath(projection)(line) ?? "", center, focal };
  }, [line, round.fragment.coordinates]);
  const initialZoom = INITIAL_ZOOM[handlers.difficulty];
  const zoom = answered || hints >= 2 ? 1 : hints === 1 ? Math.sqrt(initialZoom) : initialZoom;
  // Clamp the crop to the fitted viewport. The real coastal focal point remains
  // visible at every zoom; at 1x this resolves to the complete fitted fragment.
  const cropX = Math.max(300 / zoom, Math.min(600 - 300 / zoom, geometry.focal[0]));
  const cropY = Math.max(210 / zoom, Math.min(420 - 210 / zoom, geometry.focal[1]));
  const bandSouth = Math.max(-90, Math.min(80, Math.floor(geometry.center[1] / 10) * 10));
  const bandNorth = bandSouth + 10;
  const pointValue = coastlinePoints(hints);
  const country = countryName(round.answer, locale);

  function revealHint() {
    if (lockedRef.current || hintsRef.current >= 3) return;
    hintsRef.current += 1;
    setHints(hintsRef.current);
    haptic.tap();
  }

  function answer(correct: boolean) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    session.commit(correct, coastlinePoints(hintsRef.current));
  }

  return <>
    <header>
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{de ? "Zu welchem Land gehört diese Küste?" : "Which country is this coastline from?"}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{de ? "Untersuche Buchten, Kaps und Kurven. Du siehst einen echten Küstenabschnitt, keine Landesgrenzen. Norden ist oben." : "Look for bays, headlands and curves. This is a real stretch of coast, not a country’s borders. North is up."}</p>
    </header>

    <section aria-label={de ? "Küstenabschnitt untersuchen" : "Inspect the coastline"}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground">{answered || hints >= 2 ? de ? "Vollständiger Abschnitt" : "Full stretch" : hints === 1 ? de ? "Weiterer Ausschnitt" : "Wider view" : de ? "Nahaufnahme" : "Close-up"}</p>
          <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><ArrowUp className="h-3.5 w-3.5" aria-hidden />{de ? "Norden" : "North"}</p>
        </div>
        <svg viewBox="0 0 600 420" className="block aspect-[10/7] w-full bg-primary/5" role="img" aria-label={de ? "Ein Küstenabschnitt. Das gesuchte Land wird erst nach deiner Antwort aufgelöst." : "A coastline fragment. The country is revealed only after your answer."}>
          <defs><clipPath id={clipId}><rect width="600" height="420" /></clipPath></defs>
          <g clipPath={`url(#${clipId})`}>
            <g transform={`translate(300 210) scale(${zoom}) translate(${-cropX} ${-cropY})`}>
              <path d={geometry.path} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        </svg>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>{de ? "Originalform · nicht gedreht" : "True shape · not rotated"}</span>
          {!handlers.practice && <span className="font-semibold tabular-nums text-primary">{de ? `Bis zu ${pointValue} Punkte` : `Up to ${pointValue} points`}</span>}
        </div>
      </div>

      {!answered && <div className="mt-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={revealHint} disabled={hints >= 3} className="min-w-0 whitespace-normal">
            {hints < 2 ? <Expand className="h-4 w-4 shrink-0" aria-hidden /> : <Lightbulb className="h-4 w-4 shrink-0" aria-hidden />}
            {hints === 0 ? de ? "Mehr Küste zeigen" : "Show more coast" : hints === 1 ? de ? "Ganzen Abschnitt zeigen" : "Show the full stretch" : hints === 2 ? de ? "Breitengrad-Hinweis" : "Latitude clue" : de ? "Alle Hinweise genutzt" : "All clues used"}
          </Button>
          <span className="text-xs leading-relaxed tabular-nums text-muted-foreground">{hints < 3 ? de ? "−200 Punkte je Hinweis" : "−200 points per clue" : de ? "3 von 3 Hinweisen" : "3 of 3 clues"}</span>
        </div>
        {hints > 0 && <p role="status" className={cn("mt-3 rounded-xl px-3 py-2.5 text-sm leading-relaxed", hints === 3 ? "bg-primary/10 text-foreground" : "bg-muted text-muted-foreground")}>
          {hints === 1 ? de ? "Ein größerer Ausschnitt ist sichtbar. Achte darauf, wie sich die Küstenlinie fortsetzt." : "A wider view is visible. Look at how the coastline continues." : hints === 2 ? de ? "Du siehst jetzt den gesamten ausgewählten Küstenabschnitt, nicht das ganze Land." : "You can now see the entire selected coastline stretch, not the whole country." : de ? `Der Mittelpunkt dieses Abschnitts liegt zwischen ${degreeLabel(bandSouth, locale)} und ${degreeLabel(bandNorth, locale)}.` : `The centre of this stretch lies between ${degreeLabel(bandSouth, locale)} and ${degreeLabel(bandNorth, locale)}.`}
        </p>}
      </div>}
    </section>

    <div>
      <h2 className="mb-3 text-sm font-semibold">{de ? handlers.mode === "type" ? "Deine Vermutung" : "Wähle ein Land" : handlers.mode === "type" ? "Your guess" : "Choose a country"}</h2>
      <AnswerPanel mode={handlers.mode} options={round.options.map((option) => ({ id: option.cca3, label: countryName(option, locale) }))} correctId={round.answer.cca3}
        accepted={countryAccepted(round.answer)} answered={answered} onAnswer={answer} />
    </div>

    {answered && <RoundFeedback session={session} answerLabel={country}>
      <div className="flex items-start gap-3"><FlagImage code={round.answer.flag} alt="" className="mt-0.5 max-h-10 w-12 shrink-0 rounded-sm" /><div className="min-w-0"><p className="text-sm leading-relaxed">{de ? `Dieser Abschnitt gehört zur Küste von ${country}. Die Karte darunter zeigt seine Lage.` : `This stretch belongs to the coast of ${country}. The map below shows its location.`}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{de ? `${hints} ${hints === 1 ? "Hinweis genutzt" : "Hinweise genutzt"}. Für jeden Hinweis sinkt der mögliche Gewinn um 200 Punkte.` : `${hints} ${hints === 1 ? "clue used" : "clues used"}. Each clue reduces the possible reward by 200 points.`}</p></div></div>
    </RoundFeedback>}
    {answered && <section aria-label={de ? "Lage des Küstenabschnitts" : "The coastline’s location"}>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />{de ? "Hier liegt der Abschnitt" : "Here’s where it is"}</h2>
      <TravelMap cities={[{ id: `coast-${round.fragment.id}`, name: round.answer.name, cca3: round.answer.cca3, lat: geometry.center[1], lng: geometry.center[0] }]} revealed />
    </section>}
    <p className="text-xs leading-relaxed text-muted-foreground">{de ? "Küstengeometrie: Natural Earth, 1:10 Mio. Nur echte äußere Küstenabschnitte; keine Binnengrenzen. Die Daten sind vereinfacht und zeigen nicht jede kleine Bucht." : "Coastline geometry: Natural Earth, 1:10m. Real exterior coast stretches only; no internal borders. The data is simplified and does not show every small bay."} <a className="font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">{de ? "Quelle & Lizenz" : "Source & licence"}</a></p>
  </>;
}
