import type { AnswerMode, Difficulty } from "@/lib/types";

export type ExpeditionRouteId = "africa" | "americas" | "asia" | "europe" | "oceania" | "world";
export type ExpeditionStageGame = "flags" | "capitals" | "outline" | "trivia" | "ranking" | "languages" | "neighbors";

export interface ExpeditionStage {
  id: string;
  gameId: ExpeditionStageGame;
  difficulty: Difficulty;
  mode: AnswerMode;
  variant?: string;
  boss?: boolean;
}

export interface ExpeditionCheckpoint {
  id: string;
  options: ExpeditionStage[];
}

export interface ExpeditionRoute {
  id: ExpeditionRouteId;
  scope?: string;
  accent: string;
  checkpoints: ExpeditionCheckpoint[];
}

function checkpoints(prefix: string): ExpeditionCheckpoint[] {
  return [
    { id: `${prefix}-landfall`, options: [
      { id: `${prefix}-flags`, gameId: "flags", difficulty: "medium", mode: "choice" },
      { id: `${prefix}-capitals`, gameId: "capitals", difficulty: "medium", mode: "choice", variant: "capitals" },
    ] },
    { id: `${prefix}-bearings`, options: [
      { id: `${prefix}-outline`, gameId: "outline", difficulty: "medium", mode: "choice" },
      { id: `${prefix}-trivia`, gameId: "trivia", difficulty: "medium", mode: "choice" },
    ] },
    { id: `${prefix}-fieldnotes`, options: [
      { id: `${prefix}-languages`, gameId: "languages", difficulty: "medium", mode: "choice" },
      { id: `${prefix}-neighbors`, gameId: "neighbors", difficulty: "medium", mode: "choice" },
    ] },
    { id: `${prefix}-crossing`, options: [
      { id: `${prefix}-ranking`, gameId: "ranking", difficulty: "medium", mode: "choice" },
      { id: `${prefix}-flags-hard`, gameId: "flags", difficulty: "hard", mode: "choice" },
    ] },
    { id: `${prefix}-summit`, options: [
      { id: `${prefix}-trivia-hard`, gameId: "trivia", difficulty: "hard", mode: "choice" },
      { id: `${prefix}-capitals-hard`, gameId: "capitals", difficulty: "hard", mode: "choice", variant: "capitals" },
    ] },
    { id: `${prefix}-boss`, options: [
      { id: `${prefix}-boss-flags`, gameId: "flags", difficulty: "hard", mode: "type", boss: true },
    ] },
  ];
}

export const EXPEDITION_ROUTES: ExpeditionRoute[] = [
  { id: "africa", scope: "Africa", accent: "#d97706", checkpoints: checkpoints("africa") },
  { id: "americas", scope: "Americas", accent: "#dc2626", checkpoints: checkpoints("americas") },
  { id: "asia", scope: "Asia", accent: "#7c3aed", checkpoints: checkpoints("asia") },
  { id: "europe", scope: "Europe", accent: "#2563eb", checkpoints: checkpoints("europe") },
  { id: "oceania", scope: "Oceania", accent: "#0891b2", checkpoints: checkpoints("oceania") },
  { id: "world", accent: "#059669", checkpoints: checkpoints("world") },
];

export function getExpeditionRoute(id: string | null | undefined): ExpeditionRoute | undefined {
  return EXPEDITION_ROUTES.find((route) => route.id === id);
}

export function starsForAccuracy(correct: number, total: number): number {
  const accuracy = total > 0 ? correct / total : 0;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.67) return 2;
  if (accuracy > 0) return 1;
  return 0;
}

export function energyLossForAccuracy(correct: number, total: number): number {
  return total > 0 && correct / total < 0.5 ? 1 : 0;
}

export function normalizedStageScore(correct: number, total: number, stars: number): number {
  const accuracy = total > 0 ? correct / total : 0;
  return Math.round(accuracy * 700 + stars * 100);
}
