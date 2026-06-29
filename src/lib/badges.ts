import {
  Footprints, Flame, Trophy, Star, Crown, Globe2, Flag, Landmark, MapPin, Shapes,
  Pencil, Languages, Waves, Lightbulb, GraduationCap, Zap, Target, Rocket, Medal,
  Sparkles, Route, Fingerprint, type LucideIcon,
} from "lucide-react";
import type { GameId, Locale } from "./types";
import type { ScoreEntry } from "./leaderboard/types";

export interface Stats {
  totalRuns: number;
  totalScore: number;
  maxScoreRun: number;
  bestStreak: number;
  perfectRounds: number;
  distinctGames: number;
  correctByGame: Record<string, number>;
  bestStreakByGame: Record<string, number>;
  maxTotalByGame: Record<string, number>;
}

export function computeStats(runs: ScoreEntry[]): Stats {
  const correctByGame: Record<string, number> = {};
  const bestStreakByGame: Record<string, number> = {};
  const maxTotalByGame: Record<string, number> = {};
  const games = new Set<string>();
  let totalScore = 0;
  let maxScoreRun = 0;
  let bestStreak = 0;
  let perfectRounds = 0;

  for (const r of runs) {
    games.add(r.gameId);
    totalScore += r.score;
    maxScoreRun = Math.max(maxScoreRun, r.score);
    bestStreak = Math.max(bestStreak, r.bestStreak ?? 0);
    correctByGame[r.gameId] = (correctByGame[r.gameId] ?? 0) + (r.correct ?? 0);
    bestStreakByGame[r.gameId] = Math.max(bestStreakByGame[r.gameId] ?? 0, r.bestStreak ?? 0);
    maxTotalByGame[r.gameId] = Math.max(maxTotalByGame[r.gameId] ?? 0, r.total ?? 0);
    if (r.total > 0 && r.correct === r.total) perfectRounds += 1;
  }

  return {
    totalRuns: runs.length,
    totalScore,
    maxScoreRun,
    bestStreak,
    perfectRounds,
    distinctGames: games.size,
    correctByGame,
    bestStreakByGame,
    maxTotalByGame,
  };
}

export interface Badge {
  id: string;
  name: { en: string; de: string };
  desc: { en: string; de: string };
  icon: LucideIcon;
  earned: (s: Stats) => boolean;
}

const g = (s: Stats, id: GameId) => s.correctByGame[id] ?? 0;

export const BADGES: Badge[] = [
  { id: "first", icon: Footprints, name: { en: "First Steps", de: "Erste Schritte" }, desc: { en: "Play your first game", de: "Spiele deine erste Runde" }, earned: (s) => s.totalRuns >= 1 },
  { id: "ten", icon: Medal, name: { en: "Getting Warm", de: "Warmgelaufen" }, desc: { en: "Play 10 games", de: "Spiele 10 Runden" }, earned: (s) => s.totalRuns >= 10 },
  { id: "fifty", icon: Trophy, name: { en: "Dedicated", de: "Engagiert" }, desc: { en: "Play 50 games", de: "Spiele 50 Runden" }, earned: (s) => s.totalRuns >= 50 },
  { id: "hundred", icon: Crown, name: { en: "Geo Addict", de: "Geo-Süchtig" }, desc: { en: "Play 100 games", de: "Spiele 100 Runden" }, earned: (s) => s.totalRuns >= 100 },
  { id: "score1k", icon: Star, name: { en: "Point Collector", de: "Punktesammler" }, desc: { en: "Earn 1,000 total points", de: "Sammle 1.000 Punkte" }, earned: (s) => s.totalScore >= 1000 },
  { id: "score10k", icon: Sparkles, name: { en: "Point Hoarder", de: "Punkte-Hamster" }, desc: { en: "Earn 10,000 total points", de: "Sammle 10.000 Punkte" }, earned: (s) => s.totalScore >= 10000 },
  { id: "score50k", icon: Rocket, name: { en: "Point Legend", de: "Punkte-Legende" }, desc: { en: "Earn 50,000 total points", de: "Sammle 50.000 Punkte" }, earned: (s) => s.totalScore >= 50000 },
  { id: "bigrun", icon: Zap, name: { en: "High Roller", de: "High Roller" }, desc: { en: "Score 3,000 in one game", de: "3.000 Punkte in einer Runde" }, earned: (s) => s.maxScoreRun >= 3000 },
  { id: "streak10", icon: Flame, name: { en: "On Fire", de: "In Flammen" }, desc: { en: "Reach a streak of 10", de: "Erreiche eine Serie von 10" }, earned: (s) => s.bestStreak >= 10 },
  { id: "streak25", icon: Flame, name: { en: "Unstoppable", de: "Unaufhaltsam" }, desc: { en: "Reach a streak of 25", de: "Erreiche eine Serie von 25" }, earned: (s) => s.bestStreak >= 25 },
  { id: "perfect", icon: Target, name: { en: "Flawless", de: "Makellos" }, desc: { en: "Finish a round with 100% accuracy", de: "Runde mit 100% Treffer beenden" }, earned: (s) => s.perfectRounds >= 1 },
  { id: "perfect5", icon: Target, name: { en: "Perfectionist", de: "Perfektionist" }, desc: { en: "Get 5 perfect rounds", de: "5 perfekte Runden" }, earned: (s) => s.perfectRounds >= 5 },
  { id: "allgames", icon: Globe2, name: { en: "Globetrotter", de: "Weltenbummler" }, desc: { en: "Try every game", de: "Jedes Spiel ausprobieren" }, earned: (s) => s.distinctGames >= 15 },
  { id: "flags50", icon: Flag, name: { en: "Vexillologist", de: "Flaggen-Profi" }, desc: { en: "50 correct flags", de: "50 Flaggen richtig" }, earned: (s) => g(s, "flags") >= 50 },
  { id: "capitals50", icon: Landmark, name: { en: "Capital Expert", de: "Hauptstadt-Profi" }, desc: { en: "50 correct capitals", de: "50 Hauptstädte richtig" }, earned: (s) => g(s, "capitals") >= 50 },
  { id: "map100", icon: MapPin, name: { en: "Explorer", de: "Entdecker" }, desc: { en: "Find 100 countries on the map", de: "100 Länder auf der Karte finden" }, earned: (s) => g(s, "map-click") >= 100 },
  { id: "outline30", icon: Shapes, name: { en: "Shape Shifter", de: "Formen-Kenner" }, desc: { en: "30 correct outlines", de: "30 Umrisse richtig" }, earned: (s) => g(s, "outline") >= 30 },
  { id: "draw20", icon: Pencil, name: { en: "Cartographer", de: "Kartograf" }, desc: { en: "20 good drawings", de: "20 gute Zeichnungen" }, earned: (s) => g(s, "draw") + g(s, "trace") >= 20 },
  { id: "lang30", icon: Languages, name: { en: "Polyglot", de: "Polyglott" }, desc: { en: "30 correct in Scripts & Money", de: "30 richtig bei Schrift & Währung" }, earned: (s) => g(s, "languages") >= 30 },
  { id: "waters20", icon: Waves, name: { en: "Hydrologist", de: "Hydrologe" }, desc: { en: "20 rivers & lakes", de: "20 Flüsse & Seen" }, earned: (s) => g(s, "waters") >= 20 },
  { id: "trivia30", icon: Lightbulb, name: { en: "Know-It-All", de: "Besserwisser" }, desc: { en: "30 correct trivia", de: "30 Trivia richtig" }, earned: (s) => g(s, "trivia") >= 30 },
  { id: "nerd10", icon: GraduationCap, name: { en: "True Geo-Nerd", de: "Echter Geo-Nerd" }, desc: { en: "Reach question 10 in the quiz", de: "Frage 10 im Quiz erreichen" }, earned: (s) => (s.maxTotalByGame["millionaire"] ?? 0) >= 10 },
  { id: "neighbors20", icon: Fingerprint, name: { en: "Good Neighbour", de: "Guter Nachbar" }, desc: { en: "20 correct in Who Am I?", de: "20 richtig bei Wer bin ich?" }, earned: (s) => g(s, "neighbors") >= 20 },
  { id: "route", icon: Route, name: { en: "Pathfinder", de: "Wegfinder" }, desc: { en: "Complete a land route", de: "Einen Landweg schaffen" }, earned: (s) => g(s, "route") >= 1 },
];

export function earnedIds(runs: ScoreEntry[]): Set<string> {
  const stats = computeStats(runs);
  return new Set(BADGES.filter((b) => b.earned(stats)).map((b) => b.id));
}

export function badgeName(b: Badge, locale: Locale) {
  return b.name[locale] ?? b.name.en;
}
export function badgeDesc(b: Badge, locale: Locale) {
  return b.desc[locale] ?? b.desc.en;
}
