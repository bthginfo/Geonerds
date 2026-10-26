"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CornerDownLeft, Lightbulb } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { COUNTRIES, getCountryByCca3, poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { FlagImage } from "@/components/flag-image";
import { GameTopBar, ScorePill, StreakPill, TimerPill, RoundPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { matchAnswer } from "@/lib/fuzzy";
import { scoreForAnswer } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { pickOne, sample, shuffle, cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";
import { GameLoadState } from "@/games/load-state";
import { useGameTimeouts } from "@/games/use-game-timeouts";

const GAME_MS = 60000;

function neighborsOf(c: Country | undefined): Country[] {
  return c?.borders.map((b) => getCountryByCca3(b)).filter((x): x is Country => !!x) ?? [];
}

export function BorderChainGame({ difficulty, mode, roundCount, timed, practice, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  const starts = useMemo(
    () => poolForDifficulty(difficulty).filter((c) => neighborsOf(c).length > 0),
    [difficulty]
  );
  const targetCountries = roundCount === 0 ? starts.length : Math.min(roundCount, starts.length);

  const [current, setCurrent] = useState<Country>(() => pickOne(starts));
  const [found, setFound] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [completed, setCompleted] = useState(0);
  const [input, setInput] = useState("");
  const [flashWrong, setFlashWrong] = useState(false);
  const [wrongChip, setWrongChip] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(GAME_MS);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);

  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const attemptsRef = useRef(0);
  const bestRef = useRef(0);
  const hitsRef = useRef<string[]>([]);
  const foundRef = useRef(new Set<string>());
  const nextLockRef = useRef(false);
  const { schedule, clearTimers } = useGameTimeouts();
  useEffect(() => { nextLockRef.current = false; }, [current, completed]);

  const neighbors = useMemo(() => neighborsOf(current), [current]);

  const options = useMemo(() => {
    if (mode !== "choice" || !current) return [];
    const nIds = new Set(neighbors.map((n) => n.cca3));
    const distractorCount = Math.max(3, Math.min(6, neighbors.length));
    const sameRegion = COUNTRIES.filter(
      (c) => c.region === current.region && c.cca3 !== current.cca3 && !nIds.has(c.cca3)
    );
    let distractors = sample(sameRegion, distractorCount);
    if (distractors.length < distractorCount) {
      const rest = COUNTRIES.filter(
        (c) => c.cca3 !== current.cca3 && !nIds.has(c.cca3) && !distractors.includes(c)
      );
      distractors = [...distractors, ...sample(rest, distractorCount - distractors.length)];
    }
    return shuffle([...neighbors, ...distractors]);
  }, [mode, current, neighbors]);

  useEffect(() => {
    if (!timed) return;
    const id = setInterval(() => {
      const left = GAME_MS - (Date.now() - startRef.current);
      if (left <= 0) {
        clearInterval(id);
        finish();
      } else {
        setTimeLeft(left);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed]);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();
    onFinish({
      score: scoreRef.current,
      correct: correctRef.current,
      total: Math.max(1, attemptsRef.current, correctRef.current),
      bestStreak: bestRef.current,
      durationMs: Date.now() - startRef.current,
      mode: timed ? "timed" : mode,
      countryHits: hitsRef.current,
    });
  }

  function chainNext(fromFound: Set<string>) {
    if (!current || finishedRef.current || nextLockRef.current) return;
    nextLockRef.current = true;
    clearTimers();
    const nextCompleted = completed + 1;
    setCompleted(nextCompleted);
    if (!timed && nextCompleted >= targetCountries) {
      finish();
      return;
    }
    const candidates = neighbors.filter(
      (n) => fromFound.has(n.cca3) && !visited.has(n.cca3) && neighborsOf(n).length > 0
    );
    const nextCountry =
      candidates.length > 0
        ? pickOne(candidates)
        : pickOne(starts.filter((c) => c.cca3 !== current.cca3 && !visited.has(c.cca3))) ?? pickOne(starts.filter((c) => c.cca3 !== current.cca3)) ?? current;
    setVisited((v) => new Set(v).add(current.cca3));
    setCurrent(nextCountry);
    setFound(new Set());
    foundRef.current = new Set();
    setRevealed(false);
    setInput("");
    setFeedback("");
    setWrongChip(null);
    setFlashWrong(false);
  }

  function markFound(hit: Country) {
    if (finishedRef.current || revealed || foundRef.current.has(hit.cca3) || foundRef.current.size === neighbors.length) return;
    foundRef.current.add(hit.cca3);
    hitsRef.current.push(hit.cca3);
    sound.correct();
    const ns = streak + 1;
    const earned = scoreForAnswer({ correct: true, difficulty });
    scoreRef.current += earned;
    setScore((s) => s + earned);
    correctRef.current += 1;
    attemptsRef.current += 1;
    bestRef.current = Math.max(bestRef.current, ns);
    setStreak(ns);
    const newFound = new Set(foundRef.current);
    setFound(newFound);
    setFeedback(t("refresh.border.found", { country: countryName(hit, locale) }));
  }

  function registerWrong() {
    sound.wrong();
    attemptsRef.current += 1;
    setStreak(0);
    setFeedback(t("refresh.border.wrong"));
    if (!practice) {
      scoreRef.current = Math.max(0, scoreRef.current - 10);
      setScore((s) => Math.max(0, s - 10));
    }
  }

  function submit() {
    if (finishedRef.current || revealed || foundRef.current.size === neighbors.length) return;
    const guess = input.trim();
    if (!guess) return;
    setInput("");
    const hit = neighbors.find(
      (n) => !found.has(n.cca3) && matchAnswer(guess, countryAccepted(n)).status === "correct"
    );
    if (hit) {
      markFound(hit);
    } else {
      registerWrong();
      setFlashWrong(true);
      schedule(() => setFlashWrong(false), 350);
    }
  }

  function pickChoice(country: Country) {
    if (finishedRef.current || revealed || foundRef.current.size >= neighbors.length || foundRef.current.has(country.cca3)) return;
    const isNeighbor = neighbors.some((n) => n.cca3 === country.cca3);
    if (isNeighbor) {
      markFound(country);
    } else {
      registerWrong();
      setWrongChip(country.cca3);
      schedule(() => setWrongChip((c) => (c === country.cca3 ? null : c)), 450);
    }
  }

  function revealRemaining() {
    if (finishedRef.current || revealed || foundRef.current.size >= neighbors.length) return;
    clearTimers();
    attemptsRef.current += neighbors.length - foundRef.current.size;
    setRevealed(true);
    setWrongChip(null);
    setFlashWrong(false);
    setStreak(0);
    setFeedback(t("refresh.border.revealed"));
    sound.tick();
  }

  if (!current) return <GameLoadState onExit={onExit} empty />;
  const readyForNext = revealed || found.size >= neighbors.length;

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.border-chain.name")} onExit={onExit}>
        {!practice && <StreakPill value={streak} />}
        {!practice && <ScorePill value={score} />}
        {timed ? (
          <TimerPill ms={timeLeft} danger={timeLeft < 10000} />
        ) : (
          <RoundPill current={completed + 1} total={targetCountries} />
        )}
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-4">
        <div className="flex flex-col items-center text-center">
          <FlagImage code={current.flag} alt="" className="aspect-[4/3] w-20 shadow-md" />
          <h2 className="mt-3 text-xl font-bold">
            {t("borderchain.prompt", { country: countryName(current, locale) })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("borderchain.found", { count: found.size, total: neighbors.length })}
          </p>
        </div>

        {mode === "choice" ? (
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {options.map((o) => {
              const isFound = found.has(o.cca3);
              const isWrong = wrongChip === o.cca3;
              return (
                <button
                  key={o.cca3}
                  disabled={isFound || readyForNext}
                  onClick={() => pickChoice(o)}
                  className={cn(
                    "flex min-h-11 min-w-0 items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-all active:scale-[0.98]",
                    (isFound || revealed && neighbors.some((neighbor) => neighbor.cca3 === o.cca3)) && "border-success bg-success/15 text-success",
                    isWrong && "animate-shake border-danger bg-danger/15 text-danger",
                    !isFound && !isWrong && !(revealed && neighbors.some((neighbor) => neighbor.cca3 === o.cca3)) && "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <FlagImage code={o.flag} alt="" className="aspect-[4/3] w-7 shrink-0" rounded={false} />
                  <span className="min-w-0 break-words">{countryName(o, locale)}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {neighbors.map((n) => {
                const isFound = found.has(n.cca3);
                return (
                  <div
                    key={n.cca3}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-medium transition-all",
                      isFound
                        ? "border-success bg-success/10 text-foreground"
                        : "border-dashed border-border bg-muted/40 text-muted-foreground"
                    )}
                  >
                    {isFound || revealed ? (
                      <>
                        <FlagImage code={n.flag} alt="" className="aspect-[4/3] w-5" rounded={false} />
                        {countryName(n, locale)}
                      </>
                    ) : (
                      <span className="px-2">?</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-auto pt-6">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  disabled={readyForNext}
                  aria-label={t("type.placeholder")}
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  placeholder={t("type.placeholder")}
                  className={cn(
                    "h-12 min-w-0 flex-1 rounded-xl border-2 bg-card px-4 text-base outline-none focus:border-primary",
                    flashWrong ? "animate-shake border-danger" : "border-border"
                  )}
                />
                <Button size="lg" className="px-4" disabled={readyForNext || !input.trim()} onClick={submit} aria-label={t("type.submit")}>
                  <CornerDownLeft className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        )}
        <div className="mt-4 space-y-3">
          <p role="status" aria-live="polite" className="min-h-5 text-sm leading-relaxed text-muted-foreground">{feedback}</p>
          {readyForNext ? <Button className="w-full gap-2" onClick={() => chainNext(foundRef.current)}>{!timed && completed + 1 >= targetCountries ? t("common.continue") : t("common.next")}<ArrowRight className="h-4 w-4" /></Button> : <Button variant="outline" className="h-auto min-h-11 w-full gap-2 whitespace-normal py-2.5" onClick={revealRemaining}><Lightbulb className="h-4 w-4 shrink-0" />{t("refresh.border.reveal")}</Button>}
        </div>
      </div>
    </div>
  );
}
