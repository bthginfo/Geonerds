"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RotateCcw, Home, Share2, Trophy, Check } from "lucide-react";
import type { RunResult } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { sound } from "@/lib/sound";
import { accuracy } from "@/lib/scoring";
import { BADGES, badgeName } from "@/lib/badges";
import { formatNumber, formatTime } from "@/lib/utils";

export function ResultScreen({
  result,
  isRecord,
  newBadges = [],
  onReplay,
}: {
  result: RunResult;
  isRecord: boolean;
  newBadges?: string[];
  onReplay: () => void;
}) {
  const { t, locale } = useT();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    sound.finish();
    if (isRecord || newBadges.length > 0) {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 120, spread: 75, origin: { y: 0.35 } });
      });
    }
  }, [isRecord, newBadges.length]);

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
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-xl"
      >
        {isRecord && (
          <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-sm font-bold text-warning">
            <Trophy className="h-4 w-4" />
            {t("common.newRecord")}
          </div>
        )}
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("result.title")}
        </h2>
        <div className="mt-2 text-5xl font-extrabold tabular-nums">
          {formatNumber(result.score, locale)}
        </div>
        <div className="text-xs text-muted-foreground">{t("common.points")}</div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <Stat label={t("common.accuracy")} value={`${acc}%`} />
          <Stat label={t("common.streak")} value={String(result.bestStreak)} />
          <Stat label={t("common.time")} value={formatTime(result.durationMs)} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("result.summary", { correct: result.correct, total: result.total })}
        </p>

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

        <div className="mt-6 flex flex-col gap-2">
          <Button size="lg" onClick={onReplay} className="gap-2">
            <RotateCcw className="h-5 w-5" />
            {t("common.restart")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={share}>
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? t("result.copied") : t("result.share")}
            </Button>
            <Link href="/leaderboard" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <Trophy className="h-4 w-4" />
                {t("leaderboard.title")}
              </Button>
            </Link>
          </div>
          <Link href="/">
            <Button variant="ghost" className="w-full gap-2">
              <Home className="h-4 w-4" />
              {t("nav.home")}
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
