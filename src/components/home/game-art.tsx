"use client";

import type { GameConfig } from "@/games/registry";
import { FlagImage } from "@/components/flag-image";
import { cn } from "@/lib/utils";

const GROUP_COLORS = ["bg-amber-300", "bg-emerald-400", "bg-sky-400", "bg-violet-400"];

function Graticule() {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full text-white/20">
      <g fill="none" stroke="currentColor" strokeWidth="0.8">
        <ellipse cx="150" cy="96" rx="92" ry="92" />
        <ellipse cx="150" cy="96" rx="58" ry="92" />
        <ellipse cx="150" cy="96" rx="22" ry="92" />
        <path d="M58 96h184M66 56h168M86 24h128" />
      </g>
    </svg>
  );
}

function LetterTile({ letter, tone }: { letter: string; tone: "hit" | "near" | "miss" }) {
  return (
    <span className={cn(
      "flex h-7 w-7 items-center justify-center rounded-md text-sm font-extrabold shadow-sm sm:h-8 sm:w-8",
      tone === "hit" && "bg-emerald-500 text-white",
      tone === "near" && "bg-amber-400 text-slate-900",
      tone === "miss" && "bg-white/85 text-slate-500",
    )}>{letter}</span>
  );
}

/** Purely decorative cover art for a game tile, built from real assets and the game's own mechanics. */
export function GameArt({ game, className }: { game: GameConfig; className?: string }) {
  const Icon = game.icon;
  let motif: React.ReactNode;
  switch (game.id) {
    case "flags":
      motif = (
        <div className="relative h-16 w-28">
          <FlagImage code="br" className="absolute left-0 top-3 w-16 -rotate-6 shadow-lg" />
          <FlagImage code="jp" className="absolute left-7 top-0 w-16 rotate-3 shadow-lg" />
          <FlagImage code="se" className="absolute left-12 top-6 w-16 rotate-[10deg] shadow-lg" />
        </div>
      );
      break;
    case "geo-groups":
      motif = (
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/15 p-1.5 shadow-inner">
          {Array.from({ length: 16 }, (_, index) => <span key={index} className={cn("h-4 w-6 rounded-[4px] sm:h-5 sm:w-7", GROUP_COLORS[Math.floor(index / 4)], index > 11 && "opacity-60")} />)}
        </div>
      );
      break;
    case "letter-atlas":
      motif = (
        <div className="flex gap-1">
          {(["G", "H", "A", "N", "A"] as const).map((letter, index) => <LetterTile key={index} letter={letter} tone={index === 0 || index === 4 ? "hit" : index === 2 ? "near" : "miss"} />)}
        </div>
      );
      break;
    case "place-trails":
      motif = (
        <div className="relative grid grid-cols-4 gap-1">
          {"PERULIMACUBA".split("").map((letter, index) => <span key={index} className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold sm:h-7 sm:w-7", index < 4 ? "bg-white text-sky-700" : "bg-white/20 text-white")}>{letter}</span>)}
        </div>
      );
      break;
    case "geo-brackets":
      motif = <p className="font-mono text-2xl font-black tracking-tight text-white drop-shadow sm:text-3xl">[ [ ? ] ]</p>;
      break;
    case "atlas-blast":
      motif = (
        <div className="grid grid-cols-5 gap-0.5">
          {[1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0].map((on, index) => <span key={index} className={cn("h-5 w-5 rounded-[3px] sm:h-6 sm:w-6", on ? (index % 3 ? "bg-white" : "bg-amber-300") : "bg-white/15")} />)}
        </div>
      );
      break;
    default:
      motif = <Icon aria-hidden="true" className="h-12 w-12 text-white drop-shadow-md sm:h-14 sm:w-14" strokeWidth={1.6} />;
  }
  return (
    <div aria-hidden="true" className={cn("relative flex items-center justify-center overflow-hidden bg-gradient-to-br", game.gradient, className)}>
      <Graticule />
      <div className="relative">{motif}</div>
    </div>
  );
}
