export type ItemCategory =
  | "animal"
  | "food"
  | "symbol"
  | "sport"
  | "invention"
  | "drink"
  | "music";

export interface OriginItem {
  en: string;
  de: string;
  emoji: string;
  cca3: string;
  category: ItemCategory;
  /** 1 = well-known, 2 = medium, 3 = obscure/tricky. */
  tier: 1 | 2 | 3;
}

/** Iconic animals, dishes, symbols, sports, inventions, drinks and music tied to one country. */
export const ITEMS: OriginItem[] = [
  // ── Animals ────────────────────────────────────────────────
  { en: "Giant Panda", de: "Großer Panda", emoji: "🐼", cca3: "CHN", category: "animal", tier: 1 },
  { en: "Kangaroo", de: "Känguru", emoji: "🦘", cca3: "AUS", category: "animal", tier: 1 },
  { en: "Kiwi", de: "Kiwi", emoji: "🐤", cca3: "NZL", category: "animal", tier: 1 },
  { en: "Komodo Dragon", de: "Komodowaran", emoji: "🦎", cca3: "IDN", category: "animal", tier: 2 },
  { en: "Beaver", de: "Biber", emoji: "🦫", cca3: "CAN", category: "animal", tier: 1 },
  { en: "Bald Eagle", de: "Weißkopfseeadler", emoji: "🦅", cca3: "USA", category: "animal", tier: 1 },
  { en: "Bengal Tiger", de: "Bengalischer Tiger", emoji: "🐯", cca3: "IND", category: "animal", tier: 1 },
  { en: "Elephant", de: "Elefant", emoji: "🐘", cca3: "THA", category: "animal", tier: 2 },
  { en: "Springbok", de: "Springbock", emoji: "🦌", cca3: "ZAF", category: "animal", tier: 2 },
  { en: "Llama", de: "Lama", emoji: "🦙", cca3: "PER", category: "animal", tier: 1 },
  { en: "Jaguar", de: "Jaguar", emoji: "🐆", cca3: "BRA", category: "animal", tier: 2 },
  { en: "Reindeer", de: "Rentier", emoji: "🦌", cca3: "FIN", category: "animal", tier: 2 },
  { en: "Bull", de: "Stier", emoji: "🐂", cca3: "ESP", category: "animal", tier: 1 },
  { en: "Gallic Rooster", de: "Gallischer Hahn", emoji: "🐓", cca3: "FRA", category: "animal", tier: 2 },
  { en: "Elk", de: "Elch", emoji: "🫎", cca3: "SWE", category: "animal", tier: 2 },
  { en: "Horse", de: "Pferd", emoji: "🐎", cca3: "MNG", category: "animal", tier: 2 },
  { en: "Water Buffalo", de: "Wasserbüffel", emoji: "🐃", cca3: "VNM", category: "animal", tier: 3 },
  { en: "Lion", de: "Löwe", emoji: "🦁", cca3: "KEN", category: "animal", tier: 2 },
  { en: "Quetzal", de: "Quetzal", emoji: "🦜", cca3: "GTM", category: "animal", tier: 3 },
  { en: "Sloth", de: "Faultier", emoji: "🦥", cca3: "CRI", category: "animal", tier: 3 },
  { en: "Dragon (Bhutan)", de: "Drache (Bhutan)", emoji: "🐉", cca3: "BTN", category: "animal", tier: 3 },

  // ── Symbols / landmarks ────────────────────────────────────
  { en: "Eiffel Tower", de: "Eiffelturm", emoji: "🗼", cca3: "FRA", category: "symbol", tier: 1 },
  { en: "Statue of Liberty", de: "Freiheitsstatue", emoji: "🗽", cca3: "USA", category: "symbol", tier: 1 },
  { en: "Matryoshka Doll", de: "Matrjoschka", emoji: "🪆", cca3: "RUS", category: "symbol", tier: 1 },
  { en: "Tulip", de: "Tulpe", emoji: "🌷", cca3: "NLD", category: "symbol", tier: 1 },
  { en: "Wristwatch", de: "Armbanduhr", emoji: "⌚", cca3: "CHE", category: "symbol", tier: 2 },
  { en: "Moai Statue", de: "Moai-Statue", emoji: "🗿", cca3: "CHL", category: "symbol", tier: 2 },
  { en: "Fairytale Castle", de: "Märchenschloss", emoji: "🏰", cca3: "DEU", category: "symbol", tier: 2 },
  { en: "Mount Fuji", de: "Fuji", emoji: "🗻", cca3: "JPN", category: "symbol", tier: 1 },
  { en: "Colosseum", de: "Kolosseum", emoji: "🏟️", cca3: "ITA", category: "symbol", tier: 1 },
  { en: "Taj Mahal", de: "Taj Mahal", emoji: "🕌", cca3: "IND", category: "symbol", tier: 1 },
  { en: "Maple Leaf", de: "Ahornblatt", emoji: "🍁", cca3: "CAN", category: "symbol", tier: 1 },
  { en: "Shamrock", de: "Kleeblatt", emoji: "☘️", cca3: "IRL", category: "symbol", tier: 1 },
  { en: "Windmill", de: "Windmühle", emoji: "🌬️", cca3: "NLD", category: "symbol", tier: 2 },
  { en: "Pyramids", de: "Pyramiden", emoji: "🛕", cca3: "EGY", category: "symbol", tier: 1 },
  { en: "Cedar Tree", de: "Zeder", emoji: "🌲", cca3: "LBN", category: "symbol", tier: 3 },
  { en: "Edelweiss", de: "Edelweiß", emoji: "🌼", cca3: "AUT", category: "symbol", tier: 3 },

  // ── Foods ──────────────────────────────────────────────────
  { en: "Sushi", de: "Sushi", emoji: "🍣", cca3: "JPN", category: "food", tier: 1 },
  { en: "Pizza", de: "Pizza", emoji: "🍕", cca3: "ITA", category: "food", tier: 1 },
  { en: "Baguette", de: "Baguette", emoji: "🥖", cca3: "FRA", category: "food", tier: 1 },
  { en: "Tacos", de: "Tacos", emoji: "🌮", cca3: "MEX", category: "food", tier: 1 },
  { en: "Dumplings", de: "Teigtaschen", emoji: "🥟", cca3: "CHN", category: "food", tier: 2 },
  { en: "Pho", de: "Pho", emoji: "🍜", cca3: "VNM", category: "food", tier: 2 },
  { en: "Paella", de: "Paella", emoji: "🥘", cca3: "ESP", category: "food", tier: 1 },
  { en: "Bratwurst", de: "Bratwurst", emoji: "🌭", cca3: "DEU", category: "food", tier: 1 },
  { en: "Falafel", de: "Falafel", emoji: "🧆", cca3: "ISR", category: "food", tier: 2 },
  { en: "Goulash", de: "Gulasch", emoji: "🍲", cca3: "HUN", category: "food", tier: 2 },
  { en: "Waffle", de: "Waffel", emoji: "🧇", cca3: "BEL", category: "food", tier: 2 },
  { en: "Curry", de: "Curry", emoji: "🍛", cca3: "IND", category: "food", tier: 1 },
  { en: "Pretzel", de: "Brezel", emoji: "🥨", cca3: "DEU", category: "food", tier: 1 },
  { en: "Kimchi", de: "Kimchi", emoji: "🥬", cca3: "KOR", category: "food", tier: 2 },
  { en: "Feta & Olives", de: "Feta & Oliven", emoji: "🫒", cca3: "GRC", category: "food", tier: 2 },
  { en: "Poutine", de: "Poutine", emoji: "🍟", cca3: "CAN", category: "food", tier: 3 },
  { en: "Biltong", de: "Biltong", emoji: "🥩", cca3: "ZAF", category: "food", tier: 3 },
  { en: "Ceviche", de: "Ceviche", emoji: "🦐", cca3: "PER", category: "food", tier: 3 },

  // ── Drinks ─────────────────────────────────────────────────
  { en: "Mate", de: "Mate", emoji: "🧉", cca3: "ARG", category: "drink", tier: 2 },
  { en: "Sake", de: "Sake", emoji: "🍶", cca3: "JPN", category: "drink", tier: 2 },
  { en: "Vodka", de: "Wodka", emoji: "🍸", cca3: "RUS", category: "drink", tier: 1 },
  { en: "Tequila", de: "Tequila", emoji: "🥃", cca3: "MEX", category: "drink", tier: 1 },
  { en: "Whisky", de: "Whisky", emoji: "🥃", cca3: "GBR", category: "drink", tier: 2 },
  { en: "Port Wine", de: "Portwein", emoji: "🍷", cca3: "PRT", category: "drink", tier: 3 },
  { en: "Ouzo", de: "Ouzo", emoji: "🥂", cca3: "GRC", category: "drink", tier: 3 },
  { en: "Rooibos Tea", de: "Rooibos-Tee", emoji: "🍵", cca3: "ZAF", category: "drink", tier: 3 },

  // ── Sports ─────────────────────────────────────────────────
  { en: "Sumo Wrestling", de: "Sumo-Ringen", emoji: "🤼", cca3: "JPN", category: "sport", tier: 1 },
  { en: "Ice Hockey", de: "Eishockey", emoji: "🏒", cca3: "CAN", category: "sport", tier: 2 },
  { en: "Cricket", de: "Cricket", emoji: "🏏", cca3: "IND", category: "sport", tier: 2 },
  { en: "Taekwondo", de: "Taekwondo", emoji: "🥋", cca3: "KOR", category: "sport", tier: 2 },
  { en: "Capoeira", de: "Capoeira", emoji: "🤸", cca3: "BRA", category: "sport", tier: 3 },
  { en: "Muay Thai", de: "Muay Thai", emoji: "🥊", cca3: "THA", category: "sport", tier: 2 },
  { en: "Bullfighting", de: "Stierkampf", emoji: "🐂", cca3: "ESP", category: "sport", tier: 2 },
  { en: "Hurling", de: "Hurling", emoji: "🏑", cca3: "IRL", category: "sport", tier: 3 },

  // ── Inventions ─────────────────────────────────────────────
  { en: "Printing Press", de: "Buchdruck", emoji: "🖨️", cca3: "DEU", category: "invention", tier: 2 },
  { en: "Sauna", de: "Sauna", emoji: "🧖", cca3: "FIN", category: "invention", tier: 2 },
  { en: "Origami", de: "Origami", emoji: "🎎", cca3: "JPN", category: "invention", tier: 2 },
  { en: "Lego", de: "Lego", emoji: "🧱", cca3: "DNK", category: "invention", tier: 2 },
  { en: "Gunpowder", de: "Schwarzpulver", emoji: "🧨", cca3: "CHN", category: "invention", tier: 2 },
  { en: "Espresso Machine", de: "Espressomaschine", emoji: "☕", cca3: "ITA", category: "invention", tier: 3 },

  // ── Music ──────────────────────────────────────────────────
  { en: "Bagpipes", de: "Dudelsack", emoji: "🎵", cca3: "GBR", category: "music", tier: 2 },
  { en: "Flamenco Guitar", de: "Flamenco-Gitarre", emoji: "🎸", cca3: "ESP", category: "music", tier: 2 },
  { en: "Didgeridoo", de: "Didgeridoo", emoji: "🎶", cca3: "AUS", category: "music", tier: 3 },
  { en: "Reggae", de: "Reggae", emoji: "🎤", cca3: "JAM", category: "music", tier: 2 },
  { en: "Samba", de: "Samba", emoji: "🥁", cca3: "BRA", category: "music", tier: 2 },
  { en: "K-Pop", de: "K-Pop", emoji: "🎧", cca3: "KOR", category: "music", tier: 1 },
  { en: "Yodeling", de: "Jodeln", emoji: "🎙️", cca3: "CHE", category: "music", tier: 3 },
  { en: "Steelpan", de: "Steeldrum", emoji: "🛢️", cca3: "TTO", category: "music", tier: 3 },

  // ── Extra batch ──
  { en: "Hamburger", de: "Hamburger", emoji: "🍔", cca3: "USA", category: "food", tier: 2 },
  { en: "Maple Syrup", de: "Ahornsirup", emoji: "🥞", cca3: "CAN", category: "food", tier: 2 },
  { en: "Vegemite", de: "Vegemite", emoji: "🥪", cca3: "AUS", category: "food", tier: 3 },
  { en: "Sombrero", de: "Sombrero", emoji: "👒", cca3: "MEX", category: "symbol", tier: 2 },
  { en: "Boomerang", de: "Bumerang", emoji: "🪃", cca3: "AUS", category: "symbol", tier: 2 },
  { en: "Gondola", de: "Gondel", emoji: "🛶", cca3: "ITA", category: "symbol", tier: 3 },
  { en: "Clogs", de: "Holzschuhe", emoji: "🥿", cca3: "NLD", category: "symbol", tier: 3 },
  { en: "Yoga", de: "Yoga", emoji: "🧘", cca3: "IND", category: "invention", tier: 2 },
  { en: "Karate", de: "Karate", emoji: "🥋", cca3: "JPN", category: "sport", tier: 2 },
  { en: "Rugby (Haka)", de: "Rugby (Haka)", emoji: "🏉", cca3: "NZL", category: "sport", tier: 2 },

  // ── Batch 3 ──
  // Animals
  { en: "Polar Bear", de: "Eisbär", emoji: "🐻‍❄️", cca3: "CAN", category: "animal", tier: 2 },
  { en: "Camel", de: "Kamel", emoji: "🐫", cca3: "EGY", category: "animal", tier: 2 },
  { en: "Orangutan", de: "Orang-Utan", emoji: "🦧", cca3: "MYS", category: "animal", tier: 3 },
  { en: "Penguin", de: "Pinguin", emoji: "🐧", cca3: "ARG", category: "animal", tier: 3 },
  { en: "Gorilla", de: "Gorilla", emoji: "🦍", cca3: "RWA", category: "animal", tier: 3 },
  // Food
  { en: "Croissant", de: "Croissant", emoji: "🥐", cca3: "FRA", category: "food", tier: 1 },
  { en: "Fish & Chips", de: "Fish & Chips", emoji: "🍟", cca3: "GBR", category: "food", tier: 2 },
  { en: "Döner Kebab", de: "Döner", emoji: "🥙", cca3: "TUR", category: "food", tier: 2 },
  { en: "Hummus", de: "Hummus", emoji: "🫓", cca3: "LBN", category: "food", tier: 3 },
  { en: "Pierogi", de: "Piroggen", emoji: "🥟", cca3: "POL", category: "food", tier: 3 },
  { en: "Borscht", de: "Borschtsch", emoji: "🥣", cca3: "UKR", category: "food", tier: 3 },
  { en: "Churros", de: "Churros", emoji: "🍩", cca3: "ESP", category: "food", tier: 2 },
  { en: "Poffertjes", de: "Poffertjes", emoji: "🥞", cca3: "NLD", category: "food", tier: 3 },
  // Symbols / landmarks
  { en: "Big Ben", de: "Big Ben", emoji: "🕰️", cca3: "GBR", category: "symbol", tier: 1 },
  { en: "Great Wall", de: "Chinesische Mauer", emoji: "🧱", cca3: "CHN", category: "symbol", tier: 1 },
  { en: "Christ the Redeemer", de: "Christusstatue", emoji: "⛪", cca3: "BRA", category: "symbol", tier: 2 },
  { en: "Sphinx", de: "Sphinx", emoji: "🐪", cca3: "EGY", category: "symbol", tier: 2 },
  { en: "Cherry Blossom", de: "Kirschblüte", emoji: "🌸", cca3: "JPN", category: "symbol", tier: 2 },
  { en: "Viking Ship", de: "Wikingerschiff", emoji: "⛵", cca3: "NOR", category: "symbol", tier: 3 },
  // Drinks
  { en: "Guinness", de: "Guinness", emoji: "🍺", cca3: "IRL", category: "drink", tier: 2 },
  { en: "Champagne", de: "Champagner", emoji: "🍾", cca3: "FRA", category: "drink", tier: 1 },
  { en: "Caipirinha", de: "Caipirinha", emoji: "🍹", cca3: "BRA", category: "drink", tier: 3 },
  { en: "Pisco", de: "Pisco", emoji: "🥃", cca3: "PER", category: "drink", tier: 3 },
  // Sport
  { en: "Cricket", de: "Cricket", emoji: "🏏", cca3: "IND", category: "sport", tier: 2 },
  { en: "Baseball", de: "Baseball", emoji: "⚾", cca3: "USA", category: "sport", tier: 1 },
  { en: "Skiing", de: "Skifahren", emoji: "⛷️", cca3: "AUT", category: "sport", tier: 3 },
  { en: "Judo", de: "Judo", emoji: "🥋", cca3: "JPN", category: "sport", tier: 2 },
  // Invention / culture
  { en: "Tango", de: "Tango", emoji: "💃", cca3: "ARG", category: "music", tier: 2 },
  { en: "Fado", de: "Fado", emoji: "🎶", cca3: "PRT", category: "music", tier: 3 },
  { en: "Bouzouki", de: "Bouzouki", emoji: "🪕", cca3: "GRC", category: "music", tier: 3 },
];

/** Item difficulty tiers permitted at each game difficulty. */
export const ITEM_MAX_TIER: Record<"easy" | "medium" | "hard", number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};
