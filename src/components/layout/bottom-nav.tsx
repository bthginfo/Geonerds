"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, CalendarDays, Trophy, Swords, UserRound } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", key: "nav.home", icon: House },
  { href: "/daily", key: "nav.daily", icon: CalendarDays },
  { href: "/challenges", key: "challenges", icon: Swords },
  { href: "/leaderboard", key: "nav.leaderboard", icon: Trophy },
  { href: "/profile", key: "nav.profile", icon: UserRound },
] as const;

export function BottomNav() {
  const { t, locale } = useT();
  const pathname = usePathname();
  if (pathname.startsWith("/play/") || pathname.startsWith("/wine-nerds") || pathname.startsWith("/poke-nerds")) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
      <nav aria-label={locale === "de" ? "Hauptnavigation" : "Main navigation"} className="geo-glass pointer-events-auto mx-auto flex max-w-md items-stretch rounded-[22px] p-1.5">
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[10px] font-semibold leading-tight transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              <span className="max-w-full truncate">{href === "/challenges" ? (locale === "de" ? "Duelle" : "Duels") : href === "/leaderboard" ? (locale === "de" ? "Rangliste" : "Rankings") : t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
