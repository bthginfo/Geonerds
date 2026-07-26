"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpen, Home, Trophy, UserRound, Globe2 } from "lucide-react";
import { WineLogo } from "./wine-logo";
import { WineLanguageSwitch } from "./wine-language-switch";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const links=[
 {href:"/wine-nerds",icon:Home,en:"Cellar",de:"Keller"},
 {href:"/wine-nerds/dex",icon:BookOpen,en:"Wine-Dex",de:"Wine-Dex"},
 {href:"/wine-nerds/leaderboard",icon:Trophy,en:"Ranks",de:"Ränge"},
 {href:"/wine-nerds/badges",icon:Award,en:"Badges",de:"Badges"},
 {href:"/wine-nerds/profile",icon:UserRound,en:"Profile",de:"Profil"},
];
export function WineShell({children}:{children:React.ReactNode}) {
 const path=usePathname(); const {locale}=useT(); const playing=path.includes("/play/");
 return <div className="wine-nerds-shell min-h-dvh text-[var(--wine-ink)]">
  <header className="wine-header sticky top-0 z-50 border-b border-[var(--wine-line)]">
   <div className="mx-auto grid h-16 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-2 px-4">
    <Link href="/wine-nerds" className="flex min-w-0 items-center gap-2.5 text-[var(--wine-cream)]">
     <WineLogo className="h-9 w-9 text-[var(--wine-grape)]"/>
     <span className="hidden font-black tracking-[-.04em] min-[350px]:inline">Wine<span className="text-[var(--wine-copper)]">Nerds</span></span>
    </Link>
    {!playing&&<nav className="hidden items-center justify-self-center gap-1 lg:flex">{links.map(({href,en,de})=><Link key={href} href={href} className={cn("min-h-11 px-3 py-3 text-xs font-bold uppercase tracking-[.12em]",path===href?"text-[var(--wine-copper)]":"text-[var(--wine-muted)] hover:text-[var(--wine-cream)]")}>{locale==="de"?de:en}</Link>)}</nav>}
    <div className="col-start-3 flex items-center justify-self-end gap-1.5">
     <WineLanguageSwitch/>
     <Link
      href="/"
      aria-label={locale==="de"?"Zurück zu GeoNerds":"Back to GeoNerds"}
      className="inline-flex h-11 min-w-11 items-center justify-center gap-2 px-2 text-xs font-semibold text-[var(--wine-muted)] transition-colors hover:text-[var(--wine-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wine-cream)]"
     >
      <Globe2 className="h-4 w-4"/>
      <span className="hidden xl:inline">{locale==="de"?"Zu GeoNerds":"Back to GeoNerds"}</span>
     </Link>
    </div>
   </div>
  </header>
  <main className={playing?"pb-0":"pb-24 md:pb-8"}>{children}</main>
  {!playing&&<nav className="wine-header fixed inset-x-0 bottom-0 z-50 border-t border-[var(--wine-line)] md:hidden"><div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">{links.map(({href,icon:Icon,en,de})=><Link key={href} href={href} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold",path===href?"text-[var(--wine-copper)]":"text-[var(--wine-muted)]")}><Icon className="h-5 w-5"/>{locale==="de"?de:en}</Link>)}</div></nav>}
 </div>;
}
