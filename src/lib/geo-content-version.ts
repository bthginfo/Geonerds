/** Existing invitations keep their original question bank and mechanics. */
export const GEO_CONTENT_SEED_PREFIX = "geo-v2:";

export function isLegacyGeoSeed(seed: string | undefined): boolean {
  return seed?.startsWith("geo:") ?? false;
}
