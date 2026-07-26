"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Award,BookOpen,Globe2,Home,Layers3,Trophy,UserRound} from "lucide-react";
import {useT} from "@/i18n/I18nProvider";
import {PokeLogo} from "./poke-logo";
import {PokeLanguageSwitch} from "./poke-language-switch";
const nav=[
 {href:"/poke-nerds",icon:Home,en:"Base",de:"Basis"},
 {href:"/poke-nerds/dex",icon:BookOpen,en:"PokéDex",de:"PokéDex"},
 {href:"/poke-nerds/cards",icon:Layers3,en:"Cards",de:"Karten"},
 {href:"/poke-nerds/leaderboard",icon:Trophy,en:"Ranks",de:"Ränge"},
 {href:"/poke-nerds/badges",icon:Award,en:"Badges",de:"Orden"},
 {href:"/poke-nerds/profile",icon:UserRound,en:"Profile",de:"Profil"},
];
export function PokeShell({children}:{children:React.ReactNode}){
 const path=usePathname();const {locale}=useT();const playing=path.includes("/play/");
 return <div className="poke-shell min-h-dvh">
  <header className="poke-header sticky top-0 z-50">
   <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-2 px-4">
    <Link href="/poke-nerds" className="poke-brand"><PokeLogo className="h-9 w-9"/><span>Poke<span>Nerds</span></span></Link>
    {!playing&&<nav className="poke-desktop-nav">{nav.map(({href,en,de})=><Link key={href} href={href} aria-current={path===href?"page":undefined}>{locale==="de"?de:en}</Link>)}</nav>}
    <div className="flex items-center gap-1"><PokeLanguageSwitch/><Link href="/" className="poke-geo-return" aria-label={locale==="de"?"Zurück zu GeoNerds":"Back to GeoNerds"}><Globe2 className="h-4 w-4"/><span>{locale==="de"?"GeoNerds":"GeoNerds"}</span></Link></div>
   </div>
  </header>
  <main className={playing?"":"pb-20 md:pb-0"}>{children}</main>
  {!playing&&<nav className="poke-mobile-nav">{nav.map(({href,icon:Icon,en,de})=><Link key={href} href={href} aria-current={path===href?"page":undefined}><Icon/>{locale==="de"?de:en}</Link>)}</nav>}
 </div>;
}
