import type { Country } from "@/lib/types";

export interface ScriptSample {
  /** Autonym — the language's name written in its own script. */
  text: string;
  /** Google Noto font family; empty = system default (Latin/Greek/Cyrillic). */
  font: string;
}

/** Keyed by the language's English name as it appears in the dataset. */
export const SCRIPT_SAMPLES: Record<string, ScriptSample> = {
  Arabic: { text: "العربية", font: "Noto Sans Arabic" },
  "Persian (Farsi)": { text: "فارسی", font: "Noto Sans Arabic" },
  Persian: { text: "فارسی", font: "Noto Sans Arabic" },
  Pashto: { text: "پښتو", font: "Noto Sans Arabic" },
  Urdu: { text: "اردو", font: "Noto Sans Arabic" },
  Hebrew: { text: "עברית", font: "Noto Sans Hebrew" },
  Greek: { text: "Ελληνικά", font: "" },
  Japanese: { text: "日本語", font: "Noto Sans JP" },
  Chinese: { text: "中文", font: "Noto Sans SC" },
  Korean: { text: "한국어", font: "Noto Sans KR" },
  Thai: { text: "ภาษาไทย", font: "Noto Sans Thai" },
  Lao: { text: "ພາສາລາວ", font: "Noto Sans Lao" },
  Khmer: { text: "ភាសាខ្មែរ", font: "Noto Sans Khmer" },
  Burmese: { text: "မြန်မာ", font: "Noto Sans Myanmar" },
  Hindi: { text: "हिन्दी", font: "Noto Sans Devanagari" },
  Nepali: { text: "नेपाली", font: "Noto Sans Devanagari" },
  Bengali: { text: "বাংলা", font: "Noto Sans Bengali" },
  Tamil: { text: "தமிழ்", font: "Noto Sans Tamil" },
  Telugu: { text: "తెలుగు", font: "Noto Sans Telugu" },
  Sinhala: { text: "සිංහල", font: "Noto Sans Sinhala" },
  Georgian: { text: "ქართული", font: "Noto Sans Georgian" },
  Armenian: { text: "Հայերեն", font: "Noto Sans Armenian" },
  Amharic: { text: "አማርኛ", font: "Noto Sans Ethiopic" },
  Tigrinya: { text: "ትግርኛ", font: "Noto Sans Ethiopic" },
  Maldivian: { text: "ދިވެހި", font: "Noto Sans Thaana" },
  Dzongkha: { text: "རྫོང་ཁ", font: "Noto Sans Tibetan" },
  Russian: { text: "Русский", font: "" },
  Ukrainian: { text: "Українська", font: "" },
  Serbian: { text: "Српски", font: "" },
  Macedonian: { text: "Македонски", font: "" },
  Bulgarian: { text: "Български", font: "" },
  Mongolian: { text: "Монгол", font: "" },
  Kazakh: { text: "Қазақша", font: "" },
  Kyrgyz: { text: "Кыргызча", font: "" },
  Tajik: { text: "Тоҷикӣ", font: "" },
};

/** First language of a country that has a script sample. */
export function findScript(c: Country): { language: string; sample: ScriptSample } | null {
  for (const lang of c.languages) {
    if (SCRIPT_SAMPLES[lang]) return { language: lang, sample: SCRIPT_SAMPLES[lang] };
  }
  return null;
}

const FONT_FAMILIES = [
  "Noto Sans Arabic", "Noto Sans Hebrew", "Noto Sans JP", "Noto Sans SC", "Noto Sans KR",
  "Noto Sans Thai", "Noto Sans Lao", "Noto Sans Khmer", "Noto Sans Myanmar", "Noto Sans Devanagari",
  "Noto Sans Bengali", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Sinhala", "Noto Sans Georgian",
  "Noto Sans Armenian", "Noto Sans Ethiopic", "Noto Sans Thaana", "Noto Sans Tibetan",
];

export const SCRIPT_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  FONT_FAMILIES.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600`).join("&") +
  "&display=swap";

let loaded = false;
/** Inject the Noto fonts stylesheet once (client-side). */
export function loadScriptFonts() {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = SCRIPT_FONTS_HREF;
  document.head.appendChild(link);
}
