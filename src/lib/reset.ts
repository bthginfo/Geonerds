/** Every persisted gameplay store removed by Settings → Clear data. */
export const GAMEPLAY_STORAGE_KEYS = [
  "geonerds-scores",
  "geonerds-dex",
  "geonerds-progression",
  "geonerds-daily",
  "geonerds-weekly",
  "geonerds-expedition",
] as const;

export function clearGameplayStorage(storage: Pick<Storage, "removeItem">) {
  GAMEPLAY_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
}
