import {
  Footprints, Flame, Trophy, Star, Crown, Globe2, Flag, Landmark, MapPin, Shapes,
  Pencil, Languages, Waves, Lightbulb, GraduationCap, Zap, Target, Rocket, Medal,
  Sparkles, Route, Fingerprint, Award, Gem, Brain, Keyboard, Moon, CalendarDays,
  Scale, ListOrdered, ListChecks, Mountain, Crosshair, Spline, PenLine, Swords,
  Diamond, Compass, Gauge, TrendingUp, Repeat, type LucideIcon,
} from "lucide-react";
import type { GameId, Locale } from "./types";
import type { ScoreEntry } from "./leaderboard/types";

export interface Stats {
  totalRuns: number;
  totalScore: number;
  maxScoreRun: number;
  bestStreak: number;
  perfectRounds: number;
  bigPerfect: number;
  distinctGames: number;
  hardRuns: number;
  hardPerfect: number;
  typeRuns: number;
  distinctDays: number;
  nightOwl: number;
  correctByGame: Record<string, number>;
  bestStreakByGame: Record<string, number>;
  maxTotalByGame: Record<string, number>;
}

export function computeStats(runs: ScoreEntry[]): Stats {
  const correctByGame: Record<string, number> = {};
  const bestStreakByGame: Record<string, number> = {};
  const maxTotalByGame: Record<string, number> = {};
  const games = new Set<string>();
  const days = new Set<string>();
  let totalScore = 0;
  let maxScoreRun = 0;
  let bestStreak = 0;
  let perfectRounds = 0;
  let bigPerfect = 0;
  let hardRuns = 0;
  let hardPerfect = 0;
  let typeRuns = 0;
  let nightOwl = 0;

  for (const r of runs) {
    games.add(r.gameId);
    totalScore += r.score;
    maxScoreRun = Math.max(maxScoreRun, r.score);
    bestStreak = Math.max(bestStreak, r.bestStreak ?? 0);
    correctByGame[r.gameId] = (correctByGame[r.gameId] ?? 0) + (r.correct ?? 0);
    bestStreakByGame[r.gameId] = Math.max(bestStreakByGame[r.gameId] ?? 0, r.bestStreak ?? 0);
    maxTotalByGame[r.gameId] = Math.max(maxTotalByGame[r.gameId] ?? 0, r.total ?? 0);
    const perfect = r.total > 0 && r.correct === r.total;
    if (perfect) perfectRounds += 1;
    if (perfect && r.total >= 25) bigPerfect += 1;
    if (r.difficulty === "hard" && (r.correct ?? 0) > 0) hardRuns += 1;
    if (r.difficulty === "hard" && perfect) hardPerfect += 1;
    if (r.mode === "type") typeRuns += 1;
    if (r.createdAt) {
      const d = new Date(r.createdAt);
      days.add(d.toISOString().slice(0, 10));
      if (d.getHours() < 6) nightOwl += 1;
    }
  }

  return {
    totalRuns: runs.length,
    totalScore,
    maxScoreRun,
    bestStreak,
    perfectRounds,
    bigPerfect,
    distinctGames: games.size,
    hardRuns,
    hardPerfect,
    typeRuns,
    distinctDays: days.size,
    nightOwl,
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
  // ── Volume ──────────────────────────────────────────────
  { id: "first", icon: Footprints, name: { en: "First Steps", de: "Erste Schritte" }, desc: { en: "Play your first game", de: "Spiele deine erste Runde" }, earned: (s) => s.totalRuns >= 1 },
  { id: "ten", icon: Medal, name: { en: "Getting Warm", de: "Warmgelaufen" }, desc: { en: "Play 10 games", de: "Spiele 10 Runden" }, earned: (s) => s.totalRuns >= 10 },
  { id: "fifty", icon: Trophy, name: { en: "Dedicated", de: "Engagiert" }, desc: { en: "Play 50 games", de: "Spiele 50 Runden" }, earned: (s) => s.totalRuns >= 50 },
  { id: "hundred", icon: Crown, name: { en: "Geo Addict", de: "Geo-Süchtig" }, desc: { en: "Play 100 games", de: "Spiele 100 Runden" }, earned: (s) => s.totalRuns >= 100 },
  { id: "marathon", icon: Repeat, name: { en: "Marathoner", de: "Marathonläufer" }, desc: { en: "Play 250 games", de: "Spiele 250 Runden" }, earned: (s) => s.totalRuns >= 250 },

  // ── Total score ─────────────────────────────────────────
  { id: "score1k", icon: Star, name: { en: "Point Collector", de: "Punktesammler" }, desc: { en: "Earn 1,000 total points", de: "Sammle 1.000 Punkte" }, earned: (s) => s.totalScore >= 1000 },
  { id: "score10k", icon: Sparkles, name: { en: "Point Hoarder", de: "Punkte-Hamster" }, desc: { en: "Earn 10,000 total points", de: "Sammle 10.000 Punkte" }, earned: (s) => s.totalScore >= 10000 },
  { id: "score50k", icon: Rocket, name: { en: "Point Legend", de: "Punkte-Legende" }, desc: { en: "Earn 50,000 total points", de: "Sammle 50.000 Punkte" }, earned: (s) => s.totalScore >= 50000 },
  { id: "score100k", icon: Gem, name: { en: "Point Deity", de: "Punkte-Gottheit" }, desc: { en: "Earn 100,000 total points", de: "Sammle 100.000 Punkte" }, earned: (s) => s.totalScore >= 100000 },

  // ── Single run ──────────────────────────────────────────
  { id: "bigrun", icon: Zap, name: { en: "High Roller", de: "High Roller" }, desc: { en: "Score 3,000 in one game", de: "3.000 Punkte in einer Runde" }, earned: (s) => s.maxScoreRun >= 3000 },
  { id: "megarun", icon: TrendingUp, name: { en: "Mega Run", de: "Mega-Runde" }, desc: { en: "Score 5,000 in one game", de: "5.000 Punkte in einer Runde" }, earned: (s) => s.maxScoreRun >= 5000 },

  // ── Streaks ─────────────────────────────────────────────
  { id: "streak10", icon: Flame, name: { en: "On Fire", de: "In Flammen" }, desc: { en: "Reach a streak of 10", de: "Erreiche eine Serie von 10" }, earned: (s) => s.bestStreak >= 10 },
  { id: "speedy", icon: Gauge, name: { en: "Hot Streak", de: "Lauf" }, desc: { en: "Reach a streak of 15", de: "Erreiche eine Serie von 15" }, earned: (s) => s.bestStreak >= 15 },
  { id: "streak25", icon: Flame, name: { en: "Unstoppable", de: "Unaufhaltsam" }, desc: { en: "Reach a streak of 25", de: "Erreiche eine Serie von 25" }, earned: (s) => s.bestStreak >= 25 },
  { id: "streak50", icon: Flame, name: { en: "Inhuman", de: "Übermenschlich" }, desc: { en: "Reach a streak of 50", de: "Erreiche eine Serie von 50" }, earned: (s) => s.bestStreak >= 50 },

  // ── Accuracy ────────────────────────────────────────────
  { id: "perfect", icon: Target, name: { en: "Flawless", de: "Makellos" }, desc: { en: "Finish a round with 100% accuracy", de: "Runde mit 100% Treffer beenden" }, earned: (s) => s.perfectRounds >= 1 },
  { id: "perfect5", icon: Target, name: { en: "Perfectionist", de: "Perfektionist" }, desc: { en: "Get 5 perfect rounds", de: "5 perfekte Runden" }, earned: (s) => s.perfectRounds >= 5 },
  { id: "perfect10", icon: Crosshair, name: { en: "Sniper", de: "Scharfschütze" }, desc: { en: "Get 10 perfect rounds", de: "10 perfekte Runden" }, earned: (s) => s.perfectRounds >= 10 },
  { id: "perfect25", icon: Crosshair, name: { en: "Untouchable", de: "Unantastbar" }, desc: { en: "Get 25 perfect rounds", de: "25 perfekte Runden" }, earned: (s) => s.perfectRounds >= 25 },
  { id: "bigPerfect", icon: Award, name: { en: "Spotless", de: "Tadellos" }, desc: { en: "A perfect round of 25+ questions", de: "Perfekte Runde mit 25+ Fragen" }, earned: (s) => s.bigPerfect >= 1 },

  // ── Variety ─────────────────────────────────────────────
  { id: "sampler", icon: Compass, name: { en: "Sampler", de: "Schnupperer" }, desc: { en: "Try 5 different games", de: "5 verschiedene Spiele" }, earned: (s) => s.distinctGames >= 5 },
  { id: "explorer", icon: Globe2, name: { en: "Explorer", de: "Entdecker" }, desc: { en: "Try 10 different games", de: "10 verschiedene Spiele" }, earned: (s) => s.distinctGames >= 10 },
  { id: "allgames", icon: Globe2, name: { en: "Globetrotter", de: "Weltenbummler" }, desc: { en: "Try 15 different games", de: "15 verschiedene Spiele" }, earned: (s) => s.distinctGames >= 15 },
  { id: "completionist", icon: Crown, name: { en: "Completionist", de: "Komplettist" }, desc: { en: "Try every single game", de: "Wirklich jedes Spiel" }, earned: (s) => s.distinctGames >= 19 },

  // ── Difficulty & style ──────────────────────────────────
  { id: "hardMode", icon: Swords, name: { en: "Hard Mode", de: "Harter Modus" }, desc: { en: "Win points on hard difficulty", de: "Punkte auf Schwer holen" }, earned: (s) => s.hardRuns >= 1 },
  { id: "hardcore", icon: Diamond, name: { en: "Hardcore", de: "Hardcore" }, desc: { en: "A perfect round on hard", de: "Perfekte Runde auf Schwer" }, earned: (s) => s.hardPerfect >= 1 },
  { id: "typist", icon: Keyboard, name: { en: "Typist", de: "Schnelltipper" }, desc: { en: "Finish 10 rounds in typing mode", de: "10 Runden im Tippmodus" }, earned: (s) => s.typeRuns >= 10 },

  // ── Habit ───────────────────────────────────────────────
  { id: "regular", icon: CalendarDays, name: { en: "Regular", de: "Stammgast" }, desc: { en: "Play on 3 different days", de: "An 3 verschiedenen Tagen spielen" }, earned: (s) => s.distinctDays >= 3 },
  { id: "loyal", icon: CalendarDays, name: { en: "Loyal", de: "Treu" }, desc: { en: "Play on 7 different days", de: "An 7 verschiedenen Tagen spielen" }, earned: (s) => s.distinctDays >= 7 },
  { id: "nightOwl", icon: Moon, name: { en: "Night Owl", de: "Nachteule" }, desc: { en: "Play after midnight", de: "Nach Mitternacht spielen" }, earned: (s) => s.nightOwl >= 1 },

  // ── Per-game mastery ────────────────────────────────────
  { id: "flags50", icon: Flag, name: { en: "Vexillologist", de: "Flaggen-Profi" }, desc: { en: "50 correct flags", de: "50 Flaggen richtig" }, earned: (s) => g(s, "flags") >= 50 },
  { id: "flags200", icon: Flag, name: { en: "Flag Master", de: "Flaggen-Meister" }, desc: { en: "200 correct flags", de: "200 Flaggen richtig" }, earned: (s) => g(s, "flags") >= 200 },
  { id: "capitals50", icon: Landmark, name: { en: "Capital Expert", de: "Hauptstadt-Profi" }, desc: { en: "50 correct capitals & cities", de: "50 Haupt-/Städte richtig" }, earned: (s) => g(s, "capitals") >= 50 },
  { id: "capitals150", icon: Landmark, name: { en: "City Slicker", de: "Großstädter" }, desc: { en: "150 correct capitals & cities", de: "150 Haupt-/Städte richtig" }, earned: (s) => g(s, "capitals") >= 150 },
  { id: "map100", icon: MapPin, name: { en: "Pathfinder", de: "Pfadfinder" }, desc: { en: "Find 100 countries on the map", de: "100 Länder auf der Karte finden" }, earned: (s) => g(s, "map-click") >= 100 },
  { id: "map250", icon: MapPin, name: { en: "Cartophile", de: "Kartenkenner" }, desc: { en: "Find 250 countries on the map", de: "250 Länder auf der Karte finden" }, earned: (s) => g(s, "map-click") >= 250 },
  { id: "outline30", icon: Shapes, name: { en: "Shape Shifter", de: "Formen-Kenner" }, desc: { en: "30 correct outlines", de: "30 Umrisse richtig" }, earned: (s) => g(s, "outline") >= 30 },
  { id: "draw20", icon: Pencil, name: { en: "Cartographer", de: "Kartograf" }, desc: { en: "20 good drawings", de: "20 gute Zeichnungen" }, earned: (s) => g(s, "draw") + g(s, "trace") >= 20 },
  { id: "trace15", icon: PenLine, name: { en: "River Tracer", de: "Fluss-Zeichner" }, desc: { en: "Trace 15 rivers", de: "15 Flüsse nachzeichnen" }, earned: (s) => g(s, "trace") >= 15 },
  { id: "lang30", icon: Languages, name: { en: "Polyglot", de: "Polyglott" }, desc: { en: "30 correct in Scripts & Money", de: "30 richtig bei Schrift & Währung" }, earned: (s) => g(s, "languages") >= 30 },
  { id: "waters20", icon: Waves, name: { en: "Hydrologist", de: "Hydrologe" }, desc: { en: "20 rivers & lakes", de: "20 Flüsse & Seen" }, earned: (s) => g(s, "waters") >= 20 },
  { id: "waters50", icon: Waves, name: { en: "Oceanographer", de: "Ozeanograf" }, desc: { en: "50 rivers & lakes", de: "50 Flüsse & Seen" }, earned: (s) => g(s, "waters") >= 50 },
  { id: "trivia30", icon: Lightbulb, name: { en: "Know-It-All", de: "Besserwisser" }, desc: { en: "30 correct trivia", de: "30 Trivia richtig" }, earned: (s) => g(s, "trivia") >= 30 },
  { id: "neighbors20", icon: Fingerprint, name: { en: "Detective", de: "Detektiv" }, desc: { en: "20 correct in Who Am I?", de: "20 richtig bei Wer bin ich?" }, earned: (s) => g(s, "neighbors") >= 20 },
  { id: "route", icon: Route, name: { en: "Wayfarer", de: "Wegfinder" }, desc: { en: "Complete a land route", de: "Einen Landweg schaffen" }, earned: (s) => g(s, "route") >= 1 },
  { id: "routePro", icon: Route, name: { en: "Road Tripper", de: "Roadtripper" }, desc: { en: "20 correct route steps", de: "20 richtige Wegschritte" }, earned: (s) => g(s, "route") >= 20 },
  { id: "higherLower50", icon: Scale, name: { en: "Top Trump", de: "Quartett-König" }, desc: { en: "50 correct comparisons", de: "50 richtige Vergleiche" }, earned: (s) => g(s, "higher-lower") >= 50 },
  { id: "ranking30", icon: ListOrdered, name: { en: "Sorted", de: "Sortierer" }, desc: { en: "30 correct rankings", de: "30 richtige Rangfolgen" }, earned: (s) => g(s, "ranking") >= 30 },
  { id: "pin30", icon: Crosshair, name: { en: "Sharpshooter", de: "Punktlandung" }, desc: { en: "30 close pins", de: "30 nahe Treffer" }, earned: (s) => g(s, "pin") >= 30 },
  { id: "borderchain30", icon: Spline, name: { en: "Chain Gang", de: "Kettenmeister" }, desc: { en: "30 correct neighbours", de: "30 richtige Nachbarn" }, earned: (s) => g(s, "border-chain") >= 30 },
  { id: "origin30", icon: Sparkles, name: { en: "Culture Vulture", de: "Kulturkenner" }, desc: { en: "30 correct origins", de: "30 richtige Herkünfte" }, earned: (s) => g(s, "origin") >= 30 },
  { id: "nameall50", icon: ListChecks, name: { en: "Lister", de: "Auflister" }, desc: { en: "Name 50 countries in Name All", de: "50 Länder bei Alle nennen" }, earned: (s) => g(s, "nameall") >= 50 },
  { id: "mountains25", icon: Mountain, name: { en: "Mountaineer", de: "Bergsteiger" }, desc: { en: "Identify 25 peaks", de: "25 Gipfel erkennen" }, earned: (s) => g(s, "mountains") >= 25 },
  { id: "nerd10", icon: GraduationCap, name: { en: "Geo-Nerd", de: "Geo-Nerd" }, desc: { en: "Reach question 10 in the quiz", de: "Frage 10 im Quiz erreichen" }, earned: (s) => (s.maxTotalByGame["millionaire"] ?? 0) >= 10 },
  { id: "nerd20", icon: Brain, name: { en: "Geo Genius", de: "Geo-Genie" }, desc: { en: "Reach question 20 in the quiz", de: "Frage 20 im Quiz erreichen" }, earned: (s) => (s.maxTotalByGame["millionaire"] ?? 0) >= 20 },

  // ── Higher tiers ────────────────────────────────────────
  // Volume
  { id: "runs500", icon: Repeat, name: { en: "Veteran", de: "Veteran" }, desc: { en: "Play 500 games", de: "Spiele 500 Runden" }, earned: (s) => s.totalRuns >= 500 },
  { id: "runs1000", icon: Crown, name: { en: "Geo Immortal", de: "Geo-Unsterblich" }, desc: { en: "Play 1,000 games", de: "Spiele 1.000 Runden" }, earned: (s) => s.totalRuns >= 1000 },
  // Total score
  { id: "score250k", icon: Gem, name: { en: "Quarter Million", de: "Viertelmillion" }, desc: { en: "Earn 250,000 total points", de: "Sammle 250.000 Punkte" }, earned: (s) => s.totalScore >= 250000 },
  { id: "score500k", icon: Diamond, name: { en: "Half a Million", de: "Halbe Million" }, desc: { en: "Earn 500,000 total points", de: "Sammle 500.000 Punkte" }, earned: (s) => s.totalScore >= 500000 },
  { id: "score1m", icon: Crown, name: { en: "Millionaire", de: "Millionär" }, desc: { en: "Earn 1,000,000 total points", de: "Sammle 1.000.000 Punkte" }, earned: (s) => s.totalScore >= 1000000 },
  { id: "score2m", icon: Sparkles, name: { en: "Multi-Millionaire", de: "Multimillionär" }, desc: { en: "Earn 2,000,000 total points", de: "Sammle 2.000.000 Punkte" }, earned: (s) => s.totalScore >= 2000000 },
  { id: "score5m", icon: Rocket, name: { en: "Point Tycoon", de: "Punkte-Tycoon" }, desc: { en: "Earn 5,000,000 total points", de: "Sammle 5.000.000 Punkte" }, earned: (s) => s.totalScore >= 5000000 },
  // Single run
  { id: "run7500", icon: Zap, name: { en: "Big Spender", de: "Großverdiener" }, desc: { en: "Score 7,500 in one game", de: "7.500 Punkte in einer Runde" }, earned: (s) => s.maxScoreRun >= 7500 },
  { id: "run10k", icon: TrendingUp, name: { en: "Five Figures", de: "Fünfstellig" }, desc: { en: "Score 10,000 in one game", de: "10.000 Punkte in einer Runde" }, earned: (s) => s.maxScoreRun >= 10000 },
  { id: "run15k", icon: Rocket, name: { en: "Stratosphere", de: "Stratosphäre" }, desc: { en: "Score 15,000 in one game", de: "15.000 Punkte in einer Runde" }, earned: (s) => s.maxScoreRun >= 15000 },
  // Streaks
  { id: "streak50b", icon: Flame, name: { en: "Blazing", de: "Lodernd" }, desc: { en: "Reach a streak of 40", de: "Erreiche eine Serie von 40" }, earned: (s) => s.bestStreak >= 40 },
  { id: "streak75", icon: Flame, name: { en: "Supernova", de: "Supernova" }, desc: { en: "Reach a streak of 75", de: "Erreiche eine Serie von 75" }, earned: (s) => s.bestStreak >= 75 },
  { id: "streak100", icon: Flame, name: { en: "Centa-Streak", de: "Hunderter-Serie" }, desc: { en: "Reach a streak of 100", de: "Erreiche eine Serie von 100" }, earned: (s) => s.bestStreak >= 100 },
  // Perfection
  { id: "perfect25b", icon: Target, name: { en: "Machine", de: "Maschine" }, desc: { en: "Get 50 perfect rounds", de: "50 perfekte Runden" }, earned: (s) => s.perfectRounds >= 50 },
  { id: "perfect100", icon: Award, name: { en: "Immaculate", de: "Unbefleckt" }, desc: { en: "Get 100 perfect rounds", de: "100 perfekte Runden" }, earned: (s) => s.perfectRounds >= 100 },
  // Habit
  { id: "days30", icon: CalendarDays, name: { en: "Devotee", de: "Stammspieler" }, desc: { en: "Play on 30 different days", de: "An 30 verschiedenen Tagen spielen" }, earned: (s) => s.distinctDays >= 30 },
  { id: "days100", icon: CalendarDays, name: { en: "Centurion", de: "Hundert-Tage-Held" }, desc: { en: "Play on 100 different days", de: "An 100 verschiedenen Tagen spielen" }, earned: (s) => s.distinctDays >= 100 },
  // Hard mode mastery
  { id: "hard25", icon: Swords, name: { en: "Hard Veteran", de: "Hart-Veteran" }, desc: { en: "Finish 25 runs on hard", de: "25 Runden auf Schwer" }, earned: (s) => s.hardRuns >= 25 },
  { id: "typist50", icon: Keyboard, name: { en: "Touch Typist", de: "Zehnfinger-Profi" }, desc: { en: "Finish 50 rounds typing", de: "50 Runden im Tippmodus" }, earned: (s) => s.typeRuns >= 50 },
  // Deep per-game mastery
  { id: "flags500", icon: Flag, name: { en: "Flag Deity", de: "Flaggen-Gottheit" }, desc: { en: "500 correct flags", de: "500 Flaggen richtig" }, earned: (s) => g(s, "flags") >= 500 },
  { id: "capitals300", icon: Landmark, name: { en: "Metropolitan", de: "Metropolen-Meister" }, desc: { en: "300 correct capitals & cities", de: "300 Haupt-/Städte richtig" }, earned: (s) => g(s, "capitals") >= 300 },
  { id: "map500", icon: MapPin, name: { en: "World Master", de: "Welt-Meister" }, desc: { en: "Find 500 countries on the map", de: "500 Länder auf der Karte finden" }, earned: (s) => g(s, "map-click") >= 500 },
  { id: "trivia100", icon: Lightbulb, name: { en: "Walking Atlas", de: "Wandelndes Lexikon" }, desc: { en: "100 correct trivia", de: "100 Trivia richtig" }, earned: (s) => g(s, "trivia") >= 100 },
  { id: "nerd30", icon: Brain, name: { en: "Geo Grandmaster", de: "Geo-Großmeister" }, desc: { en: "Reach question 30 in the quiz", de: "Frage 30 im Quiz erreichen" }, earned: (s) => (s.maxTotalByGame["millionaire"] ?? 0) >= 30 },
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
