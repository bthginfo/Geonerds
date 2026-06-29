// Base monetary units, so we can drop the country adjective (e.g. "Chinese yuan" → "Yuan").
const CURRENCY_UNITS = new Set([
  "dollar", "pound", "franc", "peso", "dinar", "rupee", "krona", "krone", "ruble", "rouble", "real",
  "yuan", "renminbi", "yen", "won", "rand", "lira", "dirham", "riyal", "rial", "ringgit", "baht",
  "dong", "kip", "kyat", "taka", "rupiah", "shilling", "birr", "naira", "cedi", "leu", "lev", "forint",
  "zloty", "koruna", "kuna", "denar", "dram", "lari", "manat", "som", "somoni", "tenge", "hryvnia",
  "guarani", "sol", "boliviano", "colon", "colón", "quetzal", "lempira", "cordoba", "córdoba", "balboa",
  "gourde", "escudo", "metical", "kwacha", "pula", "dalasi", "leone", "ariary", "ouguiya", "vatu",
  "tala", "dobra", "nakfa", "loti", "lilangeni", "ngultrum", "afghani", "rufiyaa", "euro", "dollars",
]);

/** Reduce a currency name to its base unit, dropping the country adjective. */
export function simplifyCurrency(name: string): string {
  for (const w of name.split(/[\s-]+/)) {
    if (CURRENCY_UNITS.has(w.toLowerCase())) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }
  }
  return name;
}
