"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { ThemeToggle } from "./theme-toggle";
import { LangToggle } from "./lang-toggle";
import { cn } from "@/lib/utils";
import { ChallengeNotificationBell } from "@/components/challenges/challenge-notification-bell";

const NAV = [
  { href: "/", key: "nav.home" },
  { href: "/daily", key: "nav.daily" },
  { href: "/challenges", key: "challenges" },
  { href: "/leaderboard", key: "nav.leaderboard" },
  { href: "/profile", key: "nav.profile" },
] as const;

export function Header() {
  const { t, locale } = useT();
  const pathname = usePathname();
  // Hide global chrome inside an active game for a focused experience.
  if (pathname.startsWith("/play/") || pathname.startsWith("/wine-nerds") || pathname.startsWith("/poke-nerds")) return null;

  return (
    <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3 focus:text-primary">{locale === "de" ? "Zum Inhalt" : "Skip to content"}</a>
      <div className="geo-glass">
      <div className="mx-auto flex min-h-17 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:px-5">
        <Link href="/" aria-label={t("app.name")} className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl font-bold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={36} height={36} className="h-9 w-9 rounded-xl" />
          <span className="hidden text-lg sm:inline">{t("app.name")}</span>
        </Link>

        <nav aria-label={locale === "de" ? "Hauptnavigation" : "Main navigation"} className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {item.href === "/challenges" ? (locale === "de" ? "Duelle" : "Duels") : t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ChallengeNotificationBell />
          <LangToggle />
          <ThemeToggle />
          <Link href="/settings" aria-label={t("nav.settings")} title={t("nav.settings")} aria-current={pathname === "/settings" ? "page" : undefined} className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-muted", pathname === "/settings" ? "text-primary" : "text-muted-foreground")}><Settings className="h-[19px] w-[19px]" aria-hidden="true" /></Link>
        </div>
      </div>
      </div>
    </header>
  );
}
