export function validateName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 20) return null;
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(trimmed)) return null;
  return trimmed;
}

export function validatePasscode(passcode: unknown): string | null {
  if (typeof passcode !== "string") return null;
  if (passcode.length < 4 || passcode.length > 64) return null;
  return passcode;
}
