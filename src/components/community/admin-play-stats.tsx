"use client";

import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { cn, formatNumber } from "@/lib/utils";

interface StatsResponse {
  ok: boolean;
  days: number;
  anonymous: { gameId: string; starts: number; finishes: number }[];
  accounts: { gameId: string; runs: number; players: number }[];
}

/** Private overview of which games are actually played (anonymous counters + account runs). */
export function AdminPlayStats() {
  const { t, locale } = useT();
  const de = locale === "de";
  const [days, setDays] = useState(30);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setFailed(false);
    fetch(`/api/admin/plays?days=${days}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<StatsResponse> : Promise.reject(new Error(String(response.status))))
      .then(setData)
      .catch((error: Error) => { if (error.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, [days]);

  const accounts = new Map(data?.accounts.map((row) => [row.gameId, row]) ?? []);
  const ids = [...new Set([...(data?.anonymous.map((row) => row.gameId) ?? []), ...(data?.accounts.map((row) => row.gameId) ?? [])])];
  const anonymous = new Map(data?.anonymous.map((row) => [row.gameId, row]) ?? []);
  const rows = ids.map((gameId) => ({ gameId, anon: anonymous.get(gameId), acc: accounts.get(gameId) }))
    .sort((a, b) => (b.anon?.finishes ?? 0) - (a.anon?.finishes ?? 0) || (b.acc?.runs ?? 0) - (a.acc?.runs ?? 0));

  return (
    <section className="geo-surface mb-8 p-4 sm:p-5" aria-labelledby="admin-play-stats">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="admin-play-stats" className="flex items-center gap-2 text-lg font-bold"><BarChart3 className="h-5 w-5 text-primary" aria-hidden />{de ? "Was gespielt wird" : "What gets played"}</h2>
        <div className="geo-segmented">
          {[7, 30, 90].map((value) => <button key={value} type="button" aria-pressed={days === value} onClick={() => setDays(value)} className="geo-segment min-h-9 px-3 text-xs">{value} {de ? "Tage" : "days"}</button>)}
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{de ? "Starts und Abschlüsse zählen alle Spielenden anonym (auch Gäste). Kontorunden zeigen gespeicherte Ergebnisse angemeldeter Spielender." : "Starts and finishes count every player anonymously (guests too). Account runs show saved results of signed-in players."}</p>
      {failed ? <p role="alert" className="mt-4 text-sm text-danger">{de ? "Statistik konnte nicht geladen werden." : "Couldn't load stats."}</p>
        : !data ? <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{t("common.loading")}</p>
        : rows.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{de ? "Noch keine Daten in diesem Zeitraum." : "No data in this period yet."}</p>
        : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="py-2 pr-3 font-semibold">{de ? "Spiel" : "Game"}</th><th className="px-2 py-2 text-right font-semibold">Starts</th><th className="px-2 py-2 text-right font-semibold">{de ? "Beendet" : "Finished"}</th><th className="px-2 py-2 text-right font-semibold">%</th><th className="px-2 py-2 text-right font-semibold">{de ? "Kontorunden" : "Account runs"}</th><th className="py-2 pl-2 text-right font-semibold">{de ? "Konten" : "Accounts"}</th></tr></thead>
              <tbody>
                {rows.map(({ gameId, anon, acc }) => {
                  const rate = anon && anon.starts > 0 ? Math.round((anon.finishes / anon.starts) * 100) : null;
                  return (
                    <tr key={gameId} className="border-t border-border tabular-nums">
                      <td className="py-2 pr-3 font-medium">{t(`games.${gameId}.name`) === `games.${gameId}.name` ? gameId : t(`games.${gameId}.name`)}</td>
                      <td className="px-2 py-2 text-right">{formatNumber(anon?.starts ?? 0, locale)}</td>
                      <td className="px-2 py-2 text-right">{formatNumber(anon?.finishes ?? 0, locale)}</td>
                      <td className={cn("px-2 py-2 text-right", rate !== null && rate < 40 && "text-warning")}>{rate === null ? "–" : `${rate}%`}</td>
                      <td className="px-2 py-2 text-right">{formatNumber(acc?.runs ?? 0, locale)}</td>
                      <td className="py-2 pl-2 text-right">{formatNumber(acc?.players ?? 0, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
}
