"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, Share2, Check, Home, Trophy, Play } from "lucide-react";
import type { GameId } from "@/lib/types";
import { QuizGame } from "@/games/quiz-core";
import { generateWeeklyRounds } from "@/games/daily/daily-rounds";
import { GameTopBar } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { useWeekly } from "@/store/weekly";
import { scoreStore } from "@/lib/leaderboard/local";
import { weekKey, msUntilNextWeek, WEEKLY_COUNT } from "@/lib/daily";

function grid(marks: boolean[], total: number): string {
  const cells = Array.from({ length: total }, (_, i) => (i < marks.length ? (marks[i] ? "🟩" : "🟥") : "⬜"));
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 5) rows.push(cells.slice(i, i + 5).join(""));
  return rows.join("\n");
}

function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export default function WeeklyPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const results = useWeekly((s) => s.results);
  const record = useWeekly((s) => s.record);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [playing, setPlaying] = useState(false);

  const week = weekKey();
  const weekResult = results[week];
  const rounds = useMemo(() => generateWeeklyRounds(week, locale), [week, locale]);

  if (!mounted) {
    return <div className="flex flex-1 items-center justify-center text-muted-foreground">{t("common.loading")}</div>;
  }

  if (playing && !weekResult) {
    return (
      <QuizGame
        gameId={"weekly" as GameId}
        rounds={rounds}
        mode="choice"
        difficulty="hard"
        timed={false}
        onExit={() => router.push("/")}
        onFinish={(r) => {
          const marks = r.marks ?? [];
          record({ week, score: r.score, correct: r.correct, total: r.total, marks });
          scoreStore.saveRun({
            gameId: "weekly" as GameId,
            difficulty: "hard",
            mode: "weekly",
            score: r.score,
            correct: r.correct,
            total: r.total,
            bestStreak: r.bestStreak,
            durationMs: r.durationMs,
            createdAt: Date.now(),
          });
          setPlaying(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("weekly.title")} onExit={() => router.push("/")} />
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        {weekResult ? (
          <ResultView result={weekResult} locale={locale} t={t} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center rounded-3xl border border-border bg-card p-8 text-center shadow-sm"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
              <Swords className="h-8 w-8" />
            </span>
            <h1 className="mt-4 text-2xl font-bold">{t("weekly.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("weekly.subtitle", { n: WEEKLY_COUNT })}</p>
            <Button size="lg" className="mt-6 w-full gap-2" onClick={() => setPlaying(true)}>
              <Play className="h-5 w-5" />
              {t("weekly.play")}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Countdown({ label }: { label: string }) {
  const [left, setLeft] = useState(() => countdown(msUntilNextWeek()));
  useEffect(() => {
    const id = setInterval(() => setLeft(countdown(msUntilNextWeek())), 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="mt-5 rounded-xl bg-muted/60 p-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-bold tabular-nums">{left}</div>
    </div>
  );
}

function ResultView({
  result,
  locale,
  t,
}: {
  result: { score: number; correct: number; total: number; marks: boolean[] };
  locale: string;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const g = grid(result.marks, result.total);
    const text = `GeoNerds — ${t("weekly.title")} ${weekKey()}\n${g}\n${result.correct}/${result.total} · ${result.score} ${t("common.points")}`;
    const url = typeof window !== "undefined" ? window.location.origin + "/weekly" : "";
    try {
      if (navigator.share) await navigator.share({ title: "GeoNerds", text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("weekly.done")}</h2>
      <div className="mt-1 text-5xl font-extrabold tabular-nums">{result.score.toLocaleString(locale)}</div>
      <div className="text-xs text-muted-foreground">{t("common.points")}</div>

      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: result.total }, (_, i) => (
          <span
            key={i}
            className={
              "flex h-7 w-7 items-center justify-center rounded-lg text-sm " +
              (i < result.marks.length ? (result.marks[i] ? "bg-success/20" : "bg-danger/20") : "bg-muted")
            }
          >
            {i < result.marks.length ? (result.marks[i] ? "✅" : "❌") : "⬜"}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("result.summary", { correct: result.correct, total: result.total })}
      </p>

      <Countdown label={t("weekly.comeBack")} />

      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={share} className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {copied ? t("result.copied") : t("weekly.share")}
        </Button>
        <div className="flex gap-2">
          <Link href="/leaderboard" className="flex-1">
            <Button variant="outline" className="w-full gap-2">
              <Trophy className="h-4 w-4" />
              {t("leaderboard.title")}
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full gap-2">
              <Home className="h-4 w-4" />
              {t("nav.home")}
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
