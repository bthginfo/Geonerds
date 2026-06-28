"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { COUNTRIES, getCountryByCca3, poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { FlagImage } from "@/components/flag-image";
import { GameTopBar, ScorePill, StreakPill, TimerPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { matchAnswer } from "@/lib/fuzzy";
import { scoreForAnswer } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { pickOne, sample, shuffle, cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

const GAME_MS = 60000;

function neighborsOf(c: Country): Country[] {
  return c.borders.map((b) => getCountryByCca3(b)).filter((x): x is Country => !!x);
}

export function BorderChainGame({ difficulty, mode, onFinish, onExit }: PlayHandlers) {
  const { t, locale } = useT();

  const starts = useMemo(
    () => poolForDifficulty(difficulty).filter((c) => neighborsOf(c).length > 0),
    [difficulty]
  );

  const [current, setCurrent] = useState<Country>(() => pickOne(starts));
  const [found, setFound] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const [input, setInput] = useState("");
  const [flashWrong, setFlashWrong] = useState(false);
  const [wrongChip, setWrongChip] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_MS);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const neighbors = useMemo(() => neighborsOf(current), [current]);

  // For choice mode: neighbours mixed with regional distractors.
  const options = useMemo(() => {
    if (mode !== "choice") return [];
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

  // Countdown
  useEffect(() => {
    const id = setInterval(() => {
      const left = GAME_MS - (Date.now() - startRef.current);
      if (left <= 0) {
        clearInterval(id);
        finish(0);
      } else {
        setTimeLeft(left);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish(extra: number) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      score: score + extra,
      correct,
      total: Math.max(attempts, correct),
      bestStreak,
      durationMs: Date.now() - startRef.current,
      mode,
    });
  }

  function chainNext(fromFound: Set<string>) {
    const candidates = neighbors.filter(
      (n) => fromFound.has(n.cca3) && !visited.has(n.cca3) && neighborsOf(n).length > 0
    );
    const nextCountry =
      candidates.length > 0
        ? pickOne(candidates)
        : pickOne(starts.filter((c) => !visited.has(c.cca3)) ?? starts) ?? pickOne(starts);
    setVisited((v) => new Set(v).add(current.cca3));
    setCurrent(nextCountry);
    setFound(new Set());
  }

  function markFound(hit: Country) {
    sound.correct();
    const ns = streak + 1;
    const earned = scoreForAnswer({ correct: true, difficulty, streak });
    setScore((s) => s + earned);
    setStreak(ns);
    setBestStreak((b) => Math.max(b, ns));
    setCorrect((c) => c + 1);
    const newFound = new Set(found).add(hit.cca3);
    setFound(newFound);
    if (newFound.size >= neighbors.length) {
      setTimeout(() => chainNext(newFound), 500);
    }
  }

  function registerWrong() {
    sound.wrong();
    setStreak(0);
  }

  function submit() {
    if (finishedRef.current) return;
    const guess = input.trim();
    if (!guess) return;
    setInput("");
    setAttempts((a) => a + 1);
    const hit = neighbors.find(
      (n) => !found.has(n.cca3) && matchAnswer(guess, countryAccepted(n)).status === "correct"
    );
    if (hit) {
      markFound(hit);
    } else {
      registerWrong();
      setFlashWrong(true);
      setTimeout(() => setFlashWrong(false), 350);
    }
  }

  function pickChoice(country: Country) {
    if (finishedRef.current || found.has(country.cca3)) return;
    setAttempts((a) => a + 1);
    const isNeighbor = neighbors.some((n) => n.cca3 === country.cca3);
    if (isNeighbor) {
      markFound(country);
    } else {
      registerWrong();
      setWrongChip(country.cca3);
      setTimeout(() => setWrongChip((c) => (c === country.cca3 ? null : c)), 450);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.border-chain.name")} onExit={onExit}>
        <StreakPill value={streak} />
        <ScorePill value={score} />
        <TimerPill ms={timeLeft} danger={timeLeft < 10000} />
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
                  disabled={isFound}
                  onClick={() => pickChoice(o)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-all active:scale-[0.98]",
                    isFound && "border-success bg-success/15 text-success",
                    isWrong && "animate-shake border-danger bg-danger/15 text-danger",
                    !isFound && !isWrong && "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <FlagImage code={o.flag} alt="" className="aspect-[4/3] w-7 shrink-0" rounded={false} />
                  <span className="truncate">{countryName(o, locale)}</span>
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
                    {isFound ? (
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
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="words"
                  spellCheck={false}
                  placeholder={t("type.placeholder")}
                  className={cn(
                    "h-12 flex-1 rounded-xl border-2 bg-card px-4 text-base outline-none focus:border-primary",
                    flashWrong ? "animate-shake border-danger" : "border-border"
                  )}
                />
                <Button size="lg" className="px-4" onClick={submit} aria-label={t("type.submit")}>
                  <CornerDownLeft className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
