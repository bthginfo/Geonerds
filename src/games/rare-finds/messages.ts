import type { Locale } from "@/lib/types";

export const RARE_FINDS_MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    "games.rare-finds.name": "Rare Finds",
    "games.rare-finds.short": "Five prompts, many right answers. The fewer players pick yours, the more it scores.",
    "howto.rare-finds": "Five prompts, many right answers. The fewer players pick yours, the more it scores.",
    "rarefinds.setupNote": "Daily board: everyone answers the same five prompts.",
  },
  de: {
    "games.rare-finds.name": "Seltene Funde",
    "games.rare-finds.short": "Fünf Aufgaben, viele richtige Antworten. Je seltener deine gewählt wird, desto mehr zählt sie.",
    "howto.rare-finds": "Fünf Aufgaben, viele richtige Antworten. Je seltener deine gewählt wird, desto mehr zählt sie.",
    "rarefinds.setupNote": "Tagesbrett: Alle beantworten dieselben fünf Aufgaben.",
  },
};
