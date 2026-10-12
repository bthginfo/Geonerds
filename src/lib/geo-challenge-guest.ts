import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { CHALLENGE_PLAY_TTL_MS } from "./challenges";

export const guestCookieName = (id: string) => `gn_guest_${createHash("sha256").update(id).digest("hex").slice(0, 24)}`;
export const guestTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export function readGuestChallengeToken(req: Request, id: string): string | null {
  const name = guestCookieName(id);
  const pair = (req.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  const value = pair?.slice(name.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

export function validGuestChallengeToken(token: string | null, stored: unknown): boolean {
  if (!token || typeof stored !== "string" || !/^[a-f0-9]{64}$/.test(stored)) return false;
  return timingSafeEqual(Buffer.from(guestTokenHash(token), "hex"), Buffer.from(stored, "hex"));
}

export function newGuestChallengeAccess(id: string) {
  const token = randomBytes(32).toString("hex");
  return {
    hash: guestTokenHash(token),
    cookie: { name: guestCookieName(id), value: token, httpOnly: true,
      secure: process.env.NODE_ENV === "production", sameSite: "lax" as const,
      // The guest capability is only sent to this challenge's API, not other matches.
      path: `/api/challenges/${id}`, maxAge: Math.floor(CHALLENGE_PLAY_TTL_MS / 1000) },
  };
}
