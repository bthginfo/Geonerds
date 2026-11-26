"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowRight, Check, Clock, Gem, Info, Loader2, Lock, Search, Sparkles, WifiOff, X } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ScorePill, StreakPill } from "@/components/game/hud";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { countryName, getCountryByCca3 } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import type { Country, Locale } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { dailyPuzzleNumber, dailyStreak, isDailyVariant, puzzleSeed, readDailyRecord, utcDateKey, writeDailyRecord } from "@/games/puzzle-kit";
import { PuzzleWrapUp } from "@/games/puzzle-wrapup";
import { fetchRareDistribution, postRareAnswer } from "./api";
import { rareSuggestions, resolveTyped } from "./answer-input";
import { PROMPTS_PER_BOARD, commonExamples, generateRareBoard, getRarePrompt, isAcceptedAnswer, rareExamples, type RarePrompt } from "./generator";
import { MAX_PROMPT_POINTS, buildShareText, longestValidRun, rarityEmoji, scoreAnswer, type RaritySource } from "./scoring";
import { RARE_DIFFICULTY, RARE_GAME_ID, dailySeedForDay, type RareDistribution } from "./validate";

interface PromptResult {
  promptId: string;
  /** cca3 of the chosen country; null when the text matched no country. */
  answer: string | null;
  typed: string;
  valid: boolean;
  borderline: boolean;
  points: number;
  source: RaritySource;
  share: number | null;
  /** Today's answers for this prompt (daily runs only). */
  distribution: RareDistribution | null;
}

interface Notice {
  tone: "warning" | "muted";
  text: string;
  suggestion?: Country;
}

interface Summary {
  score: number;
  correct: number;
  bestStreak: number;
  share: string;
  streak: number;
}

type Bucket = "diamond" | "purple" | "blue" | "plain" | "miss";

function bucketOf(points: number, valid: boolean): Bucket {
  if (!valid) return "miss";
  if (points >= 90) return "diamond";
  if (points >= 70) return "purple";
  if (points >= 40) return "blue";
  return "plain";
}

/** Rarity colours with dark variants; every text colour keeps ≥ 4.5:1 on its surface. */
const BUCKET_STYLE: Record<Bucket, string> = {
  diamond: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-950 dark:border-fuchsia-300/40 dark:bg-fuchsia-400/20 dark:text-fuchsia-50",
  purple: "border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-300/40 dark:bg-violet-400/20 dark:text-violet-50",
  blue: "border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-300/40 dark:bg-sky-400/20 dark:text-sky-50",
  plain: "border-border bg-muted text-foreground",
  miss: "border-danger/40 bg-danger/10 text-danger",
};

function formatShare(share: number, locale: Locale): string {
  const format = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  if (share > 0 && share < 0.01) return `<${format.format(0.01)}`;
  return format.format(share);
}

function nameOf(cca3: string, locale: Locale): string {
  const country = getCountryByCca3(cca3);
  return country ? countryName(country, locale) : cca3;
}

function CountryChip({ cca3, rare }: { cca3: string; rare?: boolean }) {
  const { t, locale } = useT();
  const country = getCountryByCca3(cca3);
  if (!country) return null;
  return (
    <li className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-sm font-medium">
      <FlagImage code={country.flag} rounded={false} className="h-3.5 w-auto shrink-0 rounded-[2px]" />
      <span lang={locale} className="min-w-0 break-words">{countryName(country, locale)}</span>
      {rare && country.difficulty >= 3 && (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-violet-800 dark:text-violet-200">
          <Gem className="h-3 w-3" aria-hidden />
          {t("rarefinds.rareTag")}
        </span>
      )}
    </li>
  );
}

function ProgressSteps({ results, index, done, practice }: { results: PromptResult[]; index: number; done: boolean; practice: boolean }) {
  const { t } = useT();
  return (
    <ol aria-label={t("rarefinds.progress")} className="mx-auto flex w-full max-w-sm items-center gap-1.5">
      {Array.from({ length: PROMPTS_PER_BOARD }, (_, step) => {
        const result = results[step];
        const current = !result && step === index && !done;
        const n = step + 1;
        const label = result
          ? result.valid ? (practice ? t("rarefinds.stepValid", { n }) : t("rarefinds.stepScored", { n, points: result.points })) : t("rarefinds.stepMiss", { n })
          : current ? t("rarefinds.stepCurrent", { n }) : t("rarefinds.stepUpcoming", { n });
        return (
          <li
            key={step}
            aria-label={label}
            aria-current={current ? "step" : undefined}
            className={cn(
              "flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border text-xs font-bold tabular-nums transition-colors",
              result ? BUCKET_STYLE[bucketOf(result.points, result.valid)] : current ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30" : "border-border bg-card text-muted-foreground",
            )}
          >
            {result ? (
              result.valid ? (practice ? <Check className="h-4 w-4" aria-hidden /> : <span aria-hidden>{result.points}</span>) : <X className="h-4 w-4" aria-hidden />
            ) : (
              <span aria-hidden>{n}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function TopAnswers({ distribution, answer }: { distribution: RareDistribution; answer: string | null }) {
  const { t, locale } = useT();
  const reducedMotion = useReducedMotion();
  const headingId = useId();
  const total = Math.max(1, distribution.total);
  const max = Math.max(1, ...distribution.top.map((row) => row.count));
  const rows = [...distribution.top];
  const ownMissing = answer && !rows.some((row) => row.answer === answer) && distribution.count > 0;
  if (ownMissing) rows.push({ answer: answer!, count: distribution.count });
  return (
    <section aria-labelledby={headingId} className="mt-4">
      <h3 id={headingId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("rarefinds.topAnswers")}</h3>
      <ol className="mt-2 space-y-1.5">
        {rows.map((row, position) => {
          const mine = row.answer === answer;
          const country = getCountryByCca3(row.answer);
          return (
            <li key={row.answer} className={cn("grid grid-cols-[minmax(0,1fr)_3.25rem] items-center gap-2", ownMissing && position === rows.length - 1 && "border-t border-dashed border-border pt-1.5")}>
              <div className="relative min-h-9 overflow-hidden rounded-lg bg-muted">
                <motion.div
                  aria-hidden
                  className={cn("absolute inset-y-0 left-0 rounded-lg", mine ? "bg-primary/30" : "bg-foreground/10")}
                  initial={reducedMotion ? false : { width: 0 }}
                  animate={{ width: `${Math.max(6, (row.count / max) * 100)}%` }}
                  transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.05 * position, ease: [0.22, 1, 0.36, 1] }}
                />
                <div className="relative flex min-h-9 items-center gap-2 px-2.5 py-1 text-sm font-semibold">
                  {country && <FlagImage code={country.flag} rounded={false} className="h-3.5 w-auto shrink-0 rounded-[2px]" />}
                  <span lang={locale} className="min-w-0 break-words">{nameOf(row.answer, locale)}</span>
                  {mine && <span className="shrink-0 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold uppercase text-primary-foreground">{t("rarefinds.you")}</span>}
                </div>
              </div>
              <span className="text-right text-xs font-semibold tabular-nums text-muted-foreground">{formatShare(row.count / total, locale)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function RarityLine({ result, country, practice }: { result: PromptResult; country: Country; practice: boolean }) {
  const { t, locale } = useT();
  const name = countryName(country, locale);
  const tier = t(`rarefinds.tier.${country.difficulty}`);
  const distribution = result.distribution;
  if (result.source === "live" && result.share !== null && distribution) {
    const pct = formatShare(result.share, locale);
    return (
      <div className="mt-3">
        <p className="flex items-start gap-2 text-base font-bold leading-snug">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-700 dark:text-violet-300" aria-hidden />
          <span lang={locale}>{result.share <= 0.15 ? t("rarefinds.onlyShare", { pct, name }) : t("rarefinds.shareLine", { pct, name })}</span>
        </p>
        <p className="mt-0.5 pl-6 text-xs text-muted-foreground">{t("rarefinds.answersToday", { count: formatNumber(distribution.count, locale), total: formatNumber(distribution.total, locale) })}</p>
      </div>
    );
  }
  if (result.source === "early" && distribution) {
    return (
      <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
        <p className="flex items-start gap-2 font-semibold text-amber-900 dark:text-amber-100"><Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{t("rarefinds.early")}</p>
        <p className="mt-1 pl-6 text-xs leading-relaxed text-muted-foreground" lang={locale}>{t("rarefinds.earlyDetail", { count: formatNumber(distribution.count, locale), total: formatNumber(distribution.total, locale), name })}</p>
        <p className="mt-1 pl-6 text-xs font-semibold text-amber-900 dark:text-amber-100">{t("rarefinds.estimateTier", { tier })}</p>
      </div>
    );
  }
  if (result.source === "offline") {
    return (
      <div className="mt-3">
        <p className="flex items-start gap-2 text-base font-bold"><Gem className="mt-0.5 h-4 w-4 shrink-0 text-violet-700 dark:text-violet-300" aria-hidden />{t("rarefinds.estimated")}: {tier}</p>
        <p className="mt-1 flex items-start gap-2 rounded-lg bg-muted px-2.5 py-2 text-xs leading-relaxed text-muted-foreground"><WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{t("rarefinds.offline")}</p>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <p className="flex items-start gap-2 text-base font-bold"><Gem className="mt-0.5 h-4 w-4 shrink-0 text-violet-700 dark:text-violet-300" aria-hidden />{t("rarefinds.estimated")}: {tier}</p>
      <p className="mt-0.5 pl-6 text-xs text-muted-foreground" lang={locale}>{t("rarefinds.estimatedDetail", { name })}{practice ? "" : ` · ${t("rarefinds.pointsGained", { n: result.points })} ${t("rarefinds.pointsLabel")}`}</p>
    </div>
  );
}

function FactLine({ prompt, country }: { prompt: RarePrompt; country: Country }) {
  const { t, locale } = useT();
  if (!prompt.fact) return null;
  const name = countryName(country, locale);
  const text = prompt.fact === "population"
    ? t("rarefinds.factPopulation", { name, value: formatNumber(country.population, locale) })
    : t("rarefinds.factArea", { name, value: formatNumber(country.area, locale) });
  return <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /><span lang={locale}>{text}</span></p>;
}

export function RareFindsGame(handlers: PlayHandlers) {
  const { t, locale } = useT();
  const reducedMotion = useReducedMotion();
  const { practice } = handlers;
  const daily = isDailyVariant(handlers.variant) && !handlers.challenge;
  /** Only ranked daily runs talk to the server; everything else uses the estimate. */
  const live = daily && !practice;

  const [startedAt] = useState(() => Date.now());
  const [day] = useState(() => utcDateKey(new Date(startedAt)));
  const [seed] = useState(() => daily
    ? dailySeedForDay(day)
    : puzzleSeed(RARE_GAME_ID, { variant: handlers.variant, difficulty: RARE_DIFFICULTY, seed: handlers.seed, challenge: handlers.challenge }));
  const [puzzleNumber] = useState(() => dailyPuzzleNumber(new Date(startedAt)));
  const [priorDaily] = useState(() => (live ? readDailyRecord(RARE_GAME_ID, RARE_DIFFICULTY) : null));
  const prompts = useMemo(() => generateRareBoard(seed).promptIds.map((id) => getRarePrompt(id)!), [seed]);

  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<PromptResult[]>([]);
  const [phase, setPhase] = useState<"answer" | "checking" | "reveal" | "done">("answer");
  const [pending, setPending] = useState<{ country: Country | null; typed: string } | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [retryUsed, setRetryUsed] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  const finished = useRef(false);
  const reported = useRef(false);
  const listId = useId();
  const hintId = useId();
  const promptHeadingId = useId();

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const prompt = prompts[index];
  const promptLabel = t(prompt.labelKey);
  const used = useMemo(() => new Set(results.map((result) => result.answer).filter((code): code is string => Boolean(code))), [results]);
  const suggestions = useMemo(() => (phase === "answer" ? rareSuggestions(query, used, locale) : []), [phase, query, used, locale]);
  const highlighted = suggestions.length ? suggestions[Math.min(active, suggestions.length - 1)] : undefined;
  const result = results[index] as PromptResult | undefined;
  const liveScore = practice ? 0 : results.reduce((sum, entry) => sum + entry.points, 0);
  let currentStreak = 0;
  for (let position = results.length - 1; position >= 0 && results[position].valid; position--) currentStreak++;

  // Keyboard focus follows the task: the input while answering, Next after a reveal.
  useEffect(() => {
    if (phase === "answer") {
      if (index === 0 && !window.matchMedia?.("(pointer: fine)").matches) return;
      inputRef.current?.focus({ preventScroll: index === 0 });
    } else if (phase === "reveal") {
      nextRef.current?.focus({ preventScroll: true });
      nextRef.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    }
  }, [phase, index, reducedMotion]);

  function resetInput() {
    setQuery("");
    setActive(0);
    setNotice(null);
    setRetryUsed(false);
  }

  async function commit(country: Country | null, typed: string) {
    if (busy.current || phase !== "answer") return;
    if (country && used.has(country.cca3)) {
      setNotice({ tone: "warning", text: t("rarefinds.alreadyUsed", { name: countryName(country, locale) }) });
      return;
    }
    busy.current = true;
    const promptIndex = index;
    const valid = Boolean(country && isAcceptedAnswer(prompt, country.cca3));
    let distribution: RareDistribution | null = null;
    if (live) {
      setPending({ country, typed });
      setPhase("checking");
      const lookup = valid && country
        ? await postRareAnswer({ day, promptIndex, promptId: prompt.id, answer: country.cca3 })
        : await fetchRareDistribution(day, promptIndex);
      if (!alive.current) return;
      if (lookup.kind === "live") distribution = lookup.distribution;
    }
    const scored = scoreAnswer({ valid, tier: country?.difficulty ?? 1, live, distribution: valid ? distribution : null });
    const entry: PromptResult = {
      promptId: prompt.id,
      answer: country?.cca3 ?? null,
      typed,
      valid,
      borderline: Boolean(country && valid && prompt.borderline.has(country.cca3)),
      points: scored.points,
      source: scored.source,
      share: scored.share,
      distribution,
    };
    setResults((current) => [...current, entry]);
    setPending(null);
    setPhase("reveal");
    resetInput();
    busy.current = false;
    const name = country ? countryName(country, locale) : typed;
    if (valid) {
      sound.correct();
      haptic.success();
      setAnnouncement(`${t("rarefinds.fits")}: ${name}.${practice ? "" : ` ${t("rarefinds.pointsGained", { n: entry.points })} ${t("rarefinds.pointsLabel")}.`}`);
    } else {
      sound.wrong();
      haptic.error();
      setAnnouncement(`${t("rarefinds.noFit")}: ${name}.`);
    }
  }

  function retryOrMiss(text: string, near?: Country) {
    if (!retryUsed) {
      setRetryUsed(true);
      setNotice(near
        ? { tone: "warning", text: t("rarefinds.didYouMean", { name: countryName(near, locale) }), suggestion: near }
        : { tone: "warning", text: t("rarefinds.unknown") });
      return;
    }
    void commit(null, text);
  }

  function submit() {
    if (phase !== "answer" || busy.current) return;
    if (highlighted) { void commit(highlighted, query.trim()); return; }
    const typed = query.trim();
    if (!typed) return;
    const resolution = resolveTyped(typed);
    if (resolution.kind === "country") { void commit(resolution.country, typed); return; }
    if (resolution.kind === "ambiguous") { setNotice({ tone: "muted", text: t("rarefinds.ambiguous") }); return; }
    if (resolution.kind === "near" && used.has(resolution.country.cca3)) {
      setNotice({ tone: "warning", text: t("rarefinds.alreadyUsed", { name: countryName(resolution.country, locale) }) });
      return;
    }
    retryOrMiss(typed, resolution.kind === "near" ? resolution.country : undefined);
  }

  function finish(all: PromptResult[]) {
    if (finished.current) return;
    finished.current = true;
    const correct = all.filter((entry) => entry.valid).length;
    const score = practice ? 0 : all.reduce((sum, entry) => sum + entry.points, 0);
    const name = t("games.rare-finds.name");
    const header = daily
      ? `GeoNerds ${name} #${puzzleNumber}`
      : `GeoNerds ${name} · ${handlers.challenge ? t("rarefinds.kickerChallenge") : t("rarefinds.shareEndless")}`;
    const share = buildShareText(header, all);
    if (live) writeDailyRecord(RARE_GAME_ID, RARE_DIFFICULTY, { solved: true, score, share, at: Date.now() });
    setSummary({ score, correct, bestStreak: longestValidRun(all.map((entry) => entry.valid)), share, streak: live ? dailyStreak(RARE_GAME_ID) : 0 });
    setPhase("done");
    sound.finish();
    if (correct >= 3) haptic.success();
  }

  function next() {
    if (phase !== "reveal") return;
    if (index + 1 < PROMPTS_PER_BOARD) {
      setIndex(index + 1);
      setPhase("answer");
      setAnnouncement("");
    } else {
      finish(results);
    }
  }

  function handleContinue() {
    if (!summary || reported.current) return;
    reported.current = true;
    handlers.onFinish({
      score: summary.score,
      correct: summary.correct,
      total: PROMPTS_PER_BOARD,
      bestStreak: Math.min(summary.bestStreak, summary.correct),
      durationMs: Math.max(500, Date.now() - startedAt),
      countryHits: results.filter((entry) => entry.valid && entry.answer).map((entry) => entry.answer!),
    });
  }

  const kicker = [
    daily ? t("rarefinds.kickerDaily", { n: puzzleNumber }) : handlers.challenge ? t("rarefinds.kickerChallenge") : t("rarefinds.kickerEndless"),
    practice ? t("rarefinds.kickerPractice") : "",
  ].filter(Boolean).join(" · ");
  const explain = practice ? t("rarefinds.explainPractice") : live ? t("rarefinds.explainLive") : t("rarefinds.explainEstimate");
  const isLast = index + 1 >= PROMPTS_PER_BOARD;
  const shownCountry = result?.answer ? getCountryByCca3(result.answer) ?? null : pending?.country ?? null;
  const shownTyped = result?.typed ?? pending?.typed ?? "";

  const wrapTitle = !summary ? "" : practice ? t("rarefinds.titlePractice") : summary.correct === PROMPTS_PER_BOARD ? t("rarefinds.titlePerfect") : t("rarefinds.titleDone", { n: summary.correct });
  const wrapDetail = !summary ? "" : [
    practice ? t("rarefinds.detailPractice", { n: summary.correct }) : t("rarefinds.detail", { points: formatNumber(summary.score, locale) }),
    summary.streak > 0 ? t("rarefinds.streak", { n: summary.streak }) : "",
  ].filter(Boolean).join(" · ");

  const cardMotion = reducedMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.rare-finds.name")} onExit={handlers.onExit}>
        {!practice && <ScorePill value={liveScore} />}
        <StreakPill value={currentStreak} />
      </GameTopBar>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-12 pt-4 sm:pt-6">
        <header className="mb-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{kicker}</p>
          <div className="mt-3">
            <ProgressSteps results={results} index={index} done={phase === "done"} practice={practice} />
          </div>
          {priorDaily && phase !== "done" && <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{t("rarefinds.dailyDone")}</p>}
        </header>

        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

        {phase !== "done" && (
          <>
            <motion.section key={`prompt-${index}`} {...cardMotion} aria-labelledby={promptHeadingId} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("rarefinds.promptOf", { n: index + 1, total: PROMPTS_PER_BOARD })}</p>
              <p className="mt-3 text-sm font-medium text-muted-foreground">{t("rarefinds.nameOne")}</p>
              <h1 id={promptHeadingId} lang={locale} className="mt-0.5 text-2xl font-extrabold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-3xl">{promptLabel}</h1>
              {index === 0 && phase === "answer" && (
                <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-violet-300/60 bg-violet-50 p-3 text-sm leading-relaxed text-violet-950 dark:border-violet-300/25 dark:bg-violet-400/10 dark:text-violet-50">
                  <Gem className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p><strong className="font-bold">{t("rarefinds.rarerBetter")}.</strong> {explain}</p>
                </div>
              )}
            </motion.section>

            {phase === "answer" && (
              <form className="relative mt-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
                <label htmlFor={`${listId}-input`} className="mb-2 block text-sm font-semibold">{t("rarefinds.inputLabel")}</label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <input
                      ref={inputRef}
                      id={`${listId}-input`}
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={suggestions.length > 0}
                      aria-controls={listId}
                      aria-activedescendant={highlighted ? `${listId}-${highlighted.cca3}` : undefined}
                      aria-describedby={hintId}
                      value={query}
                      placeholder={t("rarefinds.placeholder")}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="words"
                      spellCheck={false}
                      enterKeyHint="done"
                      onChange={(event) => { setQuery(event.target.value); setActive(0); setNotice((current) => (current?.suggestion ? current : null)); }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); setActive((value) => (Math.min(value, suggestions.length - 1) + 1) % suggestions.length); }
                        if (event.key === "ArrowUp" && suggestions.length) { event.preventDefault(); setActive((value) => (Math.min(value, suggestions.length - 1) - 1 + suggestions.length) % suggestions.length); }
                        if (event.key === "Escape") { setQuery(""); setActive(0); }
                      }}
                      className="h-14 w-full rounded-xl border-2 border-border bg-card pl-10 pr-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </div>
                  <Button type="submit" size="lg" className="shrink-0 px-4" disabled={!query.trim()}>
                    <Lock className="h-4 w-4" aria-hidden />
                    <span className="max-[379px]:sr-only">{t("rarefinds.lockIn")}</span>
                  </Button>
                </div>
                {suggestions.length > 0 && (
                  <div id={listId} role="listbox" aria-label={t("rarefinds.suggestions")} className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border-2 border-primary/35 bg-card shadow-xl">
                    {suggestions.map((country, position) => {
                      const isActive = highlighted?.cca3 === country.cca3;
                      return (
                        <div
                          key={country.cca3}
                          id={`${listId}-${country.cca3}`}
                          role="option"
                          aria-selected={isActive}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => void commit(country, query.trim())}
                          onMouseEnter={() => setActive(position)}
                          className={cn("flex min-h-12 w-full cursor-pointer items-center gap-3 border-b border-border/50 px-4 py-2.5 text-left text-sm font-semibold last:border-b-0", isActive ? "bg-primary/10 text-primary" : "hover:bg-muted")}
                        >
                          <FlagImage code={country.flag} rounded={false} className="h-4 w-auto shrink-0 rounded-[2px]" />
                          <span lang={locale} className="min-w-0 break-words">{countryName(country, locale)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p id={hintId} className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("rarefinds.inputHint")}</p>
                <div role="status" aria-live="polite" className="min-h-0">
                  {notice && (
                    <div className={cn("mt-2 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm", notice.tone === "warning" ? "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100" : "border-border bg-muted text-foreground")}>
                      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">{notice.text}</span>
                      {notice.suggestion && (
                        <Button type="button" size="sm" variant="outline" onClick={() => void commit(notice.suggestion!, query.trim())}>
                          {t("rarefinds.useSuggestion", { name: countryName(notice.suggestion, locale) })}
                        </Button>
                      )}
                    </div>
                  )}
                  {query.trim() && !suggestions.length && !notice && <p className="mt-2 text-xs text-muted-foreground">{t("rarefinds.noMatches")}</p>}
                </div>
              </form>
            )}

            {(phase === "checking" || phase === "reveal") && (
              <motion.section {...cardMotion} className="mt-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  {shownCountry ? (
                    <FlagImage code={shownCountry.flag} alt="" className="mt-0.5 h-10 w-auto max-w-[4.5rem] shrink-0" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"><X className="h-5 w-5 text-muted-foreground" aria-hidden /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p lang={locale} className="text-lg font-bold leading-snug [overflow-wrap:anywhere]">
                      {shownCountry ? countryName(shownCountry, locale) : t("rarefinds.notRecognised", { text: shownTyped })}
                    </p>
                    {phase === "checking" ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />{t("rarefinds.checking")}</p>
                    ) : result && (
                      <p className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", result.valid ? (result.borderline ? "bg-amber-500/15 text-amber-900 dark:text-amber-100" : "bg-success/15 text-success") : "bg-danger/10 text-danger")}>
                        {result.valid ? (result.borderline ? <Info className="h-3.5 w-3.5" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />) : <X className="h-3.5 w-3.5" aria-hidden />}
                        {result.valid ? (result.borderline ? t("rarefinds.borderline") : t("rarefinds.fits")) : t("rarefinds.noFit")}
                      </p>
                    )}
                  </div>
                  {result && !practice && (
                    <motion.div
                      initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 22, delay: 0.08 }}
                      className={cn("flex shrink-0 flex-col items-center rounded-2xl border px-3 py-1.5", BUCKET_STYLE[bucketOf(result.points, result.valid)])}
                    >
                      <span className="text-2xl font-black tabular-nums leading-none">{result.valid ? t("rarefinds.pointsGained", { n: result.points }) : "0"}</span>
                      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide">{t("rarefinds.pointsLabel")}</span>
                    </motion.div>
                  )}
                </div>

                {result && (
                  <>
                    {result.valid && shownCountry && <RarityLine result={result} country={shownCountry} practice={practice} />}
                    {!result.valid && (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground" lang={locale}>
                        {shownCountry ? t("rarefinds.noFitDetail", { name: countryName(shownCountry, locale), prompt: promptLabel }) : t("rarefinds.notRecognisedDetail")}
                      </p>
                    )}
                    {shownCountry && <FactLine prompt={prompt} country={shownCountry} />}
                    {result.distribution && result.distribution.total > 0 && result.distribution.top.length > 0 && (
                      <TopAnswers distribution={result.distribution} answer={result.valid ? result.answer : null} />
                    )}
                    <section className="mt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{result.valid ? t("rarefinds.rareIdeas") : t("rarefinds.validExamples")}</h3>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {!result.valid && commonExamples(prompt, used).map((code) => <CountryChip key={code} cca3={code} />)}
                        {rareExamples(prompt, used).map((code) => <CountryChip key={code} cca3={code} rare />)}
                      </ul>
                    </section>
                    <Button ref={nextRef} size="lg" className="mt-5 w-full" onClick={next}>
                      {isLast ? t("rarefinds.results") : t("rarefinds.next")}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </>
                )}
              </motion.section>
            )}
          </>
        )}

        {phase === "done" && summary && (
          <motion.div {...cardMotion} className="space-y-5">
            <section aria-labelledby={`${listId}-summary`}>
              <h1 id={`${listId}-summary`} className="text-center text-xl font-extrabold tracking-tight sm:text-2xl">{t("rarefinds.summary")}</h1>
              <ol className="mt-3 space-y-2">
                {results.map((entry, position) => {
                  const entryPrompt = getRarePrompt(entry.promptId)!;
                  const country = entry.answer ? getCountryByCca3(entry.answer) : undefined;
                  return (
                    <li key={entry.promptId} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold", BUCKET_STYLE[bucketOf(entry.points, entry.valid)])} aria-hidden>{position + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug text-muted-foreground" lang={locale}>{t(entryPrompt.labelKey)}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold" lang={locale}>
                          {country && <FlagImage code={country.flag} rounded={false} className="h-3.5 w-auto shrink-0 rounded-[2px]" />}
                          <span className={cn("min-w-0 break-words", !entry.valid && "text-muted-foreground line-through decoration-danger/70")}>{country ? countryName(country, locale) : entry.typed || t("rarefinds.noValid")}</span>
                          {entry.valid && entry.borderline && <Info className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" aria-label={t("rarefinds.borderline")} />}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span aria-hidden className="mr-1">{rarityEmoji(entry.points, entry.valid)}</span>
                        {practice ? (
                          <span className="text-sm font-bold">{entry.valid ? t("rarefinds.fits") : t("rarefinds.noFit")}</span>
                        ) : (
                          <span className="text-sm font-bold tabular-nums">{entry.valid ? entry.points : 0}<span className="sr-only"> {t("rarefinds.pointsLabel")}</span></span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {!practice && (
                <p className="mt-3 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                  {formatNumber(summary.score, locale)} / {formatNumber(PROMPTS_PER_BOARD * MAX_PROMPT_POINTS, locale)}
                </p>
              )}
            </section>
            <PuzzleWrapUp
              solved={!practice && summary.correct === PROMPTS_PER_BOARD}
              title={wrapTitle}
              detail={wrapDetail}
              share={practice ? undefined : summary.share}
              daily={live}
              onContinue={handleContinue}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
