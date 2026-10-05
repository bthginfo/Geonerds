/** Shared public contracts; no database or authentication code in client bundles. */
export const FEEDBACK_MIN_LENGTH = 10;
export const FEEDBACK_MAX_LENGTH = 4000;
export const DUEL_WIN_POINTS = 3;
export const DUEL_DRAW_POINTS = 1;

export type FeedbackStatus = "new" | "reviewed";
export type FeedbackFilter = FeedbackStatus | "all";

export interface FeedbackSubmission {
  id: string;
  authorName: string | null;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  reviewedAt: string | null;
}

export interface DuelStanding {
  rank: number;
  name: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  played: number;
  /** Percentage, not a 0–1 fraction. */
  winRate: number;
  opponents: number;
}

export function parseFeedbackMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const message = value.trim().replace(/\r\n?/g, "\n");
  if (message.length < FEEDBACK_MIN_LENGTH || message.length > FEEDBACK_MAX_LENGTH) return null;
  // Control characters have no place in plain-text ideas; preserve tabs/newlines.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(message)) return null;
  return message;
}

export function validSubmissionId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
