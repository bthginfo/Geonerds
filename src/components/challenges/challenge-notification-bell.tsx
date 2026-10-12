"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, Loader2, RefreshCw, X } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useAuth } from "@/store/auth";
import { useChallengeNotifications } from "@/hooks/use-challenge-notifications";
import type { GeoChallengeNotification } from "@/lib/challenges";
import { Button } from "@/components/ui/button";
import { challengeError } from "./challenge-ui";

export function ChallengeNotificationBell() {
  const userId = useAuth((state) => state.user?.id);
  return userId ? <NotificationBell key={userId} /> : null;
}

function NotificationBell() {
  const { locale } = useT();
  const notifications = useChallengeNotifications();
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [failure, setFailure] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const readLock = useRef(false);
  const id = useId();
  const unread = notifications.notifications.filter((item) => !item.readAt).slice(0, 12);

  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  async function dismiss(notificationId: string) {
    if (readLock.current) return;
    readLock.current = true;
    setReading(notificationId);
    setFailure(false);
    const ok = await notifications.markRead(notificationId);
    if (!ok) setFailure(true);
    setReading(null);
    readLock.current = false;
  }

  function textFor(item: GeoChallengeNotification) {
    const actor = item.actorName || (locale === "de" ? "Dein Gegenüber" : "Your opponent");
    const messages = {
      invited: locale === "de" ? `${actor} lädt dich zu einer Herausforderung ein.` : `${actor} invited you to a challenge.`,
      accepted: locale === "de" ? `${actor} hat angenommen. Dein Versuch ist bereit.` : `${actor} accepted. Your attempt is ready.`,
      declined: locale === "de" ? `${actor} hat die Einladung abgelehnt.` : `${actor} declined the invitation.`,
      cancelled: locale === "de" ? `${actor} hat die Einladung zurückgezogen.` : `${actor} cancelled the invitation.`,
      expired: locale === "de" ? "Die Herausforderung ist abgelaufen." : "The challenge has expired.",
      "opponent-finished": locale === "de" ? `${actor} ist fertig. Spiele deinen Versuch für den Vergleich.` : `${actor} finished. Complete your attempt to see the comparison.`,
      resolved: locale === "de" ? "Ihr seid beide fertig. Euer Ergebnis ist da." : "You both finished. Your result is ready.",
    };
    return messages[item.kind];
  }

  return <div ref={root} className="relative shrink-0">
    <button ref={button} type="button" aria-expanded={open} aria-haspopup="dialog" aria-controls={id} aria-label={locale === "de" ? `Benachrichtigungen, ${notifications.unreadCount} ungelesen` : `Notifications, ${notifications.unreadCount} unread`} onClick={() => { setOpen((previous) => !previous); if (!open) void notifications.refresh(); }} className="relative flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Bell className="h-5 w-5" aria-hidden />{notifications.unreadCount > 0 && <span className="absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-md bg-primary px-1 text-[10px] font-bold text-primary-foreground">{notifications.unreadCount > 99 ? "99+" : notifications.unreadCount}</span>}
    </button>
    {open && <section id={id} role="dialog" aria-labelledby={`${id}-title`} className="fixed inset-x-3 top-16 z-50 max-h-[min(70dvh,32rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-4 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-14 sm:w-96">
      <div className="flex items-center justify-between gap-2"><h2 id={`${id}-title`} className="min-w-0 text-base font-bold">{locale === "de" ? "Benachrichtigungen" : "Notifications"}</h2><Button ref={close} type="button" variant="ghost" size="icon" onClick={() => { setOpen(false); button.current?.focus(); }} aria-label={locale === "de" ? "Benachrichtigungen schließen" : "Close notifications"}><X className="h-4 w-4" aria-hidden /></Button></div>
      {(failure || notifications.error) && <div className="mt-2"><p role="alert" className="text-xs leading-relaxed text-danger">{failure ? (locale === "de" ? "Nicht als gelesen gespeichert. Bitte versuche es erneut." : "Could not mark as read. Please try again.") : challengeError(notifications.error, locale)}</p><Button type="button" variant="outline" onClick={() => void notifications.refresh()} disabled={notifications.loading} className="mt-2 gap-2"><RefreshCw className="h-4 w-4" aria-hidden />{locale === "de" ? "Neu laden" : "Reload"}</Button></div>}
      {notifications.loading && !unread.length ? <p role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{locale === "de" ? "Wird geladen…" : "Loading…"}</p> : unread.length ? <ul className="mt-2 divide-y divide-border">{unread.map((item) => <li key={item.id} className="flex min-w-0 items-start gap-2 py-3"><Link href={`/challenges?invite=${encodeURIComponent(item.challengeId)}`} onClick={() => setOpen(false)} className="min-h-11 min-w-0 flex-1 rounded-md p-1 text-sm leading-relaxed hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block break-words">{textFor(item)}</span><time dateTime={item.createdAt} className="mt-1 block text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short" })}</time></Link><Button type="button" size="icon" variant="ghost" disabled={reading !== null} onClick={() => void dismiss(item.id)} aria-label={locale === "de" ? "Als gelesen markieren" : "Mark as read"}>{reading === item.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}</Button></li>)}</ul> : !notifications.error && <p className="py-4 text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Alles gelesen. Neue Einladungen und Ergebnisse erscheinen hier." : "All caught up. New invitations and results will appear here."}</p>}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2"><Link href="/challenges" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Herausforderungen öffnen" : "Open challenges"}</Link>{notifications.unreadCount > 0 && <Button type="button" variant="ghost" disabled={reading !== null} onClick={() => void dismiss("all")} className="px-2 text-xs">{reading === "all" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{locale === "de" ? "Alle gelesen" : "Mark all read"}</Button>}</div>
    </section>}
  </div>;
}
