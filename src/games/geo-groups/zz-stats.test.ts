import { it } from "vitest";
import { getCountryByCca3 } from "@/data/countries";
import { generateBoard, GEO_GROUP_CATEGORIES } from "./generator";
it("stats", () => {
  for (const d of ["easy", "medium", "hard"] as const) {
    const use: Record<string, number> = {};
    let h = 0; const tiers = [0,0,0,0,0];
    for (let i = 0; i < 300; i++) { const b = generateBoard("s" + i, d); h += b.redHerrings.length; b.groups.forEach((g) => (use[g.categoryId] = (use[g.categoryId] ?? 0) + 1)); b.tiles.forEach(t=>tiers[getCountryByCca3(t)!.difficulty]++); }
    console.log(d, "herrings/board", (h / 300).toFixed(2), "tiers", tiers.join(","), "unused", GEO_GROUP_CATEGORIES.filter((c) => !use[c.id]).map((c) => c.id).join(" "));
    console.log(Object.entries(use).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ":" + v).join(" "));
    for (let i = 0; i < 3; i++) { const b = generateBoard("x" + i, d); console.log(b.groups.map((g) => g.categoryId + "[" + g.members.map((m) => getCountryByCca3(m)!.name.en).join(", ") + "]").join("\n  "), "\n  herrings:", b.redHerrings.join(" ")); }
  }
});
