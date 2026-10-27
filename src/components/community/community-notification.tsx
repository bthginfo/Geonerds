"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, ArrowUpRight, Bot, X, Loader2 } from "lucide-react";
import { useCommunityRewards } from "@/hooks/use-community-rewards";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/I18nProvider";

export function CommunityNotification() {
  const userId = useAuth((state) => state.user?.id);
  const community = useCommunityRewards();
  const notifications = community.notifications.filter((item) => !item.readAt && ((item.kind === "game-published" && item.gameId === "adastra") || (item.kind === "feature-published" && ["challenges", "bot-challenges"].includes(item.gameId ?? "")))).slice(0, 3);
  if (!userId || !notifications.length) return null;
  return <>{notifications.map((notification) => <NotificationCard key={`${userId}:${notification.id}`} id={notification.id} feature={notification.kind === "feature-published"} bot={notification.gameId === "bot-challenges"} markRead={community.markRead} />)}</>;
}

function NotificationCard({ id, feature, bot, markRead }: { id: string; feature: boolean; bot: boolean; markRead: (id: string) => Promise<boolean> }) {
  const { t, locale } = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function dismiss() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await markRead(id);
    if (!result) { setBusy(false); setFailed(true); }
  }
  const title = bot ? (locale === "de" ? "Dein Feedback macht den Unterschied" : "Your feedback makes a difference") : feature ? (locale === "de" ? "Deine Idee ist jetzt Teil von GeoNerds" : "Your idea is now part of GeoNerds") : t("community.notificationTitle");
  const description = bot ? (locale === "de" ? "Danke für dein Feedback zum Warten auf ein Gegenüber. Du kannst jetzt sofort gegen Bots in drei Stärken spielen – wann immer du Lust auf eine Herausforderung hast." : "Thanks for your feedback about waiting for opponents. You can now play immediately against bots in three strengths — whenever you feel like a challenge.") : feature ? (locale === "de" ? "Shahin, deine Idee hat GeoNerds verändert. Danke, dass du Herausforderungen für die ganze Community angestoßen hast! Dein Contributor-Abzeichen ist jetzt in deinem Profil sichtbar." : "Shahin, your idea changed GeoNerds. Thanks for helping open challenges to the whole community! Your Contributor badge is now visible on your profile.") : t("community.notificationDesc");
  const Icon = bot ? Bot : Award;
  return <section aria-label={title} className="mb-5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl border border-amber-600/30 bg-amber-500/5 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-4">
    <Icon className="mt-1 hidden h-5 w-5 text-amber-800 sm:block dark:text-amber-300" aria-hidden />
    <div className="min-w-0"><h2 className="break-words text-sm font-bold">{title}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p><Link href={bot ? "/challenges?opponentType=bot" : feature ? "/challenges" : "/play/adastra"} className="mt-2 inline-flex min-h-11 max-w-full items-center gap-1.5 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="min-w-0">{bot ? (locale === "de" ? "Sofort gegen einen Bot spielen" : "Play a bot now") : feature ? (locale === "de" ? "Community-Herausforderungen entdecken" : "Explore community challenges") : t("adastra.play")}</span><ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden /></Link>{failed && <p role="alert" className="mt-1 text-xs text-danger">{t("community.notificationError")}</p>}</div>
    <button type="button" disabled={busy} onClick={() => void dismiss()} aria-label={t("community.notificationDismiss")} title={t("community.notificationDismiss")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}</button>
  </section>;
}
