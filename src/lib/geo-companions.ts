import { merge } from "topojson-client";

/**
 * Natural Earth ships some de-facto territories as separate, id-less features.
 * Quizzing on the bare id feature then shows a broken shape — Cyprus without
 * the north renders as a torn island with a detached south-eastern exclave.
 * Each entry maps a country's numeric code (ccn3) to the companion feature
 * names that must be dissolved into it so the outline reads as one landmass.
 *
 * Kosovo is deliberately NOT merged into Serbia: showing Serbia without
 * Kosovo matches how most atlases and quizzes draw it today.
 */
export const GEO_COMPANIONS: Record<string, readonly string[]> = {
  // Cyprus: Northern Cyprus, the UN buffer zone and both UK base areas.
  "196": ["N. Cyprus", "Cyprus U.N. Buffer Zone", "Dhekelia", "Akrotiri"],
  // Somalia: Somaliland (the Horn of Africa is unrecognizable without it).
  "706": ["Somaliland"],
  // Cuba: the Guantanamo Bay naval base notch.
  "192": ["USNB Guantanamo Bay"],
  // Kazakhstan: the leased Baikonur enclave.
  "398": ["Baikonur"],
};

/** Every feature name that gets absorbed into a country geometry. */
export const COMPANION_FEATURE_NAMES: ReadonlySet<string> = new Set(
  Object.values(GEO_COMPANIONS).flat()
);

interface TopoGeometry {
  id?: string | number;
  properties?: { name?: string };
}
export interface CountriesTopology {
  objects: { countries: { geometries: TopoGeometry[] } };
}

/**
 * Merged whole-landmass geometry per country id, for every companion set
 * present in the given topology. Merging happens on the topology's shared
 * arcs, so internal borders dissolve cleanly.
 */
export function mergedCompanionGeometries(topo: CountriesTopology): Map<string, GeoJSON.Geometry> {
  const geometries = topo.objects.countries.geometries;
  const result = new Map<string, GeoJSON.Geometry>();
  for (const [id, names] of Object.entries(GEO_COMPANIONS)) {
    const target = geometries.find((g) => g.id != null && String(g.id) === id);
    const companions = geometries.filter(
      (g) => g.id == null && g.properties?.name != null && names.includes(g.properties.name)
    );
    if (!target || companions.length === 0) continue;
    result.set(id, merge(topo as never, [target, ...companions] as never[]));
  }
  return result;
}
