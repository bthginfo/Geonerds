import { feature } from "topojson-client";
import { geoArea } from "d3-geo";

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
    caches[res] = fetch(`/geo/countries-${res}.json`)
      .then((r) => r.json())
      .then((topo) => {
        const fc = feature(topo, topo.objects.countries) as unknown as {
          features: CountryFeature[];
        };
        // Keep all features (incl. id-less ones like Somaliland) so the map has
        // no visual gaps; callers that need country matching filter by id.
        return fc.features;
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
    if (!existing || geoArea(f as unknown as GeoJSON.Feature) > geoArea(existing as unknown as GeoJSON.Feature)) {
      map.set(id, f);
    }
  }
  return map;
}
