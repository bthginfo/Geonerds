"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, ArrowUpRight, X, Loader2 } from "lucide-react";
import { useCommunityRewards } from "@/hooks/use-community-rewards";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/I18nProvider";

export function CommunityNotification() {
  const userId = useAuth((state) => state.user?.id);
  const community = useCommunityRewards();
  const notification = community.notifications.find((item) => item.gameId === "adastra" && !item.readAt);
  if (!userId || !notification) return null;
  return <NotificationCard key={`${userId}:${notification.id}`} id={notification.id} markRead={community.markRead} />;
}

function NotificationCard({ id, markRead }: { id: string; markRead: (id: string) => Promise<boolean> }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function dismiss() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await markRead(id);
    if (!result) { setBusy(false); setFailed(true); }
  }
  return <section aria-label={t("community.notificationTitle")} className="mb-5 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] gap-3 rounded-xl border border-amber-600/30 bg-amber-500/5 p-3 sm:p-4">
    <Award className="mt-1 h-5 w-5 text-amber-800 dark:text-amber-300" aria-hidden />
    <div className="min-w-0"><h2 className="text-sm font-bold">{t("community.notificationTitle")}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("community.notificationDesc")}</p><Link href="/play/adastra" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("adastra.play")}<ArrowUpRight className="h-4 w-4" aria-hidden /></Link>{failed && <p role="alert" className="mt-1 text-xs text-danger">{t("community.notificationError")}</p>}</div>
    <button type="button" disabled={busy} onClick={() => void dismiss()} aria-label={t("community.notificationDismiss")} title={t("community.notificationDismiss")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}</button>
  </section>;
}
