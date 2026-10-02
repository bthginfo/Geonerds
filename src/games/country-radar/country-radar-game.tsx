"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, Radar, Search, Target } from "lucide-react";
import { countryName } from "@/data/countries";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { newRunSeed } from "@/lib/random";
import { getFlagPolicyNote } from "@/lib/flag-policy";
import { cn, formatNumber } from "@/lib/utils";
import type { Country } from "@/lib/types";
import { RoundFeedback, VisualGameFrame, useVisualSession, type VisualPlayHandlers, type VisualSessionUI } from "@/games/flag-pie/game-kit";
import { buildRadarTargets, countrySuggestions, evaluateRadarGuess, RADAR_GUESS_LIMIT, radarDirection, type RadarWarmth } from "./generator";
import { RadarMap } from "./radar-map";

interface RadarGuess { country: Country; distanceKm: number; bearing: number | null; warmth: RadarWarmth }
const WARMTH_STYLE: Record<RadarWarmth, string> = {
  cold: "border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  cool: "border-cyan-500/35 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300",
  warm: "border-amber-500/40 bg-amber-400/15 text-amber-900 dark:text-amber-200",
  hot: "border-orange-500/40 bg-orange-500/10 text-orange-800 dark:text-orange-300",
  burning: "border-rose-500/45 bg-rose-500/10 text-rose-800 dark:text-rose-300",
};

function RadarRoundView({ answer, session, handlers }: { answer: Country; session: VisualSessionUI; handlers: VisualPlayHandlers }) {
  const { t, locale } = useT();
  const [guesses, setGuesses] = useState<RadarGuess[]>([]);
  const guessesRef = useRef<RadarGuess[]>([]);
  const closedRef = useRef(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Country | null>(null);
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const noteId = useId();
  const limit = RADAR_GUESS_LIMIT[handlers.difficulty];
  const revealed = Boolean(session.answer);
  const guessed = useMemo(() => new Set(guesses.map((guess) => guess.country.cca3)), [guesses]);
  const suggestions = useMemo(() => selected ? [] : countrySuggestions(query, guessed, locale), [query, guessed, locale, selected]);
  const highlighted = suggestions[Math.min(active, Math.max(0, suggestions.length - 1))];

  function makeGuess(country: Country) {
    if (revealed || closedRef.current || !country.latlng || !answer.latlng) return;
    if (guessesRef.current.some((guess) => guess.country.cca3 === country.cca3)) {
      setNotice(t("countryradar.alreadyGuessed"));
      return;
    }
    const result = evaluateRadarGuess(answer, country, guessesRef.current.map((guess) => guess.country.cca3), handlers.difficulty);
    if (!result) return;
    const guess = { country, distanceKm: result.distanceKm, bearing: result.bearing, warmth: result.warmth };
    const next = [...guessesRef.current, guess];
    guessesRef.current = next;
    setGuesses(next);
    setQuery("");
    setSelected(null);
    setActive(0);
    setNotice(null);
    if (result.outcome !== "continue") {
      closedRef.current = true;
      session.commit(result.correct, result.points);
    } else inputRef.current?.focus();
  }

  function selectOnMap(country: Country) {
    if (guessed.has(country.cca3)) { setNotice(t("countryradar.alreadyGuessed")); return; }
    setSelected(country);
    setQuery(countryName(country, locale));
    setNotice(null);
    inputRef.current?.focus();
  }

  return <>
    <header className="text-center">
      <p className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Radar className="h-4 w-4" aria-hidden />{t("countryradar.kicker")}</p>
      <h1 className="text-xl font-bold sm:text-2xl">{t("countryradar.prompt")}</h1>
      <p id={noteId} className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">{t("countryradar.arrowNote")}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{t("countryradar.guessesLeft", { n: Math.max(0, limit - guesses.length) })}</span>
        {handlers.difficulty === "easy" && !revealed && <span className="rounded-md border border-teal-600/25 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-200">{t("countryradar.continentClue", { continent: t(`scope.${answer.region}`) })}</span>}
      </div>
    </header>
    {!revealed && <form onSubmit={(event) => { event.preventDefault(); if (selected ?? highlighted) makeGuess((selected ?? highlighted)!); }} className="relative">
      <label className="mb-2 block text-xs font-semibold" htmlFor={`radar-search-${listId}`}>{t("countryradar.searchLabel")}</label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-4 h-5 w-5 text-muted-foreground" aria-hidden />
          <input ref={inputRef} id={`radar-search-${listId}`} role="combobox" aria-autocomplete="list" aria-expanded={suggestions.length > 0}
            aria-controls={listId} aria-describedby={noteId} aria-activedescendant={highlighted ? `${listId}-${highlighted.cca3}` : undefined}
            value={query} placeholder={t("countryradar.searchPlaceholder")} autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false}
            onChange={(event) => { setQuery(event.target.value); setSelected(null); setActive(0); setNotice(null); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => (value + 1) % Math.max(1, suggestions.length)); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => (value - 1 + suggestions.length) % Math.max(1, suggestions.length)); }
              if (event.key === "Escape") { setQuery(""); setSelected(null); }
            }}
            className="h-14 w-full rounded-xl border-2 border-border bg-card pl-10 pr-3 text-base outline-none focus:border-primary" />
        </div>
        <Button type="submit" size="lg" className="shrink-0 px-4" disabled={!selected && !highlighted}><Target className="h-4 w-4" aria-hidden /><span className="hidden min-[420px]:inline">{t("countryradar.guess")}</span><span className="sr-only min-[420px]:hidden">{t("countryradar.guess")}</span></Button>
      </div>
      {suggestions.length > 0 && <div id={listId} role="listbox" aria-label={t("countryradar.suggestions")} className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border-2 border-primary/35 bg-card shadow-xl">
        {suggestions.map((country, index) => <button key={country.cca3} id={`${listId}-${country.cca3}`} role="option" aria-selected={highlighted?.cca3 === country.cca3}
          type="button" onClick={() => makeGuess(country)} onMouseEnter={() => setActive(index)} className={cn("flex min-h-12 w-full items-center justify-between gap-3 border-b border-border/50 px-4 py-3 text-left text-sm font-semibold last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary", highlighted?.cca3 === country.cca3 ? "bg-primary/10 text-primary" : "hover:bg-muted")}>
          <span>{countryName(country, locale)}</span><span className="text-xs font-normal text-muted-foreground">{country.cca3}</span>
        </button>)}
      </div>}
      {query && !selected && suggestions.length === 0 && <p role="status" className="mt-2 text-xs text-muted-foreground">{t("countryradar.noMatches")}</p>}
      {notice && <p role="status" className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200">{notice}</p>}
    </form>}
    <section aria-label={t("countryradar.history")}>
      {guesses.length === 0 ? <div className="flex min-h-24 items-center gap-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-5 py-4"><Radar className="h-8 w-8 shrink-0 text-primary/65" aria-hidden /><p className="text-xs leading-relaxed text-muted-foreground">{t("countryradar.startHint")}</p></div>
        : <ol className="space-y-2" aria-live="polite" aria-relevant="additions">
          {guesses.map((guess, index) => {
            const correct = guess.country.cca3 === answer.cca3;
            const previous = guesses[index - 1];
            const trend = previous ? guess.distanceKm < previous.distanceKm - 1 ? "warmer" : guess.distanceKm > previous.distanceKm + 1 ? "colder" : "same" : null;
            return <li key={guess.country.cca3} className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-3", correct ? "border-emerald-600/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : WARMTH_STYLE[guess.warmth])}>
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-card/70 text-xs font-bold tabular-nums">{index + 1}</span>
              <div className="min-w-0"><p className="break-words text-sm font-bold">{countryName(guess.country, locale)}</p><p className="mt-0.5 text-[11px] tabular-nums">{formatNumber(guess.distanceKm, locale)} km · {t(correct ? "countryradar.found" : `countryradar.warmth.${guess.warmth}`)}{!correct && trend ? ` · ${t(`countryradar.${trend}`)}` : ""}</p></div>
              {correct ? <Check className="h-6 w-6" aria-label={t("countryradar.found")} /> : guess.bearing != null ? <div role="img" className="flex min-w-11 flex-col items-center gap-1" aria-label={t("countryradar.bearingLabel", { direction: t(`countryradar.direction.${radarDirection(guess.bearing)}`), n: Math.round(guess.bearing) })}>
                <ArrowUp className="h-6 w-6" style={{ transform: `rotate(${guess.bearing}deg)` }} aria-hidden /><span className="text-[10px] font-bold">{t(`citycompass.direction.${radarDirection(guess.bearing)}`)}</span>
              </div> : null}
            </li>;
          })}
        </ol>}
    </section>
    <RoundFeedback session={session} answerLabel={countryName(answer, locale)}>
      <FlagImage code={answer.flag} alt={countryName(answer, locale)} className="mx-auto w-full max-w-[160px] shadow-sm" />
      {getFlagPolicyNote(answer.flag, locale) && <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-muted-foreground">{getFlagPolicyNote(answer.flag, locale)}</p>}
      {!session.answer?.correct && <p className="mt-3 text-center text-xs text-muted-foreground">{t("countryradar.exhausted", { n: limit })}</p>}
    </RoundFeedback>
    <RadarMap guesses={guesses} answer={answer} revealed={revealed} onSelect={selectOnMap} />
    <p className="-mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">{t("countryradar.centersNote")}</p>
  </>;
}

export function CountryRadarGame(handlers: VisualPlayHandlers) {
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const targets = useMemo(() => buildRadarTargets(handlers.difficulty, handlers.roundCount, seed), [handlers.difficulty, handlers.roundCount, seed]);
  const hits = useMemo(() => targets.map((country) => country.cca3), [targets]);
  const session = useVisualSession({ ...handlers, mode: "type", total: targets.length, hits });
  const answer = targets[session.index];
  return <VisualGameFrame gameId="country-radar" session={session} handlers={handlers} wide>
    {answer && <RadarRoundView key={answer.cca3} answer={answer} session={session} handlers={handlers} />}
  </VisualGameFrame>;
}
