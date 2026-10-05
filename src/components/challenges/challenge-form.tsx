"use client";

import { useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { CHALLENGE_GAME_IDS, CHALLENGE_ROUND_COUNTS, type GeoChallengeGameId } from "@/lib/challenges";
import { apiCreateGeoChallenge } from "@/lib/challenge-online";
import type { AnswerMode, Difficulty } from "@/lib/types";
import { getGame } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { validateName } from "@/lib/validate";
import { cn } from "@/lib/utils";
import { challengeError } from "./challenge-ui";
import { ChallengeRules } from "./challenge-summary";
import { OpponentPicker } from "./opponent-picker";

const inputClass = "mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20";

export function ChallengeForm({ initialOpponent = "", onCreated }: { initialOpponent?: string; onCreated: (id: string) => void }) {
  const { t, locale } = useT();
  const [opponent, setOpponent] = useState(initialOpponent);
  const [gameId, setGameId] = useState<GeoChallengeGameId>("flags");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mode, setMode] = useState<AnswerMode>("choice");
  const [rounds, setRounds] = useState<number>(10);
  const [timed, setTimed] = useState(false);
  const [variant, setVariant] = useState("world");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const submitLock = useRef(false);
  const config = getGame(gameId)!;
  const modes = config.modes ?? ["choice"];

  function chooseGame(id: GeoChallengeGameId) {
    const next = getGame(id);
    if (!next) return;
    setGameId(id);
    setMode(next.modes?.[0] ?? "choice");
    setVariant(next.variants?.default ?? "");
    setTimed(false);
    setDifficulty("medium");
    setError(undefined);
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const name = validateName(opponent);
    if (!name) { setError("invalid_request"); return; }
    if (name.toLocaleLowerCase() === useAuth.getState().user?.name.toLocaleLowerCase()) { setError("self_challenge"); return; }
    submitLock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await apiCreateGeoChallenge({ opponentName: name, gameId, difficulty, mode, rounds, timed, variant });
      if (!result.ok || !result.id) {
        setError(result.error ?? "request_failed");
        if (result.error === "unauthorized") await useAuth.getState().refresh();
      } else { onCreated(result.id); }
    } catch { setError("network_error"); }
    finally { submitLock.current = false; setBusy(false); }
  }

  return <form onSubmit={send} className="w-full min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
    <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-widest text-primary">{locale === "de" ? "Eine neue Begegnung" : "A new encounter"}</p><h2 className="mt-1 text-xl font-bold">{locale === "de" ? "Herausforderung senden" : "Send a challenge"}</h2></div>
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      <OpponentPicker value={opponent} onChange={(name) => { setOpponent(name); setError(undefined); }} disabled={busy} />
      <label className="block text-xs font-semibold">{locale === "de" ? "Spiel" : "Game"}<select name="gameId" value={gameId} onChange={(event) => chooseGame(event.target.value as GeoChallengeGameId)} className={inputClass}>{CHALLENGE_GAME_IDS.filter((id) => getGame(id)).map((id) => <option key={id} value={id}>{t(`games.${id}.name`)}</option>)}</select></label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold">{t("common.difficulty")}<select name="difficulty" value={difficulty} disabled={!config.supportsDifficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className={inputClass}>{["easy", "medium", "hard"].map((value) => <option key={value} value={value}>{t(`difficulty.${value}`)}</option>)}</select></label>
        <label className="block text-xs font-semibold">{t("common.mode")}<select name="mode" value={mode} disabled={modes.length === 1} onChange={(event) => setMode(event.target.value as AnswerMode)} className={cn(inputClass, modes.length === 1 && "text-muted-foreground")}>{modes.map((value) => <option key={value} value={value}>{t(`mode.${value}`)}</option>)}</select></label>
      </div>
      {config.variants && <label className="block text-xs font-semibold">{t(config.variants.labelKey)}<select name="variant" value={variant} onChange={(event) => setVariant(event.target.value)} className={inputClass}>{config.variants.options.map((value) => <option key={value} value={value}>{t(`scope.${value}`)}</option>)}</select></label>}
      <fieldset className="min-w-0"><legend className="mb-2 text-xs font-semibold">{t("setup.rounds")}</legend><div className="grid grid-cols-3 gap-2">{CHALLENGE_ROUND_COUNTS.map((count) => <label key={count} className={cn("relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold", rounds === count ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground")}><input type="radio" name="rounds" value={count} checked={rounds === count} onChange={() => setRounds(count)} className="peer sr-only" /><span className="absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-ring" /><span>{count}</span></label>)}</div></fieldset>
      {config.supportsTimed && <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border p-3"><span><span className="block text-sm font-semibold">{t("setup.timed")}</span><span className="mt-0.5 block text-xs text-muted-foreground">{locale === "de" ? "Dasselbe Zeitlimit pro Frage für beide" : "The same per-question countdown for both"}</span></span><input type="checkbox" checked={timed} onChange={(event) => setTimed(event.target.checked)} className="h-5 w-5 shrink-0 accent-primary" /></label>}
      <div className="border-t border-border pt-4"><ChallengeRules /></div>
      {error && <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 p-3 text-sm leading-relaxed text-danger">{challengeError(error, locale)}</p>}
      <Button type="submit" size="lg" className="h-auto min-h-14 w-full gap-2 py-3" disabled={busy}>{busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <Send className="h-5 w-5 shrink-0" />}<span className="min-w-0 break-words">{busy ? (locale === "de" ? "Wird gesendet…" : "Sending…") : (locale === "de" ? "Herausforderung senden" : "Send challenge")}</span></Button>
    </fieldset>
  </form>;
}
