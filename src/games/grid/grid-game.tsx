"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Dices, Search, Sparkles } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, LivesPill, ProgressBar, ScorePill } from "@/components/game/hud";
import { FlagImage } from "@/components/flag-image";
import { Modal } from "@/components/ui/modal";
import { COUNTRIES, countryName, getCountryByCca3 } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import type { GridConstraint } from "./generator";
import { generateGrid, validateGridEntry } from "./generator";

const MAX_LIVES = { easy: 4, medium: 3, hard: 2 } as const;

function initialSeed(): number {
  if (typeof window === "undefined") return 0;
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (raw && /^\d+$/.test(raw)) return Number(raw) >>> 0;
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const url = new URL(window.location.href); url.searchParams.set("seed", String(seed));
  window.history.replaceState(null, "", url);
  return seed;
}

export function GridGame({ difficulty, practice, onFinish, onExit }: PlayHandlers) {
  const { t } = useT();
  const [seed, setSeed] = useState(initialSeed);
  const puzzle = useMemo(() => generateGrid(COUNTRIES, difficulty, seed), [difficulty, seed]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [attempted, setAttempted] = useState<Set<number>>(new Set());
  const [lives, setLives] = useState<number>(MAX_LIVES[difficulty]);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [locked, setLocked] = useState(false);
  const startedAt = useRef(Date.now());
  const errors = useRef(0);
  const correct = Object.keys(answers).length;

  function finish(nextAnswers: Record<number, string>, nextScore: number) {
    setLocked(true);
    sound.finish();
    window.setTimeout(() => onFinish({
      score: practice ? 0 : Math.max(0, nextScore), correct: Object.keys(nextAnswers).length, total: 9,
      bestStreak: Object.keys(nextAnswers).length, durationMs: Date.now() - startedAt.current,
      mode: `seed:${seed}${Object.keys(nextAnswers).length === 9 && errors.current === 0 ? ";flawless" : ""}`, countryHits: Object.values(nextAnswers),
    }), 650);
  }

  function submit(cca3: string) {
    if (selected === null || locked) return;
    const used = new Set(Object.values(answers));
    const result = validateGridEntry(puzzle, COUNTRIES, Math.floor(selected / 3), selected % 3, cca3, used, new Set(Object.keys(answers).map(Number)));
    setSelected(null);
    if (result === "deadEnd") {
      haptic.tap();
      setFeedback(t("grid.feedback.deadEnd"));
      return;
    }
    if (result !== "valid") {
      errors.current += 1;
      sound.wrong(); haptic.error();
      setAttempted((current) => new Set(current).add(selected));
      setFeedback(t(result === "duplicate" ? "grid.feedback.duplicate" : "grid.feedback.wrong"));
      if (!practice) {
        const nextLives = lives - 1;
        const nextScore = Math.max(0, score - 40);
        setLives(nextLives); setScore(nextScore);
        if (nextLives <= 0) finish(answers, nextScore);
      }
      return;
    }
    sound.correct(); haptic.success();
    const cell = puzzle.cells[selected];
    const firstTry = !attempted.has(selected);
    const earned = practice ? 0 : (difficulty === "hard" ? 140 : difficulty === "medium" ? 110 : 80) + Math.max(0, 80 - cell.candidates.length * 4) + (firstTry ? 30 : 0);
    const nextAnswers = { ...answers, [selected]: cca3 };
    const completeBonus = Object.keys(nextAnswers).length === 9 && !practice ? 250 + lives * 100 : 0;
    const nextScore = score + earned + completeBonus;
    setAnswers(nextAnswers); setScore(nextScore);
    setFeedback(t("grid.feedback.correct"));
    if (Object.keys(nextAnswers).length === 9) finish(nextAnswers, nextScore);
  }

  function newBoard() {
    const next = crypto.getRandomValues(new Uint32Array(1))[0];
    const url = new URL(window.location.href); url.searchParams.set("seed", String(next));
    window.history.replaceState(null, "", url);
    setAnswers({}); setAttempted(new Set()); setLives(MAX_LIVES[difficulty]); setScore(0); setFeedback(""); setLocked(false); startedAt.current = Date.now(); errors.current = 0; setSeed(next);
  }

  async function copyBoard() {
    await navigator.clipboard?.writeText(window.location.href);
    setFeedback(t("grid.feedback.copied"));
  }

  return (
    <div className="geo-workbench flex min-w-0 flex-1 flex-col">
      <GameTopBar title={t("games.grid.name")} onExit={onExit} compactMobileTitle>
        <button onClick={copyBoard} className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={t("grid.copy")}><Copy className="h-4 w-4" /></button>
        <button onClick={newBoard} className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={t("grid.newBoard")}><Dices className="h-4 w-4" /></button>
        {!practice && <LivesPill lives={lives} max={MAX_LIVES[difficulty]} />}
        <ScorePill value={score} />
      </GameTopBar>
      <ProgressBar value={correct / 9} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-2.5 py-4 sm:px-5 sm:py-7">
        <header className="mb-4 px-1 text-center">
          <div className="text-[11px] font-black uppercase tracking-[.2em] text-cyan-600 dark:text-cyan-400">{t("grid.eyebrow", { seed })}</div>
          <h1 className="mt-1 text-xl font-black sm:text-2xl">{t("grid.title")}</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t("grid.subtitle")}</p>
        </header>

        <section className="relative rounded-2xl border border-cyan-500/20 bg-card/95 p-1.5 shadow-xl shadow-cyan-950/5 sm:p-3" aria-label={t("grid.boardLabel")}>
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.09),transparent_45%)]" />
          <div className="relative grid grid-cols-[4.6rem_repeat(3,minmax(0,1fr))] gap-1.5 sm:grid-cols-[7.5rem_repeat(3,minmax(0,1fr))] sm:gap-2">
            <div className="flex items-center justify-center text-[9px] font-black uppercase tracking-widest text-muted-foreground sm:text-[10px]">{t("grid.cross")}</div>
            {puzzle.columns.map((constraint) => <ConstraintLabel key={constraint.id} constraint={constraint} />)}
            {puzzle.rows.map((constraint, row) => (
              <GridRow key={constraint.id} constraint={constraint} row={row} answers={answers} locked={locked} onSelect={setSelected} />
            ))}
          </div>
        </section>

        <div className="mt-4 min-h-11" aria-live="polite">
          {feedback && <motion.p key={feedback} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-center text-sm font-bold">{feedback}</motion.p>}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-3 text-center text-xs">
          <Stat label={t("grid.filled")} value={`${correct}/9`} />
          <Stat label={t("grid.unique")} value={String(new Set(Object.values(answers)).size)} />
          <Stat label={t("grid.difficulty")} value={t(`difficulty.${difficulty}`)} />
        </div>
      </main>

      <CountryPicker open={selected !== null} onClose={() => setSelected(null)} onSubmit={submit} used={new Set(Object.values(answers))} />
    </div>
  );
}

function GridRow({ constraint, row, answers, locked, onSelect }: { constraint: GridConstraint; row: number; answers: Record<number, string>; locked: boolean; onSelect: (index: number) => void }) {
  const { locale, t } = useT();
  return <><ConstraintLabel constraint={constraint} />{[0, 1, 2].map((column) => {
    const index = row * 3 + column; const country = getCountryByCca3(answers[index] ?? "");
    return <button key={column} disabled={locked || !!country} onClick={() => onSelect(index)} className={cn("group flex aspect-square min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:min-h-24", country ? "border-emerald-500/50 bg-emerald-500/10 shadow-inner" : "border-dashed border-border bg-background/70 hover:border-cyan-500/60 hover:bg-cyan-500/5")} aria-label={country ? countryName(country, locale) : t("grid.cellEmpty", { row: row + 1, column: column + 1 })}>
      {country ? <><motion.div initial={{ scale: .55, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}><FlagImage code={country.flag} alt="" className="w-9 shadow sm:w-12" /></motion.div><span className="max-w-full truncate px-1 text-[9px] font-black leading-tight sm:text-xs">{countryName(country, locale)}</span><Check className="hidden h-3 w-3 text-emerald-500 sm:block" /></> : <Sparkles className="h-4 w-4 text-muted-foreground/30 group-hover:text-cyan-500" />}
    </button>;
  })}</>;
}

function ConstraintLabel({ constraint }: { constraint: GridConstraint }) {
  const { t, locale } = useT();
  let label: string;
  if (constraint.kind === "border") label = t("grid.constraint.border", { country: countryName(getCountryByCca3(constraint.value)!, locale) });
  else if (constraint.kind === "region" || constraint.kind === "subregion") label = t(`grid.geo.${constraint.value}`);
  else label = t(`grid.constraint.${constraint.kind}.${constraint.value}`);
  return <div title={label} className="flex min-h-14 items-center justify-center rounded-lg border border-border/70 bg-muted/35 px-1 text-center text-[9px] font-extrabold leading-[1.15] text-foreground sm:min-h-20 sm:px-2 sm:text-xs">{label}</div>;
}

function CountryPicker({ open, onClose, onSubmit, used }: { open: boolean; onClose: () => void; onSubmit: (code: string) => void; used: Set<string> }) {
  const { t, locale } = useT(); const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase(locale);
  const countries = useMemo(() => COUNTRIES.filter((country) => country.independent && (!normalized || countryName(country, locale).toLocaleLowerCase(locale).includes(normalized))).sort((a, b) => countryName(a, locale).localeCompare(countryName(b, locale))).slice(0, 40), [locale, normalized]);
  return <Modal open={open} onClose={onClose} title={t("grid.pickerTitle")} className="sm:max-w-lg">
    <label className="relative block"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("grid.searchPlaceholder")} className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-base outline-none focus:ring-2 focus:ring-cyan-500" /></label>
    <p className="mt-2 text-xs text-muted-foreground">{t("grid.searchHint")}</p>
    <div className="mt-3 grid max-h-[52vh] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
      {countries.map((country) => <button key={country.cca3} disabled={used.has(country.cca3)} onClick={() => { setQuery(""); onSubmit(country.cca3); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-left transition hover:border-cyan-500/50 disabled:opacity-35"><FlagImage code={country.flag} alt="" className="w-8 shrink-0" /><span className="truncate text-sm font-bold">{countryName(country, locale)}</span>{used.has(country.cca3) && <Check className="ml-auto h-4 w-4" />}</button>)}
      {!countries.length && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">{t("grid.noResults")}</p>}
    </div>
  </Modal>;
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-card px-2 py-2"><div className="font-black tabular-nums">{value}</div><div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div></div>; }
