"use client";

import { useMemo, useRef, useState } from "react";
import { Check, LockKeyhole, Target, Users, Ruler } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { countryName, poolForDifficulty } from "@/data/countries";
import { RoundFeedback, VisualGameFrame, useVisualSession, type VisualSessionUI } from "@/games/flag-pie/game-kit";
import { useT } from "@/i18n/I18nProvider";
import { getFlagPolicyNote } from "@/lib/flag-policy";
import { haptic } from "@/lib/haptics";
import { newRunSeed } from "@/lib/random";
import { cn } from "@/lib/utils";
import { BALANCE_TOLERANCE, balanceValue, buildGeoBalanceRounds, evaluateGeoBalance, type GeoBalanceAnswer, type GeoBalanceRound } from "./generator";

export function GeoBalanceGame(handlers: PlayHandlers) {
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const rounds = useMemo(() => buildGeoBalanceRounds(poolForDifficulty(handlers.difficulty), handlers.roundCount, seed), [handlers.difficulty, handlers.roundCount, seed]);
  const hits = useMemo(() => rounds.map(() => undefined), [rounds]);
  const successfulCountries = useRef<string[]>([]);
  const session = useVisualSession({ ...handlers, mode: "choice", timed: false, total: rounds.length, hits,
    onFinish: (result) => handlers.onFinish({ ...result, countryHits: successfulCountries.current }) });
  const round = rounds[session.index];
  return <VisualGameFrame gameId="geo-balance" session={session} handlers={{ ...handlers, timed: false }} wide>
    {round && <GeoBalanceHand key={round.id} round={round} handlers={handlers} session={session}
      onAnswer={(answer) => { if (answer.correct) successfulCountries.current.push(...answer.countries.map((country) => country.cca3)); session.commit(answer.correct, answer.points); }} />}
  </VisualGameFrame>;
}

function GeoBalanceHand({ round, handlers, session, onAnswer }: { round: GeoBalanceRound; handlers: PlayHandlers; session: VisualSessionUI; onAnswer: (answer: GeoBalanceAnswer) => void }) {
  const { t, locale } = useT();
  const [selected, setSelected] = useState<string[]>([]);
  const selectedRef = useRef<string[]>([]);
  const submittedRef = useRef(false);
  const [answer, setAnswer] = useState<GeoBalanceAnswer | null>(null);
  const [selectionFull, setSelectionFull] = useState(false);
  const tolerance = BALANCE_TOLERANCE[handlers.difficulty] * 100;
  const unit = t(`geobalance.${round.metric}Unit`);
  const format = (value: number, compact = false) => new Intl.NumberFormat(locale, compact ? { notation: "compact", maximumSignificantDigits: 3 } : { maximumFractionDigits: value < 10 ? 2 : 0 }).format(value);
  const percent = (value: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(value);
  const comparisonMax = Math.max(round.target, answer?.total ?? round.target);
  const flagPolicyNote = answer ? round.hand.map((country) => getFlagPolicyNote(country.flag, locale)).find(Boolean) : null;

  function choose(id: string) {
    if (submittedRef.current) return;
    const current = selectedRef.current;
    if (!current.includes(id) && current.length === 3) {
      setSelectionFull(true);
      haptic.error();
      return;
    }
    const next = current.includes(id) ? current.filter((country) => country !== id) : [...current, id];
    selectedRef.current = next;
    setSelected(next);
    setSelectionFull(false);
    haptic.tap();
  }

  function submit() {
    if (submittedRef.current) return;
    const result = evaluateGeoBalance(round, selectedRef.current, handlers.difficulty);
    if (!result) return;
    submittedRef.current = true;
    setAnswer(result);
    onAnswer(result);
    if (result.correct) haptic.success();
    else haptic.error();
  }

  return <>
    <header>
      <h1 className="text-xl font-bold sm:text-2xl">{t("geobalance.objective")}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("geobalance.instruction")}</p>
    </header>
    <section className="rounded-2xl border border-primary/35 bg-primary/5 px-4 py-4 sm:px-5" aria-label={t("geobalance.target")}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-primary">{round.metric === "population" ? <Users className="h-4 w-4 shrink-0" aria-hidden /> : <Ruler className="h-4 w-4 shrink-0" aria-hidden />}{t(`geobalance.${round.metric}`)}</p>
        <Target className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="min-w-0 break-words text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">{format(round.target)}</span><span className="text-sm font-medium text-muted-foreground">{unit}</span></p>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{t("geobalance.tolerance", { n: tolerance })}</p>
    </section>
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold tabular-nums" aria-live="polite">{t("geobalance.selected", { n: selected.length })}</p>
        {!answer && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden />{t("geobalance.hidden")}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {round.hand.map((country) => {
          const selectedIndex = selected.indexOf(country.cca3);
          const chosen = selectedIndex >= 0;
          return <button key={country.cca3} aria-pressed={chosen} disabled={Boolean(answer)}
            aria-label={chosen ? t("geobalance.selectedCountry", { country: countryName(country, locale), n: selectedIndex + 1 }) : t("geobalance.selectCountry", { country: countryName(country, locale) })}
            onClick={() => choose(country.cca3)} className={cn("relative flex min-h-[106px] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border-2 px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
              chosen ? "border-primary bg-primary/10" : "border-border bg-card", !answer && "hover:border-primary/65 active:bg-primary/5")}>
            <FlagImage code={country.flag} alt="" className="w-11 max-h-9" />
            <span className="w-full break-words text-xs font-bold leading-snug sm:text-sm">{countryName(country, locale)}</span>
            {chosen && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground" aria-hidden>{answer ? <Check className="h-3.5 w-3.5" /> : selectedIndex + 1}</span>}
            {answer && <span className="w-full break-words text-xs font-semibold tabular-nums text-muted-foreground">{format(balanceValue(country, round.metric), true)} {unit}</span>}
          </button>;
        })}
      </div>
      {selectionFull && !answer && <p role="status" className="mt-3 text-sm font-semibold text-amber-900 dark:text-amber-200">{t("geobalance.full")}</p>}
      {!answer && <Button onClick={submit} disabled={selected.length !== 3} className="mt-4 h-auto min-h-12 w-full whitespace-normal px-4 py-3"><LockKeyhole className="h-4 w-4 shrink-0" aria-hidden />{t("geobalance.submit")}</Button>}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t(answer ? "geobalance.revealed" : "geobalance.reward")}</p>
    </div>
    {answer && <RoundFeedback session={session} answerLabel={t("geobalance.deviation", { n: percent(answer.error) })}>
      <div role="img" aria-label={t("geobalance.comparison", { target: `${format(round.target)} ${unit}`, total: `${format(answer.total)} ${unit}` })} className="space-y-3">
        {[{ label: t("geobalance.target"), value: round.target, target: true }, { label: t("geobalance.yourTotal"), value: answer.total, target: false }].map((bar) => <div key={bar.label}>
          <div className="mb-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs"><span className="font-semibold">{bar.label}</span><span className="font-bold tabular-nums">{format(bar.value)} {unit}</span></div>
          <div className="h-3 overflow-hidden rounded bg-foreground/10"><div aria-hidden className={cn("h-full rounded", bar.target ? "bg-primary" : answer.correct ? "bg-emerald-600 dark:bg-emerald-400" : "bg-rose-600 dark:bg-rose-400")} style={{ width: `${100 * bar.value / comparisonMax}%` }} /></div>
        </div>)}
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <h2 className="text-sm font-bold">{t("geobalance.best")}</h2>
        <p className="mt-2 break-words text-sm leading-relaxed">{round.best.countries.map((country) => countryName(country, locale)).join(" + ")}</p>
        <p className="mt-1 text-xs font-semibold tabular-nums text-muted-foreground">{format(round.best.total)} {unit} · {t("geobalance.bestDeviation", { n: percent(round.best.error) })}</p>
      </div>
      {flagPolicyNote && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{flagPolicyNote}</p>}
    </RoundFeedback>}
    <p className="text-xs leading-relaxed text-muted-foreground">{t("geobalance.estimate")}</p>
  </>;
}
