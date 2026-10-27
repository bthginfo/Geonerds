"use client";

import { CheckCircle2, Clock3, Loader2, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import type { GeoChallenge } from "@/lib/challenges";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { formatNumber, formatTime } from "@/lib/utils";
import { challengeBotLabel, challengeError, isBotChallenge } from "./challenge-ui";

export interface ChallengeResultState {
  challenge: GeoChallenge;
  status: "sending" | "saved" | "error";
  error?: string;
  onRetry: () => void;
}

export function ChallengeResultPanel({ challenge, status, error, onRetry }: ChallengeResultState) {
  const { locale } = useT();
  const resolved = challenge.status === "resolved";
  const bot = isBotChallenge(challenge);
  const outcome = challenge.viewerOutcome;
  const Icon = status === "sending" ? Loader2 : status === "error" ? Swords : resolved ? Trophy : Clock3;
  const title = status === "sending" ? (locale === "de" ? "Ergebnis wird gesendet…" : "Sending your result…") : status === "error" ? (locale === "de" ? "Ergebnis noch nicht gesendet" : "Result not sent yet") : resolved ? outcome === "win" ? (locale === "de" ? "Du hast gewonnen!" : "You won!") : outcome === "loss" ? (bot ? (locale === "de" ? "GeoBot gewinnt dieses Training" : "GeoBot wins this training") : (locale === "de" ? "Dein Gegenüber gewinnt" : "Your opponent wins")) : (locale === "de" ? "Unentschieden!" : "It is a draw!") : bot ? (locale === "de" ? "Gespeichert · Bot-Vergleich wird geladen" : "Saved · Loading bot comparison") : (locale === "de" ? "Gespeichert · Warten auf dein Gegenüber" : "Saved · Waiting for your opponent");
  return <section aria-label={locale === "de" ? "Herausforderungsergebnis" : "Challenge result"} className="mb-5 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-left">
    <div className="flex items-center gap-2"><Icon className={`h-5 w-5 shrink-0 text-primary ${status === "sending" ? "animate-spin" : ""}`} /><h2 className="text-sm font-bold" aria-live="polite">{title}</h2></div>
    <p className="mt-2 break-words text-xs text-muted-foreground">{locale === "de" ? "Gegen" : "Against"} <span className="font-semibold text-foreground">{challenge.opponentName}</span></p>
    {bot && <><p className="mt-2 text-xs font-semibold text-primary">{challengeBotLabel(challenge, locale)} · {locale === "de" ? "Training ohne Duell-Ranglistenwertung" : "Training · No duel ranking impact"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Unabhängig simulierte Leistung mit denselben Spieleinstellungen. GeoBot passt sich nicht an dein Ergebnis an." : "Independently simulated performance with the same game settings. GeoBot does not adapt to your result."}</p></>}
    {(challenge.viewerIsGuest || challenge.opponentIsGuest) && <p className="mt-2 text-xs font-semibold text-primary">{locale === "de" ? "Gastspiel · Ohne Duell-Ranglistenwertung" : "Guest game · Casual, unranked duel"}</p>}
    {status === "error" ? <><p role="alert" className="mt-3 text-sm leading-relaxed">{challengeError(error, locale)}</p><Button variant="outline" className="mt-3 h-auto min-h-11 w-full whitespace-normal py-2" onClick={onRetry}>{locale === "de" ? "Dasselbe Ergebnis erneut senden" : "Resend the same result"}</Button><p className="mt-2 text-xs text-muted-foreground">{locale === "de" ? "Kein neuer Spielversuch. Deine Fragen werden nicht wiederholt." : "This is not a new attempt. Your questions will not restart."}</p></> : status === "saved" && !resolved && <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />{bot ? (locale === "de" ? "Dein Versuch ist sicher gespeichert. Der Bot-Vergleich wird geladen." : "Your attempt is safely saved. Loading the bot comparison.") : (locale === "de" ? "Dein Versuch ist sicher gespeichert. Der Vergleich erscheint, sobald beide fertig sind." : "Your attempt is safely saved. The comparison appears when both players finish.")}</p>}
    {resolved && challenge.attempts && <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full table-fixed text-xs"><caption className="sr-only">{locale === "de" ? "Vergleich beider Ergebnisse" : "Comparison of both results"}</caption><thead className="border-b border-border bg-muted/40"><tr><th className="w-[34%] px-2 py-2 text-left">{locale === "de" ? "Spieler" : "Player"}</th><th className="px-1 py-2 text-right">{locale === "de" ? "Punkte" : "Score"}</th><th className="px-1 py-2 text-right">{locale === "de" ? "Richtig" : "Correct"}</th><th className="px-1 py-2 text-right">{locale === "de" ? "Zeit" : "Time"}</th></tr></thead><tbody>{challenge.attempts.map((attempt, index) => <tr key={`${attempt.name}:${index}`} className="border-b border-border/50 last:border-0"><th className="break-words px-2 py-2 text-left font-semibold [overflow-wrap:anywhere]">{attempt.name}<span className="block text-[10px] font-normal text-muted-foreground">{[attempt.mine ? (locale === "de" ? "Du" : "You") : "", attempt.bot ? challengeBotLabel(challenge, locale) : "", attempt.guest ? (locale === "de" ? "Gast" : "Guest") : ""].filter(Boolean).join(" · ")}</span></th><td className="break-words px-1 py-2 text-right tabular-nums">{formatNumber(attempt.score, locale)}</td><td className="px-1 py-2 text-right tabular-nums">{attempt.correct}/{attempt.total}</td><td className="px-1 py-2 text-right tabular-nums">{formatTime(attempt.durationMs)}</td></tr>)}</tbody></table>
    </div>}
    {bot && resolved && <Link href="/challenges?opponentType=bot" className="mt-3 inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Neues Bot-Duell erstellen" : "Create another bot duel"}</Link>}
  </section>;
}
