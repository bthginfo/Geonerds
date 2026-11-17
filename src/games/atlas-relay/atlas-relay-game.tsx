"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Circle, Search, X } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { FlagImage } from "@/components/flag-image";
import { WorldMap } from "@/components/map/world-map";
import { Button } from "@/components/ui/button";
import { COUNTRIES, countryName, getCountryByCca3, getCountryByCcn3 } from "@/data/countries";
import { RoundFeedback, VisualGameFrame, useVisualSession, type VisualSessionUI } from "@/games/flag-pie/game-kit";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";
import { newRunSeed } from "@/lib/random";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { buildRelayMission, evaluateRelay, relayPoints } from "./generator";

export function AtlasRelayGame(handlers: PlayHandlers) {
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const total = handlers.roundCount === 0 ? 25 : handlers.roundCount;
  const hits = useMemo(() => Array.from({ length: total }, () => undefined), [total]);
  const trail = useRef<string[]>([]);
  const [renderedTrail, setRenderedTrail] = useState<string[]>([]);
  const session = useVisualSession({ ...handlers, mode: "choice", timed: false, total, hits,
    onFinish: (result) => handlers.onFinish({ ...result, countryHits: [...trail.current] }) });

  return <VisualGameFrame gameId="atlas-relay" session={session} handlers={{ ...handlers, timed: false }} wide>
    <RelayLeg key={`${seed}-${session.index}`} seed={seed} handlers={handlers} session={session} visitedIds={renderedTrail}
      onAnswer={(countryId, points) => {
        if (countryId) {
          const nextTrail = [...trail.current, countryId];
          trail.current = nextTrail;
          setRenderedTrail(nextTrail);
        }
        session.commit(Boolean(countryId), points);
      }} />
  </VisualGameFrame>;
}

function RelayLeg({ seed, handlers, session, visitedIds, onAnswer }: {
  seed: string;
  handlers: PlayHandlers;
  session: VisualSessionUI;
  visitedIds: string[];
  onAnswer: (countryId: string | null, points: number) => void;
}) {
  const { locale } = useT();
  const de = locale === "de";
  const [mission] = useState(() => buildRelayMission({ difficulty: handlers.difficulty, seed, index: session.index, previousId: visitedIds.at(-1), visitedIds }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [lastCheck, setLastCheck] = useState<{ id: string; checks: boolean[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const failedRef = useRef<string[]>([]);
  const submitted = useRef(false);
  const selectedRef = useRef<string | null>(null);
  const selected = selectedId ? getCountryByCca3(selectedId) : undefined;
  const previous = getCountryByCca3(visitedIds.at(-1) ?? "");
  const found = new Set(visitedIds.flatMap((id) => { const country = getCountryByCca3(id); return country?.ccn3 ? [String(country.ccn3)] : []; }));
  const search = query.trim().toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches = useMemo(() => search ? COUNTRIES.filter((country) => [country.name.en, country.name.de, country.cca3].some((name) => name.toLocaleLowerCase(locale).normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(search))).sort((a, b) => countryName(a, locale).localeCompare(countryName(b, locale), locale)) : [], [search, locale]);

  function choose(id: string) {
    if (submitted.current) return;
    if (visitedIds.includes(id)) { setNotice(de ? "Dieses Land liegt schon auf deiner Route. Wähle ein neues." : "That country is already on your trail. Choose a new one."); return; }
    if (failedRef.current.includes(id)) { setNotice(de ? "Dieses Land wurde schon geprüft. Probiere ein anderes." : "You already checked that country. Try another one."); return; }
    selectedRef.current = id;
    setSelectedId(id);
    setQuery("");
    setLastCheck(null);
    setNotice(null);
    haptic.tap();
  }

  function check() {
    const id = selectedRef.current;
    if (!id || submitted.current || failedRef.current.includes(id) || visitedIds.includes(id)) return;
    const result = evaluateRelay(mission, id);
    setLastCheck({ id, checks: result.checks });
    if (result.valid) { submitted.current = true; onAnswer(id, relayPoints(failedRef.current.length)); return; }
    const failed = [...failedRef.current, id];
    failedRef.current = failed;
    setFailedIds(failed);
    if (failed.length >= 3) { submitted.current = true; onAnswer(null, 0); }
    else { sound.wrong(); haptic.error(); }
  }

  const checkCountry = lastCheck ? getCountryByCca3(lastCheck.id) : undefined;
  const answers = mission.answerIds.flatMap((id) => { const country = getCountryByCca3(id); return country ? [country] : []; });

  return <>
    <header>
      <h1 className="text-xl font-bold sm:text-2xl">{de ? "Finde deinen nächsten Stopp" : "Find your next stop"}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{de ? "Wähle auf der Karte oder per Suche ein Land, das alle Bedingungen erfüllt. Du hast drei Versuche." : "Pick a country on the map or search for one that meets every condition. You have three attempts."}</p>
      {handlers.roundCount === 0 && <p className="mt-2 text-xs text-muted-foreground">{de ? "Übungspaket: 25 neue Etappen, ohne Punkte." : "Practice pack: 25 fresh legs, no points."}</p>}
    </header>

    <section aria-label={de ? "Deine Route" : "Your trail"} className="min-w-0">
      <h2 className="text-sm font-semibold">{previous ? (de ? `Weiter ab ${countryName(previous, locale)}` : `Continue from ${countryName(previous, locale)}`) : (de ? "Deine Route beginnt hier" : "Your trail starts here")}</h2>
      {visitedIds.length > 0 && <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{visitedIds.map((id, index) => {
        const country = getCountryByCca3(id);
        return country && <li key={id} className="flex min-w-0 items-center gap-2"><span className="break-words">{countryName(country, locale)}</span>{index < visitedIds.length - 1 && <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />}</li>;
      })}</ol>}
    </section>

    <section className="rounded-2xl bg-card p-4" aria-label={de ? "Bedingungen für den nächsten Stopp" : "Conditions for your next stop"}>
      <ul className="space-y-3">{mission.conditions.map((condition, index) => {
        const checked = lastCheck?.checks[index];
        return <li key={condition.id} className="flex items-start gap-2.5 text-sm font-medium leading-relaxed">
          {checked === undefined ? <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> : checked ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />}
          <span>{condition.label[locale]}{checked !== undefined && <span className={cn("ml-2 text-xs font-semibold", checked ? "text-success" : "text-danger")}>{checked ? (de ? "Erfüllt" : "Matched") : (de ? "Nicht erfüllt" : "Not matched")}</span>}</span>
        </li>;
      })}</ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
        <span className="font-semibold tabular-nums">{session.answer ? (de ? "Etappe abgeschlossen" : "Leg complete") : (de ? `${Math.max(0, 3 - failedIds.length)} Versuche übrig` : `${Math.max(0, 3 - failedIds.length)} attempts left`)}</span>
        <span className="text-muted-foreground">{handlers.practice ? (de ? "Ohne Punkte" : "No points") : session.answer ? `${session.answer.earned} ${de ? "Punkte" : "points"}` : `${relayPoints(failedIds.length)} ${de ? "Punkte möglich" : "points available"}`}</span>
      </div>
      {checkCountry && !session.answer && <p role="status" className="mt-3 text-sm text-danger">{de ? `${countryName(checkCountry, locale)} passt noch nicht. Nutze die Prüfung oben und wähle ein anderes Land.` : `${countryName(checkCountry, locale)} does not fit. Use the checks above and choose another country.`}</p>}
    </section>

    <div className="relative isolate aspect-[49/25] min-h-64 min-w-0 overflow-hidden rounded-2xl border border-border bg-card" aria-label={de ? "Land auf der Karte auswählen" : "Choose a country on the map"}>
      <WorldMap onPick={(ccn3) => { const country = getCountryByCcn3(ccn3); if (country) choose(country.cca3); }} found={found}
        flagByCcn3={(ccn3) => getCountryByCcn3(ccn3)?.flag}
        getFill={(ccn3) => selected?.ccn3 && String(selected.ccn3).padStart(3, "0") === String(ccn3).padStart(3, "0") ? "fill-primary/50" : undefined} />
    </div>

    {!session.answer && <section aria-label={de ? "Land auswählen und prüfen" : "Select and check a country"}>
      <label htmlFor={`relay-search-${session.index}`} className="mb-2 block text-sm font-semibold">{de ? "Oder Land suchen" : "Or search for a country"}</label>
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" aria-hidden /><input id={`relay-search-${session.index}`} value={query} onChange={(event) => { setQuery(event.target.value); selectedRef.current = null; setSelectedId(null); setLastCheck(null); setNotice(null); }} autoComplete="off" autoCorrect="off" spellCheck={false} placeholder={de ? "Land eingeben …" : "Type a country …"} className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-card py-3 pl-10 pr-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" /></div>
      {search && <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-card" aria-label={de ? "Suchergebnisse" : "Search results"}>
        {matches.length ? matches.map((country) => <button key={country.cca3} type="button" disabled={visitedIds.includes(country.cca3) || failedIds.includes(country.cca3)} onClick={() => choose(country.cca3)} className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:text-muted-foreground disabled:opacity-55"><FlagImage code={country.flag} alt="" className="max-h-5 w-7 shrink-0" /><span className="min-w-0 flex-1 break-words">{countryName(country, locale)}</span>{(visitedIds.includes(country.cca3) || failedIds.includes(country.cca3)) && <span className="text-xs">{de ? "Schon gewählt" : "Already used"}</span>}</button>) : <p role="status" className="p-3 text-sm text-muted-foreground">{de ? "Kein Land gefunden. Versuche einen anderen Namen." : "No countries found. Try another name."}</p>}
      </div>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-semibold">{selected ? <><FlagImage code={selected.flag} alt="" className="max-h-6 w-8 shrink-0" /><span className="break-words">{countryName(selected, locale)}</span></> : <span className="text-muted-foreground">{de ? "Noch kein Land gewählt" : "No country selected"}</span>}</div>
        <Button onClick={check} disabled={!selected || failedIds.includes(selected.cca3)} className="min-h-12">{de ? "Land prüfen" : "Check country"}<Check className="h-4 w-4 shrink-0" aria-hidden /></Button>
      </div>
      {notice && <p role="status" className="mt-3 text-sm text-muted-foreground">{notice}</p>}
    </section>}

    {session.answer && <RoundFeedback session={session} answerLabel={session.answer.correct && selected ? countryName(selected, locale) : (de ? "Diese Etappe ist beendet" : "This leg is over")}>
      <p className="text-sm leading-relaxed">{session.answer.correct ? (de ? "Alle Bedingungen erfüllt. Dieses Land ist jetzt der Ausgangspunkt deiner nächsten Etappe." : "Every condition matched. This country now becomes the starting point for your next leg.") : (de ? "Drei Versuche verbraucht. Du reist vom letzten erfolgreichen Stopp weiter." : "Three attempts used. Your next leg continues from your last successful stop.")}</p>
      <details className="mt-3 border-t border-border pt-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{de ? "Passende Länder ansehen" : "See valid countries"}</summary><p className="pb-2 text-sm leading-relaxed text-muted-foreground">{answers.map((country) => countryName(country, locale)).join(" · ")}</p></details>
    </RoundFeedback>}
  </>;
}
