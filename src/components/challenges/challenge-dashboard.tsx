"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Loader2, Play, RefreshCw, Swords } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useAuth } from "@/store/auth";
import { AccountPanel } from "@/components/account/account-panel";
import { Button } from "@/components/ui/button";
import { apiActGeoChallenge, apiGeoChallenges, apiGeoOpenChallenges } from "@/lib/challenge-online";
import type { GeoChallenge, GeoChallengeAction } from "@/lib/challenges";
import { cn } from "@/lib/utils";
import { CHALLENGE_CHANGED_EVENT, notifyChallengeMutation } from "@/hooks/use-challenge-notifications";
import { challengeBotLabel, challengeError, challengeRoundsLabel, isBotChallenge } from "./challenge-ui";
import { ChallengeForm } from "./challenge-form";
import { ChallengeInvite } from "./challenge-invite";
import { ChallengeSummary } from "./challenge-summary";
import { ChallengeShareLink } from "./challenge-share-link";

type Tab = "incoming" | "active" | "sent" | "results";
const TAB_NAMES = { incoming: { de: "Eingang", en: "Inbox" }, active: { de: "Aktiv", en: "Active" }, sent: { de: "Gesendet", en: "Sent" }, results: { de: "Verlauf", en: "History" } };
const linkClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function matchesTab(challenge: GeoChallenge, tab: Tab) {
  return tab === "incoming" ? challenge.status === "pending" && challenge.direction === "received" : tab === "sent" ? challenge.status === "pending" && challenge.direction === "sent" : tab === "active" ? challenge.status === "active" : !["pending", "active"].includes(challenge.status);
}

export function ChallengeDashboard() {
  const { locale } = useT();
  const { user, loaded, configured } = useAuth();
  const searchParams = useSearchParams();
  const initialOpponent = (searchParams.get("opponent") ?? "").slice(0, 20);
  const initialBot = searchParams.get("opponentType") === "bot";
  const inviteId = searchParams.get("invite") || searchParams.get("challenge");

  return <div className="geo-aurora flex flex-1 flex-col"><div className="mx-auto w-full max-w-5xl px-4 py-5 pb-20 sm:py-8">
    <Link href="/" className="mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" aria-hidden />{locale === "de" ? "Zu den Spielen" : "Back to games"}</Link>
    <header className="mb-6"><h1 className="text-3xl font-extrabold tracking-tight">{locale === "de" ? "Herausforderungen" : "Challenges"}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Spiele sofort gegen GeoBot oder fordere andere GeoNerds heraus. Bot-Training ohne Warten; Duelle mit Menschen spielt ihr unabhängig voneinander." : "Play GeoBot immediately or challenge other GeoNerds. Bot training without the wait; human opponents play at their own pace."}</p></header>
    {inviteId && <ChallengeInvite key={`invitation:${inviteId}:${user?.id ?? "guest"}`} challengeId={inviteId} />}
    {/* Sibling keys include section identity; an account ID alone collides with the lobby. */}
    {!loaded ? <Loading label={locale === "de" ? "Konto wird geladen…" : "Loading account…"} /> : !configured ? <div className="rounded-xl border border-border bg-card p-4"><h2 className="font-bold">{locale === "de" ? "Herausforderungen sind gerade nicht verfügbar" : "Challenges are currently unavailable"}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{challengeError("not_configured", locale)}</p><Button variant="outline" onClick={() => void useAuth.getState().refresh().catch(() => undefined)} className="mt-3">{locale === "de" ? "Erneut prüfen" : "Check again"}</Button></div> : user ? <MyChallenges key={`my-challenges:${user.id}`} ownerId={user.id} initialOpponent={initialOpponent} initialBot={initialBot} /> : !inviteId && <section className="mb-6 max-w-lg rounded-xl border border-border bg-card p-4"><h2 className="text-lg font-bold">{locale === "de" ? "Mitmachen mit deinem GeoNerds-Konto" : "Join in with your GeoNerds account"}</h2><p className="mb-4 mt-2 text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Melde dich an, um sofort gegen einen Bot zu spielen, jemanden einzuladen oder eine offene Herausforderung anzunehmen. Über einen Einladungslink kannst du auch ohne Konto mitspielen." : "Sign in to play a bot immediately, invite someone or join an open challenge. With an invite link, you can also play without an account."}</p><AccountPanel /></section>}
    {loaded && configured && <OpenChallengeLobby key={`open-lobby:${user?.id ?? "guest"}`} ownerId={user?.id} />}
  </div></div>;
}

function MyChallenges({ ownerId, initialOpponent, initialBot }: { ownerId: string; initialOpponent: string; initialBot: boolean }) {
  const { locale } = useT();
  const [challenges, setChallenges] = useState<GeoChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<Tab>("incoming");
  const [limit, setLimit] = useState(6);
  const [busyId, setBusyId] = useState<string>();
  const sequence = useRef(0);
  const mounted = useRef(true);
  const mutationLock = useRef(false);
  const userSelectedTab = useRef(false);
  const initialTabSet = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (useAuth.getState().user?.id !== ownerId) return;
    const request = ++sequence.current;
    const current = () => mounted.current && request === sequence.current && useAuth.getState().user?.id === ownerId;
    if (!quiet) setLoading(true);
    try {
      const data = await apiGeoChallenges();
      if (!current()) return;
      setError(!data.configured ? "not_configured" : data.error);
      if (!data.error) {
        const entries = data.challenges.slice(0, 100);
        setChallenges(entries);
        if (!initialTabSet.current && !userSelectedTab.current) {
          setTab(entries.some((entry) => matchesTab(entry, "incoming")) ? "incoming" : entries.some((entry) => matchesTab(entry, "active")) ? "active" : entries.some((entry) => matchesTab(entry, "sent")) ? "sent" : "incoming");
          initialTabSet.current = true;
        }
      }
      if (data.error === "unauthorized") void useAuth.getState().refresh().catch(() => undefined);
    } catch { if (current()) setError("network_error"); }
    finally { if (current()) setLoading(false); }
  }, [ownerId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const refresh = () => { if (document.visibilityState === "visible" && !mutationLock.current) void load(true); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(CHALLENGE_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { mounted.current = false; sequence.current += 1; clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener(CHALLENGE_CHANGED_EVENT, refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);

  async function act(id: string, action: GeoChallengeAction) {
    if (mutationLock.current || useAuth.getState().user?.id !== ownerId) return;
    mutationLock.current = true;
    sequence.current += 1;
    setBusyId(id);
    setError(undefined);
    setSuccess("");
    try {
      const data = await apiActGeoChallenge(id, action);
      if (!mounted.current || useAuth.getState().user?.id !== ownerId) return;
      if (!data.ok) {
        setError(data.error ?? "request_failed");
        if (data.error === "unauthorized") void useAuth.getState().refresh().catch(() => undefined);
      } else {
        setSuccess(action === "accept" ? (locale === "de" ? "Angenommen. Du kannst deinen Versuch jetzt spielen." : "Accepted. You can play your attempt now.") : action === "decline" ? (locale === "de" ? "Einladung abgelehnt." : "Invitation declined.") : (locale === "de" ? "Einladung zurückgezogen." : "Invitation cancelled."));
        if (action === "accept") { setTab("active"); setLimit(6); }
        await load(true);
        notifyChallengeMutation();
      }
    } catch { if (mounted.current) setError("network_error"); }
    finally { mutationLock.current = false; if (mounted.current) setBusyId(undefined); }
  }

  const visible = challenges.filter((entry) => matchesTab(entry, tab));
  const incoming = challenges.filter((entry) => matchesTab(entry, "incoming")).length;
  const results = challenges.filter((entry) => entry.status === "resolved" && !entry.viewerIsGuest && !entry.opponentIsGuest && !isBotChallenge(entry));
  const empty = tab === "incoming" ? (locale === "de" ? "Keine neuen Einladungen. Spiele sofort gegen einen Bot oder finde unten eine offene Herausforderung." : "No new invitations. Play a bot now or find an open challenge below.") : tab === "active" ? (locale === "de" ? "Bot-Duelle sind sofort spielbereit. Duelle mit Menschen erscheinen nach der Annahme hier." : "Bot duels are ready immediately. Human duels appear here once accepted.") : tab === "sent" ? (locale === "de" ? "Noch keine wartenden Einladungen. Für sofortiges Training kannst du ein Bot-Duell starten." : "No invitations awaiting acceptance. Start a bot duel for immediate training.") : (locale === "de" ? "Abgeschlossene Bot-Trainings sowie abgeschlossene, abgelehnte und abgelaufene Einladungen erscheinen hier." : "Completed bot training and completed, declined or expired invitations appear here.");

  return <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
    <div key={`challenge-launcher:${ownerId}`} className="min-w-0 lg:col-start-1 lg:row-start-1"><ChallengeForm key={`challenge-form:${ownerId}:${initialOpponent}:${initialBot}`} initialOpponent={initialOpponent} initialBot={initialBot} onCreated={(_id, method) => { userSelectedTab.current = true; setTab(method === "bot" ? "active" : "sent"); setLimit(6); void load(true); notifyChallengeMutation(); }} /></div>
    <section key={`my-challenges-list:${ownerId}`} aria-labelledby="my-challenges-title" className="min-w-0 lg:col-start-2 lg:row-start-1">
      <div className="mb-3 flex items-center justify-between gap-2"><div className="min-w-0"><h2 id="my-challenges-title" className="text-xl font-bold">{locale === "de" ? "Deine Herausforderungen" : "Your challenges"}</h2>{incoming > 0 && <p className="mt-1 text-xs font-semibold text-primary">{locale === "de" ? `${incoming} neue ${incoming === 1 ? "Einladung" : "Einladungen"}` : `${incoming} new ${incoming === 1 ? "invitation" : "invitations"}`}</p>}</div><Button variant="outline" size="icon" disabled={loading || busyId !== undefined} onClick={() => void load()} aria-label={locale === "de" ? "Herausforderungen neu laden" : "Reload challenges"}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden /></Button></div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={locale === "de" ? "Herausforderungen filtern" : "Filter challenges"}>{(Object.keys(TAB_NAMES) as Tab[]).map((item) => <button key={item} type="button" aria-pressed={tab === item} onClick={() => { userSelectedTab.current = true; setTab(item); setLimit(6); }} className={cn("flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{TAB_NAMES[item][locale]}<span className={cn("rounded px-1.5 py-0.5 tabular-nums", tab === item ? "bg-white/15" : "bg-muted")}>{challenges.filter((entry) => matchesTab(entry, item)).length}</span></button>)}</div>
      {success && <p role="status" className="mb-3 flex items-start gap-2 text-sm leading-relaxed"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{success}</p>}
      {error && <div className="mb-3 rounded-lg border border-danger/20 bg-danger/5 p-3"><p role="alert" className="text-sm leading-relaxed text-danger">{challengeError(error, locale)}</p><Button variant="outline" disabled={loading} onClick={() => void load()} className="mt-2">{locale === "de" ? "Erneut laden" : "Try again"}</Button></div>}
      {loading && !challenges.length ? <Loading label={locale === "de" ? "Herausforderungen werden geladen…" : "Loading challenges…"} /> : visible.length ? <ul className="space-y-3">{visible.slice(0, limit).map((entry) => <li key={entry.id}><ChallengeCard challenge={entry} busy={busyId !== undefined} busyHere={busyId === entry.id} onAct={act} /></li>)}</ul> : !error && <p className="rounded-xl border border-dashed border-border bg-card/60 p-4 text-sm leading-relaxed text-muted-foreground">{empty}</p>}
      {visible.length > limit && <Button variant="outline" className="mt-3 w-full" onClick={() => setLimit((value) => Math.min(value + 6, 100))}>{locale === "de" ? "Weitere anzeigen" : "Show more"}</Button>}
      {results.length > 0 && <p className="mt-4 text-xs text-muted-foreground">{locale === "de" ? "Deine Duelle" : "Your duels"}: {results.filter((entry) => entry.viewerOutcome === "win").length} {locale === "de" ? "Siege" : "wins"} · {results.filter((entry) => entry.viewerOutcome === "loss").length} {locale === "de" ? "Niederlagen" : "losses"} · {results.filter((entry) => entry.viewerOutcome === "draw").length} {locale === "de" ? "Unentschieden" : "draws"}</p>}
    </section>
  </div>;
}

function ChallengeCard({ challenge, busy, busyHere, onAct }: { challenge: GeoChallenge; busy: boolean; busyHere: boolean; onAct: (id: string, action: GeoChallengeAction) => Promise<void> }) {
  const { t, locale } = useT();
  const [expanded, setExpanded] = useState(false);
  const expired = Date.parse(challenge.expiresAt) <= Date.now() || challenge.status === "expired";
  const resolved = challenge.status === "resolved";
  const bot = isBotChallenge(challenge);
  const status = expired && !resolved ? (locale === "de" ? "Abgelaufen" : "Expired") : challenge.status === "pending" ? challenge.direction === "received" ? (locale === "de" ? "Neue Einladung" : "New invitation") : (locale === "de" ? "Wartet auf Annahme" : "Awaiting acceptance") : challenge.status === "active" ? challenge.viewerAttempted ? bot ? (locale === "de" ? "Gespeichert · Bot-Vergleich wird geladen" : "Saved · Loading bot comparison") : (locale === "de" ? "Gespeichert · Warten auf dein Gegenüber" : "Saved · Waiting for your opponent") : challenge.viewerStarted ? (locale === "de" ? "Versuch begonnen" : "Attempt started") : (locale === "de" ? "Dein Versuch ist bereit" : "Your attempt is ready") : resolved ? challenge.viewerOutcome === "win" ? (locale === "de" ? "Gewonnen" : "You won") : challenge.viewerOutcome === "loss" ? bot ? (locale === "de" ? "GeoBot gewinnt" : "GeoBot won") : (locale === "de" ? "Dein Gegenüber gewinnt" : "Opponent won") : (locale === "de" ? "Unentschieden" : "Draw") : challenge.status === "declined" ? (locale === "de" ? "Abgelehnt" : "Declined") : (locale === "de" ? "Zurückgezogen" : "Cancelled");
  const rival = challenge.opponentName;
  return <article className="min-w-0 rounded-xl border border-border bg-card p-4">
    <h3 className="break-words text-sm font-bold">{rival ? <>{locale === "de" ? "Gegen" : "Against"} {bot ? <span>{rival}</span> : challenge.opponentIsGuest ? <span>{rival} <span className="font-normal text-muted-foreground">({locale === "de" ? "Gast" : "Guest"})</span></span> : <Link href={`/u/${encodeURIComponent(rival)}`} className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{rival}</Link>}</> : (locale === "de" ? "Warten auf ein Gegenüber" : "Waiting for an opponent")}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{t(`games.${challenge.gameId}.name`)} · {challengeRoundsLabel(challenge.rounds, locale)}</p>
    <p className="mt-2 text-xs font-semibold text-primary">{status}</p>
    {bot && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{challengeBotLabel(challenge, locale)} · {locale === "de" ? "Training ohne Ranglistenwertung" : "Unranked training"}</p>}
    {(challenge.viewerIsGuest || challenge.opponentIsGuest) && <p className="mt-1 text-xs text-muted-foreground">{locale === "de" ? "Gastspiel · Ohne Ranglistenwertung" : "Guest game · Unranked"}</p>}
    {["pending", "active"].includes(challenge.status) && !expired && <p className="mt-2 text-xs text-muted-foreground">{challenge.status === "pending" ? (locale === "de" ? "Annehmen bis" : "Accept by") : (locale === "de" ? "Spielen bis" : "Finish by")} <time dateTime={challenge.expiresAt}>{new Date(challenge.expiresAt).toLocaleDateString(locale, { day: "numeric", month: "short" })}</time></p>}
    {challenge.status === "pending" && !expired && <div className="mt-3 flex flex-wrap gap-2">{challenge.direction === "received" ? <><Button disabled={busy} onClick={() => void onAct(challenge.id, "accept")}>{busyHere && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{locale === "de" ? "Annehmen" : "Accept"}</Button><Button variant="outline" disabled={busy} onClick={() => void onAct(challenge.id, "decline")}>{locale === "de" ? "Ablehnen" : "Decline"}</Button></> : <Button variant="outline" disabled={busy} onClick={() => void onAct(challenge.id, "cancel")}>{locale === "de" ? "Zurückziehen" : "Cancel invitation"}</Button>}</div>}
    {challenge.status === "active" && !expired && !challenge.viewerAttempted && <Link href={`/play/${challenge.gameId}?challenge=${encodeURIComponent(challenge.id)}`} className={cn("mt-3", linkClass)}><Play className="h-4 w-4" aria-hidden />{challenge.viewerStarted ? (locale === "de" ? "Versuchsstatus öffnen" : "Open attempt status") : (locale === "de" ? "Deinen Versuch spielen" : "Play your attempt")}</Link>}
    <div className="mt-1 flex flex-wrap gap-x-4"><Link href={`/challenges?invite=${encodeURIComponent(challenge.id)}`} className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{resolved ? (locale === "de" ? "Ergebnisse vergleichen" : "Compare results") : bot ? (locale === "de" ? "Bot-Training ansehen" : "View bot training") : (locale === "de" ? "Einladung öffnen" : "View challenge")}</Link>{!resolved && <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="min-h-11 rounded text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{expanded ? (locale === "de" ? "Einstellungen ausblenden" : "Hide settings") : (locale === "de" ? "Einstellungen" : "Settings")}</button>}</div>
    {expanded && <div className="mt-2"><ChallengeSummary challenge={challenge} locked />{challenge.sharePath && challenge.status === "pending" && !expired && <div className="mt-3"><ChallengeShareLink path={challenge.sharePath} /></div>}</div>}
  </article>;
}

function OpenChallengeLobby({ ownerId }: { ownerId?: string }) {
  const { locale, t } = useT();
  const [entries, setEntries] = useState<GeoChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [limit, setLimit] = useState(8);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    try {
      const data = await apiGeoOpenChallenges(request.signal);
      if (request.signal.aborted || useAuth.getState().user?.id !== ownerId) return;
      setError(!data.configured ? "not_configured" : data.error);
      if (!data.error) setEntries(data.challenges.filter((entry) => entry.status === "pending" && Date.parse(entry.expiresAt) > Date.now()).slice(0, 50));
    } catch { if (!request.signal.aborted) setError("network_error"); }
    finally { if (!request.signal.aborted) setLoading(false); }
  }, [ownerId]);

  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(CHALLENGE_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.current?.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener(CHALLENGE_CHANGED_EVENT, refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);

  return <section id="open-challenges" aria-labelledby="open-challenges-title" className="mt-8 min-w-0 scroll-mt-24 border-t border-border pt-6">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 id="open-challenges-title" className="text-xl font-bold">{locale === "de" ? "Offene Herausforderungen" : "Open challenges"}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Ein Platz ist frei. Schau dir die Einladung an und spiele mit." : "An open seat is waiting. View an invitation and join in."}</p></div><Button variant="outline" size="icon" disabled={loading} onClick={() => void load()} aria-label={locale === "de" ? "Offene Herausforderungen neu laden" : "Reload open challenges"}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden /></Button></div>
    {error && <div className="mt-3"><p role="alert" className="text-sm text-danger">{challengeError(error, locale)}</p><Button variant="outline" disabled={loading} onClick={() => void load()} className="mt-2">{locale === "de" ? "Erneut laden" : "Try again"}</Button></div>}
    {loading && !entries.length ? <Loading label={locale === "de" ? "Offene Einladungen werden geladen…" : "Loading open invitations…"} /> : entries.length ? <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">{entries.slice(0, limit).map((entry) => <li key={entry.id} className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 p-4"><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{entry.challengerName}</h3><p className="mt-1 text-sm text-muted-foreground">{t(`games.${entry.gameId}.name`)} · {challengeRoundsLabel(entry.rounds, locale)} · {t(`difficulty.${entry.difficulty}`)}</p><p className="mt-1 text-xs text-muted-foreground">{locale === "de" ? "Offen bis" : "Accept by"} {new Date(entry.expiresAt).toLocaleDateString(locale, { day: "numeric", month: "short" })}</p></div><Link href={`/challenges?invite=${encodeURIComponent(entry.id)}`} className="inline-flex min-h-11 max-w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{entry.viewerRole === "challenger" ? (locale === "de" ? "Deine Einladung" : "Your invitation") : (locale === "de" ? "Ansehen & mitspielen" : "View & join")}</Link></li>)}</ul> : !error && <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-border bg-card/60 p-4"><Swords className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden /><div className="min-w-0"><h3 className="text-sm font-semibold">{locale === "de" ? "Noch kein freier Platz" : "No open seats yet"}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Spiele währenddessen sofort gegen GeoBot. Oder erstelle eine offene Herausforderung, damit andere GeoNerds dich finden können." : "Play GeoBot immediately while you wait. Or create an open challenge so other GeoNerds can find you."}</p><Link href="/challenges?opponentType=bot" className="mt-2 inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Sofort gegen einen Bot spielen" : "Play a bot now"}</Link></div></div>}
    {entries.length > limit && <Button variant="outline" onClick={() => setLimit((value) => Math.min(value + 8, 50))} className="mt-3">{locale === "de" ? "Weitere anzeigen" : "Show more"}</Button>}
    {!ownerId && <p className="mt-3 text-xs text-muted-foreground">{locale === "de" ? "Offene Herausforderungen erfordern ein Konto. Gäste können über einen Einladungslink mitspielen." : "Open challenges require an account. Guests can play through an invite link."}</p>}
  </section>;
}

function Loading({ label }: { label: string }) {
  return <p role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{label}</p>;
}
