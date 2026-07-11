import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/data/countries";
import { COUNTRY_CUISINES } from "@/data/country-cuisines";
import { COUNTRY_DEFINING_ACTIONS } from "@/data/country-defining-actions";
import type { CountryRecipePayload } from "@/data/country-recipe-types";
import { countryDiscoveryPresentation } from "@/lib/country-discovery";

const countryCodes = COUNTRIES.map((country) => country.cca3).sort();
const validDiets = new Set(["vegan", "vegetarian", "meat", "fish"]);
const validAllergens = new Set(["milk", "egg", "fish", "shellfish", "tree-nuts", "peanuts", "wheat", "soy", "sesame"]);
const payload = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/country-recipes.json"), "utf8")) as CountryRecipePayload;
const COUNTRY_RECIPES = payload.countries;

describe("country cuisine content", () => {
  it("covers the exact 196-country playable universe in both chunks", () => {
    expect(payload.version).toBe(1);
    expect(countryCodes).toHaveLength(196);
    expect(Object.keys(COUNTRY_CUISINES).sort()).toEqual(countryCodes);
    expect(Object.keys(COUNTRY_RECIPES).sort()).toEqual(countryCodes);
    expect(Object.keys(COUNTRY_DEFINING_ACTIONS).sort()).toEqual(countryCodes);
  });

  it("delivers every manually authored defining action as the visible first method step", () => {
    for (const code of countryCodes) {
      const action = COUNTRY_DEFINING_ACTIONS[code];
      const recipe = COUNTRY_RECIPES[code];
      expect(action.en.trim()).not.toBe("");
      expect(action.de.trim()).not.toBe("");
      expect(recipe.definingAction).toEqual(action);
      expect(recipe.steps[0]).toEqual(action);
    }
  });

  it("keeps every localized index and recipe complete and bounded", () => {
    for (const code of countryCodes) {
      const cuisine = COUNTRY_CUISINES[code];
      const recipe = COUNTRY_RECIPES[code];
      expect(cuisine.cca3).toBe(code);
      expect(recipe.cca3).toBe(code);
      for (const value of [cuisine.dish, cuisine.blurb]) {
        expect(value.en.trim()).not.toBe("");
        expect(value.de.trim()).not.toBe("");
      }
      expect(cuisine.totalMinutes).toBeGreaterThan(0);
      expect(cuisine.servings).toBeGreaterThan(0);
      expect(validDiets.has(cuisine.diet)).toBe(true);
      expect(new Set(cuisine.allergens).size).toBe(cuisine.allergens.length);
      cuisine.allergens.forEach((allergen) => expect(validAllergens.has(allergen)).toBe(true));
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(4);
      expect(recipe.ingredients.length).toBeLessThanOrEqual(10);
      expect(recipe.steps.length).toBeGreaterThanOrEqual(3);
      expect(recipe.steps.length).toBeLessThanOrEqual(7);
      for (const value of [...recipe.ingredients, ...recipe.steps, ...(recipe.note ? [recipe.note] : [])]) {
        expect(value.en.trim()).not.toBe("");
        expect(value.de.trim()).not.toBe("");
      }
    }
  });

  it("keeps important culinary anchors specific and recognizable", () => {
    expect(COUNTRY_CUISINES.JPN.dish.en).toContain("sushi");
    expect(COUNTRY_CUISINES.ITA.dish.en).toContain("Pizza");
    expect(COUNTRY_CUISINES.MEX.dish.en).toContain("tacos");
    expect(COUNTRY_CUISINES.VNM.dish.en).toContain("pho");
    expect(COUNTRY_CUISINES.ESP.dish.en).toContain("paella");
    expect(COUNTRY_CUISINES.IND.dish.en).toBe("Chana masala");

    const text = (code: string) => {
      const recipe = COUNTRY_RECIPES[code];
      return `${recipe.ingredients.map((item) => item.en).join(" ")} ${recipe.steps.map((step) => step.en).join(" ")}`.toLowerCase();
    };
    expect(text("ITA")).toMatch(/pizza dough.*mozzarella.*basil/);
    expect(text("ITA")).toMatch(/stretch.*bake/);
    expect(text("JPN")).toMatch(/short-grain sushi rice.*rice vinegar.*nori/);
    expect(text("JPN")).toMatch(/seasoned rice.*roll/);
    expect(text("MEX")).toMatch(/corn tortillas.*black beans.*lime/);
    expect(text("MEX")).toMatch(/warm.*tortillas.*fill/);
    expect(text("IND")).toMatch(/cumin.*coriander.*turmeric.*garam masala/);
    expect(text("IND")).toMatch(/cook cumin.*add onion.*simmer/);
    expect(text("VNM")).toMatch(/rice noodles.*star anise.*cinnamon.*fish sauce/);
    expect(text("ESP")).toMatch(/short-grain rice.*saffron.*smoked paprika/);
  });

  it("contains no recipe placeholders or unnamed seasoning shortcuts", () => {
    const allText = JSON.stringify(COUNTRY_RECIPES);
    expect(allText).not.toMatch(/\b(?:named|measured|listed|remaining|main ingredients?|protein|everything|suitable|as needed|to taste|if appropriate)\b|vegetables?, beans? or grain|\b(?:genannt|abgemessen|aufgeführt|übrig(?:e[snm]?)?|hauptzutaten?|proteinzutaten?|alles|passende gewürze|nach bedarf|nach geschmack|gegebenenfalls)\b|gemüse, bohnen oder getreide/i);
  });

  it("does not duplicate core ingredient concepts within a recipe", () => {
    const concepts: Record<string, RegExp> = {
      lime:/\blime|limette/i, garlic:/\bgarlic|knoblauch/i,
      ginger:/\bginger|ingwer/i, tomato:/\btomato|tomate/i,
      coconutMilk:/coconut milk|kokosmilch/i, flour:/\bflour|\bmehl/i, water:/\bwater|wasser/i,
    };
    for (const [code, recipe] of Object.entries(COUNTRY_RECIPES)) {
      for (const [concept, pattern] of Object.entries(concepts)) {
        const occurrences = recipe.ingredients.filter((item) => pattern.test(`${item.en} ${item.de}`));
        expect(occurrences.length, `${code} duplicates ${concept}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("uses concrete defining signatures across continents and cooking families", () => {
    const text = (code: string) => JSON.stringify(COUNTRY_RECIPES[code]).toLowerCase();
    expect(text("ETH")).toMatch(/red lentils.*berbere.*tomato paste/);
    expect(text("ETH")).toMatch(/onion slowly.*stir in the berbere.*simmer/);
    expect(text("NRU")).toMatch(/white-fish.*coconut milk.*ginger.*lime/);
    expect(text("NRU")).toMatch(/pour in coconut milk.*nestle in the fish.*fully cooked/);
    expect(text("SOM")).toMatch(/wholemeal flour.*yeast.*lukewarm water/);
    expect(text("SOM")).toMatch(/bubbly.*one side.*small holes/);
    expect(text("AUT")).toMatch(/cutlets.*flour.*eggs.*breadcrumbs/);
    expect(text("AUT")).toMatch(/coat each cutlet.*shallow-fry/);
    expect(text("CHN")).toMatch(/wheat flour.*minced pork or chicken.*chinese cabbage.*soy sauce/);
    expect(text("CHN")).toMatch(/knead.*fill.*pleat.*boil/);
    expect(text("LKA")).toMatch(/roti.*cabbage.*curry powder.*soy sauce/);
    expect(text("LKA")).toMatch(/chop and toss.*kottu/);
    expect(text("KIR")).toMatch(/cabbage leaves.*spinach.*coconut milk/);
    expect(text("KIR")).toMatch(/sealed parcels.*bake/);
    expect(text("PER")).toMatch(/beef steak.*potatoes.*soy sauce.*vinegar/);
    expect(text("PER")).toMatch(/stir-fry.*fold in the chips/);
    expect(text("MDA")).toMatch(/cornmeal.*sheep's cheese.*soured cream/);
    expect(text("MDA")).toMatch(/rain in the cornmeal.*very thick/);
    expect(text("BEL")).toMatch(/flour.*baking powder.*egg.*milk.*butter/);
    expect(text("BEL")).toMatch(/waffle iron.*crisp outside/);
  });

  it("mentions every ingredient line in its method using at least one distinctive word", () => {
    const stop = new Set(["tbsp","tsp","with","from","into","plus","taste","cooking","fresh","freshly","frisch","cracked","zerstoßener","finely","chopped","diced","sliced","peeled","rinsed","drained","ground","grated","large","small","thin","firm","plain","ready","made","salt","salz","pepper","pfeffer","black","schwarzer","water","warm","cool","low","the","and","oder","sowie"]);
    for (const [code, recipe] of Object.entries(COUNTRY_RECIPES)) {
      const method = recipe.steps.map((step) => `${step.en} ${step.de}`).join(" ").toLowerCase();
      for (const ingredient of recipe.ingredients) {
        const words = `${ingredient.en} ${ingredient.de}`.toLowerCase().match(/[\p{L}]{4,}/gu) ?? [];
        const distinctive = words.filter((word) => !stop.has(word));
        if (!distinctive.length) continue;
        expect(distinctive.some((word) => method.includes(word) || (word.endsWith("s") && method.includes(word.slice(0, -1)))), `${code} does not use: ${ingredient.en}`).toBe(true);
      }
    }
  });

  it("keeps allergen tags bidirectionally aligned with delivered ingredients", () => {
    const rules: Record<string, RegExp> = {
      milk:/\bmilk\b|cream|yogurt|cheese|mozzarella|feta|butter|pecorino|halloumi|bryndza|curd|quark|soured|jameed/i,
      egg:/\beggs?\b|egg noodle/i, fish:/\bfish\b|salmon|tuna|saltfish|fish sauce/i,
      shellfish:/shellfish|prawn|shrimp|conch/i, peanuts:/peanut/i,
      "tree-nuts":/almond|hazelnut|tree nuts/i,
      wheat:/wheat|flour|bread|dough|pastry|noodle|pasta|spaghetti|couscous|roti|chapati|wafer/i,
      soy:/soy|tofu|kecap/i, sesame:/sesame|tahini/i,
    };
    for (const code of countryCodes) {
      const ingredients = COUNTRY_RECIPES[code].ingredients.map((item) => item.en).join(" ")
        .replace(/coconut milk/gi,"coconut").replace(/rice noodles?/gi,"rice strands")
        .replace(/peanut butter/gi,"peanut paste").replace(/breadfruit/gi,"starchy fruit");
      const expected = Object.entries(rules).filter(([, pattern]) => pattern.test(ingredients)).map(([name]) => name).sort();
      expect([...COUNTRY_CUISINES[code].allergens].sort(), `${code} allergen mismatch`).toEqual(expected);
    }
  });

  it("keeps a broad cross-continent signature table for defining techniques", () => {
    const signatures: Record<string, string[]> = {
      AFG:["steam","carrots","nuts"], ALB:["yogurt","custard"], DZA:["couscous","separately"], AND:["mash","fry"],
      AGO:["peanut"], ARG:["half-moons","crimp"], BHS:["conch","fry"], BHR:["toast","rice"], BTN:["chillies","melt"],
      BWA:["shred"], BRA:["black beans"], BRN:["sago","translucent"], KHM:["coconut curry","steam"], CMR:["blanch","peanuts"],
      CHL:["corn purée","beef filling"], CHN:["pleat","boil"], CUB:["shred","strands"], DNK:["open sandwich"],
      ETH:["berbere","lentils"], FRA:["separately","tomato"], GEO:["boats","egg"], GHA:["pepper-tomato","steam"],
      IND:["cumin","tomato masala"], ISR:["wells","eggs"], ITA:["passata","mozzarella"], JAM:["fold","ackee"],
      JPN:["nori","roll"], KAZ:["broad noodle","broth"], KIR:["sealed parcels"], LBN:["caramelized onions"],
      LIE:["press","cheese"], MYS:["coconut rice","arrange"], MNG:["steam","toss"], MAR:["conical lid"],
      NRU:["single measure","lime"], PER:["fierce heat","chips"], PHL:["vinegar","glazes"], POL:["potato-and-cheese","boil"],
      PRT:["blend","finely shredded"], SOM:["one side","holes"], ESP:["without stirring","saffron"],
      TZA:["cardamom","cloves","toast"], TTO:["two fried","chickpea"], UKR:["beetroot","vinegar"],
      VAT:["emulsify","pasta water"], VNM:["char","star anise"], ZWE:["separately","greens"],
    };
    expect(Object.keys(signatures).length).toBeGreaterThanOrEqual(40);
    for (const [code, tokens] of Object.entries(signatures)) {
      const action = COUNTRY_DEFINING_ACTIONS[code].en.toLowerCase();
      tokens.forEach((token) => expect(action, `${code} missing ${token}`).toContain(token));
    }
  });

  it("avoids state-copy tautologies and broken generated German grammar", () => {
    const text = JSON.stringify(COUNTRY_RECIPES);
    expect(text).not.toMatch(/Rinse [^.]{0,80}\brinsed\b|spülen[^.]{0,80}\babgespült\b/i);
    expect(text).not.toMatch(/mit \d+\s*ml warmes Wasser/i);
  });

  it("adds explicit animal-product and hazardous-produce safeguards", () => {
    for (const code of countryCodes) {
      const cuisine = COUNTRY_CUISINES[code];
      const recipe = COUNTRY_RECIPES[code];
      const english = recipe.steps.map((step) => step.en).join(" ").toLowerCase();
      if (cuisine.diet === "meat") expect(english).toMatch(/completely.*thermometer/);
      if (cuisine.diet === "fish") expect(english).toMatch(/fully.*safe-temperature/);
      const ingredients = recipe.ingredients.map((ingredient) => ingredient.en).join(" ").toLowerCase();
      if (/cassava|ackee/.test(ingredients)) {
        expect(ingredients).toMatch(/commercially prepared/);
        expect(recipe.note?.en.toLowerCase()).toContain("package directions");
      }
    }
  });

  it("never exposes discovery payload for locked countries", () => {
    expect(countryDiscoveryPresentation("JPN", "locked")).toBeNull();
    for (const state of ["discovered", "researched", "unlocked", "mastered"] as const) {
      const payload = countryDiscoveryPresentation("JPN", state);
      expect(payload?.cuisine.dish.en).toContain("sushi");
      expect(payload?.outline.d).not.toBe("");
    }
  });
});
