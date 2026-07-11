"use client";

import Link from "next/link";
import { Award, BookOpen, Check, ChevronRight, Stamp, Target } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useProgression } from "@/store/progression";
import { dailyMissions, recentActivity, weeklyMission } from "@/lib/progression";
import { useDex } from "@/store/dex";
import { DEX_POOL, MASTER_GAMES, MASTER_TOTAL, dexGameCount, dexRawHits, dexStateOf } from "@/lib/dex";
import { countryName } from "@/data/countries";
import { cn } from "@/lib/utils";
import { useAllRuns } from "@/hooks/use-scores";
import { BADGES, badgeName, badgeProgress, badgeTier, computeStats } from "@/lib/badges";

export function FieldJournal() {
  const { locale } = useT();
  const progression = useProgression();
  const hits = useDex((state) => state.hits);
  const { runs } = useAllRuns();
  const L = (en: string, de: string) => locale === "de" ? de : en;
  const daily = dailyMissions(progression);
  const weekly = weeklyMission(progression);
  const activity = recentActivity(progression);
  const closest = DEX_POOL
    .filter((country) => dexStateOf(hits[country.cca3]) !== "locked" && dexStateOf(hits[country.cca3]) !== "mastered")
    .map((country) => ({ country, score: dexRawHits(hits[country.cca3]), games: dexGameCount(hits[country.cca3]) }))
    .sort((a, b) => (Math.min(b.score / MASTER_TOTAL, b.games / MASTER_GAMES) - Math.min(a.score / MASTER_TOTAL, a.games / MASTER_GAMES)))[0];
  const stats = computeStats(runs ?? [], hits, progression);
  const nextBadge = BADGES
    .map((badge) => ({ badge, progress: badgeProgress(badge, stats) }))
    .filter((item) => !item.badge.earned(stats) && item.progress && item.progress.target > 0)
    .sort((a, b) => (b.progress!.current / b.progress!.target) - (a.progress!.current / a.progress!.target) || a.badge.id.localeCompare(b.badge.id))[0];

  return (
    <section className="mx-auto mt-5 w-full max-w-2xl overflow-hidden rounded-3xl border border-cyan-500/25 bg-slate-950 text-slate-50 shadow-lg">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300"><BookOpen className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><h2 className="font-extrabold">{L("Field Journal", "Feldjournal")}</h2><p className="text-xs text-slate-400">{L("Today’s expeditions and lasting mastery", "Heutige Expeditionen und dauerhafte Meisterschaft")}</p></div>
        <Link href="/badges" aria-label={L("Open badges", "Badges öffnen")} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-cyan-300 hover:bg-white/10"><ChevronRight className="h-5 w-5" /></Link>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_.85fr]">
        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400"><span>{L("Daily missions", "Tagesmissionen")}</span><span>{daily.filter((m) => m.complete).length}/3</span></div>
          <div className="space-y-2">{daily.map((mission) => {
            const label = mission.id === "daily-variety" ? L("Play two different games", "Spiele zwei verschiedene Spiele") : mission.id === "daily-answers" ? L("Answer ten correctly", "Beantworte zehn richtig") : mission.id === "daily-strategy" ? L("Solve Grid or Minesweeper", "Löse Grid oder Minesweeper") : L("Complete three runs", "Schließe drei Runden ab");
            return <div key={mission.id} className={cn("rounded-xl border px-3 py-2", mission.complete ? "border-emerald-400/30 bg-emerald-400/10" : "border-white/10 bg-white/5")}><div className="flex items-center gap-2 text-xs"><span className={cn("flex h-5 w-5 items-center justify-center rounded-md", mission.complete ? "bg-emerald-400 text-emerald-950" : "bg-white/10 text-slate-400")}>{mission.complete ? <Check className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}</span><span className="flex-1 font-semibold">{label}</span><span className="tabular-nums text-slate-400">{Math.min(mission.current, mission.target)}/{mission.target}</span></div></div>;
          })}</div>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-xs"><Stamp className="h-4 w-4 text-violet-300" /><span className="flex-1 font-semibold">{L("Weekly variety", "Wochenvielfalt")}</span><span className="tabular-nums text-slate-400">{Math.min(weekly.current, weekly.target)}/{weekly.target}</span></div>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">{L("Last 7 days", "Letzte 7 Tage")}</div>
          <div className="flex h-16 items-end gap-1.5 rounded-xl bg-white/5 p-2">{activity.map((day) => <div key={day.key} title={`${day.key}: ${day.runs}`} className="flex flex-1 flex-col items-center justify-end gap-1"><span className={cn("w-full rounded-sm", day.runs > 0 ? "bg-cyan-400" : "bg-white/10")} style={{height: `${Math.max(5, Math.min(36, day.runs * 7))}px`}} /><span className="text-[8px] text-slate-500">{day.key.slice(-2)}</span></div>)}</div>
          {nextBadge && <Link href="/badges" className="mt-3 block rounded-xl border border-violet-400/20 bg-violet-400/10 p-3 hover:border-violet-400/40"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-300"><Award className="h-3.5 w-3.5" />{L("Next badge", "Nächstes Badge")} · {badgeTier(nextBadge.badge)}</div><div className="mt-1 truncate text-sm font-bold">{badgeName(nextBadge.badge, locale)}</div><div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400" style={{width:`${Math.min(100, nextBadge.progress!.current / nextBadge.progress!.target * 100)}%`}} /></div><span className="text-[10px] tabular-nums text-slate-400">{nextBadge.progress!.current}/{nextBadge.progress!.target}</span></div></Link>}
          {closest && <Link href="/collection" className="mt-3 block rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 hover:border-amber-400/40"><div className="text-[10px] font-black uppercase tracking-widest text-amber-300">{L("Closest mastery", "Nächste Meisterschaft")}</div><div className="mt-1 truncate text-sm font-bold">{countryName(closest.country, locale)}</div><div className="mt-1 text-[11px] text-slate-400">{closest.score}/{MASTER_TOTAL} · {closest.games}/{MASTER_GAMES} {L("games", "Spiele")}</div></Link>}
          {progression.stamps.length > 0 && <div className="mt-2 text-[11px] text-slate-400">{progression.stamps.length} {L("passport stamps", "Passstempel")}</div>}
        </div>
      </div>
    </section>
  );
}
