"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Award, BookOpen, Check, ChevronDown, ChevronRight, Stamp, Target } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
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
  const nextBadge = BADGES.map((badge) => ({ badge, progress: badgeProgress(badge, stats) }))
    .filter((item) => !item.badge.earned(stats) && item.progress && item.progress.target > 0)
    .sort((a, b) => (b.progress!.current / b.progress!.target) - (a.progress!.current / a.progress!.target) || a.badge.id.localeCompare(b.badge.id))[0];

  return <section className="overflow-hidden rounded-2xl bg-card">
    <button type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((value) => !value)} className="flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-offset-[-3px]">
      <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{L("Field Journal", "Feldjournal")}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{daily.filter((mission) => mission.complete).length}/{daily.length} {L("daily missions", "Tagesmissionen")} · {Math.min(weekly.current, weekly.target)}/{weekly.target} {L("this week", "diese Woche")}</p></div>
      <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", expanded && "rotate-180")} />
    </button>
    <div id={contentId} hidden={!expanded} className="border-t border-border px-4 pb-3 pt-4">
      <h3 className="mb-2.5 text-sm font-semibold">{L("Daily missions", "Tagesmissionen")}</h3>
      <div className="space-y-2">{daily.map((mission) => {
        const label = mission.id === "daily-variety" ? L("Play two different games", "Spiele zwei verschiedene Spiele") : mission.id === "daily-answers" ? L("Answer ten correctly", "Beantworte zehn richtig") : mission.id === "daily-strategy" ? L("Solve Grid or Minesweeper", "Löse Grid oder Minesweeper") : L("Complete three runs", "Schließe drei Runden ab");
        return <div key={mission.id} className="flex items-start gap-2 py-1.5 text-xs leading-relaxed"><span className={cn("mt-0.5 shrink-0", mission.complete ? "text-success" : "text-muted-foreground")}>{mission.complete ? <Check aria-label={L("Complete", "Abgeschlossen")} className="h-4 w-4" /> : <Target aria-hidden="true" className="h-4 w-4" />}</span><span className="min-w-0 flex-1">{label}</span><span className="shrink-0 tabular-nums text-muted-foreground">{Math.min(mission.current, mission.target)}/{mission.target}</span></div>;
      })}</div>
      <div className="mt-3 flex items-center gap-2 border-t border-border py-3 text-xs"><Stamp aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" /><span className="flex-1 font-medium">{L("Weekly variety", "Wochenvielfalt")}</span><span className="tabular-nums text-muted-foreground">{Math.min(weekly.current, weekly.target)}/{weekly.target}</span></div>
      <h3 className="mt-3 text-sm font-semibold">{L("Last 7 days", "Letzte 7 Tage")}</h3>
      <div className="mt-2 flex h-20 items-end gap-2">{activity.map((day) => <div key={day.key} title={`${day.key}: ${day.runs}`} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className={cn("w-full rounded-sm", day.runs > 0 ? "bg-primary/70" : "bg-muted")} style={{ height: `${Math.max(5, Math.min(44, day.runs * 7))}px` }} /><span className="text-[10px] tabular-nums text-muted-foreground">{day.key.slice(-2)}</span></div>)}</div>
      {nextBadge && <Link href="/badges" className="mt-4 block rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted"><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Award aria-hidden="true" className="h-4 w-4 text-primary" />{L("Next badge", "Nächstes Badge")} · {badgeTier(nextBadge.badge)}</div><div className="mt-1.5 text-sm font-semibold">{badgeName(nextBadge.badge, locale)}</div><div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, nextBadge.progress!.current / nextBadge.progress!.target * 100)}%` }} /></div><span className="text-[10px] tabular-nums text-muted-foreground">{nextBadge.progress!.current}/{nextBadge.progress!.target}</span></div></Link>}
      {closest && <Link href="/collection" className="mt-2 block rounded-xl bg-muted/60 p-3 transition-colors hover:bg-muted"><div className="text-xs text-muted-foreground">{L("Closest mastery", "Nächste Meisterschaft")}</div><div className="mt-1 text-sm font-semibold">{countryName(closest.country, locale)}</div><div className="mt-1 text-xs leading-relaxed text-muted-foreground">{closest.score}/{MASTER_TOTAL} · {closest.games}/{MASTER_GAMES} {L("games", "Spiele")}</div></Link>}
      {progression.stamps.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{progression.stamps.length} {L("passport stamps", "Passstempel")}</p>}
      <Link href="/badges" className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-xs font-semibold text-primary hover:underline">{L("Open badges", "Badges öffnen")}<ChevronRight aria-hidden="true" className="h-4 w-4" /></Link>
    </div>
  </section>;
}
