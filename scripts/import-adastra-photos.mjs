/** Import the reviewed NASA catalogue, not live search results. Run with Node24+.
 * Binary assets are copied unchanged; the caller applies the returned JSON catalog.
 * node scripts/import-adastra-photos.mjs <reviewed-candidates.json> <QA-temp-directory>
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { NIGHT_CITY_DEFINITIONS } from "../src/data/adastra-city-definitions.ts";

const [input, qaDirectory] = process.argv.slice(2);
if (!input || !qaDirectory) throw new Error("A reviewed candidate file and QA directory are required.");
const candidates = JSON.parse(await fs.readFile(input, "utf8"));
const output = path.resolve("public/images/adastra");
await fs.mkdir(output, { recursive: true });
await fs.mkdir(qaDirectory, { recursive: true });
const lookup = new Map(NIGHT_CITY_DEFINITIONS.flatMap((city) => [...new Set([city.name.en, ...city.aliases])].map((name) => [name.toLowerCase(), city])));
const hashes = new Map();
const photos = [];
const issues = [];
// Visually reviewed frames where clouds, hardware or the horizon obscure the city.
// Preserve these exclusions when regenerating the catalogue from the source list.
const rejectedFrames = new Set([
  "iss036e032765", "iss036e022872", "iss040e091715", "iss040e091716",
  "iss040e005997", "iss042e019343", "iss063e039001", "iss073e685684",
  "iss066e158964", "iss040e019206", "iss040e097837",
]);
let next = 0;
const safeText = (value) => String(value).replace(/(?:[\u00c2-\u00f4][\u0080-\u00bf]{1,3})+/g,
  (sequence) => Buffer.from(sequence, "latin1").toString("utf8"));
function canonicalId(value) {
  const id = String(value).toLowerCase();
  const parts = /^(iss\d+)[- ]?([a-z])[- ]?(\d+)$/i.exec(id);
  return parts ? `${parts[1]}${parts[2]}${String(Number(parts[3])).padStart(6, "0")}` : id;
}
const unique = [...new Map(candidates.map((photo) => [canonicalId(photo.nasaId), photo])).values()];
async function worker() {
  while (next < unique.length) {
    const candidate = unique[next++];
    const id = canonicalId(candidate.nasaId);
    if (rejectedFrames.has(id)) { issues.push({ id, issue: "visual-review-city-obscured" }); continue; }
    const city = lookup.get(candidate.city.toLowerCase());
    if (!city) { issues.push({ id, city: candidate.city, issue: "missing-reviewed-city-definition" }); continue; }
    if (!/^[a-z0-9-]+$/.test(id)) { issues.push({ id, issue: "invalid-photo-id" }); continue; }
    const source = new URL(candidate.imageUrl);
    if (source.protocol !== "https:" || !new Set(["images-assets.nasa.gov", "eol.jsc.nasa.gov"]).has(source.hostname)) {
      issues.push({ id, issue: "unapproved-image-host" }); continue;
    }
    try {
      const filename = path.join(output, `${id}.jpg`);
      let bytes;
      try { bytes = await fs.readFile(filename); }
      catch {
        const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error(`image-http-${response.status}`);
        bytes = Buffer.from(await response.arrayBuffer());
      }
      const metadata = await sharp(bytes).metadata();
      if (metadata.format !== "jpeg" || !metadata.width || metadata.width < 640 || !metadata.height || metadata.height < 400) throw new Error("insufficient-jpeg-resolution");
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (hashes.has(hash)) { issues.push({ id, issue: `duplicate-image-content:${hashes.get(hash)}` }); continue; }
      hashes.set(hash, id);
      await fs.writeFile(filename, bytes);
      photos.push({ id, cityId: city.id, src: `/images/adastra/${id}.jpg`, sourceUrl: candidate.sourceUrl,
        title: safeText(candidate.title), capturedAt: candidate.dateCreated && Number.isFinite(Date.parse(candidate.dateCreated))
          ? new Date(candidate.dateCreated).toISOString() : undefined,
        credit: "Image courtesy of the Earth Science and Remote Sensing Unit, NASA Johnson Space Center" });
    } catch (error) { issues.push({ id, city: candidate.city, issue: error.message }); }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
photos.sort((a, b) => a.id.localeCompare(b.id));
const usedCities = new Set(photos.map((photo) => photo.cityId));
const cities = NIGHT_CITY_DEFINITIONS.filter((city) => usedCities.has(city.id));
// Contact sheets are inspection artifacts only; game photographs remain unchanged.
for (let start = 0; start < photos.length; start += 40) {
  const batch = photos.slice(start, start + 40);
  const tiles = await Promise.all(batch.map(async (photo, i) => ({
    input: await sharp(path.join(output, `${photo.id}.jpg`)).resize(240, 160, { fit: "contain", background: "#030712" }).toBuffer(),
    left: (i % 8) * 240, top: Math.floor(i / 8) * 184,
  })));
  const labels = batch.map((photo, i) => `<text x="${(i % 8) * 240 + 5}" y="${Math.floor(i / 8) * 184 + 176}" fill="#fff" font-size="11">${photo.id} / ${photo.cityId}</text>`).join("");
  const height = Math.ceil(batch.length / 8) * 184;
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="${height}">${labels}</svg>`);
  await sharp({ create: { width: 1920, height, channels: 3, background: "#030712" } }).composite([...tiles, { input: overlay }])
    .png().toFile(path.join(qaDirectory, `night-photo-sheet-${Math.floor(start / 40) + 1}.png`));
}
console.log(JSON.stringify({ catalog: { cities, photos }, issues,
  stats: { photos: photos.length, cities: cities.length, countries: new Set(cities.map((city) => city.cca3)).size,
    regions: [...new Set(cities.map((city) => city.region))], contactSheets: Math.ceil(photos.length / 40) } }));
