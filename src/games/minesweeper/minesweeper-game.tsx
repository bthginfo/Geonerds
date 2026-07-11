"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, Flag, Network, RefreshCw, ShieldAlert } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, LivesPill, ScorePill } from "@/components/game/hud";
import { FlagImage } from "@/components/flag-image";
import { Button } from "@/components/ui/button";
import { countryName, getCountryByCca3 } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { haptic } from "@/lib/haptics";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { boardNeighbors, generateMinesweeperBoard, layoutMinesweeperBoard } from "./generator";

type Tool = "reveal" | "mark";
type Phase = "playing" | "solved" | "failed";

const STARTING_LIVES = { easy: 3, medium: 2, hard: 1 } as const;

export function MinesweeperGame({ difficulty, practice, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();
  const [seed, setSeed] = useState(() => (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  const board = useMemo(() => generateMinesweeperBoard(seed, difficulty), [seed, difficulty]);
  const positions = useMemo(() => layoutMinesweeperBoard(board.codes), [board]);
  const [revealed, setRevealed] = useState(() => new Set(board.initialRevealed));
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [struck, setStruck] = useState<Set<string>>(new Set());
  const [tool, setTool] = useState<Tool>("reveal");
  const [lives, setLives] = useState<number>(STARTING_LIVES[difficulty]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [selected, setSelected] = useState(board.codes[0]);
  const [feedback, setFeedback] = useState(t("mines.ready"));
  const [phase, setPhase] = useState<Phase>("playing");
  const startRef = useRef(Date.now());
  const finishRef = useRef(false);
  const actionLockRef = useRef(false);
  const errorsRef = useRef(0);

  const mineSet = useMemo(() => new Set(board.mines), [board]);
  const propertyVisible = difficulty === "easy" || phase !== "playing";
  const propertyText = propertyVisible
    ? t(`mines.property.${board.property.id}`)
    : difficulty === "medium"
      ? t(`mines.family.${board.property.family}`)
      : t("mines.property.hidden");

  function reset(nextSeed = seed) {
    const nextBoard = generateMinesweeperBoard(nextSeed, difficulty);
    setSeed(nextSeed);
    setRevealed(new Set(nextBoard.initialRevealed));
    setMarked(new Set()); setStruck(new Set()); setTool("reveal"); setLives(STARTING_LIVES[difficulty]);
    setScore(0); setStreak(0); setBestStreak(0); setSelected(nextBoard.codes[0]); setFeedback(t("mines.ready")); setPhase("playing");
    startRef.current = Date.now(); finishRef.current = false; actionLockRef.current = false; errorsRef.current = 0;
  }

  function finish(solved: boolean, nextScore: number, nextBest: number) {
    if (finishRef.current) return;
    finishRef.current = true;
    setPhase(solved ? "solved" : "failed");
    setFeedback(solved ? t("mines.solved") : t("mines.failed"));
    if (solved) { sound.finish(); haptic.success(); }
    else { sound.wrong(); haptic.error(); }
    window.setTimeout(() => onFinish({
      score: practice ? 0 : nextScore,
      correct: solved ? board.mineCount : 0,
      total: board.mineCount,
      bestStreak: nextBest,
      durationMs: Date.now() - startRef.current,
      mode: solved && errorsRef.current === 0 ? "logic;flawless" : "logic",
      countryHits: solved ? board.mines : [],
    }), 1100);
  }

  function loseLife(message: string) {
    errorsRef.current += 1;
    setFeedback(message); sound.wrong(); haptic.error(); setStreak(0);
    if (practice) return;
    const nextLives = Math.max(0, lives - 1);
    setLives(nextLives);
    setScore((value) => Math.max(0, value - 60));
    if (nextLives === 0) finish(false, 0, bestStreak);
  }

  function activate(code: string) {
    if (phase !== "playing") return;
    setSelected(code);
    if (revealed.has(code)) { setFeedback(t("mines.alreadyRevealed")); return; }
    if (tool === "mark") {
      setMarked((current) => {
        const next = new Set(current);
        if (next.has(code)) { next.delete(code); setFeedback(t("mines.unmarked")); }
        else if (next.size < board.mineCount) { next.add(code); setFeedback(t("mines.marked")); haptic.tap(); }
        else setFeedback(t("mines.markLimit"));
        return next;
      });
      return;
    }
    if (marked.has(code)) { setFeedback(t("mines.unmarkFirst")); return; }
    if (mineSet.has(code)) {
      setStruck((current) => new Set(current).add(code));
      setMarked((current) => new Set(current).add(code));
      loseLife(t("mines.mineHit"));
      return;
    }
    const nextStreak = streak + 1;
    const nextBest = Math.max(bestStreak, nextStreak);
    setRevealed((current) => new Set(current).add(code));
    setStreak(nextStreak); setBestStreak(nextBest);
    if (!practice) setScore((value) => value + 35 + nextStreak * 5);
    setFeedback(t("mines.safeReveal", { n: board.clues[code] })); sound.correct(); haptic.success();
  }

  function checkMarks() {
    if (phase !== "playing" || marked.size !== board.mineCount || actionLockRef.current) return;
    actionLockRef.current = true;
    window.setTimeout(() => { actionLockRef.current = false; }, 300);
    const correct = [...marked].every((code) => mineSet.has(code));
    if (!correct) { loseLife(t("mines.incorrectMarks")); return; }
    const difficultyBonus = difficulty === "hard" ? 500 : difficulty === "medium" ? 280 : 120;
    const solvedScore = practice ? 0 : score + board.mineCount * 180 + lives * 120 + difficultyBonus;
    setScore(solvedScore);
    finish(true, solvedScore, Math.max(bestStreak, board.mineCount));
  }

  const selectedCountry = getCountryByCca3(selected)!;
  const selectedNeighbors = boardNeighbors(board, selected);

  return (
    <div className="geo-workbench flex flex-1 flex-col">
      <GameTopBar title={t("games.minesweeper.name")} onExit={onExit}>
        {practice ? <span className="rounded-lg bg-muted px-2 py-1 text-xs font-black">∞</span> : <LivesPill lives={lives} max={STARTING_LIVES[difficulty]} />}
        <ScorePill value={score} />
      </GameTopBar>
      <main className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-4 px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-center lg:px-5 lg:pb-5">
        <section className="overflow-hidden rounded-3xl border border-cyan-900/20 bg-slate-950 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">{t("mines.propertyLabel")}</div><div className="mt-1 text-sm font-bold">{propertyText}</div></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right"><div className="text-[9px] font-black uppercase tracking-wide text-slate-400">{t("mines.mines")}</div><div className="font-black tabular-nums text-amber-300">{marked.size}/{board.mineCount}</div></div>
          </div>
          <div className="relative mx-auto aspect-[39/46] w-full max-w-[560px] bg-[radial-gradient(circle_at_50%_35%,rgba(8,145,178,.18),transparent_58%)]" role="group" aria-label={t("mines.boardLabel")}>
            <svg viewBox="0 0 390 460" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              {board.edges.map(([left, right]) => <line key={`${left}-${right}`} x1={positions[left].x} y1={positions[left].y} x2={positions[right].x} y2={positions[right].y} stroke="rgba(148,163,184,.34)" strokeWidth="2" strokeDasharray="4 5" />)}
            </svg>
            {board.codes.map((code) => {
              const country = getCountryByCca3(code)!;
              const isRevealed = revealed.has(code);
              const isMarked = marked.has(code);
              const isStruck = struck.has(code);
              const state = isRevealed ? t("mines.node.revealed", { n: board.clues[code] }) : isMarked ? t("mines.node.marked") : t("mines.node.hidden");
              return <motion.button key={code} whileTap={{ scale: .93 }} onClick={() => activate(code)} aria-label={`${countryName(country, locale)}. ${state}`} aria-pressed={selected === code} className={cn("absolute z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border-2 shadow-lg outline-none transition-colors focus-visible:ring-4 focus-visible:ring-cyan-300/60", isStruck ? "border-rose-400 bg-rose-950" : isMarked ? "border-amber-300 bg-amber-950" : isRevealed ? "border-emerald-400 bg-emerald-950" : "border-slate-500 bg-slate-800 hover:border-cyan-300", selected === code && "ring-2 ring-white/50")} style={{ left: `${positions[code].x / 3.9}%`, top: `${positions[code].y / 4.6}%` }}>
                {isMarked ? <Flag className="h-5 w-5 fill-amber-300 text-amber-300" /> : isRevealed ? <span className="text-xl font-black text-emerald-200">{board.clues[code]}</span> : <FlagImage code={country.flag} alt="" className="aspect-[4/3] w-6 opacity-80" rounded={false} />}
                <span className="mt-0.5 text-[8px] font-black tracking-wide text-slate-200">{code}</span>
              </motion.button>;
            })}
          </div>
        </section>

        <aside className="rounded-3xl border border-border bg-card p-4 shadow-lg">
          <div className="grid grid-cols-2 rounded-2xl border border-border bg-muted/40 p-1" aria-label={t("mines.toolLabel")}>
            <button className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-colors", tool === "reveal" ? "bg-card text-primary shadow" : "text-muted-foreground")} aria-pressed={tool === "reveal"} onClick={() => setTool("reveal")}><Eye className="h-4 w-4" />{t("mines.reveal")}</button>
            <button className={cn("flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-colors", tool === "mark" ? "bg-card text-amber-600 shadow" : "text-muted-foreground")} aria-pressed={tool === "mark"} onClick={() => setTool("mark")}><Flag className="h-4 w-4" />{t("mines.mark")}</button>
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-background p-3">
            <div className="flex items-center gap-2"><FlagImage code={selectedCountry.flag} alt="" className="aspect-[4/3] w-9" /><div><div className="font-extrabold">{countryName(selectedCountry, locale)}</div><div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("mines.selectedCountry")}</div></div></div>
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><Network className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" /><span>{t("mines.neighbors")}: {selectedNeighbors.map((code) => countryName(getCountryByCca3(code)!, locale)).join(", ") || t("mines.noBoardNeighbors")}</span></div>
          </div>
          <div className={cn("mt-3 flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold", phase === "failed" ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300" : phase === "solved" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-cyan-500/20 bg-cyan-500/5 text-muted-foreground")} aria-live="polite">{phase === "failed" ? <ShieldAlert className="h-4 w-4 shrink-0" /> : phase === "solved" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <EyeOff className="h-4 w-4 shrink-0" />}{feedback}</div>
          <Button className="mt-3 w-full gap-2" size="lg" disabled={phase !== "playing" || marked.size !== board.mineCount} onClick={checkMarks}><CheckCircle2 className="h-5 w-5" />{t("mines.checkMarks")}</Button>
          <button disabled={phase !== "playing"} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50" onClick={() => reset((seed + 1) >>> 0)}><RefreshCw className="h-4 w-4" />{t("mines.newBoard")} · {seed}</button>
        </aside>
      </main>
    </div>
  );
}
