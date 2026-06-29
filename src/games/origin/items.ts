export type ItemCategory = "animal" | "food" | "symbol";

export interface OriginItem {
  en: string;
  de: string;
  emoji: string;
  cca3: string;
  category: ItemCategory;
}

/** Iconic animals, dishes and symbols strongly tied to one country. */
export const ITEMS: OriginItem[] = [
  // Animals
  { en: "Giant Panda", de: "Großer Panda", emoji: "🐼", cca3: "CHN", category: "animal" },
  { en: "Kangaroo", de: "Känguru", emoji: "🦘", cca3: "AUS", category: "animal" },
  { en: "Kiwi", de: "Kiwi", emoji: "🐤", cca3: "NZL", category: "animal" },
  { en: "Komodo Dragon", de: "Komodowaran", emoji: "🦎", cca3: "IDN", category: "animal" },
  { en: "Beaver", de: "Biber", emoji: "🦫", cca3: "CAN", category: "animal" },
  { en: "Bald Eagle", de: "Weißkopfseeadler", emoji: "🦅", cca3: "USA", category: "animal" },
  { en: "Bengal Tiger", de: "Bengalischer Tiger", emoji: "🐯", cca3: "IND", category: "animal" },
  { en: "Elephant", de: "Elefant", emoji: "🐘", cca3: "THA", category: "animal" },
  { en: "Springbok", de: "Springbock", emoji: "🦌", cca3: "ZAF", category: "animal" },
  { en: "Llama", de: "Lama", emoji: "🦙", cca3: "PER", category: "animal" },
  { en: "Jaguar", de: "Jaguar", emoji: "🐆", cca3: "BRA", category: "animal" },
  { en: "Reindeer", de: "Rentier", emoji: "🦌", cca3: "FIN", category: "animal" },
  { en: "Bull", de: "Stier", emoji: "🐂", cca3: "ESP", category: "animal" },
  { en: "Gallic Rooster", de: "Gallischer Hahn", emoji: "🐓", cca3: "FRA", category: "animal" },
  { en: "Elk", de: "Elch", emoji: "🫎", cca3: "SWE", category: "animal" },
  { en: "Horse", de: "Pferd", emoji: "🐎", cca3: "MNG", category: "animal" },
  { en: "Tiger", de: "Tiger", emoji: "🐅", cca3: "KOR", category: "animal" },
  { en: "Water Buffalo", de: "Wasserbüffel", emoji: "🐃", cca3: "VNM", category: "animal" },

  // Symbols / landmarks
  { en: "Eiffel Tower", de: "Eiffelturm", emoji: "🗼", cca3: "FRA", category: "symbol" },
  { en: "Statue of Liberty", de: "Freiheitsstatue", emoji: "🗽", cca3: "USA", category: "symbol" },
  { en: "Matryoshka Doll", de: "Matrjoschka", emoji: "🪆", cca3: "RUS", category: "symbol" },
  { en: "Tulip", de: "Tulpe", emoji: "🌷", cca3: "NLD", category: "symbol" },
  { en: "Wristwatch", de: "Armbanduhr", emoji: "⌚", cca3: "CHE", category: "symbol" },
  { en: "Moai Statue", de: "Moai-Statue", emoji: "🗿", cca3: "CHL", category: "symbol" },
  { en: "Castle", de: "Märchenschloss", emoji: "🏰", cca3: "DEU", category: "symbol" },
  { en: "Mount Fuji", de: "Fuji", emoji: "🗻", cca3: "JPN", category: "symbol" },
  { en: "Colosseum", de: "Kolosseum", emoji: "🏟️", cca3: "ITA", category: "symbol" },
  { en: "Taj Mahal", de: "Taj Mahal", emoji: "🕌", cca3: "IND", category: "symbol" },
  { en: "Maple Leaf", de: "Ahornblatt", emoji: "🍁", cca3: "CAN", category: "symbol" },
  { en: "Shamrock", de: "Kleeblatt", emoji: "☘️", cca3: "IRL", category: "symbol" },
  { en: "Mate", de: "Mate", emoji: "🧉", cca3: "ARG", category: "symbol" },
  { en: "Windmill", de: "Windmühle", emoji: "🪟", cca3: "NLD", category: "symbol" },
  { en: "Pyramids", de: "Pyramiden", emoji: "🛕", cca3: "EGY", category: "symbol" },

  // Foods
  { en: "Sushi", de: "Sushi", emoji: "🍣", cca3: "JPN", category: "food" },
  { en: "Pizza", de: "Pizza", emoji: "🍕", cca3: "ITA", category: "food" },
  { en: "Baguette", de: "Baguette", emoji: "🥖", cca3: "FRA", category: "food" },
  { en: "Tacos", de: "Tacos", emoji: "🌮", cca3: "MEX", category: "food" },
  { en: "Dumplings", de: "Teigtaschen", emoji: "🥟", cca3: "CHN", category: "food" },
  { en: "Pho", de: "Pho", emoji: "🍜", cca3: "VNM", category: "food" },
  { en: "Paella", de: "Paella", emoji: "🥘", cca3: "ESP", category: "food" },
  { en: "Bratwurst", de: "Bratwurst", emoji: "🌭", cca3: "DEU", category: "food" },
  { en: "Falafel", de: "Falafel", emoji: "🧆", cca3: "ISR", category: "food" },
  { en: "Goulash", de: "Gulasch", emoji: "🍲", cca3: "HUN", category: "food" },
  { en: "Waffle", de: "Waffel", emoji: "🧇", cca3: "BEL", category: "food" },
  { en: "Curry", de: "Curry", emoji: "🍛", cca3: "IND", category: "food" },
  { en: "Pretzel", de: "Brezel", emoji: "🥨", cca3: "DEU", category: "food" },
  { en: "Kimchi", de: "Kimchi", emoji: "🥬", cca3: "KOR", category: "food" },
];
