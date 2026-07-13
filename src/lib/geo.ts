import { feature } from "topojson-client";
import { geometryAreaScore } from "@/lib/geometry";
import { COMPANION_FEATURE_NAMES, mergedCompanionGeometries } from "@/lib/geo-companions";

export interface CountryFeature {
  type: "Feature";
  id: string;
  properties: { name: string };
  geometry: GeoJSON.Geometry;
}

type Resolution = "10m" | "50m" | "110m";

const caches: Partial<Record<Resolution, Promise<CountryFeature[]>>> = {};

export function loadCountries(res: Resolution = "50m"): Promise<CountryFeature[]> {
  if (!caches[res]) {
    const request = fetch(`/geo/countries-${res}.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${res} country geometry (${response.status})`);
        return response.json();
      })
      .then((topo) => {
        const fc = feature(topo, topo.objects.countries) as unknown as {
          features: CountryFeature[];
        };
        // Dissolve id-less companion territories (Northern Cyprus,
        // Somaliland, …) into their country so outlines read as one landmass.
        const merged = mergedCompanionGeometries(topo);
        // Keep all features (incl. id-less ones like Kosovo) so the map has
        // no visual gaps; callers that need country matching filter by id.
        // Absorbed companions are dropped — their country now covers them.
        return fc.features
          .filter((f) => f.id != null || !COMPANION_FEATURE_NAMES.has(f.properties?.name ?? ""))
          .map((f) => {
            const replacement = f.id != null ? merged.get(String(f.id)) : undefined;
            return replacement ? { ...f, geometry: replacement } : f;
          });
      });
    caches[res] = request.catch((error) => {
      delete caches[res];
      throw error;
    });
  }
  return caches[res]!;
}

export async function featuresByCcn3(res: Resolution = "50m"): Promise<Map<string, CountryFeature>> {
  const list = await loadCountries(res);
  const map = new Map<string, CountryFeature>();
  // Some numeric codes are shared (e.g. Australia + a tiny territory). Keep the
  // larger geometry so the main country is the one we quiz on.
  for (const f of list) {
    if (!f.id) continue;
    const id = String(f.id);
    const existing = map.get(id);
    if (!existing || geometryAreaScore(f.geometry) > geometryAreaScore(existing.geometry)) {
      map.set(id, f);
    }
  }
  return map;
}
