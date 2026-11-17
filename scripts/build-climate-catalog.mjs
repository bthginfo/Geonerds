import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const locations = await readJson("src/data/climate-locations.json");
const capitals = await readJson("public/geo/capitals.json");
const countries = await readJson("src/data/countries.json");
const targets = [
  ...locations.capitals.map((code) => {
    const capital = capitals.find((item) => item.code === code);
    const country = countries.find((item) => item.cca3 === code);
    if (!capital || !country) throw new Error(`Missing verified capital ${code}`);
    return { id: `capital:${code}`, name: { en: capital.en, de: capital.en }, cca3: code, lat: capital.lat, lng: capital.lng };
  }),
  ...locations.cities.map((city) => ({ id: `city:${city.en}`, name: { en: city.en, de: city.de }, cca3: city.cca3, lat: city.lat, lng: city.lng })),
];
const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const years = Array.from({ length: 30 }, (_, index) => index + 1991);
const meanMonthDays = months.map((_, month) => years.reduce((sum, year) => sum + new Date(Date.UTC(year, month + 1, 0)).getUTCDate(), 0) / years.length);
const profiles = Array(targets.length);
const versions = new Set();
let cursor = 0;
async function worker() {
  while (cursor < targets.length) {
    const index = cursor++;
    const target = targets[index];
    const url = new URL("https://power.larc.nasa.gov/api/temporal/climatology/point");
    Object.entries({ parameters: "T2M,PRECTOTCORR", community: "AG", longitude: String(target.lng), latitude: String(target.lat), format: "JSON", start: "1991", end: "2020" }).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`NASA climate ${target.id}: HTTP ${response.status}`);
    const data = await response.json();
    if (!data.header?.range?.includes("1991") || !data.header?.range?.includes("2020") ||
        data.parameters?.T2M?.units !== "C" || data.parameters?.PRECTOTCORR?.units !== "mm/day") throw new Error(`Unexpected climate period or units: ${target.id}`);
    versions.add(data.header.api.version);
    const values = data.properties.parameter;
    const temperatureC = months.map((month) => values.T2M[month]);
    const precipitationMm = months.map((month, i) => Math.round(values.PRECTOTCORR[month] * meanMonthDays[i] * 10) / 10);
    if (!temperatureC.every((value) => Number.isFinite(value) && value > -80 && value < 65) ||
        !precipitationMm.every((value) => Number.isFinite(value) && value >= 0 && value < 3000)) throw new Error(`Missing or invalid climatology: ${target.id}`);
    profiles[index] = { ...target, temperatureC, precipitationMm, sourceUrl: url.href };
    process.stdout.write(`${index + 1}/${targets.length} ${target.name.en}\n`);
  }
}
await Promise.all([worker(), worker()]);
if (versions.size !== 1) throw new Error("Mixed NASA API versions: inspect before publishing");
const snapshot = {
  meta: {
    periodStart: 1991, periodEnd: 2020, apiVersion: [...versions][0], retrievedAt: new Date().toISOString(),
    attributionUrl: "https://power.larc.nasa.gov/docs/referencing/",
    methodologyUrl: "https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/",
    accessPolicyUrl: "https://power.larc.nasa.gov/docs/faqs/data/",
    source: "NASA Langley POWER / NASA Earth Science Division", model: "MERRA-2",
    conversion: "PRECTOTCORR mm/day multiplied by the mean calendar-month length over 1991–2020; T2M in degrees C. Gridded estimates, not city weather stations.",
    meanMonthDays,
  }, profiles,
};
const output = new URL("src/data/climate-profiles.json", root);
await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`);
process.stdout.write(`Wrote ${profiles.length} consistent climate profiles to ${fileURLToPath(output)}\n`);
