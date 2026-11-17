"use client";

import { useMemo, useRef, useState } from "react";
import { ExternalLink, Globe2, Lightbulb, MapPin } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { countryName, getCountryByCca3 } from "@/data/countries";
import { AnswerPanel, RoundFeedback, VisualGameFrame, useVisualSession, type VisualSessionUI } from "@/games/flag-pie/game-kit";
import { TravelMap } from "@/games/new-world/travel-map";
import { useT } from "@/i18n/I18nProvider";
import { newRunSeed } from "@/lib/random";
import { ClimateChart } from "./climate-chart";
import { buildClimateRounds, climateInsights, climatePoints, CLIMATE_META, type ClimateRound } from "./generator";

type ClimateHint = "hemisphere" | "latitude";

export function ClimatePassportGame(handlers: PlayHandlers) {
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const rounds = useMemo(() => buildClimateRounds(handlers.difficulty, handlers.roundCount, seed), [handlers.difficulty, handlers.roundCount, seed]);
  const hits = useMemo(() => rounds.map((round) => round.answer.cca3), [rounds]);
  const session = useVisualSession({ ...handlers, mode: "choice", timed: false, total: rounds.length, hits });
  const round = rounds[session.index];

  return <VisualGameFrame gameId="climate-passport" session={session} handlers={{ ...handlers, timed: false }} wide>
    {round && <ClimatePassportRound key={round.id} round={round} session={session} practice={handlers.practice} />}
  </VisualGameFrame>;
}

function ClimatePassportRound({ round, session, practice }: { round: ClimateRound; session: VisualSessionUI; practice: boolean }) {
  const { locale } = useT();
  const de = locale === "de";
  const [hints, setHints] = useState<ClimateHint[]>([]);
  const hintsRef = useRef<ClimateHint[]>([]);
  const submittedRef = useRef(false);
  const answer = round.answer;
  const country = getCountryByCca3(answer.cca3);
  const answered = Boolean(session.answer);
  const insights = climateInsights(answer, locale);
  const latitudeLow = Math.floor(Math.abs(answer.lat) / 20) * 20;
  const latitudeHigh = Math.min(90, latitudeLow + 20);
  const hemisphere = answer.lat === 0 ? de ? "Am Äquator" : "On the equator" : answer.lat > 0 ? de ? "Nordhalbkugel" : "Northern Hemisphere" : de ? "Südhalbkugel" : "Southern Hemisphere";
  const band = de ? `${latitudeLow}–${latitudeHigh}° vom Äquator entfernt` : `${latitudeLow}–${latitudeHigh}° from the equator`;

  function revealHint(hint: ClimateHint) {
    if (submittedRef.current || hintsRef.current.includes(hint)) return;
    const next = [...hintsRef.current, hint];
    hintsRef.current = next;
    setHints(next);
  }

  function submit(correct: boolean) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    session.commit(correct, climatePoints(hintsRef.current.length));
  }

  return <>
    <header>
      <h1 className="text-xl font-bold sm:text-2xl">{de ? "Welcher Ort hat dieses Klima?" : "Where does this climate belong?"}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{de ? "Vergleiche warme und kalte Monate sowie trockene und niederschlagsreiche Zeiten. Wähle dann den passenden Ort." : "Compare warm and cold months, dry periods and wetter seasons. Then choose the matching place."}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">NASA POWER · {CLIMATE_META.periodStart}–{CLIMATE_META.periodEnd} · {de ? "Langjährige Mittelwerte, kein aktuelles Wetter" : "Long-term averages, not current weather"}</p>
    </header>

    <ClimateChart temperatureC={answer.temperatureC} precipitationMm={answer.precipitationMm} locale={locale} />

    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-bold">{de ? "Deine Antwort" : "Your answer"}</h2>
        {!answered && <p className="text-xs font-semibold tabular-nums text-muted-foreground">{practice ? de ? "Training · ohne Punkte" : "Practice · no points" : de ? `${climatePoints(hints.length)} Punkte möglich` : `${climatePoints(hints.length)} points available`}</p>}
      </div>
      <AnswerPanel mode="choice" options={round.options.map((option) => ({ id: option.id, label: option.name[locale] }))} correctId={answer.id}
        accepted={[answer.name[locale]]} answered={answered} onAnswer={submit} />
      {!answered && <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Lightbulb className="h-4 w-4" aria-hidden />{de ? "Brauchst du einen Hinweis?" : "Need a clue?"}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {hints.includes("hemisphere") ? <p className="flex min-h-11 items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold"><Globe2 className="h-4 w-4 shrink-0" aria-hidden />{hemisphere}</p> : <Button type="button" variant="outline" className="justify-start whitespace-normal text-left" onClick={() => revealHint("hemisphere")}>
            <Globe2 className="h-4 w-4 shrink-0" aria-hidden />{de ? "Halbkugel zeigen" : "Reveal hemisphere"}{!practice && " · −200"}
          </Button>}
          {hints.includes("latitude") ? <p className="flex min-h-11 items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-semibold"><MapPin className="h-4 w-4 shrink-0" aria-hidden />{band}</p> : <Button type="button" variant="outline" className="justify-start whitespace-normal text-left" onClick={() => revealHint("latitude")}>
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />{de ? "Breitengrad-Zone zeigen" : "Reveal latitude band"}{!practice && " · −200"}
          </Button>}
        </div>
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{hints.map((hint) => hint === "hemisphere" ? hemisphere : band).join(". ")}</div>
      </div>}
    </div>

    <RoundFeedback session={session} answerLabel={`${answer.name[locale]}${country ? ` · ${countryName(country, locale)}` : ""}`}>
      <div className="flex items-start gap-3">
        {country && <FlagImage code={country.flag} className="mt-0.5 w-11 shrink-0" />}
        <div className="min-w-0">
          <h2 className="text-sm font-bold">{de ? "Das verrät das Klimadiagramm" : "What the climate reveals"}</h2>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed">{insights.map((insight) => <li key={insight} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current" aria-hidden /><span>{insight}</span></li>)}</ul>
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-xl"><TravelMap cities={[answer]} revealed /></div>
      <details className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{de ? "Datenquelle und Einordnung" : "Data source and context"}</summary>
        <p className="mt-1 leading-relaxed">{de ? `NASA Langley POWER / NASA Earth Science Division · MERRA-2 · Klimamittel ${CLIMATE_META.periodStart}–${CLIMATE_META.periodEnd}. Rasterbasierte Modelldaten, keine Messung einer einzelnen Wetterstation. Der gesamte Niederschlag einschließlich Schnee wird als mittlere Monatssumme in Wasseräquivalent dargestellt.` : `NASA Langley POWER / NASA Earth Science Division · MERRA-2 · Climate averages ${CLIMATE_META.periodStart}–${CLIMATE_META.periodEnd}. Gridded model data, not observations from a single weather station. Total precipitation, including snow, is shown as average monthly water-equivalent totals.`}</p>
        <p className="mt-2 leading-relaxed">{de ? `Climatology API ${CLIMATE_META.apiVersion} · Datenabruf ${CLIMATE_META.retrievedAt}` : `Climatology API ${CLIMATE_META.apiVersion} · Retrieved ${CLIMATE_META.retrievedAt}`}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {[{ href: answer.sourceUrl, label: de ? "Originaldaten dieses Orts" : "Original data for this place" }, { href: CLIMATE_META.methodologyUrl, label: de ? "Methodik" : "Methodology" }, { href: CLIMATE_META.attributionUrl, label: de ? "NASA-Quellenangabe" : "NASA attribution" }].map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{link.label}<ExternalLink className="h-3 w-3" aria-hidden /></a>)}
        </div>
      </details>
    </RoundFeedback>
  </>;
}
