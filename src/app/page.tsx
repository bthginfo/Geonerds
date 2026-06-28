"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Gamepad2 } from "lucide-react";
import { GAMES } from "@/games/registry";
import { GameCard } from "@/components/game-card";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { formatNumber } from "@/lib/utils";

export default function Home() {
  const { t, locale } = useT();
  const { runs } = useAllRuns();

  const gamesPlayed = runs?.length ?? 0;
  const totalPoints = runs?.reduce((s, r) => s + r.score, 0) ?? 0;

  return (
    <div className="geo-aurora flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-5xl px-4 pt-10 pb-6 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center"
        >
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {t("app.tagline")}
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            {t("home.heroSubtitle")}
          </p>
          <div className="mt-7">
            <Link href="#games">
              <Button size="lg" className="gap-2">
                <Gamepad2 className="h-5 w-5" />
                {t("home.cta")}
              </Button>
            </Link>
          </div>
        </motion.div>

        {gamesPlayed > 0 && (
          <div className="mx-auto mt-10 grid max-w-md grid-cols-2 gap-3">
            <StatTile label={t("home.gamesPlayed")} value={formatNumber(gamesPlayed, locale)} />
            <StatTile label={t("home.totalPoints")} value={formatNumber(totalPoints, locale)} />
          </div>
        )}
      </section>

      <section id="games" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 pb-24 pt-4">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.chooseGame")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4 text-center backdrop-blur-sm">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
