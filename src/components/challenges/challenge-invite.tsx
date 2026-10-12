"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Play, RefreshCw } from "lucide-react";
import { apiActGeoChallenge, apiGeoChallenge } from "@/lib/challenge-online";
import type { GeoChallenge, GeoChallengeAction } from "@/lib/challenges";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/I18nProvider";
import { validateName } from "@/lib/validate";
import { AccountPanel } from "@/components/account/account-panel";
import { Button } from "@/components/ui/button";
import { CHALLENGE_CHANGED_EVENT, notifyChallengeMutation } from "@/hooks/use-challenge-notifications";
import { challengeError, challengeRoundsLabel } from "./challenge-ui";
import { ChallengeSummary } from "./challenge-summary";
import { ChallengeResultPanel } from "./challenge-result";
import { ChallengeShareLink } from "./challenge-share-link";

export function ChallengeInvite({ challengeId }: { challengeId: string }) {
  const { locale, t } = useT();
  const { user, loaded } = useAuth();
  const ownerId = user?.id ?? "guest";
  const id = useId();
  const [record, setRecord] = useState<GeoChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<GeoChallengeAction | null>(null);
  const [guestName, setGuestName] = useState("");
  const [success, setSuccess] = useState("");
  const sequence = useRef(0);
  const mounted = useRef(true);
  const lock = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (!loaded) return;
    const request = ++sequence.current;
    const current = () => mounted.current && request === sequence.current && (useAuth.getState().user?.id ?? "guest") === ownerId;
    if (!quiet) setLoading(true);
    try {
      const response = await apiGeoChallenge(challengeId);
      if (!current()) return;
      if (response.challenge) {
        setRecord(response.challenge);
        setError(response.error);
      } else {
        setRecord(null);
        setError(!response.configured ? "not_configured" : response.error ?? "not_found");
      }
    } catch { if (current()) setError("network_error"); }
    finally { if (current()) setLoading(false); }
  }, [loaded, ownerId, challengeId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const refresh = () => { if (document.visibilityState === "visible" && !lock.current) void load(true); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(CHALLENGE_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mounted.current = false;
      sequence.current += 1;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(CHALLENGE_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  async function act(action: GeoChallengeAction, asGuest = false) {
    if (lock.current || !record) return;
    const name = asGuest ? validateName(guestName) : null;
    if (asGuest && !name) { setError("invalid_guest_name"); return; }
    lock.current = true;
    sequence.current += 1;
    setBusy(action);
    setError(undefined);
    setSuccess("");
    try {
      const response = await apiActGeoChallenge(challengeId, action, name ?? undefined);
      if (!mounted.current || (useAuth.getState().user?.id ?? "guest") !== ownerId) return;
      if (!response.ok) {
        setError(response.error ?? "request_failed");
        if (["invitation_taken", "invalid_transition", "expired"].includes(response.error ?? "")) await load(true);
      } else {
        setSuccess(action === "accept" ? (locale === "de" ? "Angenommen. Dein Versuch ist bereit." : "Accepted. Your attempt is ready.") : action === "cancel" ? (locale === "de" ? "Einladung zurückgezogen." : "Invitation cancelled.") : (locale === "de" ? "Einladung abgelehnt." : "Invitation declined."));
        // Only the fresh authorized response may expose the shared seed or Play action.
        setRecord((previous) => previous ? { ...previous, canAccept: false } : null);
        await load(true);
        notifyChallengeMutation();
      }
    } catch { if (mounted.current) setError("network_error"); }
    finally { lock.current = false; if (mounted.current) setBusy(null); }
  }

  const expired = record && record.status !== "resolved" ? !Number.isFinite(Date.parse(record.expiresAt)) || Date.parse(record.expiresAt) <= Date.now() || record.status === "expired" : false;
  const creator = Boolean(record && (record.viewerRole === "challenger" || (!record.viewerRole && user && record.direction === "sent")));
  const participant = Boolean(record && (record.viewerRole === "challenger" || record.viewerRole === "opponent" || (!record.viewerRole && user && record.direction !== "open")));
  const canAccept = Boolean(record && record.status === "pending" && !expired && !creator && record.canAccept);
  const canPlay = Boolean(record && participant && record.seed && record.status === "active" && !expired && !record.viewerAttempted);
  const guest = Boolean(record?.viewerIsGuest);
  const closed = Boolean(record && (expired || ["declined", "cancelled", "expired"].includes(record.status) || (!participant && record.status !== "pending")));
  const title = record ? creator ? (record.opponentName ? (locale === "de" ? `Du forderst ${record.opponentName} heraus` : `You challenged ${record.opponentName}`) : (locale === "de" ? "Warten auf ein Gegenüber" : "Waiting for an opponent")) : (locale === "de" ? `Herausforderung von ${record.challengerName}` : `Challenge from ${record.challengerName}`) : (locale === "de" ? "Deine Einladung" : "Your invitation");

  return <section aria-labelledby={`${id}-title`} className="mb-6 min-w-0 rounded-2xl border border-primary/30 bg-card p-4 sm:p-6">
    <div className="flex items-start justify-between gap-3"><h2 id={`${id}-title`} className="min-w-0 break-words text-xl font-bold">{title}</h2><Button type="button" variant="ghost" size="icon" disabled={loading || busy !== null} onClick={() => void load()} aria-label={locale === "de" ? "Einladung neu laden" : "Reload invitation"}><RefreshCw className="h-4 w-4" aria-hidden /></Button></div>
    {loading && !record ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{locale === "de" ? "Einladung wird geladen…" : "Loading invitation…"}</p> : record && <>
      <p className="mt-2 text-sm text-muted-foreground">{t(`games.${record.gameId}.name`)} · {challengeRoundsLabel(record.rounds, locale)}</p>
      {(guest || record.opponentIsGuest) && <p className="mt-2 text-xs font-semibold text-primary">{locale === "de" ? "Gastspiel · Ohne Duell-Ranglistenwertung" : "Guest game · Casual, unranked duel"}</p>}
      <div className="mt-4"><ChallengeSummary challenge={record} locked /></div>
      {["pending", "active"].includes(record.status) && !expired && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{record.status === "pending" ? (locale === "de" ? "Annehmen bis" : "Accept by") : (locale === "de" ? "Spielen bis" : "Finish by")} <time dateTime={record.expiresAt}>{new Date(record.expiresAt).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>. {locale === "de" ? "Ihr spielt unabhängig voneinander, mit denselben Fragen und einem Versuch pro Person." : "Play at your own pace, with the same questions and one attempt each."}</p>}
      {canAccept && user && <div className="mt-4 flex flex-wrap gap-2"><Button type="button" disabled={busy !== null} onClick={() => void act("accept")} className="gap-2">{busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}{locale === "de" ? "Annehmen" : "Accept challenge"}</Button>{record.direction === "received" && <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void act("decline")}>{locale === "de" ? "Ablehnen" : "Decline"}</Button>}</div>}
      {canAccept && !user && record.invitationType === "link" && !guest && <form className="mt-4 max-w-md" onSubmit={(event) => { event.preventDefault(); void act("accept", true); }}>
        <label htmlFor={`${id}-guest`} className="text-sm font-semibold">{locale === "de" ? "Dein Gastname" : "Your guest display name"}</label>
        <input id={`${id}-guest`} name="guestName" value={guestName} onChange={(event) => setGuestName(event.target.value)} disabled={busy !== null} required minLength={2} maxLength={20} autoComplete="nickname" autoCapitalize="none" aria-invalid={error === "invalid_guest_name"} aria-describedby={`${id}-guest-help${error ? ` ${id}-error` : ""}`} className="mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <p id={`${id}-guest-help`} className="mt-2 text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Ohne Registrierung. Dieses Duell ist zwanglos und zählt nicht für die Duell-Rangliste. Kehre im selben Browser zurück, damit dein Gastzugang erhalten bleibt." : "No registration needed. This duel is casual and does not count toward duel rankings. Return in the same browser to keep access to your guest attempt."}</p>
        <Button type="submit" disabled={busy !== null} className="mt-3 gap-2">{busy === "accept" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{locale === "de" ? "Als Gast spielen" : "Play as guest"}</Button>
      </form>}
      {canPlay && <Link href={`/play/${record.gameId}?challenge=${encodeURIComponent(record.id)}`} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Play className="h-4 w-4" aria-hidden />{record.viewerStarted ? (locale === "de" ? "Versuchsstatus öffnen" : "Open attempt status") : (locale === "de" ? "Deinen Versuch spielen" : "Play your attempt")}</Link>}
      {guest && participant && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Speichere diesen Einladungslink und kehre im selben Browser zurück. Dein Gastzugang gilt nur für diese Herausforderung." : "Save this invitation link and return in the same browser. Your guest access is only for this challenge."}</p>}
      {record.status === "active" && participant && record.viewerAttempted && <div className="mt-4"><ChallengeResultPanel challenge={record} status="saved" onRetry={() => undefined} /></div>}
      {record.status === "resolved" && participant && <div className="mt-4"><ChallengeResultPanel challenge={record} status="saved" onRetry={() => undefined} /></div>}
      {creator && record.status === "pending" && !expired && <>
        {record.sharePath && <div className="mt-4 max-w-lg"><ChallengeShareLink path={record.sharePath} /></div>}
        <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void act("cancel")} className="mt-3">{busy === "cancel" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{locale === "de" ? "Einladung zurückziehen" : "Cancel invitation"}</Button>
      </>}
      {closed && <div className="mt-4"><p className="text-sm font-semibold">{expired ? (locale === "de" ? "Diese Herausforderung ist abgelaufen." : "This challenge has expired.") : record.status === "cancelled" ? (locale === "de" ? "Diese Einladung wurde zurückgezogen." : "This invitation was cancelled.") : record.status === "declined" ? (locale === "de" ? "Diese Einladung wurde abgelehnt." : "This invitation was declined.") : (locale === "de" ? "Dieser Platz ist bereits vergeben." : "This seat has already been claimed.")}</p><Link href="/challenges#open-challenges" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Ein anderes Gegenüber finden" : "Find another opponent"}</Link></div>}
      {!user && !guest && !closed && <div className="mt-4 max-w-md">{record.invitationType === "link" ? <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Lieber mit Konto anmelden" : "Prefer to sign in with an account?"}</summary><AccountPanel /></details> : <><p className="mb-3 text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Für eine offene Herausforderung brauchst du ein GeoNerds-Konto. Melde dich an, um den Platz anzunehmen." : "Open challenges require a GeoNerds account. Sign in to take the seat."}</p><AccountPanel /></>}</div>}
    </>}
    {success && <p role="status" className="mt-3 text-sm font-semibold text-success">{success}</p>}
    {error && <div className="mt-3"><p id={`${id}-error`} role="alert" className="text-sm leading-relaxed text-danger">{challengeError(error, locale)}</p><Button type="button" variant="outline" disabled={loading || busy !== null} onClick={() => void load()} className="mt-3">{locale === "de" ? "Erneut laden" : "Reload invitation"}</Button>{!record && <Link href="/challenges#open-challenges" className="ml-3 inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Andere Herausforderungen" : "Find another challenge"}</Link>}{!record && !user && error === "unauthorized" && <div className="mt-4 max-w-md"><AccountPanel /></div>}</div>}
  </section>;
}
