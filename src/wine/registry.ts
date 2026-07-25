import type { WineGameDefinition, WineGameId } from "./types";

export const WINE_GAMES: WineGameDefinition[] = [
  ["terroir-detective", "Terroir Detective", "Terroir-Detektiv", "Read the land", "Lies die Landschaft", "Infer grapes and regions from climate, soil and site evidence.", "Leite Rebsorten und Regionen aus Klima, Boden und Lage ab.", "terroir", "vine", 8],
  ["aroma-atelier", "Aroma Atelier", "Aromen-Atelier", "Build associations", "Aromen verknüpfen", "Sort aroma cards into the most defensible grape or origin family.", "Ordne Aromenkarten der plausibelsten Rebsorte oder Herkunft zu.", "sensory", "grape", 10],
  ["wine-map", "Wine Map Challenge", "Weinkarten-Challenge", "Find the vineyard", "Finde den Weinberg", "Place the world's major wine regions on a map, then study the miss.", "Verorte wichtige Weinregionen und lerne aus der Abweichung.", "geography", "copper", 8],
  ["pairing-duel", "Food Pairing Duel", "Food-Pairing-Duell", "Defend the match", "Verteidige das Pairing", "Choose the stronger pairing by balancing structure, salt, spice and umami.", "Wähle das stimmigere Pairing anhand von Struktur, Salz, Schärfe und Umami.", "pairing", "copper", 8],
  ["cellar-builder", "Cellar Builder", "Kellermeister", "Curate under pressure", "Kuratieren unter Druck", "Build a balanced list under budget and category constraints.", "Baue eine ausgewogene Auswahl mit Budget und Pflichtkategorien.", "service", "vine", 1],
  ["label-decoder", "Label Decoder", "Etiketten-Decoder", "Read between the lines", "Zwischen den Zeilen lesen", "Decode original synthetic labels without relying on a named grape.", "Entschlüssele fiktive Etiketten, auch ohne genannte Rebsorte.", "theory", "grape", 8],
  ["regional-connections", "Regional Connections", "Regionale Connections", "Find the four", "Finde die Vierergruppe", "Resolve four linked wine terms among plausible decoys.", "Finde vier zusammengehörige Weinbegriffe zwischen glaubhaften Ablenkungen.", "theory", "vine", 4],
  ["appellation-ladder", "Appellation Ladder", "Appellations-Leiter", "Climb with precision", "Werde immer präziser", "Climb from country to region, appellation and typical style.", "Steige von Land über Region und Appellation bis zum typischen Stil.", "geography", "copper", 5],
  ["winemakers-dilemma", "Winemaker's Dilemma", "Winemaker's Dilemma", "Every choice leaves a trace", "Jede Wahl hinterlässt Spuren", "Shape a wine through vineyard and cellar decisions with visible trade-offs.", "Forme einen Wein durch Entscheidungen im Weinberg und Keller.", "production", "vine", 3],
  ["grape-dna", "Grape DNA", "Rebsorten-DNA", "Identify the signature", "Erkenne die Signatur", "Identify grapes from ripening, skin, structure, climate and synonyms.", "Erkenne Rebsorten an Reife, Schale, Struktur, Klima und Synonymen.", "grapes", "grape", 8],
  ["same-grape", "Same Grape, Different World", "Gleiche Rebe, andere Welt", "Compare expressions", "Stile vergleichen", "Assign contrasting traits to two regional expressions of one grape.", "Ordne Unterschiede zwei regionalen Ausprägungen derselben Rebe zu.", "terroir", "copper", 8],
  ["cellar-mystery", "Cellar Mystery", "Keller-Mysterium", "Eliminate the impossible", "Schließe Unmögliches aus", "Reveal clues and eliminate bottles until one defensible answer remains.", "Decke Hinweise auf und schließe Flaschen logisch aus.", "theory", "grape", 6],
  ["tasting-note-builder", "Tasting Note Builder", "Tasting-Note-Werkstatt", "Make the note cohere", "Baue eine stimmige Notiz", "Compose an original, internally consistent observation and conclusion.", "Baue eine eigene, in sich stimmige Beobachtung mit Schlussfolgerung.", "sensory", "vine", 5],
  ["sommelier-exam", "Sommelier Exam", "Sommelier-Prüfung", "Unofficial mixed practice", "Inoffizielle Übungsprüfung", "A timed mixed practice flight with explanations and competency breakdown.", "Eine gemischte Übungsrunde auf Zeit mit Erklärungen und Kompetenzprofil.", "theory", "copper", 12],
].map(([id, en, de, eEn, eDe, dEn, dDe, competency, tone, rounds]) => ({
  id: id as WineGameId,
  title: { en: String(en), de: String(de) },
  eyebrow: { en: String(eEn), de: String(eDe) },
  description: { en: String(dEn), de: String(dDe) },
  competency: competency as WineGameDefinition["competency"],
  tone: tone as WineGameDefinition["tone"],
  rounds: Number(rounds),
}));

export const WINE_GAME_IDS = WINE_GAMES.map((game) => game.id);
export const GRAPHICAL_WINE_GAME_IDS = [
  "aroma-atelier",
  "cellar-builder",
  "label-decoder",
  "tasting-note-builder",
  "winemakers-dilemma",
  "cellar-mystery",
] as const satisfies readonly WineGameId[];
export const isWineGameId = (id: string): id is WineGameId =>
  WINE_GAME_IDS.includes(id as WineGameId);
export const getWineGame = (id: WineGameId) => WINE_GAMES.find((game) => game.id === id)!;
