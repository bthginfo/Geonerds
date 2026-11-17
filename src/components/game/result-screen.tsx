"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw, Home, Share2, Trophy, Check, Sparkles, ArrowUpCircle, Crown, Swords, SlidersHorizontal } from "lucide-react";
import type { RunResult } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { sound } from "@/lib/sound";
import { accuracy } from "@/lib/scoring";
import { BADGES, badgeName } from "@/lib/badges";
import { FlagImage } from "@/components/flag-image";
import { getCountryByCca3, countryName } from "@/data/countries";
import { SupportLink } from "@/components/support-cta";
import { formatNumber, formatTime } from "@/lib/utils";
import { ChallengeResultPanel, type ChallengeResultState } from "@/components/challenges/challenge-result";

export function ResultScreen({
  result,
  isRecord,
  newBadges = [],
  newCountries = { discovered: [], researched: [], unlocked: [], mastered: [] },
  levelUp = null,
  onReplay,
  onSettings,
  challenge,
}: {
  result: RunResult;
  isRecord: boolean;
  newBadges?: string[];
  newCountries?: { discovered: string[]; researched: string[]; unlocked: string[]; mastered: string[] };
  levelUp?: number | null;
  onReplay?: () => void;
  onSettings?: () => void;
  challenge?: ChallengeResultState;
}) {
  const { t, locale } = useT();
  const reducedMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const soundPlayed = useRef(false);
  const celebrated = useRef(false);

  const collectCount = new Set([...newCountries.discovered, ...newCountries.researched, ...newCountries.unlocked, ...newCountries.mastered]).size;

  useEffect(() => {
    if (!soundPlayed.current) { sound.finish(); soundPlayed.current = true; }
    if (!celebrated.current && !reducedMotion && (isRecord || newBadges.length > 0 || levelUp || collectCount > 0)) {
      celebrated.current = true;
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 120, spread: 75, origin: { y: 0.35 } });
      }).catch(() => undefined);
    }
  }, [isRecord, newBadges.length, levelUp, collectCount, reducedMotion]);

  const unlocked = BADGES.filter((b) => newBadges.includes(b.id));

  async function share() {
    const text = t("result.shareText", {
      score: result.score,
      game: t(`games.${result.gameId}.name`),
    });
    const url = typeof window !== "undefined" ? window.location.origin : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "GeoNerds", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled */
    }
  }

  const acc = accuracy(result.correct, result.total);

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-6 sm:py-10">
      <motion.div
        initial={false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="geo-surface w-full max-w-lg rounded-2xl p-5 text-center sm:p-7"
      >
        {challenge && <ChallengeResultPanel {...challenge} />}
        {isRecord && (
          <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-sm font-bold text-warning">
            <Trophy className="h-4 w-4" />
            {t("common.newRecord")}
          </div>
        )}
        <h1 className="text-xl font-bold tracking-tight">
          {t("result.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(`games.${result.gameId}.name`)}</p>
        <div className="mt-5 text-5xl font-bold tracking-tight tabular-nums">
          {formatNumber(result.score, locale)}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{t("result.xpEarned")}</div>

        {levelUp != null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary"
          >
            <ArrowUpCircle className="h-4 w-4" />
            {t("result.levelUp", { n: levelUp })}
          </motion.div>
        )}

        <div className="mt-6 grid grid-cols-3 divide-x divide-border">
          <Stat label={t("common.accuracy")} value={`${acc}%`} />
          <Stat label={t("common.streak")} value={String(result.bestStreak)} />
          <Stat label={t("common.time")} value={formatTime(result.durationMs)} />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          {t("result.summary", { correct: result.correct, total: result.total })}
        </p>

        {!challenge && onReplay && <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button size="lg" onClick={onReplay} className="h-auto min-h-12 gap-2 px-3 py-3"><RotateCcw className="h-4 w-4 shrink-0" aria-hidden /><span className="whitespace-normal">{locale === "de" ? "Nochmal spielen" : "Play again"}</span></Button>{onSettings && <Button variant="secondary" onClick={onSettings} className="h-auto min-h-12 gap-2 px-3 py-3"><SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden /><span className="whitespace-normal">{locale === "de" ? "Einstellungen ändern" : "Change settings"}</span></Button>}</div>}

        {unlocked.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 rounded-2xl border border-warning/40 bg-warning/10 p-3"
          >
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-warning">
              {unlocked.length === 1
                ? t("badges.unlocked")
                : t("badges.unlockedN", { n: unlocked.length })}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {unlocked.map((b) => {
                const Icon = b.icon;
                return (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-semibold shadow-sm"
                  >
                    <Icon className="h-3.5 w-3.5 text-warning" />
                    {badgeName(b, locale)}
                  </span>
                );
              })}
            </div>
          </motion.div>
        )}

        {collectCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3"
          >
            <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              {newCountries.mastered.length > 0
                ? (locale === "de" ? `${newCountries.mastered.length} Länder gemeistert` : `${newCountries.mastered.length} countries mastered`)
                : newCountries.researched.length > 0
                ? (locale === "de" ? `${newCountries.researched.length} Länder erforscht` : `${newCountries.researched.length} countries researched`)
                : newCountries.unlocked.length > 0
                ? t("result.countriesUnlocked", { n: collectCount })
                : t("result.countriesProgress", { n: collectCount })}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {[...newCountries.mastered, ...newCountries.unlocked, ...newCountries.researched, ...newCountries.discovered].filter((cca3, index, all) => all.indexOf(cca3) === index)
                .slice(0, 12)
                .map((cca3) => {
                  const c = getCountryByCca3(cca3);
                  if (!c) return null;
                  const full = newCountries.unlocked.includes(cca3) || newCountries.mastered.includes(cca3);
                  const mastered = newCountries.mastered.includes(cca3);
                  return (
                    <span key={cca3} className="inline-flex items-center gap-1.5 rounded-full bg-card px-2 py-1 text-xs font-semibold shadow-sm">
                      <FlagImage code={c.flag} alt="" className="aspect-[4/3] w-4" rounded={false} />
                      {countryName(c, locale)}
                      {mastered ? <Crown className="h-3 w-3 text-amber-500" /> : full && <Check className="h-3 w-3 text-success" />}
                    </span>
                  );
                })}
            </div>
            <Link href="/collection" className="mt-2 block text-center text-xs font-medium text-primary hover:underline">
              {t("collection.title")} →
            </Link>
          </motion.div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {challenge && <Link href="/challenges" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Swords className="h-5 w-5" />{locale === "de" ? "Deine Herausforderungen" : "Your challenges"}</Link>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={share}>
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? t("result.copied") : t("result.share")}
            </Button>
            {!challenge && <Link href="/leaderboard" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-muted px-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <Trophy className="h-4 w-4" />
                {t("leaderboard.title")}
            </Link>}
          </div>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Home className="h-4 w-4" />
              {t("nav.home")}
          </Link>
        </div>

        <div className="mt-5 border-t border-border/60 pt-3">
          <SupportLink />
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 py-1">
      <div className="break-words text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-1 break-words text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
