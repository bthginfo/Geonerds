"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Send } from "lucide-react";
import { CHALLENGE_GAME_IDS, CHALLENGE_ROUND_COUNTS, type GeoChallengeGameId, type GeoChallengeInviteType } from "@/lib/challenges";
import { apiCreateGeoChallenge } from "@/lib/challenge-online";
import type { AnswerMode, Difficulty } from "@/lib/types";
import { getGame } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { validateName } from "@/lib/validate";
import { cn } from "@/lib/utils";
import { challengeError, challengeRoundsLabel } from "./challenge-ui";
import { ChallengeRules } from "./challenge-summary";
import { ChallengeShareLink } from "./challenge-share-link";
import { OpponentPicker } from "./opponent-picker";

const inputClass = "mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-65";
const METHODS: GeoChallengeInviteType[] = ["random", "direct", "open", "link"];
type CreatedInvite = { id: string; method: GeoChallengeInviteType; opponentName?: string; sharePath?: string };

export function ChallengeForm({ initialOpponent = "", onCreated }: { initialOpponent?: string; onCreated: (id: string, method: GeoChallengeInviteType) => void }) {
  const { t, locale } = useT();
  const id = useId();
  const [method, setMethod] = useState<GeoChallengeInviteType>(initialOpponent ? "direct" : "random");
  const [opponent, setOpponent] = useState(initialOpponent);
  const [gameId, setGameId] = useState<GeoChallengeGameId>("flags");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mode, setMode] = useState<AnswerMode>("choice");
  const [rounds, setRounds] = useState<number>(10);
  const [timed, setTimed] = useState(false);
  const [variant, setVariant] = useState("world");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const submitLock = useRef(false);
  const config = getGame(gameId)!;
  const modes = config.modes ?? ["choice"];
  const roundCounts = CHALLENGE_ROUND_COUNTS.filter((count) => count !== 0 || config.countOptions?.includes(0));
  const methodNames = { random: locale === "de" ? "Zufälliger GeoNerd" : "Random GeoNerd", direct: locale === "de" ? "Spieler wählen" : "Choose player", open: locale === "de" ? "Offene Herausforderung" : "Open challenge", link: locale === "de" ? "Einladungslink" : "Invite link" };
  const descriptions = {
    random: locale === "de" ? "Wir laden ein anderes GeoNerds-Konto für dich ein. Es hat drei Tage Zeit, anzunehmen." : "We invite another GeoNerds account for you. They have three days to accept.",
    direct: locale === "de" ? "Wähle ein GeoNerds-Konto. Deine Einladung bleibt drei Tage offen." : "Choose a GeoNerds account. Your invitation stays open for three days.",
    open: locale === "de" ? "Jeder angemeldete GeoNerd kann den freien Platz übernehmen. Offen für drei Tage." : "Any signed-in GeoNerd can take the open seat. Available for three days.",
    link: locale === "de" ? "Teile einen Link. Wer zuerst annimmt, spielt mit dir – auch als Gast ohne Registrierung. Offen für drei Tage." : "Share a link. The first person to accept plays with you — including guests without registration. Available for three days.",
  };
  const cta = method === "random" ? (locale === "de" ? "Zufälligen GeoNerd einladen" : "Invite a random GeoNerd") : method === "direct" ? (locale === "de" ? "Spieler einladen" : "Invite player") : method === "open" ? (locale === "de" ? "Herausforderung öffnen" : "Create open challenge") : (locale === "de" ? "Einladungslink erstellen" : "Create invite link");

  function chooseGame(nextId: GeoChallengeGameId) {
    const next = getGame(nextId);
    if (!next) return;
    setGameId(nextId);
    setMode(next.modes?.includes("choice") ? "choice" : next.modes?.[0] ?? "choice");
    setVariant(next.variants?.default ?? "");
    setTimed(false);
    setDifficulty("medium");
    if (rounds === 0 && !next.countOptions?.includes(0)) setRounds(10);
    setError(undefined);
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const owner = useAuth.getState().user;
    if (submitLock.current || !owner) return;
    const name = method === "direct" ? validateName(opponent) : null;
    if (method === "direct" && !name) { setError("invalid_request"); return; }
    if (name?.toLocaleLowerCase() === owner.name.toLocaleLowerCase()) { setError("self_challenge"); return; }
    submitLock.current = true;
    setBusy(true);
    setError(undefined);
    setCreated(null);
    try {
      const result = await apiCreateGeoChallenge({ invitationType: method, ...(name ? { opponentName: name } : {}), gameId, difficulty, mode, rounds, timed, variant });
      if (useAuth.getState().user?.id !== owner.id) return;
      if (!result.ok || !result.id) {
        setError(result.error ?? "request_failed");
        if (result.error === "unauthorized") await useAuth.getState().refresh();
      } else {
        setCreated({ id: result.id, method, opponentName: result.opponentName ?? name ?? undefined, sharePath: result.sharePath });
        onCreated(result.id, method);
      }
    } catch { if (useAuth.getState().user?.id === owner.id) setError("network_error"); }
    finally { submitLock.current = false; setBusy(false); }
  }

  return <section className="w-full min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="text-xl font-bold">{locale === "de" ? "Finde dein Gegenüber" : "Find your opponent"}</h2>
    <form onSubmit={send} className="mt-4">
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <fieldset className="min-w-0"><legend className="mb-2 text-sm font-semibold">{locale === "de" ? "Wie möchtest du einladen?" : "How would you like to invite?"}</legend>
          <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">{METHODS.map((value) => <label key={value} className={cn("relative flex min-h-12 min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm leading-snug", method === value ? "border-primary bg-primary/5 font-semibold" : "border-border hover:bg-muted/40")}><input type="radio" name="invitationType" value={value} checked={method === value} onChange={() => { setMethod(value); setError(undefined); }} className="peer h-4 w-4 shrink-0 accent-primary" /><span className="min-w-0 [overflow-wrap:anywhere]">{methodNames[value]}</span><span className="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-ring" /></label>)}</div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{descriptions[method]}</p>
        </fieldset>
        {method === "direct" && <OpponentPicker value={opponent} onChange={(name) => { setOpponent(name); setError(undefined); }} disabled={busy} />}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)] gap-3">
          <label className="min-w-0 text-sm font-semibold">{locale === "de" ? "Spiel" : "Game"}<select name="gameId" value={gameId} onChange={(event) => chooseGame(event.target.value as GeoChallengeGameId)} className={inputClass}>{CHALLENGE_GAME_IDS.filter((value) => getGame(value)).map((value) => <option key={value} value={value}>{t(`games.${value}.name`)}</option>)}</select></label>
          <label className="min-w-0 text-sm font-semibold">{t("setup.rounds")}<select name="rounds" value={rounds} onChange={(event) => setRounds(Number(event.target.value))} className={inputClass}>{roundCounts.map((count) => <option key={count} value={count}>{count === 0 ? t("setup.all") : count}</option>)}</select></label>
        </div>
        <details className="border-y border-border">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Weitere Einstellungen" : "More settings"}</summary>
          <div className="space-y-3 pb-4 pt-1">
            <label className="block text-xs font-semibold">{t("common.difficulty")}<select name="difficulty" value={difficulty} disabled={!config.supportsDifficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className={inputClass}>{["easy", "medium", "hard"].map((value) => <option key={value} value={value}>{t(`difficulty.${value}`)}</option>)}</select>{!config.supportsDifficulty && <span className="mt-1.5 block font-normal leading-relaxed text-muted-foreground">{locale === "de" ? "Dieses Spiel hat einen festen Schwierigkeitsgrad." : "This game uses a fixed difficulty."}</span>}</label>
            <label className="block text-xs font-semibold">{t("common.mode")}<select name="mode" value={mode} disabled={modes.length === 1} onChange={(event) => setMode(event.target.value as AnswerMode)} className={inputClass}>{modes.map((value) => <option key={value} value={value}>{t(`mode.${value}`)}</option>)}</select>{modes.length === 1 && <span className="mt-1.5 block font-normal leading-relaxed text-muted-foreground">{locale === "de" ? "Dieses Spiel unterstützt nur diesen Antwortmodus." : "This is the only answer mode this game supports."}</span>}</label>
            {config.variants && <label className="block text-xs font-semibold">{t(config.variants.labelKey)}<select name="variant" value={variant} onChange={(event) => setVariant(event.target.value)} className={inputClass}>{config.variants.options.map((value) => <option key={value} value={value}>{t(`scope.${value}`)}</option>)}</select></label>}
            <label className={cn("flex min-h-11 items-center gap-3 text-sm", !config.supportsTimed && "text-muted-foreground")}><input type="checkbox" checked={timed} disabled={!config.supportsTimed} onChange={(event) => setTimed(event.target.checked)} className="h-5 w-5 shrink-0 accent-primary" /><span>{t("setup.timed")}</span></label>
            {!config.supportsTimed && <p className="text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Dieses Spiel wird ohne Zeitlimit gespielt." : "This game is played without a countdown."}</p>}
          </div>
        </details>
        <p aria-live="polite" className="text-sm leading-relaxed"><span className="font-semibold">{t(`games.${gameId}.name`)} · {challengeRoundsLabel(rounds, locale)}</span><span className="mt-1 block text-xs text-muted-foreground">{t(`difficulty.${difficulty}`)} · {t(`mode.${mode}`)}{config.variants ? ` · ${t(`scope.${variant}`)}` : ""} · {timed ? (locale === "de" ? "Mit Zeitlimit" : "Countdown on") : (locale === "de" ? "Ohne Zeitlimit" : "Untimed")}</span>{rounds === 0 && <span className="mt-1 block text-xs text-muted-foreground">{locale === "de" ? "Alle verfügbaren Fragen für die gewählten Einstellungen." : "All available questions for the selected settings."}</span>}</p>
        {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm leading-relaxed text-danger">{challengeError(error, locale)}</p>}
        <Button type="submit" className="h-auto min-h-12 w-full gap-2 px-3 py-3" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : <Send className="h-4 w-4 shrink-0" aria-hidden />}<span className="min-w-0 whitespace-normal">{busy ? (locale === "de" ? "Einladung wird erstellt…" : "Creating invitation…") : cta}</span></Button>
      </fieldset>
    </form>
    {created && <div className="mt-4 border-t border-border pt-4">
      <p role="status" className="flex items-start gap-2 text-sm font-semibold"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /><span className="min-w-0 break-words">{created.method === "open" || created.method === "link" ? (locale === "de" ? "Warten auf ein Gegenüber" : "Waiting for an opponent") : (locale === "de" ? `Einladung an ${created.opponentName ?? "dein Gegenüber"} gesendet` : `Invitation sent to ${created.opponentName ?? "your opponent"}`)}</span></p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{created.method === "link" ? (locale === "de" ? "Teile den Link. Die erste Annahme belegt den Platz. Mit einem Gast bleibt das Spiel zwanglos und ohne Ranglistenwertung." : "Share the link. The first acceptance claims the seat. Games with guests are casual and do not count toward duel rankings.") : created.method === "open" ? (locale === "de" ? "Deine Einladung ist jetzt in den offenen Herausforderungen sichtbar. Du kannst sie auch teilen." : "Your invitation is now visible in Open challenges. You can share it too.") : (locale === "de" ? "Dein Gegenüber hat drei Tage Zeit, die Einladung anzunehmen." : "Your opponent has three days to accept.")}</p>
      {created.sharePath && <div className="mt-3"><ChallengeShareLink key={created.id} path={created.sharePath} /></div>}
      <Link href={`/challenges?invite=${encodeURIComponent(created.id)}`} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Einladung ansehen" : "View invitation"}</Link>
    </div>}
    <details className="mt-4"><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "So funktionieren Herausforderungen" : "How challenges work"}</summary><ChallengeRules /></details>
  </section>;
}
