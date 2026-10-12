"use client";

import { useId, useState } from "react";
import { BADGES, badgeDesc, badgeName, badgeTier, type Badge, type BadgeTier } from "@/lib/badges";
import { CONTRIBUTOR_BADGE_ID, GAME_CREATOR_BADGE_ID } from "@/lib/community-rewards";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const COMMUNITY_AWARDS = new Set<string>([CONTRIBUTOR_BADGE_ID, GAME_CREATOR_BADGE_ID]);
const TIER_ORDER: Record<BadgeTier, number> = { bronze: 0, silver: 1, gold: 2, mythic: 3 };
const TIER_SURFACES: Record<BadgeTier, string> = {
  bronze: "border-orange-700/50 bg-card",
  silver: "border-slate-400 bg-slate-400/10",
  gold: "border-amber-400 bg-amber-500/10",
  mythic: "border-violet-400 bg-violet-500/10",
};
const TIER_NAMES: Record<BadgeTier, Record<Locale, string>> = {
  bronze: { en: "Bronze", de: "Bronze" }, silver: { en: "Silver", de: "Silber" },
  gold: { en: "Gold", de: "Gold" }, mythic: { en: "Mythic", de: "Mythisch" },
};

/** Presentation only: the supplied account IDs, never viewer progress, decide what is shown. */
export function publicBadgeDefinitions(badgeIds: readonly string[], locale: Locale): Badge[] {
  const supplied = new Set(badgeIds);
  return BADGES.filter((badge) => supplied.has(badge.id)).sort((a, b) =>
    Number(COMMUNITY_AWARDS.has(b.id)) - Number(COMMUNITY_AWARDS.has(a.id))
    || TIER_ORDER[badgeTier(b)] - TIER_ORDER[badgeTier(a)]
    || badgeName(a, locale).localeCompare(badgeName(b, locale), locale)
  );
}

export function publicBadgeDescription(badge: Badge, profileName: string, locale: Locale): string {
  if (badge.id === CONTRIBUTOR_BADGE_ID) return locale === "de" ? `Eine Idee von ${profileName} hat GeoNerds verbessert und unsere Community bereichert.` : `${profileName} helped improve GeoNerds with a community idea.`;
  if (badge.id === GAME_CREATOR_BADGE_ID) return locale === "de" ? `Eine Community-Idee von ${profileName} wurde zu einem GeoNerds-Spiel.` : `${profileName}'s community idea became a GeoNerds game.`;
  return badgeDesc(badge, locale);
}

export function PublicProfileBadges({ profileName, badgeIds, locale }: { profileName: string; badgeIds: readonly string[]; locale: Locale }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const badges = publicBadgeDefinitions(badgeIds, locale);
  const shown = expanded ? badges : badges.slice(0, 6);

  return <section aria-labelledby={`${id}-title`} className="mt-6 min-w-0">
    <h2 id={`${id}-title`} className="text-base font-semibold">{locale === "de" ? "Verdiente Badges" : "Earned badges"} <span className="font-normal tabular-nums text-muted-foreground">({badges.length})</span></h2>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Diese Badges stammen aus gespeicherter Kontoaktivität. Erfolge, die nur auf einem Gerät gespeichert sind, erscheinen hier möglicherweise nicht." : "These badges reflect saved account activity. Achievements stored only on a device may not appear here."}</p>
    {badges.length ? <ul id={`${id}-list`} className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">{shown.map((badge) => {
      const Icon = badge.icon;
      const tier = badgeTier(badge);
      return <li key={`earned-badge:${badge.id}`} className={cn("flex min-w-0 items-start gap-3 rounded-xl border p-3", TIER_SURFACES[tier])}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white"><Icon className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0"><h3 className="break-words text-sm font-bold leading-snug [overflow-wrap:anywhere]">{badgeName(badge, locale)}</h3><p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{publicBadgeDescription(badge, profileName, locale)}</p><p className="mt-2 text-[11px] font-semibold text-muted-foreground">{TIER_NAMES[tier][locale]}</p></div>
      </li>;
    })}</ul> : <p className="mt-4 rounded-xl border border-dashed border-border bg-card/50 p-4 text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Noch keine öffentlichen Badges für dieses Konto sichtbar." : "No public badges are visible for this account yet."}</p>}
    {badges.length > 6 && <Button type="button" variant="outline" aria-expanded={expanded} aria-controls={`${id}-list`} onClick={() => setExpanded((value) => !value)} className="mt-3 h-auto min-h-11 max-w-full px-4 py-2 text-sm"><span className="whitespace-normal">{expanded ? (locale === "de" ? "Weniger anzeigen" : "Show fewer") : (locale === "de" ? `Alle ${badges.length} Badges anzeigen` : `Show all ${badges.length} badges`)}</span></Button>}
  </section>;
}
