/** Existing duels retain their original photo sequence across this content update. */
export const ADASTRA_CATALOG_SEED_PREFIX = "geo:adastra-v4:";
export type AdastraCatalogVersion = "current" | "city-v1" | "network-v2" | "expanded-v3";

export function getAdastraCatalogVersion(seed: string, challenge = false): AdastraCatalogVersion {
  if (!challenge || seed.startsWith(ADASTRA_CATALOG_SEED_PREFIX)) return "current";
  if (seed.startsWith("geo:adastra-v3:")) return "expanded-v3";
  return seed.startsWith("geo:adastra-v2:") ? "network-v2" : "city-v1";
}
