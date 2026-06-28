"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import type { Country } from "@/lib/types";
import type { PlayHandlers } from "@/components/game/game-shell";
import { getCountryByCca3, poolForDifficulty, countryName } from "@/data/countries";
import { countryAccepted } from "@/games/aliases";
import { FlagImage } from "@/components/flag-image";
import { GameTopBar, ScorePill, StreakPill, TimerPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { matchAnswer } from "@/lib/fuzzy";
import { scoreForAnswer } from "@/lib/scoring";
import { sound } from "@/lib/sound";
import { pickOne } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

const GAME_MS = 60000;

function neighborsOf(c: Country): Country[] {
  return c.borders.map((b) => getCountryByCca3(b)).filter((x): x is Country => !!x);
}

export function BorderChainGame({ difficulty, onFinish, onExit }: PlayHandlers) {
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
  const [timeLeft, setTimeLeft] = useState(GAME_MS);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const neighbors = useMemo(() => neighborsOf(current), [current]);

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
      mode: "timed",
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
    } else {
      sound.wrong();
      setStreak(0);
      setFlashWrong(true);
      setTimeout(() => setFlashWrong(false), 350);
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

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {neighbors.map((n) => {
            const isFound = found.has(n.cca3);
            return (
              <div
                key={n.cca3}
                className={
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-sm font-medium transition-all " +
                  (isFound
                    ? "border-success bg-success/10 text-foreground"
                    : "border-dashed border-border bg-muted/40 text-muted-foreground")
                }
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
              className={
                "h-12 flex-1 rounded-xl border-2 bg-card px-4 text-base outline-none focus:border-primary " +
                (flashWrong ? "animate-shake border-danger" : "border-border")
              }
            />
            <Button size="lg" className="px-4" onClick={submit} aria-label={t("type.submit")}>
              <CornerDownLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
