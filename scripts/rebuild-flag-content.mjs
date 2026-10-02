/**
 * Rebuild both flag games from the exact, proportioned SVG shown by FlagImage.
 * Run: node scripts/rebuild-flag-content.mjs
 * Sharp/librsvg validates every SVG. No external assets or new artwork are used.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const countries = JSON.parse(await readFile(resolve(root, "src/data/countries.json"), "utf8"));
const named = { red: "#ff0000", green: "#008000", gold: "#ffd700", olive: "#808000", purple: "#800080", black: "#000000", white: "#ffffff", blue: "#0000ff", yellow: "#ffff00" };
const colorPattern = /(?:fill|stroke|stop-color)\s*[:=]\s*["']?([^\s;"'<>}]+)/gi;

function hex(value) {
  const token = value.toLowerCase();
  if (named[token]) return named[token];
  if (/^#[\da-f]{3}$/.test(token)) return "#" + [...token.slice(1)].map((part) => part + part).join("");
  return /^#[\da-f]{6}$/.test(token) ? token : null;
}

function rgb(value) {
  const number = parseInt(value.slice(1), 16);
  return [(number >>> 16) & 255, (number >>> 8) & 255, number & 255];
}

function distance(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function nearest(value, colors) {
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < colors.length; index++) {
    const next = distance(value, colors[index]);
    if (next < bestDistance) { best = index; bestDistance = next; }
  }
  return best;
}

function renderedPalette(data, anchors) {
  // Histogram first: avoids repeatedly comparing every identical field pixel.
  const histogram = new Map();
  let weight = 0;
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] / 255;
    if (!alpha) continue; // Nepal's transparent exterior is not flag area.
    const key = (data[index] << 16) | (data[index + 1] << 8) | data[index + 2];
    histogram.set(key, (histogram.get(key) ?? 0) + alpha);
    weight += alpha;
  }
  const anchorRgb = anchors.map(rgb);
  const counts = anchors.map(() => 0);
  for (const [key, count] of histogram) {
    const value = [(key >>> 16) & 255, (key >>> 8) & 255, key & 255];
    counts[nearest(value, anchorRgb)] += count;
  }
  const measured = anchors.map((color, index) => ({ hex: color, share: counts[index] / weight }))
    .filter((color) => color.share > 0).sort((a, b) => b.share - a.share);
  // Merge near-identical ink shades (e.g. #fff and #fffffd), not different hues.
  const merged = [];
  for (const color of measured) {
    const close = merged.find((entry) => distance(rgb(entry.hex), rgb(color.hex)) <= 16 ** 2);
    if (close) close.share += color.share;
    else merged.push({ ...color });
  }
  // Keep meaningful emblem inks. Only sub-0.1% flecks/antialiasing are folded
  // into the closest visible ink, so a pie remains legible on a phone.
  const visible = merged.filter((color) => color.share >= .001);
  if (!visible.length) throw new Error("SVG has no visible flag colors");
  const visibleRgb = visible.map((color) => rgb(color.hex));
  for (const color of merged.filter((entry) => entry.share < .001)) {
    visible[nearest(rgb(color.hex), visibleRgb)].share += color.share;
  }
  visible.sort((a, b) => b.share - a.share);
  return visible.map((entry) => ({ hex: entry.hex, share: entry.share }));
}

function colorTemplate(source, colors, code) {
  const groups = new Map(colors.map((color, index) => [color, index]));
  const replace = (token) => {
    const group = groups.get(hex(token));
    return group === undefined ? token : `var(--c${group})`;
  };
  let template = source
    .replace(/\b(fill|stroke|stop-color)\s*=\s*(["'])([^"']+)\2/gi, (_, key, quote, value) => `${key}=${quote}${replace(value)}${quote}`)
    .replace(/\b(fill|stroke|stop-color)\s*:\s*([^;"'<>}]+)/gi, (_, key, value) => `${key}:${replace(value.trim())}`);
  // SVG's implicit black fill was previously lost (most visibly in Jamaica).
  // Explicit root fill preserves normal inheritance and <use> symbol details.
  const rootTag = template.match(/<svg\b[^>]*>/i)?.[0];
  if (rootTag && !/\bfill\s*=/.test(rootTag)) {
    template = template.replace(/<svg\b/i, `<svg fill="${replace("#000000")}"`);
  }
  // Inline flags share a document. Namespace every ID and reference so a second
  // flag cannot accidentally use the first flag's clipPath or emblem.
  const ids = [...template.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((match) => match[1]);
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    template = template.replace(new RegExp(`(\\bid\\s*=\\s*["'])${escaped}(["'])`, "g"), `$1flag-${code}-${id}$2`)
      .replace(new RegExp(`([#])${escaped}(?=[)"'\\s])`, "g"), `$1flag-${code}-${id}`);
  }
  return template;
}

const palettes = {};
const colorFlags = [];
const ratios = {};
let maximumRoundtripDifference = 0;
for (const country of [...countries].sort((a, b) => a.flag.localeCompare(b.flag))) {
  const code = country.flag;
  const path = resolve(root, `public/flags-true/${code}.svg`);
  const source = await readFile(path, "utf8");
  if (!/^\s*<svg\b/.test(source) || /<(?:script|foreignObject|image)\b|\bfilter\s*=|https?:\/\//.test(source.replace(/xmlns(?:\:xlink)?="[^"]+"/g, ""))) {
    throw new Error(`Unsafe or non-standalone SVG: ${code}`);
  }
  const metadata = await sharp(Buffer.from(source)).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`No flag dimensions: ${code}`);
  ratios[code] = metadata.width / metadata.height;
  const raster = await sharp(Buffer.from(source), { density: 96 }).resize({ width: 768, height: 768, fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const anchors = [...new Set(["#000000", ...[...source.matchAll(colorPattern)].map((match) => hex(match[1])).filter(Boolean)])];
  const colors = renderedPalette(raster.data, anchors);
  palettes[code] = { colors, source: `/flags-true/${code}.svg` };

  // Major painted regions plus contrasting symbol inks; fine multicolored
  // coats of arms keep their original, fixed inks rather than being redrawn.
  const paintColors = colors.filter((entry) => entry.share >= .003).slice(0, 7).map((entry) => entry.hex);
  if (paintColors.length < 2) paintColors.push(...anchors.filter((color) => !paintColors.includes(color)).slice(0, 2 - paintColors.length));
  const template = colorTemplate(source, paintColors, code);
  const restored = template.replace(/var\(--c(\d+)\)/g, (_, index) => paintColors[Number(index)]);
  const comparison = await sharp(Buffer.from(restored), { density: 96 }).resize({ width: 768, height: 768, fit: "inside" }).ensureAlpha().raw().toBuffer();
  if (comparison.length !== raster.data.length) throw new Error(`Template changed flag dimensions: ${code}`);
  let difference = 0;
  for (let index = 0; index < comparison.length; index++) difference = Math.max(difference, Math.abs(comparison[index] - raster.data[index]));
  if (difference > 1) throw new Error(`Template changed artwork for ${code}: maximum channel difference ${difference}`);
  maximumRoundtripDifference = Math.max(maximumRoundtripDifference, difference);
  colorFlags.push({ code, en: country.name.en, de: country.name.de, colors: paintColors, template });
}

await writeFile(resolve(root, "src/data/flag-palettes.json"), JSON.stringify(palettes, null, 2) + "\n");
await writeFile(resolve(root, "src/data/flag-ratios.json"), JSON.stringify(ratios, null, 2) + "\n");
await writeFile(resolve(root, "src/data/color-flags.json"), JSON.stringify(colorFlags) + "\n");
console.log(JSON.stringify({ flags: colorFlags.length, palettes: Object.keys(palettes).length, maximumRoundtripDifference, paintGroups: colorFlags.reduce((counts, flag) => ({ ...counts, [flag.colors.length]: (counts[flag.colors.length] ?? 0) + 1 }), {}) }, null, 2));
