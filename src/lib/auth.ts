import { randomBytes, scryptSync, timingSafeEqual, createHmac, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "gn_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 365; // 1 year

function secret(): string {
  return process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
}

// ---- passcode hashing (scrypt) ----

export function hashPasscode(passcode: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(passcode, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasscode(passcode: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(passcode, salt, 64);
  const original = Buffer.from(hash, "hex");
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}

export function newId(): string {
  return randomUUID();
}

// ---- signed session token: base64url(payload).hmac ----

interface SessionPayload {
  uid: string;
  name: string;
  exp: number;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSessionToken(uid: string, name: string): string {
  const payload: SessionPayload = { uid, name, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(uid: string, name: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(uid, name), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
