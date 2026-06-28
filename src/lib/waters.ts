export interface Water {
  id: string;
  kind: "river" | "lake";
  name: string;
  nameDe?: string;
  accepted: string[];
  geometry: GeoJSON.Geometry;
}

let cache: Promise<Water[]> | null = null;

export function loadWaters(): Promise<Water[]> {
  if (!cache) {
    cache = fetch("/geo/waters.json").then((r) => r.json());
  }
  return cache;
}

export function waterLabel(w: Water, locale: string): string {
  return locale === "de" && w.nameDe ? w.nameDe : w.name;
}
