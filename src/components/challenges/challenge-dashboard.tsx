"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Swords, RefreshCw, Loader2, Check, Play, Trophy, Clock3, ArrowUpRight } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useAuth } from "@/store/auth";
import { AccountPanel } from "@/components/account/account-panel";
import { Button } from "@/components/ui/button";
import { apiActGeoChallenge, apiGeoChallenge, apiGeoChallenges } from "@/lib/challenge-online";
import type { GeoChallenge, GeoChallengeAction } from "@/lib/challenges";
import { getGame } from "@/games/registry";
import { cn } from "@/lib/utils";
import { challengeError } from "./challenge-ui";
import { ChallengeForm } from "./challenge-form";
import { ChallengeResultPanel } from "./challenge-result";
import { ChallengeSummary } from "./challenge-summary";

type Tab = "incoming" | "sent" | "active" | "results";
const TAB_NAMES = { incoming: { de: "Eingang", en: "Incoming" }, sent: { de: "Gesendet", en: "Sent" }, active: { de: "Aktiv", en: "Active" }, results: { de: "Ergebnisse", en: "Results" } };

function matchesTab(challenge: GeoChallenge, tab: Tab) {
  return tab === "incoming" ? challenge.status === "pending" && challenge.direction === "received" : tab === "sent" ? challenge.status === "pending" && challenge.direction === "sent" : tab === "active" ? challenge.status === "active" : !["pending", "active"].includes(challenge.status);
}

export function ChallengeDashboard() {
  const { locale } = useT();
  const { user, loaded, configured } = useAuth();
  const searchParams = useSearchParams();
  const initialOpponent = (searchParams.get("opponent") ?? "").slice(0, 20);
  const [challenges, setChallenges] = useState<GeoChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<Tab>("incoming");
  const [busyId, setBusyId] = useState<string>();
  const requestSequence = useRef<object | null>(null);
  const mutationLock = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (!user) { setLoading(false); return; }
    const sequence = {};
    requestSequence.current = sequence;
    if (!quiet) setLoading(true);
    try {
      const data = await apiGeoChallenges();
      if (sequence !== requestSequence.current) return;
      setAvailable(data.configured);
      setError(data.error);
      if (!data.error) setChallenges(data.challenges);
      if (data.error === "unauthorized") await useAuth.getState().refresh();
    } catch { if (sequence === requestSequence.current) setError("network_error"); }
    finally { if (sequence === requestSequence.current) setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (loaded && configured && user) void load();
    return () => { requestSequence.current = null; };
  }, [loaded, configured, user, load]);

  useEffect(() => {
    if (!user || !configured) return;
    const refresh = () => { if (document.visibilityState === "visible") void load(true); };
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [user, configured, load]);

  async function act(id: string, action: GeoChallengeAction) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusyId(id);
    setError(undefined);
    setSuccess("");
    try {
      const data = await apiActGeoChallenge(id, action);
      if (!data.ok) {
        setError(data.error);
        if (data.error === "unauthorized") await useAuth.getState().refresh();
      } else {
        setSuccess(action === "accept" ? (locale === "de" ? "Angenommen. Ihr könnt jetzt beide spielen." : "Accepted. Both players can now play.") : action === "decline" ? (locale === "de" ? "Herausforderung abgelehnt." : "Challenge declined.") : (locale === "de" ? "Einladung zurückgezogen." : "Invitation cancelled."));
        if (action === "accept") setTab("active");
        await load(true);
      }
    } catch { setError("network_error"); }
    finally { setBusyId(undefined); mutationLock.current = false; }
  }

  const results = challenges.filter((entry) => entry.status === "resolved");
  const stats = [
    { label: locale === "de" ? "Siege" : "Wins", count: results.filter((entry) => entry.viewerOutcome === "win").length },
    { label: locale === "de" ? "Niederlagen" : "Losses", count: results.filter((entry) => entry.viewerOutcome === "loss").length },
    { label: locale === "de" ? "Unentschieden" : "Draws", count: results.filter((entry) => entry.viewerOutcome === "draw").length },
  ];
  const visible = challenges.filter((entry) => matchesTab(entry, tab));

  return <div className="geo-aurora flex flex-1 flex-col"><div className="mx-auto w-full max-w-5xl px-4 py-8 pb-24 sm:py-12">
    <Link href="/" className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{locale === "de" ? "Zum Spielekatalog" : "Back to games"}</Link>
    <header className="mb-8 flex items-start gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"><Swords className="h-7 w-7" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-primary">{locale === "de" ? "Ihr zwei. Dieselbe Welt." : "Two players. One world."}</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{locale === "de" ? "Herausforderungen" : "Challenges"}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Fordere ein anderes GeoNerds-Konto heraus. Ihr spielt unabhängig voneinander mit denselben Fragen und Einstellungen." : "Challenge another GeoNerds account. Play at your own pace with exactly the same questions and settings."}</p></div></header>
    {!loaded ? <Loading label={locale === "de" ? "Konto wird geladen…" : "Loading account…"} /> : !configured || !available ? <div className="rounded-2xl border border-dashed border-border bg-card p-6"><h2 className="font-bold">{locale === "de" ? "Online-Herausforderungen sind gerade nicht verfügbar" : "Online challenges are currently unavailable"}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{challengeError("not_configured", locale)}</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/#games" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">{locale === "de" ? "Spiele entdecken" : "Explore games"}<ArrowUpRight className="h-4 w-4" /></Link><Button variant="outline" onClick={() => { void useAuth.getState().refresh().catch(() => setError("network_error")); void load(); }}>{locale === "de" ? "Erneut prüfen" : "Check again"}</Button></div></div> : !user ? <div className="mx-auto max-w-lg"><h2 className="mb-2 text-xl font-bold">{locale === "de" ? "Melde dich mit deinem GeoNerds-Konto an" : "Sign in with your GeoNerds account"}</h2><p className="mb-5 text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Du brauchst kein neues Konto. Dein bestehender Benutzername und dein Passwort reichen." : "No new account needed. Use your existing username and passcode."}</p><AccountPanel /></div> : <>
      <div className="mb-6 grid grid-cols-3 gap-3">{stats.map((stat) => <div key={stat.label} className="rounded-xl border border-border bg-card/80 p-3 sm:p-4"><p className="text-2xl font-extrabold tabular-nums sm:text-3xl">{stat.count}</p><p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{stat.label}</p></div>)}</div>
      {success && <p role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 p-3 text-sm"><Check className="h-4 w-4 shrink-0 text-success" />{success}</p>}
      {error && <div role="alert" className="mb-5 rounded-xl border border-danger/20 bg-danger/5 p-3"><p className="text-sm leading-relaxed">{challengeError(error, locale)}</p><Button variant="outline" className="mt-3" onClick={() => void load()}>{locale === "de" ? "Erneut laden" : "Try again"}</Button></div>}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <ChallengeForm key={initialOpponent} initialOpponent={initialOpponent} onCreated={() => { setSuccess(locale === "de" ? "Einladung gesendet. Dein Gegenüber kann sie im Eingang annehmen." : "Invitation sent. Your opponent can accept it from their inbox."); setTab("sent"); void load(true); }} />
        <section aria-labelledby="challenge-list-title" className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-primary">{user.name}</p><h2 id="challenge-list-title" className="mt-1 text-xl font-bold">{locale === "de" ? "Deine Begegnungen" : "Your encounters"}</h2></div><Button variant="outline" size="icon" disabled={loading} onClick={() => void load()} aria-label={locale === "de" ? "Herausforderungen aktualisieren" : "Refresh challenges"}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></Button></div>
          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={locale === "de" ? "Herausforderungen filtern" : "Filter challenges"}>{(Object.keys(TAB_NAMES) as Tab[]).map((item) => <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)} className={cn("flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}>{TAB_NAMES[item][locale]}<span className={cn("rounded-md px-1.5 py-0.5 tabular-nums", tab === item ? "bg-white/15" : "bg-muted")}>{challenges.filter((entry) => matchesTab(entry, item)).length}</span></button>)}</div>
          {loading && !challenges.length ? <Loading label={locale === "de" ? "Herausforderungen werden geladen…" : "Loading challenges…"} /> : visible.length ? <div className="space-y-3">{visible.map((entry) => <ChallengeCard key={entry.id} challenge={entry} busy={busyId !== undefined} busyHere={busyId === entry.id} onAct={act} />)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card/60 p-7 text-center"><Swords className="mx-auto h-8 w-8 text-primary/60" /><h3 className="mt-3 font-bold">{locale === "de" ? "Hier ist noch alles offen" : "A fresh field of play"}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tab === "incoming" ? (locale === "de" ? "Neue Einladungen landen hier. Oder mache selbst den ersten Schritt." : "New invitations arrive here. Or make the first move yourself.") : tab === "sent" ? (locale === "de" ? "Sende eine Einladung mit dem Formular. Sie erscheint hier bis zur Annahme." : "Send an invitation using the form. It stays here until accepted.") : tab === "active" ? (locale === "de" ? "Nach der Annahme könnt ihr beide euren einen Versuch starten." : "Once a challenge is accepted, both players can start their one attempt.") : (locale === "de" ? "Eure abgeschlossenen Begegnungen und Ergebnisse erscheinen hier." : "Completed encounters and their results appear here.")}</p></div>}
        </section>
      </div>
    </>}
  </div></div>;
}

function Loading({ label }: { label: string }) { return <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{label}</p>; }

function ChallengeCard({ challenge, busy, busyHere, onAct }: { challenge: GeoChallenge; busy: boolean; busyHere: boolean; onAct: (id: string, action: GeoChallengeAction) => Promise<void> }) {
  const { t, locale } = useT();
  const config = getGame(challenge.gameId);
  const Icon = config?.icon ?? Swords;
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<GeoChallenge>();
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string>();
  const detailLock = useRef(false);
  const isResolved = challenge.status === "resolved";
  const status = challenge.status === "pending" ? challenge.direction === "received" ? (locale === "de" ? "Neue Einladung" : "New invitation") : (locale === "de" ? "Wartet auf Annahme" : "Awaiting acceptance") : challenge.status === "active" ? challenge.viewerAttempted ? (locale === "de" ? "Dein Ergebnis ist gespeichert" : "Your result is saved") : challenge.viewerStarted ? (locale === "de" ? "Dein Versuch wurde begonnen" : "Your attempt has started") : (locale === "de" ? "Bereit für deinen Versuch" : "Ready for your attempt") : isResolved ? challenge.viewerOutcome === "win" ? (locale === "de" ? "Gewonnen" : "You won") : challenge.viewerOutcome === "loss" ? (locale === "de" ? "Dein Gegenüber gewinnt" : "Opponent won") : (locale === "de" ? "Unentschieden" : "Draw") : challenge.status === "expired" ? (locale === "de" ? "Abgelaufen" : "Expired") : challenge.status === "declined" ? (locale === "de" ? "Abgelehnt" : "Declined") : (locale === "de" ? "Zurückgezogen" : "Cancelled");

  async function toggleDetails() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (!isResolved || details || detailLock.current) return;
    detailLock.current = true;
    setFetching(true);
    setError(undefined);
    try {
      const data = await apiGeoChallenge(challenge.id);
      if (data.challenge) setDetails(data.challenge); else setError(data.error ?? "not_found");
      if (data.error === "unauthorized") await useAuth.getState().refresh();
    } catch { setError("network_error"); }
    finally { setFetching(false); detailLock.current = false; }
  }

  return <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    <div className="flex items-start gap-3"><span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white", config?.gradient ?? "from-sky-500 to-teal-500")}><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{locale === "de" ? "Gegen" : "Against"} <Link href={`/u/${encodeURIComponent(challenge.opponentName)}`} className="text-primary hover:underline">{challenge.opponentName}</Link></p><h3 className="mt-0.5 text-sm text-muted-foreground">{t(`games.${challenge.gameId}.name`)} · {challenge.rounds} {locale === "de" ? "Runden" : "rounds"}</h3><p className={cn("mt-2 inline-flex items-center gap-1 text-xs font-semibold", isResolved ? "text-amber-700 dark:text-amber-400" : "text-primary")}>{isResolved ? <Trophy className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{status}</p></div></div>
    {["pending", "active"].includes(challenge.status) && <p className="mt-3 text-[11px] text-muted-foreground">{locale === "de" ? "Offen bis" : "Complete by"} {new Date(challenge.expiresAt).toLocaleDateString(locale, { day: "numeric", month: "short" })}</p>}
    {challenge.status === "active" && challenge.viewerAttempted && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Warten auf dein Gegenüber. Der Vergleich bleibt bis dahin verborgen." : "Waiting for your opponent. The comparison stays hidden until then."}</p>}
    {challenge.status === "pending" && <div className="mt-4 flex flex-wrap gap-2">{challenge.direction === "received" ? <><Button size="sm" className="min-h-11 gap-1.5" disabled={busy} onClick={() => void onAct(challenge.id, "accept")}>{busyHere ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{locale === "de" ? "Annehmen" : "Accept"}</Button><Button variant="outline" size="sm" className="min-h-11" disabled={busy} onClick={() => void onAct(challenge.id, "decline")}>{locale === "de" ? "Ablehnen" : "Decline"}</Button></> : <Button variant="outline" size="sm" className="min-h-11" disabled={busy} onClick={() => void onAct(challenge.id, "cancel")}>{locale === "de" ? "Einladung zurückziehen" : "Cancel invitation"}</Button>}</div>}
    {challenge.status === "active" && !challenge.viewerAttempted && <Link href={`/play/${challenge.gameId}?challenge=${encodeURIComponent(challenge.id)}`} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Play className="h-4 w-4" />{challenge.viewerStarted ? (locale === "de" ? "Versuchsstatus öffnen" : "Open attempt status") : (locale === "de" ? "Deinen Versuch spielen" : "Play your attempt")}</Link>}
    <button type="button" aria-expanded={expanded} onClick={() => void toggleDetails()} className="mt-3 block min-h-11 text-xs font-semibold text-primary hover:underline">{expanded ? (locale === "de" ? "Details schließen" : "Hide details") : isResolved ? (locale === "de" ? "Ergebnisse vergleichen" : "Compare results") : (locale === "de" ? "Spielbedingungen anzeigen" : "View game settings")}</button>
    {expanded && <div className="mt-2">{fetching ? <Loading label={locale === "de" ? "Vergleich wird geladen…" : "Loading comparison…"} /> : error ? <p role="alert" className="text-sm text-danger">{challengeError(error, locale)}</p> : details && isResolved ? <ChallengeResultPanel challenge={details} status="saved" onRetry={() => undefined} /> : <ChallengeSummary challenge={challenge} locked />}</div>}
  </article>;
}
