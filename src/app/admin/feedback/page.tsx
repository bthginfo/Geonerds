"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Inbox, Lightbulb, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import type { FeedbackFilter, FeedbackStatus, FeedbackSubmission } from "@/lib/community";
import { apiAdminFeedback, apiSetFeedbackStatus, type AdminFeedbackResult } from "@/lib/community-online";
import { cn, formatNumber } from "@/lib/utils";
import { useAuth } from "@/store/auth";

export default function FeedbackAdminPage() {
  const { locale } = useT();
  const { user, loaded, configured } = useAuth();
  const de = locale === "de";

  return (
    <div className="geo-aurora flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 pb-24 sm:py-12">
        <Link href="/" className="mb-6 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{de ? "Zurück zu GeoNerds" : "Back to GeoNerds"}</Link>
        <header className="mb-8 flex items-start gap-3 sm:gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Lightbulb aria-hidden="true" className="h-6 w-6" /></span>
          <div className="min-w-0"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />{de ? "Nur für TheCreator" : "TheCreator only"}</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{de ? "Ideen aus der Community" : "Community ideas"}</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{de ? "Kleine Wünsche, neue Spiele und hilfreiche Hinweise – gesammelt an einem privaten Ort." : "Small wishes, new games and helpful notes, gathered in one private place."}</p></div>
        </header>
        {!loaded ? <Loading label={de ? "Konto wird geprüft …" : "Checking account …"} /> : !configured ? (
          <StatePanel title={de ? "Online-Verbindung fehlt" : "Online service isn't connected"}>
            <p>{de ? "Die private Ideenliste ist ohne Online-Datenbank nicht verfügbar." : "The private ideas list isn't available without the online database."}</p>
            <Button variant="outline" className="mt-4" onClick={() => void useAuth.getState().refresh()}>{de ? "Erneut prüfen" : "Check again"}</Button>
          </StatePanel>
        ) : !user ? (
          <StatePanel title={de ? "Bitte melde dich an" : "Please sign in"}>
            <p>{de ? "Diese Liste ist privat. Melde dich mit dem TheCreator-Konto an, um Einsendungen zu lesen." : "This list is private. Sign in with the TheCreator account to read submissions."}</p>
            <Link href="/settings" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{de ? "Zum Konto" : "Go to account"}</Link>
          </StatePanel>
        ) : user.name.toLowerCase() !== "thecreator" ? (
          <StatePanel title={de ? "Dieser Bereich ist privat" : "This area is private"}>
            <p>{de ? "Nur das TheCreator-Konto kann Einsendungen ansehen. Deine eigenen Ideen kannst du auf der Startseite teilen." : "Only the TheCreator account can view submissions. You can share your own ideas from Home."}</p>
          </StatePanel>
        ) : <FeedbackInbox key={user.id} userId={user.id} />}
      </div>
    </div>
  );
}

type InboxData = Extract<AdminFeedbackResult, { ok: true }>;

function FeedbackInbox({ userId }: { userId: string }) {
  const { locale } = useT();
  const de = locale === "de";
  const [filter, setFilter] = useState<FeedbackFilter>("all");
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<FeedbackStatus | null>(null);
  const mutationLock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void apiAdminFeedback(filter, page, controller.signal).then((result) => {
      if (controller.signal.aborted || useAuth.getState().user?.id !== userId) return;
      if (!result.ok) {
        setData(null);
        setError(result.error);
        if (result.error === "unauthorized") void useAuth.getState().refresh();
      } else if (page > 0 && result.submissions.length === 0) {
        setPage(page - 1);
      } else {
        setData(result);
      }
      setLoading(false);
    });
    return () => { controller.abort(); };
  }, [filter, page, reload, userId]);

  async function mark(submission: FeedbackSubmission) {
    if (mutationLock.current || loading) return;
    mutationLock.current = true;
    const nextStatus = submission.status === "new" ? "reviewed" : "new";
    setBusyId(submission.id);
    setActionError(null);
    setConfirmation(null);
    try {
      const result = await apiSetFeedbackStatus(submission.id, nextStatus);
      if (!mounted.current || useAuth.getState().user?.id !== userId) return;
      if (!result.ok) {
        setActionError(result.error);
        if (["unauthorized", "forbidden"].includes(result.error)) {
          setData(null);
          setError(result.error);
          if (result.error === "unauthorized") void useAuth.getState().refresh();
        }
      } else {
        setConfirmation(nextStatus);
        setLoading(true);
        setReload((value) => value + 1);
      }
    } finally {
      mutationLock.current = false;
      if (mounted.current) setBusyId(null);
    }
  }

  const allCount = data?.allCount ?? (filter === "all" ? data?.total : undefined);
  const counts = { all: allCount, new: data?.newCount, reviewed: allCount === undefined ? undefined : Math.max(0, allCount - (data?.newCount ?? 0)) };
  const filters: { id: FeedbackFilter; name: string }[] = [
    { id: "all", name: de ? "Alle" : "All" },
    { id: "new", name: de ? "Neu" : "New" },
    { id: "reviewed", name: de ? "Gelesen" : "Reviewed" },
  ];
  const busy = loading || busyId !== null;

  return (
    <section aria-label={de ? "Private Einsendungen" : "Private submissions"}>
      <div className="mb-5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-2" aria-label={de ? "Einsendungen filtern" : "Filter submissions"}>
          {filters.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} disabled={busy} onClick={() => { setFilter(item.id); setPage(0); setActionError(null); setConfirmation(null); }} className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60", filter === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground")}><span>{item.name}</span><span className={cn("rounded-md px-1.5 py-0.5 tabular-nums", filter === item.id ? "bg-primary-foreground/10" : "bg-muted")}>{counts[item.id] === undefined ? "–" : formatNumber(counts[item.id]!, locale)}</span></button>)}
        </div>
        <Button type="button" variant="outline" size="icon" disabled={busy} onClick={() => setReload((value) => value + 1)} aria-label={de ? "Einsendungen aktualisieren" : "Refresh submissions"}><RefreshCw aria-hidden="true" className={cn("h-4 w-4", loading && "animate-spin")} /></Button>
      </div>
      {confirmation && <p role="status" className="mb-4 flex items-center gap-2 text-sm"><Check aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />{confirmation === "reviewed" ? (de ? "Als gelesen markiert." : "Marked as reviewed.") : (de ? "Wieder als neu markiert." : "Marked as new again.")}</p>}
      {actionError && !error && <p role="alert" className="mb-4 rounded-xl border border-danger/25 bg-danger/5 p-3 text-sm leading-relaxed">{adminError(actionError, locale)}</p>}
      {loading ? <Loading label={de ? "Ideen werden geladen …" : "Loading ideas …"} /> : error ? (
        <StatePanel title={error === "forbidden" || error === "unauthorized" ? (de ? "Zugriff nicht erlaubt" : "Access not allowed") : (de ? "Ideen gerade nicht verfügbar" : "Ideas currently unavailable")}>
          <p role="alert">{adminError(error, locale)}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => setReload((value) => value + 1)}>{de ? "Erneut versuchen" : "Try again"}</Button>
        </StatePanel>
      ) : data?.submissions.length ? (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{de ? "Neueste zuerst · Nachrichten werden nur als Text angezeigt." : "Newest first · Messages are displayed as plain text only."}</p>
          <div className="space-y-3">
            {data.submissions.map((submission) => <article key={submission.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0"><h2 className="break-words text-sm font-bold">{submission.authorName ?? (de ? "Anonym" : "Anonymous")}</h2><time dateTime={submission.createdAt} className="mt-1 block text-xs text-muted-foreground">{new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(submission.createdAt))}</time></div>
                <span className={cn("rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide", submission.status === "new" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{submission.status === "new" ? (de ? "Neu" : "New") : (de ? "Gelesen" : "Reviewed")}</span>
              </header>
              <p className="my-5 whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{submission.message}</p>
              <div className="border-t border-border/60 pt-3"><Button type="button" variant="outline" disabled={busy} className="min-h-11 w-full gap-2 px-3 sm:w-auto" onClick={() => void mark(submission)}>{busyId === submission.id ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : submission.status === "new" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Inbox aria-hidden="true" className="h-4 w-4" />}{submission.status === "new" ? (de ? "Als gelesen markieren" : "Mark reviewed") : (de ? "Als neu markieren" : "Mark new")}</Button></div>
            </article>)}
          </div>
        </>
      ) : (
        <StatePanel title={filter === "new" ? (de ? "Keine neuen Ideen" : "No new ideas") : filter === "reviewed" ? (de ? "Noch keine gelesenen Ideen" : "No reviewed ideas yet") : (de ? "Noch wartet die erste Idee" : "The first idea is still to come")}>
          <Inbox aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-primary/60" />
          <p>{filter === "new" ? (de ? "Alles gelesen. Neue Einsendungen erscheinen hier." : "All caught up. New submissions will appear here.") : filter === "reviewed" ? (de ? "Markiere eine neue Einsendung als gelesen, damit sie hier erscheint." : "Mark a new submission as reviewed to find it here.") : (de ? "Wenn jemand eine Idee auf der Startseite teilt, erscheint sie hier." : "When someone shares an idea from Home, it will appear here.")}</p>
        </StatePanel>
      )}
      {(page > 0 || data?.hasMore) && !error && <nav aria-label={de ? "Einsendungen: Seiten" : "Submissions pagination"} className="mt-5 flex items-center justify-between gap-2"><Button type="button" variant="outline" className="min-h-11 px-3" disabled={busy || page === 0} onClick={() => setPage(page - 1)}>{de ? "Zurück" : "Previous"}</Button><span className="text-xs tabular-nums text-muted-foreground">{de ? "Seite" : "Page"} {page + 1}</span><Button type="button" variant="outline" className="min-h-11 px-3" disabled={busy || !data?.hasMore} onClick={() => setPage(page + 1)}>{de ? "Weiter" : "Next"}</Button></nav>}
    </section>
  );
}

function StatePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/70 p-5 text-center sm:p-8"><h2 className="mb-2 text-lg font-bold">{title}</h2><div className="text-sm leading-relaxed text-muted-foreground">{children}</div></div>;
}

function Loading({ label }: { label: string }) {
  return <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />{label}</p>;
}

function adminError(error: string, locale: string) {
  const de = locale === "de";
  if (error === "unauthorized") return de ? "Deine Anmeldung ist abgelaufen. Bitte melde dich erneut mit dem TheCreator-Konto an." : "Your sign-in has expired. Please sign in again with the TheCreator account.";
  if (error === "forbidden") return de ? "Der Server erlaubt diesem Konto keinen Zugriff auf private Einsendungen." : "The server doesn't allow this account to access private submissions.";
  if (error === "not_configured") return de ? "Die Online-Datenbank ist noch nicht verbunden. Es können keine Einsendungen geladen werden." : "The online database isn't connected yet. Submissions can't be loaded.";
  if (error === "not_found") return de ? "Diese Einsendung wurde nicht gefunden. Aktualisiere die Liste." : "This submission wasn't found. Refresh the list.";
  if (error === "network_error") return de ? "Die Verbindung ist unterbrochen. Bitte versuche es erneut." : "The connection was interrupted. Please try again.";
  return de ? "Die Online-Verbindung ist gerade nicht verfügbar. Bitte versuche es später erneut." : "The online service is currently unavailable. Please try again later.";
}
