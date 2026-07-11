import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "vite";

const root = resolve(import.meta.dirname, "..");
const server = await createServer({
  root,
  configFile: false,
  server: { middlewareMode: true },
  resolve: { alias: { "@": resolve(root, "src") } },
});

try {
  const recipeSourceModule = await server.ssrLoadModule("/src/data/country-recipes.ts");
  const countries = recipeSourceModule.COUNTRY_RECIPES;
  if (!countries || Object.keys(countries).length !== 196) throw new Error("Recipe source must contain exactly 196 countries");
  const target = resolve(root, "public/data/country-recipes.json");
  mkdirSync(resolve(root, "public/data"), { recursive: true });
  writeFileSync(target, `${JSON.stringify({ version: 1, countries })}\n`, "utf8");
  console.log(`Wrote ${Object.keys(countries).length} country recipes to ${target}`);
} finally {
  await server.close();
}
