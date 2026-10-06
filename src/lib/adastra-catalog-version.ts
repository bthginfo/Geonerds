/** Existing duels retain their original photo sequence across this content update. */
export const ADASTRA_CATALOG_SEED_PREFIX = "geo:adastra-v2:";

export function isLegacyAdastraChallenge(seed: string, challenge = false): boolean {
  return challenge && !seed.startsWith(ADASTRA_CATALOG_SEED_PREFIX);
}
