"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Flame, Gamepad2, RefreshCw, Swords } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { apiUserProfile, type PublicProfile } from "@/lib/online";
import { levelFromXp, rankName } from "@/lib/level";
import { getGame } from "@/games/registry";
import { formatNumber } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { PublicProfileBadges } from "@/components/profile/public-profile-badges";

export default function PublicProfilePage() {
  const params = useParams<{ name: string }>();
  // Next already decodes this route segment; keying content removes prior-user state immediately.
  return <PublicProfileContent key={`public-profile:${params.name}`} name={params.name} />;
}

function PublicProfileContent({ name }: { name: string }) {
  const { t, locale } = useT();
  const viewerName = useAuth((state) => state.user?.name);
  const [reload, setReload] = useState(0);

  const [state, setState] = useState<{ loading: boolean; profile: PublicProfile | null; found: boolean; error?: string }>({
    loading: true,
    profile: null,
    found: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, profile: null, found: false });
    void apiUserProfile(name, controller.signal).then((res) => {
      if (controller.signal.aborted) return;
      if (res.error || !res.configured) {
        setState({ loading: false, profile: null, found: false, error: res.error ?? "not_configured" });
      } else {
        setState({ loading: false, profile: res.profile ?? null, found: res.found });
      }
    }).catch(() => {
      if (!controller.signal.aborted) setState({ loading: false, profile: null, found: false, error: "service_unavailable" });
    });
    return () => controller.abort();
  }, [name, reload]);

  const level = state.profile ? levelFromXp(state.profile.totalScore) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 pb-24">
      <Link href="/leaderboard" className="mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("leaderboard.title")}
      </Link>

      {state.loading ? (
        <div role="status" aria-busy="true" className="animate-pulse motion-reduce:animate-none">
          <span className="sr-only">{t("common.loading")}</span>
          <div aria-hidden className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5"><div className="h-16 w-16 shrink-0 rounded-2xl bg-muted" /><div className="min-w-0 flex-1 space-y-3"><div className="h-5 w-32 max-w-full rounded bg-muted" /><div className="h-3 w-24 max-w-full rounded bg-muted" /><div className="h-2 w-full rounded bg-muted" /></div></div>
          <div aria-hidden className="mt-4 grid grid-cols-3 gap-3">{[0, 1, 2].map((item) => <div key={item} className="h-20 rounded-xl bg-muted" />)}</div>
          <div aria-hidden className="mt-6 h-5 w-36 max-w-full rounded bg-muted" />
          <div aria-hidden className="mt-3 grid gap-3 sm:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-24 rounded-xl bg-muted" />)}</div>
        </div>
      ) : state.error ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h1 className="text-lg font-bold">{locale === "de" ? "Profil gerade nicht verfügbar" : "Profile temporarily unavailable"}</h1>
          <p role="alert" className="mt-2 text-sm leading-relaxed text-muted-foreground">{state.error === "not_configured" ? (locale === "de" ? "Öffentliche Profile sind derzeit nicht mit dem Online-Dienst verbunden. Versuche es später noch einmal." : "Public profiles are not connected to the online service right now. Try again later.") : (locale === "de" ? "Dieses Profil konnte nicht geladen werden. Prüfe deine Verbindung und versuche es erneut." : "Could not load this profile. Check your connection and try again.")}</p>
          <Button type="button" variant="outline" onClick={() => setReload((value) => value + 1)} className="mt-4 gap-2"><RefreshCw className="h-4 w-4" aria-hidden />{locale === "de" ? "Erneut laden" : "Try again"}</Button>
        </div>
      ) : !state.found || !state.profile || !level ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          <h1 className="break-words text-base font-semibold text-foreground">{t("profile.notFound", { name })}</h1>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-2xl font-extrabold text-white shadow">
              {level.level}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-lg font-bold [overflow-wrap:anywhere]">{state.profile.name}</h1>
              <div className="text-sm text-muted-foreground">{rankName(level.rank, locale)}</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600"
                  style={{ width: `${Math.round(level.progress * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {state.profile.name.toLocaleLowerCase() !== viewerName?.toLocaleLowerCase() && <Link href={`/challenges?opponent=${encodeURIComponent(state.profile.name)}`} className="mt-4 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Swords className="h-4 w-4 shrink-0" aria-hidden /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{locale === "de" ? `${state.profile.name} herausfordern` : `Challenge ${state.profile.name}`}</span></Link>}

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Tile label={t("home.totalPoints")} value={formatNumber(state.profile.totalScore, locale)} />
            <Tile label={t("home.gamesPlayed")} value={formatNumber(state.profile.totalRuns, locale)} />
            <Tile label={t("common.streak")} value={String(state.profile.bestStreak)} />
          </div>

          <PublicProfileBadges key={`public-profile-badges:${state.profile.name}`} profileName={state.profile.name} badgeIds={state.profile.badgeIds ?? []} locale={locale} />

          <h2 className="mb-2 mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Gamepad2 className="h-4 w-4" aria-hidden />
            {t("profile.bestPerGame")}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {!state.profile.games.length && <p className="p-4 text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Noch keine gespeicherten Spielergebnisse für dieses Konto." : "No saved game results for this account yet."}</p>}
            {state.profile.games.map((g, i) => {
              const known = getGame(g.game_id);
              return (
                <div
                  key={g.game_id}
                  className={
                    "flex items-center gap-3 px-4 py-3 " +
                    (i < state.profile!.games.length - 1 ? "border-b border-border/60" : "")
                  }
                >
                  <div className="min-w-0 flex-1 truncate font-medium">
                    {known ? t(`games.${g.game_id}.name`) : g.game_id}
                  </div>
                  <span className="shrink-0 font-bold tabular-nums">{formatNumber(g.best, locale)}</span>
                </div>
              );
            })}
          </div>

          {state.profile.bestStreak >= 10 && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-sm text-orange-500">
              <Flame className="h-4 w-4" />
              {t("common.streak")}: {state.profile.bestStreak}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-3 text-center">
      <div className="break-words text-xl font-bold tabular-nums [overflow-wrap:anywhere]">{value}</div>
      <div className="mt-0.5 break-words text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
