import type { Locale } from "@/lib/types";

/** Display only AFTER the answer is revealed in flag-identification games. */
export const FLAG_POLICY = {
  af: {
    variant: "Republic-era tricolour (2004–2021)",
    sources: [
      "https://www.afghanembassy.ca/about-afghanistan/afghanistan-flag.html",
      "https://www.awm.gov.au/collection/C2905605",
    ],
    en: "Shown here: Afghanistan’s Republic-era tricolour (2004–2021), a historical/international-use variant. The de facto authorities have used a white flag with the Shahada since 2021.",
    de: "Hier gezeigt: Afghanistans Trikolore der Republik (2004–2021), eine historische und international verwendete Variante. Die De-facto-Behörden verwenden seit 2021 eine weiße Flagge mit der Schahada.",
  },
} as const;

export function getFlagPolicyNote(code: string | null | undefined, locale: Locale): string | null {
  const key = code?.toLowerCase();
  return key === "af" || key === "afg" ? FLAG_POLICY.af[locale] : null;
}
