"use client";

import { useMemo, useState } from "react";
import { Compass, Navigation } from "lucide-react";
import { countryName, getCountryByCca3 } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { newRunSeed } from "@/lib/random";
import { AnswerPanel, RoundFeedback, VisualGameFrame, useVisualSession, type VisualPlayHandlers } from "@/games/flag-pie/game-kit";
import { cityLabel } from "./cities";
import { buildCityCompassRounds, COMPASS_DIRECTIONS, type CompassDirection } from "./generator";
import { CityRevealMap } from "./reveal-map";

const POSITIONS: Record<CompassDirection, string> = {
  N: "col-start-2 row-start-1", NE: "col-start-3 row-start-1", E: "col-start-3 row-start-2",
  SE: "col-start-3 row-start-3", S: "col-start-2 row-start-3", SW: "col-start-1 row-start-3",
  W: "col-start-1 row-start-2", NW: "col-start-1 row-start-1",
};

export function CityCompassGame(handlers: VisualPlayHandlers) {
  const { t, locale } = useT();
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const rounds = useMemo(() => buildCityCompassRounds(handlers.difficulty, handlers.roundCount, seed, handlers.mode), [handlers.difficulty, handlers.roundCount, handlers.mode, seed]);
  const hits = useMemo(() => rounds.map((round) => round.answer.cca3), [rounds]);
  const session = useVisualSession({ ...handlers, total: rounds.length, hits, timeLimitMs: 35000 });
  const round = rounds[session.index];
  const country = round && getCountryByCca3(round.answer.cca3);

  return <VisualGameFrame gameId="city-compass" session={session} handlers={handlers}>
    {round && <>
      <header className="text-center">
        <p className="mb-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Compass className="h-4 w-4" aria-hidden />{t("citycompass.kicker")}</p>
        <h1 className="text-xl font-bold sm:text-2xl">{t("citycompass.prompt")}</h1>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{t("citycompass.example")}</p>
      </header>
      <div className="relative mx-auto grid aspect-square w-full max-w-[380px] grid-cols-3 grid-rows-3 gap-1 rounded-3xl border border-border bg-card/90 p-3 shadow-sm">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 300 300" aria-hidden>
          <circle cx="150" cy="150" r="98" className="fill-none stroke-primary/20" strokeWidth="1" />
          <circle cx="150" cy="150" r="63" className="fill-none stroke-primary/10" strokeWidth="1" strokeDasharray="3 5" />
          {COMPASS_DIRECTIONS.map((direction, index) => {
            const angle = index * Math.PI / 4;
            return <line key={direction} x1={150 + Math.sin(angle) * 33} y1={150 - Math.cos(angle) * 33} x2={150 + Math.sin(angle) * 103} y2={150 - Math.cos(angle) * 103} className="stroke-primary/20" strokeWidth="1" />;
          })}
        </svg>
        {COMPASS_DIRECTIONS.map((direction) => {
          const reference = round.references.find((item) => item.direction === direction);
          return <div key={direction} className={`relative z-10 flex min-w-0 items-center justify-center ${POSITIONS[direction]}`}>
            {reference ? <div className="w-full rounded-xl border border-primary/20 bg-card px-1.5 py-3 text-center shadow-sm" aria-label={t("citycompass.reference", { city: cityLabel(reference.city, locale), direction: t(`citycompass.direction.${direction}`) })}>
              <span className="mb-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-primary">{t(`citycompass.direction.${direction}`)}</span>
              <p className="break-words text-[11px] font-semibold leading-snug min-[380px]:text-xs">{cityLabel(reference.city, locale)}</p>
            </div> : <span className="text-[10px] font-bold text-muted-foreground/75">{t(`citycompass.direction.${direction}`)}</span>}
          </div>;
        })}
        <div className="relative z-10 col-start-2 row-start-2 flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-2xl font-bold text-primary">{session.answer ? <Navigation className="h-6 w-6" aria-hidden /> : "?"}</div>
          <p className="mt-2 max-w-full text-[10px] font-semibold uppercase tracking-wide text-primary">{t("citycompass.hidden")}</p>
        </div>
      </div>
      <p className="-mt-2 text-center text-[11px] text-muted-foreground">{t("citycompass.scaleNote")}</p>
      {handlers.mode === "type" && <div className="rounded-xl border border-border bg-card/70 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("citycompass.candidates")}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">{round.options.map((city) => <span key={city.id}>{cityLabel(city, locale)}</span>)}</div>
      </div>}
      <AnswerPanel key={round.answer.id} mode={handlers.mode} options={round.options.map((city) => ({ id: city.id, label: cityLabel(city, locale) }))}
        correctId={round.answer.id} accepted={[round.answer.name.en, round.answer.name.de, round.answer.name.en.replace(/,?\s*D\.?C\.?$/, "")]} answered={Boolean(session.answer)} onAnswer={session.commit} placeholderKey="citycompass.typePlaceholder" />
      <RoundFeedback session={session} answerLabel={`${cityLabel(round.answer, locale)}${country ? ` · ${countryName(country, locale)}` : ""}`}>
        <CityRevealMap lat={round.answer.lat} lng={round.answer.lng} label={cityLabel(round.answer, locale)} />
      </RoundFeedback>
    </>}
  </VisualGameFrame>;
}
