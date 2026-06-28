"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, BookOpen, Settings } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", key: "nav.home", icon: Home },
  { href: "/leaderboard", key: "nav.leaderboard", icon: Trophy },
  { href: "/how-to", key: "nav.howto", icon: BookOpen },
  { href: "/settings", key: "nav.settings", icon: Settings },
] as const;

export function BottomNav() {
  const { t } = useT();
  const pathname = usePathname();
  if (pathname.startsWith("/play/")) return null;

  return (
    <nav className="sticky bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-md sm:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
