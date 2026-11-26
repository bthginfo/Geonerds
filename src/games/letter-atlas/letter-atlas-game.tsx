"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, ArrowUp, Check, CornerDownLeft, Crosshair, Delete, Lightbulb, MapPin, Type } from "lucide-react";
import type { PlayHandlers, PlayResult } from "@/components/game/game-shell";
import { GameTopBar, RoundPill, ScorePill } from "@/components/game/hud";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { countryName, getCountryByCca3 } from "@/data/countries";
import { capitalLabel } from "@/games/aliases";
import { dailyPuzzleNumber, dailyStreak, isDailyVariant, puzzleSeed, readDailyRecord, writeDailyRecord } from "@/games/puzzle-kit";
import { PuzzleWrapUp } from "@/games/puzzle-wrapup";
import { useGameTimeouts } from "@/games/use-game-timeouts";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";
import { regionLabel, subregionLabel } from "@/lib/regions";
import { DIFFICULTY_MULTIPLIER } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import type { Country, Locale } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import {
  COMPASS_POINTS, HINT_COST, KEYBOARD_ROWS, MAX_HINTS, evaluateGuess, keyboardStates, maxTries, normalizeLetters, shareRow,
  solvedScore, targetForSeed, targetWord, type GuessRow, type LetterState,
} from "./generator";

const GAME_ID = "letter-atlas";
type Phase = "playing" | "revealing" | "done";
type Translate = (key: string, vars?: Record<string, string | number>) => string;

const TILE_STYLES: Record<LetterState, string> = {
  correct: "border-emerald-700 bg-emerald-700 text-white",
  present: "border-amber-400 bg-amber-400 text-amber-950",
  absent: "border-slate-500 bg-slate-500 text-white dark:border-slate-600 dark:bg-slate-600",
};

const KEY_STYLES: Record<LetterState, string> = {
  correct: "bg-emerald-700 text-white hover:bg-emerald-800",
  present: "bg-amber-400 text-amber-950 hover:bg-amber-300",
  absent: "bg-slate-500 text-white hover:bg-slate-600 dark:bg-slate-950 dark:text-slate-400 dark:ring-1 dark:ring-inset dark:ring-slate-800 dark:hover:bg-slate-900",
};

function StateIcon({ state, className }: { state: LetterState; className?: string }) {
  if (state === "correct") return <Check className={className} strokeWidth={3} aria-hidden />;
  if (state === "present") return <ArrowLeftRight className={className} strokeWidth={3} aria-hidden />;
  return null;
}

/** Subregion without the German sentence article ("der Karibik" → "Karibik") for labels. */
function subregionName(value: string, locale: Locale) {
  return subregionLabel(value, locale).replace(/^der /, "");
}

function placeLabel(row: GuessRow, locale: Locale, t: Translate): string {
  const country = getCountryByCca3(row.entry.cca3);
  if (!country) return row.word;
  const name = countryName(country, locale);
  return row.entry.kind === "capital" ? t("letteratlas.capitalPlace", { capital: capitalLabel(country, locale), country: name }) : name;
}

function Tile({ letter, state, index, fontSize, reduced, ghost, active, celebrate }: {
  letter?: string;
  state?: LetterState;
  index: number;
  fontSize: string;
  reduced: boolean;
  ghost?: string;
  active?: boolean;
  celebrate?: boolean;
}) {
  const flipped = Boolean(state);
  return (
    <motion.div
      className="relative aspect-square [perspective:640px]"
      style={{ fontSize }}
      initial={false}
      animate={celebrate && !reduced ? { y: [0, -10, 0] } : { y: 0 }}
      transition={{ duration: 0.35, delay: celebrate ? 0.45 + index * 0.18 : 0 }}
    >
      <motion.div
        className="absolute inset-0 [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateX: flipped ? 180 : 0 }}
        transition={{ duration: reduced ? 0 : 0.42, delay: reduced ? 0 : index * 0.11, ease: "easeInOut" }}
      >
        <motion.div
          key={letter ?? "empty"}
          initial={letter && !reduced && !flipped ? { scale: 0.86 } : false}
          animate={{ scale: 1 }}
          transition={{ duration: 0.12 }}
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-[18%] border-2 font-extrabold uppercase [backface-visibility:hidden]",
            letter ? "border-foreground/45 bg-card text-foreground" : active ? "border-border bg-card/80" : "border-border/70 bg-card/40",
          )}
        >
          {letter ?? (ghost && <span className="text-muted-foreground/70">{ghost}</span>)}
        </motion.div>
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-[18%] border-2 font-extrabold uppercase [backface-visibility:hidden] [transform:rotateX(180deg)]",
            state ? TILE_STYLES[state] : "border-border bg-card",
          )}
        >
          {letter}
          {state && <StateIcon state={state} className="absolute right-0.5 top-0.5 h-2.5 w-2.5 opacity-90 sm:h-3 sm:w-3" />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ClueLine({ row, locale, t, delay, reduced }: { row?: GuessRow; locale: Locale; t: Translate; delay: number; reduced: boolean }) {
  if (!row) return <div className="h-5" aria-hidden />;
  const country = getCountryByCca3(row.entry.cca3);
  const clue = row.clue;
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: reduced ? 0 : delay }}
      className="flex h-5 min-w-0 items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground"
    >
      {country && <FlagImage code={country.flag} className="w-5 shrink-0 rounded-[3px]" rounded={false} />}
      <span className="min-w-0 truncate text-foreground">{placeLabel(row, locale, t)}</span>
      {clue && (clue.km === 0 ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-700/10 px-1.5 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
          <Crosshair className="h-3.5 w-3.5" aria-hidden />{t("letteratlas.here")}
        </span>
      ) : (
        <>
          <span className="shrink-0 tabular-nums text-foreground">{formatNumber(clue.km, locale)} km</span>
          {clue.compass && (
            <span className="inline-flex shrink-0 items-center" title={t("letteratlas.toward", { dir: t(`letteratlas.dir.${clue.compass}`) })}>
              <ArrowUp className="h-4 w-4 text-primary" style={{ transform: `rotate(${COMPASS_POINTS.indexOf(clue.compass) * 45}deg)` }} aria-hidden />
              <span className="sr-only">{t("letteratlas.toward", { dir: t(`letteratlas.dir.${clue.compass}`) })}</span>
            </span>
          )}
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 tabular-nums">{t("letteratlas.proximity", { n: clue.proximity })}</span>
        </>
      ))}
    </motion.div>
  );
}

function Keyboard({ layout, states, disabled, onLetter, onEnter, onBackspace, t }: {
  layout: string[];
  states: Record<string, LetterState>;
  disabled: boolean;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  t: Translate;
}) {
  const base = "flex h-12 min-w-0 flex-1 items-center justify-center rounded-lg text-sm font-bold uppercase transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 sm:h-13 sm:text-base";
  return (
    <div role="group" aria-label={t("letteratlas.keyboard")} className="flex flex-col gap-1.5">
      {layout.map((row, rowIndex) => (
        <div key={row} className="flex justify-center gap-1 sm:gap-1.5">
          {rowIndex === 1 && <span className="max-w-5 flex-[0.5]" aria-hidden />}
          {rowIndex === 2 && (
            <button type="button" data-letter-key disabled={disabled} onClick={onEnter} aria-label={t("letteratlas.enterLabel")}
              className={cn(base, "max-w-18 flex-[1.6] gap-1 bg-primary px-1 text-[11px] text-primary-foreground hover:brightness-110 sm:text-xs")}>
              <CornerDownLeft className="h-5 w-5 shrink-0 min-[360px]:max-[419px]:hidden min-[420px]:h-4 min-[420px]:w-4" aria-hidden /><span className="truncate max-[359px]:hidden">{t("letteratlas.enter")}</span>
            </button>
          )}
          {row.split("").map((letter) => {
            const state = states[letter];
            return (
              <button key={letter} type="button" data-letter-key disabled={disabled} onClick={() => onLetter(letter)}
                aria-label={state ? `${letter}, ${t(`letteratlas.state.${state}`)}` : letter}
                className={cn(base, "max-w-11", state ? KEY_STYLES[state] : "bg-muted text-foreground hover:bg-muted/70 ring-1 ring-inset ring-border/60")}>
                {letter}
              </button>
            );
          })}
          {rowIndex === 2 && (
            <button type="button" data-letter-key disabled={disabled} onClick={onBackspace} aria-label={t("letteratlas.backspace")}
              className={cn(base, "max-w-18 flex-[1.6] bg-muted text-foreground ring-1 ring-inset ring-border/60 hover:bg-muted/70")}>
              <Delete className="h-5 w-5" aria-hidden />
            </button>
          )}
          {rowIndex === 1 && <span className="max-w-5 flex-[0.5]" aria-hidden />}
        </div>
      ))}
    </div>
  );
}

function AnswerCard({ target, locale, t, solved }: { target: Country; locale: Locale; t: Translate; solved: boolean }) {
  const name = countryName(target, locale);
  const capital = capitalLabel(target, locale);
  const subregion = subregionName(target.subregion || target.region, locale);
  const region = regionLabel(target.region, locale);
  const reduced = useReducedMotion();
  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-center gap-4 rounded-3xl border p-4", solved ? "border-emerald-600/40 bg-emerald-600/10" : "border-border bg-card")}
    >
      <FlagImage code={target.flag} alt={t("letteratlas.flagOf", { name })} rounded={false} className="w-20 shrink-0 rounded-md shadow-sm sm:w-24" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{t("letteratlas.answer")}</p>
        <p className="text-xl font-extrabold leading-tight">{name}</p>
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
          {capital ? t("letteratlas.fact", { capital, subregion, region }) : t("letteratlas.factNoCapital", { subregion, region })}
        </p>
      </div>
    </motion.section>
  );
}

export function LetterAtlasGame(handlers: PlayHandlers) {
  const { difficulty, variant, practice, seed, challenge, onFinish, onExit } = handlers;
  const { t, locale } = useT();
  const reduced = Boolean(useReducedMotion());
  // The answer's spelling is fixed for the run, even if the language is switched mid-game.
  const [wordLocale] = useState<Locale>(locale);
  const daily = isDailyVariant(variant) && !(challenge && seed);
  const [runSeed] = useState(() => puzzleSeed(GAME_ID, { variant, difficulty, seed, challenge }));
  const target = useMemo(() => targetForSeed(runSeed, difficulty), [runSeed, difficulty]);
  const answer = useMemo(() => targetWord(target, wordLocale), [target, wordLocale]);
  const tries = maxTries(difficulty);
  const length = answer.length;
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty];

  const [rows, setRows] = useState<GuessRow[]>([]);
  const [current, setCurrent] = useState("");
  const [phase, setPhase] = useState<Phase>("playing");
  const [hints, setHints] = useState(0);
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "info" } | null>(null);
  const [srMessage, setSrMessage] = useState("");
  const [final, setFinal] = useState<{ solved: boolean; score: number; share: string; streak: number } | null>(null);
  const [priorRecord] = useState(() => (daily && !practice ? readDailyRecord(GAME_ID, difficulty) : null));
  const startedAt = useRef(Date.now());
  const endedAt = useRef<number | null>(null);
  const finished = useRef(false);
  const shake = useAnimationControls();
  const { schedule } = useGameTimeouts();
  const wrapRef = useRef<HTMLDivElement>(null);
  const currentRowRef = useRef<HTMLDivElement>(null);

  const keyStates = useMemo(() => keyboardStates(rows), [rows]);
  const solved = rows.at(-1)?.word === answer;
  const potential = solvedScore(rows.length + 1, tries, hints, difficulty);
  const displayScore = final ? final.score : phase === "playing" ? potential : solved ? solvedScore(rows.length, tries, hints, difficulty) : 0;
  const revealMs = reduced ? 0 : 450 + length * 110;
  const firstLetter = answer[0];
  const subregion = subregionLabel(target.subregion || target.region, locale);

  function buildShare(finalRows: GuessRow[], won: boolean) {
    const game = t(`games.${GAME_ID}.name`);
    const level = t(`difficulty.${difficulty}`);
    const header = daily ? `GeoNerds ${game} #${dailyPuzzleNumber()} (${level})` : `GeoNerds ${game} · ${t("letteratlas.endless")} (${level})`;
    const tally = `${won ? finalRows.length : "X"}/${tries}${hints ? ` · 💡${hints}` : ""}`;
    return [header, tally, ...finalRows.map((row) => shareRow(row, (km) => formatNumber(km, locale))), "geo-nerds.com"].join("\n");
  }

  function reject(text: string) {
    setNotice({ text, tone: "error" });
    setSrMessage(text);
    haptic.error();
    if (!reduced) void shake.start({ x: [0, -9, 9, -7, 7, -3, 0], transition: { duration: 0.38 } });
  }

  function typeLetters(letters: string) {
    if (phase !== "playing") return;
    setCurrent((value) => (value + letters).slice(0, length));
    if (notice?.tone === "error") setNotice(null);
  }

  function backspace() {
    if (phase !== "playing") return;
    setCurrent((value) => value.slice(0, -1));
  }

  function summaryFor(row: GuessRow, left: number) {
    const correct = row.states.filter((state) => state === "correct").length;
    const present = row.states.filter((state) => state === "present").length;
    const place = placeLabel(row, locale, t);
    const parts = [t("letteratlas.summary", { word: row.word, correct, present })];
    if (row.clue?.km === 0) parts.push(t("letteratlas.summaryHere", { place }));
    else if (row.clue?.compass) parts.push(t("letteratlas.summaryGeo", { place, km: formatNumber(row.clue.km, locale), dir: t(`letteratlas.dir.${row.clue.compass}`), pct: row.clue.proximity }));
    if (left > 0 && row.word !== answer) parts.push(left === 1 ? t("letteratlas.triesLeftOne") : t("letteratlas.triesLeft", { n: left }));
    return parts.join(" ");
  }

  function submit() {
    if (phase !== "playing") return;
    if (current.length < length) return reject(t("letteratlas.tooShort", { n: length }));
    const row = evaluateGuess(current, target, wordLocale);
    if (!row) return reject(t("letteratlas.invalid", { n: length }));
    const next = [...rows, row];
    const won = row.word === answer;
    const out = !won && next.length >= tries;
    setRows(next);
    setCurrent("");
    haptic.tap();
    setSrMessage(summaryFor(row, tries - next.length));
    if (!won && row.entry.cca3 === target.cca3) {
      setNotice({ text: t(row.entry.kind === "capital" ? "letteratlas.capitalOfTarget" : "letteratlas.sameCountry"), tone: "info" });
    } else {
      setNotice(null);
    }
    if (!won && !out) return;
    setPhase("revealing");
    schedule(() => {
      const score = practice || !won ? 0 : solvedScore(next.length, tries, hints, difficulty);
      const share = buildShare(next, won);
      endedAt.current = Date.now();
      if (won) { sound.finish(); haptic.success(); } else { sound.wrong(); haptic.error(); }
      if (daily && !practice) writeDailyRecord(GAME_ID, difficulty, { solved: won, score, share, at: Date.now() });
      setFinal({ solved: won, score, share, streak: daily && !practice ? dailyStreak(GAME_ID) : 0 });
      const name = countryName(target, locale);
      setSrMessage(`${won ? t("letteratlas.solvedTitle", { n: next.length, total: tries }) : t("letteratlas.failedTitle")}. ${t("letteratlas.answer")}: ${name}.`);
      setPhase("done");
    }, revealMs + 250);
  }

  function takeHint() {
    if (phase !== "playing" || hints >= MAX_HINTS) return;
    const next = hints + 1;
    setHints(next);
    const text = next === 1 ? t("letteratlas.hintRegionText", { region: subregion }) : t("letteratlas.hintFirstText", { letter: firstLetter });
    setNotice({ text, tone: "info" });
    setSrMessage(text);
    haptic.tap();
  }

  function finish() {
    if (finished.current || !final) return;
    finished.current = true;
    const result: PlayResult = {
      score: practice ? 0 : final.score,
      correct: final.solved ? 1 : 0,
      total: 1,
      bestStreak: final.solved ? 1 : 0,
      durationMs: Math.max(500, (endedAt.current ?? Date.now()) - startedAt.current),
      countryHits: final.solved ? [target.cca3] : [],
      mode: daily ? "daily" : "endless",
    };
    onFinish(result);
  }

  // Physical keyboard: letters, Backspace, Enter. The listener always calls the latest handlers.
  const input = useRef({ typeLetters, backspace, submit });
  useEffect(() => {
    input.current = { typeLetters, backspace, submit };
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const element = event.target instanceof HTMLElement ? event.target : null;
      if (element?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const onGameKey = Boolean(element?.closest("[data-letter-key]"));
      if (event.key === "Enter") {
        // Enter on another focused control (hint, share, continue) keeps its normal meaning.
        if (!onGameKey && element?.closest("button, a, [role='button']")) return;
        event.preventDefault();
        input.current.submit();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        input.current.backspace();
        return;
      }
      if (event.key.length > 2) return;
      const letters = normalizeLetters(event.key);
      if (!letters) return;
      event.preventDefault();
      input.current.typeLetters(letters);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Keep the row being typed visible above the sticky keyboard on short screens.
  useEffect(() => {
    if (rows.length > 0) currentRowRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [rows.length, reduced]);

  useEffect(() => {
    if (phase === "done") wrapRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [phase, reduced]);

  const gameName = t(`games.${GAME_ID}.name`);
  const hintLabel = hints === 0 ? t("letteratlas.hintRegion") : hints === 1 ? t("letteratlas.hintFirst") : t("letteratlas.hintsUsed");
  // Tiles shrink with the viewport height too, so the board and keyboard fit on short screens.
  const tileSize = `clamp(2.25rem, calc((100dvh - 24rem) / ${tries} - 1.5rem), 3.1rem)`;
  const boardWidth = `min(100%, calc(${length} * ${tileSize} + ${(length - 1) * 0.25}rem))`;
  const tileFont = `min(1.55rem, calc((100vw - 2rem) / ${length} * 0.5), calc(${tileSize} * 0.5))`;
  const playing = phase === "playing";

  return (
    <div className="geo-workbench flex flex-1 flex-col">
      <GameTopBar title={gameName} onExit={onExit} compactMobileTitle>
        {!practice && <ScorePill value={displayScore} />}
        <RoundPill current={Math.min(rows.length + (playing ? 1 : 0), tries) || 1} total={tries} />
      </GameTopBar>

      <section aria-label={gameName} className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 pb-4 pt-4 sm:pt-6">
        <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              <Type className="h-3.5 w-3.5" aria-hidden />{t("letteratlas.kicker")}
            </p>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{t("letteratlas.letters", { n: length })}</h1>
          </div>
          {phase !== "done" && (
            <Button variant="outline" size="sm" onClick={takeHint} disabled={!playing || hints >= MAX_HINTS} className="shrink-0">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-300" aria-hidden />
              {hintLabel}
              {!practice && hints < MAX_HINTS && <span className="tabular-nums text-muted-foreground">{t("letteratlas.hintCost", { n: formatNumber(HINT_COST * multiplier, locale) })}</span>}
            </Button>
          )}
        </header>

        {(hints > 0 || practice || priorRecord || playing) && (
          <div className="-mt-1 flex min-h-6 flex-wrap items-center gap-1.5 text-xs">
            {hints > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 font-semibold text-amber-900 dark:text-amber-200">
                <MapPin className="h-3.5 w-3.5" aria-hidden />{t("letteratlas.hintRegionChip", { region: subregionName(target.subregion || target.region, locale) })}
              </span>
            )}
            {hints > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 font-semibold text-amber-900 dark:text-amber-200">
                {t("letteratlas.hintFirstChip", { letter: firstLetter })}
              </span>
            )}
            {!practice && playing && <span className="text-muted-foreground">{t("letteratlas.worth", { n: formatNumber(potential, locale) })}</span>}
            {practice && <span className="text-muted-foreground">{t("letteratlas.practice")}</span>}
          </div>
        )}
        {priorRecord && phase !== "done" && <p className="rounded-xl bg-muted/70 px-3 py-2 text-xs leading-relaxed text-muted-foreground">{t("letteratlas.alreadyPlayed")}</p>}

        <div aria-label={t("letteratlas.board")} role="group" className="mx-auto flex w-full flex-col gap-1" style={{ maxWidth: "100%" }}>
          {Array.from({ length: phase === "done" ? rows.length : tries }, (_, rowIndex) => {
            const row = rows[rowIndex];
            const isCurrent = playing && rowIndex === rows.length;
            const letters = row ? row.word : isCurrent ? current : "";
            const isLastSubmitted = rowIndex === rows.length - 1;
            const label = row
              ? `${t("letteratlas.row", { n: rowIndex + 1 })}: ${row.word.split("").map((letter, index) => `${letter} ${t(`letteratlas.state.${row.states[index]}`)}`).join(", ")}`
              : isCurrent && current
                ? t("letteratlas.rowTyping", { n: rowIndex + 1, letters: current.split("").join(" "), count: current.length, total: length })
                : t("letteratlas.rowEmpty", { n: rowIndex + 1 });
            const tiles = (
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }} aria-hidden>
                {Array.from({ length }, (_, index) => (
                  <Tile
                    key={index}
                    index={index}
                    letter={letters[index]}
                    state={row?.states[index]}
                    fontSize={tileFont}
                    reduced={reduced}
                    active={isCurrent}
                    ghost={isCurrent && index === 0 && hints > 1 && !current ? firstLetter : undefined}
                    celebrate={Boolean(row && isLastSubmitted && row.word === answer)}
                  />
                ))}
              </div>
            );
            return (
              <div key={rowIndex} ref={isCurrent ? currentRowRef : undefined} role="group" aria-label={label} className={isCurrent ? "scroll-mt-28 scroll-mb-64" : undefined}>
                <div className="mx-auto" style={{ width: boardWidth }}>
                  {isCurrent ? <motion.div animate={shake}>{tiles}</motion.div> : tiles}
                </div>
                <ClueLine row={row} locale={locale} t={t} delay={isLastSubmitted ? revealMs / 1000 : 0} reduced={reduced} />
              </div>
            );
          })}
        </div>

        <p className="sr-only" aria-live="polite" role="status">{srMessage}</p>

        {phase !== "done" ? (
          <div className="sticky bottom-0 z-10 -mx-4 mt-auto bg-background/90 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:px-3">
            <div className="mb-1.5 flex min-h-7 items-center justify-center" aria-hidden>
              {notice ? (
                <motion.p
                  key={notice.text}
                  initial={reduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("rounded-2xl px-3 py-1 text-center text-sm font-semibold", notice.tone === "error" ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary")}
                >
                  {notice.text}
                </motion.p>
              ) : (
                <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {(["correct", "present", "absent"] as const).map((state) => (
                <li key={state} className="inline-flex items-center gap-1">
                  <span className={cn("inline-flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border", TILE_STYLES[state])}><StateIcon state={state} className="h-2.5 w-2.5" /></span>
                  {t(`letteratlas.legend.${state}`)}
                </li>
              ))}
                </ul>
              )}
            </div>
            <Keyboard layout={KEYBOARD_ROWS[wordLocale]} states={keyStates} disabled={!playing} onLetter={typeLetters} onEnter={submit} onBackspace={backspace} t={t} />
          </div>
        ) : final && (
          <div ref={wrapRef} className="flex scroll-mt-20 flex-col gap-3">
            <AnswerCard target={target} locale={locale} t={t} solved={final.solved} />
            <PuzzleWrapUp
              solved={final.solved}
              title={final.solved ? t("letteratlas.solvedTitle", { n: rows.length, total: tries }) : t("letteratlas.failedTitle")}
              detail={[
                !practice ? t("letteratlas.points", { n: formatNumber(final.score, locale) }) : null,
                hints ? t("letteratlas.hintsTaken", { n: hints }) : null,
                final.streak > 0 ? t("letteratlas.streak", { n: final.streak }) : null,
              ].filter(Boolean).join(" · ") || undefined}
              share={final.share}
              daily={daily}
              onContinue={finish}
            />
          </div>
        )}
      </section>
    </div>
  );
}
