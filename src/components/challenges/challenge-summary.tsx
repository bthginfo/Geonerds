"use client";

import { LockKeyhole, Timer } from "lucide-react";
import type { GeoChallenge } from "@/lib/challenges";
import { useT } from "@/i18n/I18nProvider";
import { getGame } from "@/games/registry";

export function ChallengeSummary({ challenge, locked = false }: { challenge: GeoChallenge; locked?: boolean }) {
  const { t, locale } = useT();
  const game = getGame(challenge.gameId);
  return <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
    <div className="flex items-center gap-2 text-xs font-semibold text-primary">{locked && <LockKeyhole className="h-4 w-4" />}{locale === "de" ? "Identische Bedingungen für beide Spieler" : "Identical settings for both players"}</div>
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      <div><dt className="text-xs text-muted-foreground">{locale === "de" ? "Spiel" : "Game"}</dt><dd className="mt-0.5 font-semibold">{t(`games.${challenge.gameId}.name`)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">{t("common.difficulty")}</dt><dd className="mt-0.5 font-semibold">{t(`difficulty.${challenge.difficulty}`)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">{t("common.mode")}</dt><dd className="mt-0.5 font-semibold">{t(`mode.${challenge.mode}`)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">{t("setup.rounds")}</dt><dd className="mt-0.5 font-semibold">{challenge.rounds}</dd></div>
      {game?.variants && <div><dt className="text-xs text-muted-foreground">{t(game.variants.labelKey)}</dt><dd className="mt-0.5 font-semibold">{t(`scope.${challenge.variant}`)}</dd></div>}
      <div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><Timer className="h-3 w-3" />{t("setup.timed")}</dt><dd className="mt-0.5 font-semibold">{challenge.timed ? (locale === "de" ? "Mit Zeitlimit" : "Countdown on") : (locale === "de" ? "Ohne Zeitlimit" : "Countdown off")}</dd></div>
    </dl>
  </div>;
}

export function ChallengeRules() {
  const { locale } = useT();
  return <p className="text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Gleiche Fragen in gleicher Reihenfolge. Höhere Punktzahl gewinnt; bei Gleichstand zählen richtige Antworten, danach die kürzere Gesamtzeit. Ist alles gleich, endet es unentschieden. Ein Versuch pro Person, 7 Tage Zeit." : "Same questions in the same order. Higher score wins; ties use correct answers, then shorter total time. If all three match, it is a draw. One attempt per player, 7 days to complete."}</p>;
}
