"use client";

import { LockKeyhole, Timer } from "lucide-react";
import type { GeoChallenge } from "@/lib/challenges";
import { useT } from "@/i18n/I18nProvider";
import { getGame } from "@/games/registry";
import { challengeBotLabel, isBotChallenge } from "./challenge-ui";

export function ChallengeSummary({ challenge, locked = false }: { challenge: GeoChallenge; locked?: boolean }) {
  const { t, locale } = useT();
  const game = getGame(challenge.gameId);
  const bot = isBotChallenge(challenge);
  return <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
    <div className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-primary">{locked && <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden />}{bot ? (locale === "de" ? "Feste Spieleinstellungen fürs Bot-Training" : "Locked game settings for bot training") : (locale === "de" ? "Identische Bedingungen für beide Spieler" : "Identical settings for both players")}</div>
    <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-sm [&>div]:min-w-0 [&_dd]:break-words [&_dt]:[overflow-wrap:anywhere]">
      <div><dt className="text-xs text-muted-foreground">{locale === "de" ? "Spiel" : "Game"}</dt><dd className="mt-0.5 font-semibold">{t(`games.${challenge.gameId}.name`)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">{bot ? (locale === "de" ? "Frageschwierigkeit" : "Question difficulty") : t("common.difficulty")}</dt><dd className="mt-0.5 font-semibold">{t(`difficulty.${challenge.difficulty}`)}</dd></div>
      {bot && <div><dt className="text-xs text-muted-foreground">{locale === "de" ? "Bot-Stärke" : "Bot strength"}</dt><dd className="mt-0.5 font-semibold">{challengeBotLabel(challenge, locale)}</dd></div>}
      <div><dt className="text-xs text-muted-foreground">{t("common.mode")}</dt><dd className="mt-0.5 font-semibold">{t(`mode.${challenge.mode}`)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">{t("setup.rounds")}</dt><dd className="mt-0.5 font-semibold">{challenge.rounds === 0 ? t("setup.all") : challenge.rounds}</dd></div>
      {game?.variants && <div><dt className="text-xs text-muted-foreground">{t(game.variants.labelKey)}</dt><dd className="mt-0.5 font-semibold">{t(`scope.${challenge.variant}`)}</dd></div>}
      <div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><Timer className="h-3 w-3" />{t("setup.timed")}</dt><dd className="mt-0.5 font-semibold">{challenge.timed ? (locale === "de" ? "Mit Zeitlimit" : "Countdown on") : (locale === "de" ? "Ohne Zeitlimit" : "Countdown off")}</dd></div>
    </dl>
  </div>;
}

export function ChallengeRules({ bot = false }: { bot?: boolean }) {
  const { locale } = useT();
  if (bot) return <p className="text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "GeoBot ist ein unabhängig simulierter Trainingsgegner, kein menschliches Konto. Seine Leistung wird vor deinem Versuch festgelegt und richtet sich nach Bot-Stärke und Spieleinstellungen, nicht nach deinem Ergebnis. Ein Versuch pro Duell, kein Neustart. Der Vergleich erscheint nach deinem Ergebnis. Höhere Punktzahl gewinnt; danach zählen richtige Antworten und die kürzere Gesamtzeit. Bot-Duelle zählen nicht für die Duell-Rangliste. Für weiteres Training kannst du jederzeit ein neues Bot-Duell erstellen." : "GeoBot is an independently simulated training opponent, not a human account. Its performance is set before your attempt using bot strength and game settings, not your result. One attempt per duel, no restart. The comparison appears after your result. Higher score wins; ties use correct answers, then shorter total time. Bot duels do not count toward duel rankings. You can create a new bot duel whenever you want to train again."}</p>;
  return <p className="text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Einladungen bleiben drei Tage offen. Nach der Annahme habt ihr sieben Tage zum Spielen. Gleiche Fragen in gleicher Reihenfolge, ein Versuch pro Person, kein Neustart. Ihr spielt unabhängig voneinander; der Vergleich bleibt verborgen, bis beide fertig sind. Höhere Punktzahl gewinnt; bei Gleichstand zählen richtige Antworten, danach die kürzere Gesamtzeit. Ist alles gleich, endet es unentschieden." : "Invitations stay open for three days. Once accepted, you have seven days to play. Same questions in the same order, one attempt each, no replay. Play independently; the comparison stays hidden until both finish. Higher score wins; ties use correct answers, then shorter total time. If all three match, it is a draw."}</p>;
}
