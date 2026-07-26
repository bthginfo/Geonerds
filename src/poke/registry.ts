import type { PokeGameDefinition, PokeGameId } from "./types";

export const POKE_GAMES: PokeGameDefinition[] = [
  ["poke-path-expedition","PokéPath Expedition","PokéPath-Expedition","Branching field run","Verzweigte Feldmission","Choose a starter, navigate a living route graph and build a six-member field team.","Wähle einen Starter, navigiere ein lebendiges Routennetz und stelle ein Sechser-Team zusammen.","exploration","green"],
  ["region-ranger","Region Ranger","Region Ranger","Calibrate the atlas","Kalibriere den Atlas","Pin Kanto towns and landmarks on an original zoomable schematic.","Markiere Kanto-Orte und Landmarken auf einer eigenen zoombaren Schemakarte.","locations","cyan"],
  ["habitat-hunt","Habitat Hunt","Habitat-Jagd","Track FireRed encounters","Spüre Feuerrot-Begegnungen auf","Spend steps and capture capsules to find a target at a documented FireRed area.","Nutze Schritte und Fangmodule, um ein Ziel in einem belegten Feuerrot-Gebiet zu finden.","ecology","green"],
  ["type-clash-arena","Type Clash Arena","Typen-Kampf-Arena","Calculate before contact","Rechne vor dem Angriff","Select the best attack type against single and dual defenders under modern rules.","Wähle unter modernen Regeln den besten Angriff gegen Einzel- und Doppeltypen.","types","red"],
  ["gym-draft-gauntlet","Gym Draft Gauntlet","Typen-Prüfungs-Draft","Draft for the unknown","Drafte fürs Unbekannte","Build six under a point budget, then stress-test coverage across generic type trials.","Baue sechs Pokémon unter einem Punktelimit und teste ihre Coverage in Typen-Prüfungen.","teamcraft","amber"],
  ["evolution-lab","Evolution Lab","Evolutionslabor","Reconstruct the family","Rekonstruiere die Familie","Place specimens and verified conditions into linear or branching evolution rigs.","Setze Spezies und belegte Bedingungen in lineare oder verzweigte Evolutionsanlagen.","evolution","cyan"],
  ["field-scanner","Field Scanner","Feldscanner","Resolve the silhouette","Entschlüssle die Silhouette","Spend signal strength on factual hints, then identify the specimen.","Kaufe sachliche Hinweise mit Signalstärke und identifiziere das Exemplar.","recognition","cyan"],
  ["cry-radar","Cry Radar","Ruf-Radar","Listen. Compare. Lock.","Hören. Vergleichen. Festlegen.","Read an animated spectrum and identify real cries without autoplay.","Lies das animierte Spektrum und erkenne echte Rufe ohne Autoplay.","audio","red"],
  ["poke-grid","PokéGrid","PokéGrid","Solve nine intersections","Löse neun Schnittmengen","Fill a 3×3 predicate matrix without repeating a species.","Fülle eine 3×3-Eigenschaftsmatrix ohne eine Spezies zu wiederholen.","taxonomy","amber"],
  ["professor-case-files","Professor’s Case Files","Professor-Fallakten","One specimen remains","Ein Exemplar bleibt","Reveal evidence, cross out suspects and stake confidence on the final dossier.","Decke Beweise auf, streiche Verdächtige und setze Vertrauen auf die finale Akte.","deduction","red"],
].map(([id,en,de,ee,ed,descriptionEn,descriptionDe,competency,signal])=>({
  id:id as PokeGameId,
  title:{en:String(en),de:String(de)},
  eyebrow:{en:String(ee),de:String(ed)},
  description:{en:String(descriptionEn),de:String(descriptionDe)},
  competency:competency as PokeGameDefinition["competency"],
  signal:signal as PokeGameDefinition["signal"],
}));

export const POKE_GAME_IDS = POKE_GAMES.map((game)=>game.id);
export const isPokeGameId = (id:string):id is PokeGameId => POKE_GAME_IDS.includes(id as PokeGameId);
export const getPokeGame = (id:PokeGameId) => POKE_GAMES.find((game)=>game.id===id)!;

