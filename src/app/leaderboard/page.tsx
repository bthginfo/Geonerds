"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trophy, Loader2, Globe2, Smartphone, Crown, Gamepad2, ChevronDown, Swords } from "lucide-react";
import { GAMES } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { useAllRuns } from "@/hooks/use-scores";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { scoreStore } from "@/lib/leaderboard/local";
import { apiTopScores, type OnlineScore } from "@/lib/online";
import { formatNumber, formatTime, cn } from "@/lib/utils";
import type { GameId } from "@/lib/types";
import { CHALLENGE_GAME_IDS, type GeoChallengeGameId } from "@/lib/challenges";
import { DuelBoard } from "@/components/community/duel-board";

type Scope = "device" | "global" | "duels";
type Period = "all" | "month";

export default function LeaderboardPage() {
  const { t } = useT();
  return <Suspense fallback={<div className="geo-page py-8 text-sm text-muted-foreground">{t("common.loading")}</div>}><LeaderboardContent /></Suspense>;
}

function LeaderboardContent() {
  const { t, locale } = useT();
  const params = useSearchParams();
  const { runs, refresh } = useAllRuns();
  const user = useAuth((s) => s.user);
  const [query, setQuery] = useState<{ scope: Scope; period: Period; filter: GameId | "all"; page: number }>({ scope: params.get("scope") === "duels" ? "duels" : params.get("scope") === "device" ? "device" : "global", period: "all", filter: "all", page: 0 });
  const { scope, period, filter, page } = query;

  const [online, setOnline] = useState<{ configured: boolean; scores: OnlineScore[] } | null>(null);
  const [loadingOnline, setLoadingOnline] = useState(false);
  const [retry, setRetry] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState(false);

  function switchScope(next: Scope) {
    setQuery((current) => ({ ...current, scope: next, page: 0, filter: next === "duels" && !CHALLENGE_GAME_IDS.some((id) => id === current.filter) ? "all" : current.filter }));
  }
  const setPage = (next: number) => setQuery((current) => ({ ...current, page: next }));

  useEffect(() => {
    if (scope !== "global") return;
    let active = true;
    setLoadingOnline(true);
    setOnline(null);
    apiTopScores(filter, period, page).then((res) => {
      if (!active) return;
      setOnline(res);
      setLoadingOnline(false);
    }).catch(() => { if (active) { setOnline({ configured: false, scores: [] }); setLoadingOnline(false); } });
    return () => { active = false; };
  }, [scope, filter, period, page, retry]);

  const deviceRanked = useMemo(() => {
    const list = (runs ?? []).filter((r) => filter === "all" || r.gameId === filter);
    return [...list].sort((a, b) => b.score - a.score || a.durationMs - b.durationMs).slice(0, 50);
  }, [runs, filter]);

  async function clear() {
    if (clearing) return;
    setClearing(true);
    setClearError(false);
    try { await scoreStore.clear(); refresh(); setConfirmClear(false); }
    catch { setClearError(true); }
    finally { setClearing(false); }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl px-4 py-6 pb-28 sm:py-8">
      <div className="mb-1 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-warning" />
        <h1 className="text-2xl font-bold">{t("leaderboard.title")}</h1>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">{locale === "de" ? "Deine besten Runden und Begegnungen – weltweit oder auf diesem Gerät." : "Your best runs and encounters, worldwide or on this device."}</p>

      {/* Scope toggle */}
      <div className="geo-segmented mb-4 grid grid-cols-3" aria-label={locale === "de" ? "Bestenliste auswählen" : "Choose leaderboard"}>
        <ScopeButton active={scope === "global"} onClick={() => switchScope("global")} icon={<Globe2 aria-hidden="true" className="h-4 w-4 shrink-0" />}>
          {t("leaderboard.global")}
        </ScopeButton>
        <ScopeButton active={scope === "device"} onClick={() => switchScope("device")} icon={<Smartphone aria-hidden="true" className="h-4 w-4 shrink-0" />}>
          {t("leaderboard.device")}
        </ScopeButton>
        <ScopeButton active={scope === "duels"} onClick={() => switchScope("duels")} icon={<Swords aria-hidden="true" className="h-4 w-4 shrink-0" />}>
          {locale === "de" ? "Duelle" : "Duels"}
        </ScopeButton>
      </div>

      <div className="geo-surface mb-4 grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
      {/* Game filter */}
      <label className="block min-w-0 text-xs font-semibold text-muted-foreground">{locale === "de" ? "Spiel" : "Game"}<div className="relative mt-2">
        <Gamepad2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <select
          value={filter}
          onChange={(e) => setQuery((current) => ({ ...current, filter: e.target.value as GameId | "all", page: 0 }))}
          aria-label={locale === "de" ? "Bestenliste nach Spiel filtern" : "Filter leaderboard by game"}
          className="geo-control w-full appearance-none pl-9 pr-9 font-medium"
        >
          <option value="all">{t("leaderboard.all")}</option>
          {GAMES.filter((game) => scope !== "duels" || CHALLENGE_GAME_IDS.some((id) => id === game.id)).map((g) => (
            <option key={g.id} value={g.id}>
              {t(`games.${g.id}.name`)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div></label>
      {scope !== "device" && <label className="block min-w-0 text-xs font-semibold text-muted-foreground">{locale === "de" ? "Zeitraum" : "Period"}<select value={period} onChange={(event) => setQuery((current) => ({ ...current, period: event.target.value as Period, page: 0 }))} className="geo-control mt-2 w-full"><option value="all">{t("leaderboard.overall")}</option><option value="month">{t("leaderboard.month")}</option></select></label>}
      </div>
      <p className="mb-5 text-xs leading-relaxed text-muted-foreground">{scope === "global" ? (locale === "de" ? "Beste veröffentlichte Spielrunden. Punkte verschiedener Spiele und Rundenlängen sind nicht direkt vergleichbar – nutze den Spielfilter." : "Best published game runs. Scores across games and run lengths are not directly comparable — use the game filter.") : scope === "device" ? (locale === "de" ? "Die besten 50 Runden in diesem Browser, nach Punkten und bei Gleichstand nach Zeit sortiert." : "The best 50 runs saved in this browser, ranked by score, then time.") : (locale === "de" ? "Nur abgeschlossene Duelle zwischen registrierten Personen zählen. Bot- und Gasttraining ist ohne Ranglistenwertung." : "Only completed duels between registered players count. Bot and guest training is unranked.")}</p>

      {scope === "global" ? (
        <GlobalBoard
          data={online}
          loading={loadingOnline}
          showGame={filter === "all"}
          signedIn={!!user}
          period={period}
          page={page}
          onPage={setPage}
          locale={locale}
          t={t}
          viewerName={user?.name}
          onRetry={() => setRetry((value) => value + 1)}
        />
      ) : scope === "duels" ? (
        <DuelBoard game={filter as GeoChallengeGameId | "all"} period={period} page={page} onPage={setPage} />
      ) : (
        <>
          {deviceRanked.length === 0 ? (
            <Empty>{t("leaderboard.empty")}</Empty>
          ) : (
            <div className="geo-surface overflow-hidden">
              {deviceRanked.map((r, i) => (
                <Row
                  key={r.id}
                  rank={i + 1}
                  last={i === deviceRanked.length - 1}
                  title={t(`games.${r.gameId}.name`)}
                  sub={`${t(`difficulty.${r.difficulty}`)} · ${r.correct}/${r.total} · ${formatTime(r.durationMs)}`}
                  score={formatNumber(r.score, locale)}
                />
              ))}
            </div>
          )}
          {deviceRanked.length > 0 && (
            <div className="mt-4 text-center">
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => { setClearError(false); setConfirmClear(true); }}>
                {t("leaderboard.clear")}
              </Button>
            </div>
          )}
        </>
      )}
      <Modal open={confirmClear} onClose={() => { if (!clearing) setConfirmClear(false); }} title={locale === "de" ? "Lokale Ergebnisse löschen?" : "Clear device results?"}><p className="text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Alle gespeicherten Spielrunden in diesem Browser werden gelöscht. Dein Online-Konto und veröffentlichte Ergebnisse bleiben erhalten." : "All saved runs in this browser will be removed. Your online account and published scores will remain."}</p>{clearError && <p role="alert" className="mt-3 text-sm text-danger">{locale === "de" ? "Löschen hat nicht geklappt. Bitte versuche es erneut." : "Could not clear the results. Please try again."}</p>}<div className="mt-5 flex flex-wrap justify-end gap-3"><Button data-autofocus variant="secondary" disabled={clearing} onClick={() => setConfirmClear(false)}>{locale === "de" ? "Abbrechen" : "Cancel"}</Button><Button variant="danger" disabled={clearing} onClick={() => void clear()}>{clearing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{locale === "de" ? "Ergebnisse löschen" : "Clear results"}</Button></div></Modal>
    </div>
  );
}

function GlobalBoard({
  data,
  loading,
  showGame,
  signedIn,
  period,
  page,
  onPage,
  locale,
  t,
  viewerName,
  onRetry,
}: {
  data: { configured: boolean; scores: OnlineScore[] } | null;
  loading: boolean;
  showGame: boolean;
  signedIn: boolean;
  period: "all" | "month";
  page: number;
  onPage: (p: number) => void;
  locale: string;
  t: (k: string, v?: Record<string, string | number>) => string;
  viewerName?: string;
  onRetry: () => void;
}) {
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }
  if (data && !data.configured) {
    return <Empty><p>{locale === "de" ? "Die Online-Ergebnisse konnten nicht geladen werden. Prüfe die Verbindung oder versuche es erneut." : "Online results could not be loaded. Check your connection or try again."}</p><Button variant="outline" className="mt-4" onClick={onRetry}>{locale === "de" ? "Erneut laden" : "Try again"}</Button></Empty>;
  }

  const scores = data?.scores ?? [];
  const champion = page === 0 ? scores[0] : undefined;
  return (
    <>
      {champion && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-warning/10 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-warning">
            <Crown className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-warning">
              {period === "month" ? t("leaderboard.championMonth") : t("leaderboard.championAll")}
            </div>
            <Link href={`/u/${encodeURIComponent(champion.name)}`} className="block truncate text-lg font-bold leading-tight hover:underline">
              {champion.name}
            </Link>
          </div>
          <span className="shrink-0 text-lg font-extrabold tabular-nums">{formatNumber(champion.score, locale)}</span>
        </div>
      )}
      {!signedIn && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <span className="text-sm">{t("leaderboard.signInCta")}</span>
          <Link href="/settings" className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("account.signIn")}</Link>
        </div>
      )}
      {scores.length === 0 ? (
        <Empty>{t("leaderboard.globalEmpty")}</Empty>
      ) : (
        <>
          <div className="geo-surface overflow-hidden">
            {scores.map((s, i) => (
              <Row
                key={`${s.name}-${s.game_id}-${i}`}
                rank={page * 100 + i + 1}
                last={i === scores.length - 1}
                title={s.name}
                href={`/u/${encodeURIComponent(s.name)}`}
                sub={
                  (showGame ? t(`games.${s.game_id}.name`) + " · " : "") +
                  (s.difficulty ? t(`difficulty.${s.difficulty}`) + " · " : "") +
                  formatTime(s.duration_ms ?? 0)
                }
                score={formatNumber(s.score, locale)}
                own={viewerName?.toLocaleLowerCase() === s.name.toLocaleLowerCase()}
              />
            ))}
          </div>
          {(page > 0 || scores.length === 100) && (
            <div className="mt-4 flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
                {t("leaderboard.prev")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("leaderboard.page", { n: page + 1 })}</span>
              <Button variant="outline" size="sm" disabled={scores.length < 100} onClick={() => onPage(page + 1)}>
                {t("leaderboard.next")}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Row({
  rank,
  last,
  title,
  sub,
  score,
  href,
  own = false,
}: {
  rank: number;
  last: boolean;
  title: string;
  sub: string;
  score: string;
  href?: string;
  own?: boolean;
}) {
  const { locale } = useT();
  const titleNode = href ? (
    <Link href={href} className="block truncate font-medium hover:underline">
      {title}
    </Link>
  ) : (
    <div className="truncate font-medium">{title}</div>
  );
  return (
    <div className={cn("flex min-w-0 items-center gap-3 px-4 py-4", !last && "border-b border-border/60", own && "bg-primary/5")}>
      <span
        className={cn(
          "w-7 text-center text-sm font-bold tabular-nums",
          rank === 1 && "text-warning",
          rank === 2 && "text-muted-foreground",
          rank === 3 && "text-accent"
        )}
      >
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">{titleNode}{own && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">{locale === "de" ? "Du" : "You"}</span>}</div>
        <div className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{sub}</div>
      </div>
      <span className="shrink-0 text-sm font-bold tabular-nums sm:text-base">{score}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="geo-surface p-6 text-center text-sm leading-relaxed text-muted-foreground sm:p-8">
      {children}
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "geo-segment inline-flex min-w-0 items-center justify-center gap-1.5 px-2 text-xs sm:px-3 sm:text-sm"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

