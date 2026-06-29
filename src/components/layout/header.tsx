"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/I18nProvider";
import { ThemeToggle } from "./theme-toggle";
import { LangToggle } from "./lang-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", key: "nav.home" },
  { href: "/daily", key: "nav.daily" },
  { href: "/leaderboard", key: "nav.leaderboard" },
  { href: "/badges", key: "nav.badges" },
  { href: "/profile", key: "nav.profile" },
  { href: "/how-to", key: "nav.howto" },
] as const;

export function Header() {
  const { t } = useT();
  const pathname = usePathname();
  // Hide global chrome inside an active game for a focused experience.
  if (pathname.startsWith("/play/")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={36} height={36} className="h-9 w-9 rounded-xl shadow-sm" />
          <span className="text-lg">{t("app.name")}</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
