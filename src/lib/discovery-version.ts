/**
 * Cache-busting version for the Geo-Dex reward payloads (cuisine blurbs,
 * recipes, country outlines). These responses were once served with a
 * one-year immutable Cache-Control header, so clients keep old payloads
 * until the URL itself changes.
 *
 * Bump this whenever the content of country-cuisines, country-dish-blurbs,
 * country-recipes or country-outlines changes.
 */
export const DISCOVERY_CONTENT_VERSION = 2;
