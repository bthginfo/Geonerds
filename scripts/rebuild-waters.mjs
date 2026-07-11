import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_rivers_lake_centerlines.geojson";
const OUTPUT = fileURLToPath(new URL("../public/geo/waters.json", import.meta.url));

const replacements = [
  { existing: "Nile", aliases: ["Nile", "White Nile", "Mountain Nile", "Albert Nile", "Victoria Nile", "Blue Nile"] },
  { existing: "Irtysh", aliases: ["Irtysh", "Ertix"] },
  { existing: "Amur", aliases: ["Amur", "Heilong Jiang"] },
  { existing: "Salween", aliases: ["Salween", "Nu"] },
  { existing: "Mekong", aliases: ["Mekong", "Lancang"] },
  { existing: "Danube", aliases: ["Danube", "Donau"], nameDe: "Donau", accepted: ["Danube", "Donau"] },
  { existing: "Yangtze", aliases: ["Yangtze", "Chang Jiang", "Jinsha"], nameDe: "Jangtsekiang" },
];

const additions = [
  { id: "river-congo", name: "Congo", nameDe: "Kongo", aliases: ["Congo", "Lualaba"], accepted: ["Congo", "Kongo"] },
  { id: "river-brahmaputra", name: "Brahmaputra", aliases: ["Brahmaputra", "Yarlung"] },
  { id: "river-euphrates", name: "Euphrates", nameDe: "Euphrat", aliases: ["Euphrates"], accepted: ["Euphrates", "Euphrat"] },
  { id: "river-tigris", name: "Tigris", aliases: ["Tigris"] },
  { id: "river-rhine", name: "Rhine", nameDe: "Rhein", aliases: ["Rhine", "Rhein", "Rhin"], accepted: ["Rhine", "Rhein"] },
  { id: "river-elbe", name: "Elbe", aliases: ["Elbe"] },
  { id: "river-vistula", name: "Vistula", nameDe: "Weichsel", aliases: ["Vistula"], accepted: ["Vistula", "Weichsel", "Wisła", "Wisla"] },
  { id: "river-oder", name: "Oder", aliases: ["Oder"] },
  { id: "river-seine", name: "Seine", aliases: ["Seine"] },
  { id: "river-loire", name: "Loire", aliases: ["Loire"] },
  { id: "river-rhone", name: "Rhône", nameDe: "Rhone", aliases: ["Rhône"], accepted: ["Rhône", "Rhone"] },
  { id: "river-po", name: "Po", aliases: ["Po"] },
  { id: "river-thames", name: "Thames", nameDe: "Themse", aliases: ["Thames"], accepted: ["Thames", "Themse"] },
  { id: "river-tagus", name: "Tagus", nameDe: "Tajo", aliases: ["Tagus", "Tejo"], accepted: ["Tagus", "Tajo", "Tejo"] },
  { id: "river-douro", name: "Douro", aliases: ["Duero"], accepted: ["Douro", "Duero"] },
  { id: "river-ebro", name: "Ebro", aliases: ["Ebro"] },
  { id: "river-tiber", name: "Tiber", nameDe: "Tiber", aliases: ["Tiber", "Tevere"], accepted: ["Tiber", "Tevere"] },
  { id: "river-jordan", name: "Jordan", aliases: ["Jordan"] },
  { id: "river-limpopo", name: "Limpopo", aliases: ["Limpopo"] },
  { id: "river-darling", name: "Darling", aliases: ["Darling"] },
];

const easyNames = new Set([
  "Amazonas", "Brahmaputra", "Congo", "Danube", "Euphrates", "Ganges", "Indus", "Mekong", "Mississippi",
  "Niger", "Nile", "Rhine", "Rio Grande", "Tigris", "Volga", "Yangtze", "Yellow River", "Zambezi",
  "Lake Baikal", "Lake Chad", "Lake Erie", "Lake Huron", "Lake Malawi", "Lake Michigan", "Lake Ontario",
  "Lake Superior", "Lake Victoria", "Lago Titicaca",
]);

const mediumNames = new Set([
  "Amur", "Colorado", "Columbia", "Darling", "Dniester", "Douro", "Elbe", "Ebro", "Irtysh", "Jordan", "Lena", "Limpopo",
  "Loire", "Mackenzie", "Missouri", "Murray", "Ob", "Oder", "Orange", "Orinoco", "Paraná", "Po", "Rhône", "Salween",
  "Seine", "Tagus", "Thames", "Tiber", "Ural", "Vistula", "Yenisey", "Yukon",
  "Great Bear Lake", "Great Slave Lake", "Great Salt Lake", "IJsselmeer", "Lake Albert", "Lake Ladoga", "Lake Onega",
  "Lake Tana", "Lake Turkana", "Lake Winnipeg", "Vänern",
]);

function valueNames(feature) {
  return [feature.properties.name, feature.properties.name_en, feature.properties.name_alt]
    .filter(Boolean)
    .flatMap((value) => value.split(/[,;]/).map((part) => part.trim()));
}

function linesOf(geometry) {
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function simplify(line, tolerance = 0.012) {
  if (line.length <= 2) return line;
  let maxDistance = 0;
  let splitAt = 0;
  for (let index = 1; index < line.length - 1; index += 1) {
    const distance = perpendicularDistance(line[index], line[0], line.at(-1));
    if (distance > maxDistance) {
      maxDistance = distance;
      splitAt = index;
    }
  }
  if (maxDistance <= tolerance) return [line[0], line.at(-1)];
  return [...simplify(line.slice(0, splitAt + 1), tolerance).slice(0, -1), ...simplify(line.slice(splitAt), tolerance)];
}

function geometryFor(features, aliases) {
  const wanted = new Set(aliases);
  const matches = features.filter(
    (feature) => (feature.properties.featurecla === "River" || feature.properties.featurecla === "Lake Centerline")
      && valueNames(feature).some((name) => wanted.has(name))
  );
  const coordinates = matches.flatMap((feature) => linesOf(feature.geometry)).filter((line) => line.length >= 2).map((line) => simplify(line));
  if (!coordinates.length) throw new Error(`No Natural Earth geometry found for ${aliases.join(", ")}`);
  return { type: "MultiLineString", coordinates };
}

function tierFor(water) {
  if (easyNames.has(water.name)) return 1;
  if (mediumNames.has(water.name)) return 2;
  return 3;
}

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Natural Earth download failed: ${response.status}`);
const source = await response.json();
const current = JSON.parse(await readFile(OUTPUT, "utf8"));

for (const spec of replacements) {
  const water = current.find((entry) => entry.kind === "river" && entry.name === spec.existing);
  if (!water) throw new Error(`Existing river not found: ${spec.existing}`);
  water.geometry = geometryFor(source.features, spec.aliases);
  if (spec.nameDe) water.nameDe = spec.nameDe;
  if (spec.accepted) water.accepted = spec.accepted;
}

const lakeIndex = current.findIndex((entry) => entry.kind === "lake");
const existingIds = new Set(current.map((entry) => entry.id));
const newRivers = additions.filter((spec) => !existingIds.has(spec.id)).map((spec) => ({
  id: spec.id,
  kind: "river",
  name: spec.name,
  ...(spec.nameDe ? { nameDe: spec.nameDe } : {}),
  accepted: spec.accepted ?? [spec.name],
  geometry: geometryFor(source.features, spec.aliases),
}));
current.splice(lakeIndex, 0, ...newRivers);

for (const water of current) water.tier = tierFor(water);
await writeFile(OUTPUT, `${JSON.stringify(current)}\n`, "utf8");
console.log(`Wrote ${current.length} waters (${current.filter((entry) => entry.kind === "river").length} rivers).`);
