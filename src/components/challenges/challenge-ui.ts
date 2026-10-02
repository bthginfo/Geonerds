import type { GeoChallenge } from "@/lib/challenges";
import type { GameId, Locale, RunResult } from "@/lib/types";

const ERRORS: Record<string, Record<Locale, string>> = {
  unauthorized: { de: "Bitte melde dich an, um deine Herausforderung fortzusetzen.", en: "Sign in to continue your challenge." },
  not_configured: { de: "Der Online-Dienst ist derzeit nicht eingerichtet. Alle normalen Spiele bleiben verfügbar.", en: "The online service is not configured right now. All regular games remain available." },
  service_unavailable: { de: "Der Online-Dienst ist gerade nicht erreichbar. Bitte versuche es erneut.", en: "The online service is temporarily unavailable. Please try again." },
  network_error: { de: "Keine Verbindung zum Online-Dienst. Prüfe deine Verbindung und versuche es erneut.", en: "Could not reach the online service. Check your connection and try again." },
  submission_pending: { de: "Dein fertiges Ergebnis wurde wiederhergestellt und kann jetzt gesendet werden.", en: "Your completed result was restored and is ready to submit." },
  unknown_user: { de: "Dieses Konto wurde nicht gefunden. Prüfe den Benutzernamen.", en: "That account was not found. Check the username." },
  self_challenge: { de: "Wähle einen anderen Spieler als dich selbst.", en: "Choose a player other than yourself." },
  too_many_challenges: { de: "Du hast bereits viele offene Herausforderungen. Schließe zuerst eine ab.", en: "You already have many open challenges. Complete one first." },
  expired: { de: "Diese Herausforderung ist abgelaufen.", en: "This challenge has expired." },
  not_active: { de: "Diese Herausforderung ist noch nicht angenommen oder nicht mehr spielbar.", en: "This challenge has not been accepted yet or is no longer playable." },
  already_submitted: { de: "Dein Versuch wurde bereits gespeichert. Öffne deine Herausforderungen für das Ergebnis.", en: "Your attempt is already saved. Open your challenges to see the result." },
  already_started: { de: "Dieser Versuch wurde bereits begonnen. Ein Neustart ist nicht möglich; ein fertig gespeichertes Ergebnis kannst du erneut senden.", en: "This attempt has already started. It cannot be restarted; a saved completed result can still be submitted." },
  invalid_transition: { de: "Die Herausforderung hat sich inzwischen geändert. Aktualisiere die Übersicht.", en: "This challenge has changed. Refresh the overview." },
  not_found: { de: "Diese Herausforderung wurde nicht gefunden oder gehört nicht zu deinem Konto.", en: "This challenge was not found or does not belong to your account." },
  not_participant: { de: "Diese Herausforderung gehört zu einem anderen Konto.", en: "This challenge belongs to a different account." },
  invalid_attempt: { de: "Der Versuch konnte nicht bestätigt werden. Öffne deine Herausforderungen oder melde dich mit dem ursprünglichen Konto an.", en: "The attempt could not be verified. Open your challenges or sign in with the original account." },
  invalid_result: { de: "Das Ergebnis konnte nicht bestätigt werden. Deine Herausforderung bleibt in der Übersicht sichtbar.", en: "The result could not be verified. Your challenge remains visible in the overview." },
  wrong_game: { de: "Diese Herausforderung gehört zu einem anderen Spiel. Öffne sie über die Übersicht.", en: "This challenge is for a different game. Open it from the overview." },
  missing_seed: { de: "Die gemeinsamen Fragen sind noch nicht bereit. Aktualisiere deine Herausforderungen.", en: "The shared questions are not ready. Refresh your challenges." },
  invalid_request: { de: "Prüfe den Benutzernamen und die Spieleinstellungen.", en: "Check the username and game settings." },
};

export function challengeError(error: string | undefined, locale: Locale): string {
  return ERRORS[error ?? ""]?.[locale] ?? (locale === "de" ? "Das hat leider nicht geklappt. Bitte versuche es erneut." : "Something went wrong. Please try again.");
}

export function challengePlayBlock(challenge: GeoChallenge, gameId: GameId, now = Date.now()): string | null {
  if (challenge.gameId !== gameId) return "wrong_game";
  const expiry = new Date(challenge.expiresAt).getTime();
  if (challenge.status === "expired" || !Number.isFinite(expiry) || expiry <= now) return "expired";
  if (challenge.viewerAttempted) return "already_submitted";
  if (challenge.status !== "active") return "not_active";
  if (challenge.viewerStarted) return "already_started";
  if (!challenge.seed) return "missing_seed";
  return null;
}

export interface SavedChallengeAttempt {
  attemptToken: string;
  run?: RunResult;
  countryHits?: string[];
  localSaved: boolean;
}

export function attemptStorageKey(userId: string, challengeId: string): string {
  return `geonerds-challenge-attempt:${userId}:${challengeId}`;
}

export function readSavedAttempt(key: string): SavedChallengeAttempt | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw) as SavedChallengeAttempt;
    if (!value || typeof value.attemptToken !== "string" || !value.attemptToken || typeof value.localSaved !== "boolean") return null;
    if (value.run && ![value.run.score, value.run.correct, value.run.total, value.run.bestStreak, value.run.durationMs, value.run.createdAt].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)) return null;
    if (value.countryHits && (!Array.isArray(value.countryHits) || !value.countryHits.every((code) => typeof code === "string"))) return null;
    return value;
  } catch { return null; }
}

export function writeSavedAttempt(key: string, attempt: SavedChallengeAttempt) {
  try { sessionStorage.setItem(key, JSON.stringify(attempt)); } catch { /* In-memory retry still works when browser storage is unavailable. */ }
}
