/**
 * Curated "did you know" geography questions with a single, unambiguous country
 * answer. Used as a question type in the quiz games so the fun facts players
 * read actually get tested. Each answer is the country's cca3 code.
 */
export interface FactQuestion {
  q: { en: string; de: string };
  cca3: string;
  /** 1 = well-known, 2 = medium, 3 = trickier. */
  tier: 1 | 2 | 3;
}

export const FACT_QUESTIONS: FactQuestion[] = [
  // ── Superlatives ────────────────────────────────────────────
  { q: { en: "Which country is the largest in the world by area?", de: "Welches Land ist das flächengrößte der Welt?" }, cca3: "RUS", tier: 1 },
  { q: { en: "Which country has the longest coastline in the world?", de: "Welches Land hat die längste Küstenlinie der Welt?" }, cca3: "CAN", tier: 2 },
  { q: { en: "Which country has more lakes than the rest of the world combined?", de: "Welches Land hat mehr Seen als der Rest der Welt zusammen?" }, cca3: "CAN", tier: 2 },
  { q: { en: "Which country spans the most time zones?", de: "Welches Land erstreckt sich über die meisten Zeitzonen?" }, cca3: "FRA", tier: 3 },
  { q: { en: "Which country actually has the most pyramids?", de: "Welches Land hat tatsächlich die meisten Pyramiden?" }, cca3: "SDN", tier: 3 },
  { q: { en: "Which country is both a country and a continent?", de: "Welches Land ist zugleich ein Kontinent?" }, cca3: "AUS", tier: 1 },
  { q: { en: "Which country is the world's largest archipelago?", de: "Welches Land ist der größte Inselstaat (Archipel) der Welt?" }, cca3: "IDN", tier: 2 },
  { q: { en: "Which country has the world's largest Muslim population?", de: "Welches Land hat die größte muslimische Bevölkerung der Welt?" }, cca3: "IDN", tier: 2 },
  { q: { en: "Which country produces the most coffee in the world?", de: "Welches Land produziert weltweit am meisten Kaffee?" }, cca3: "BRA", tier: 2 },
  { q: { en: "Which country produces the most cocoa in the world?", de: "Welches Land produziert weltweit am meisten Kakao?" }, cca3: "CIV", tier: 3 },
  { q: { en: "Which country has the most UNESCO World Heritage sites?", de: "Welches Land hat die meisten UNESCO-Welterbestätten?" }, cca3: "ITA", tier: 2 },
  { q: { en: "Which large country has no naturally occurring rivers?", de: "Welches große Land hat keine natürlichen Flüsse?" }, cca3: "SAU", tier: 3 },
  { q: { en: "Which country is home to the driest place on Earth, the Atacama Desert?", de: "In welchem Land liegt der trockenste Ort der Erde, die Atacama-Wüste?" }, cca3: "CHL", tier: 2 },
  { q: { en: "Which country has the world's largest salt flat, Salar de Uyuni?", de: "In welchem Land liegt die größte Salzwüste der Welt, der Salar de Uyuni?" }, cca3: "BOL", tier: 3 },
  { q: { en: "Which country contains most of the Amazon rainforest?", de: "In welchem Land liegt der größte Teil des Amazonas-Regenwaldes?" }, cca3: "BRA", tier: 1 },
  { q: { en: "Which country has the highest administrative capital, La Paz?", de: "Welches Land hat den höchstgelegenen Regierungssitz, La Paz?" }, cca3: "BOL", tier: 2 },
  { q: { en: "Which country has the world's northernmost capital city?", de: "Welches Land hat die nördlichste Hauptstadt der Welt?" }, cca3: "ISL", tier: 2 },

  // ── Distinctive geography ───────────────────────────────────
  { q: { en: "Which country is completely surrounded by South Africa?", de: "Welches Land ist vollständig von Südafrika umschlossen?" }, cca3: "LSO", tier: 2 },
  { q: { en: "Which country surrounds the small kingdom of Lesotho?", de: "Welches Land umschließt das kleine Königreich Lesotho?" }, cca3: "ZAF", tier: 2 },
  { q: { en: "Which country is the only one with a non-rectangular national flag?", de: "Welches Land hat als einziges keine rechteckige Nationalflagge?" }, cca3: "NPL", tier: 2 },
  { q: { en: "On which country's border does Mount Everest, Earth's highest peak, sit?", de: "An welchem Land liegt der höchste Berg der Erde, der Mount Everest?" }, cca3: "NPL", tier: 1 },
  { q: { en: "Which country is home to Angel Falls, the world's tallest waterfall?", de: "In welchem Land liegt der höchste Wasserfall der Welt, der Angel Falls?" }, cca3: "VEN", tier: 2 },
  { q: { en: "Which country has the most active volcanoes?", de: "Welches Land hat die meisten aktiven Vulkane?" }, cca3: "IDN", tier: 3 },
  { q: { en: "Which country is the largest in Africa by area?", de: "Welches Land ist das flächengrößte Afrikas?" }, cca3: "DZA", tier: 2 },
  { q: { en: "Which is the largest country located entirely in Europe?", de: "Welches ist das größte Land, das vollständig in Europa liegt?" }, cca3: "UKR", tier: 2 },
  { q: { en: "Which country is the most populous in Africa?", de: "Welches Land ist das bevölkerungsreichste Afrikas?" }, cca3: "NGA", tier: 2 },
  { q: { en: "Which country is the most populous in South America?", de: "Welches Land ist das bevölkerungsreichste Südamerikas?" }, cca3: "BRA", tier: 1 },
  { q: { en: "Which country has the most official languages (11)?", de: "Welches Land hat die meisten Amtssprachen (11)?" }, cca3: "ZAF", tier: 3 },

  // ── Landmarks ───────────────────────────────────────────────
  { q: { en: "In which country would you find the Pyramids of Giza?", de: "In welchem Land stehen die Pyramiden von Gizeh?" }, cca3: "EGY", tier: 1 },
  { q: { en: "In which country is the ancient city of Machu Picchu?", de: "In welchem Land liegt die antike Stadt Machu Picchu?" }, cca3: "PER", tier: 1 },
  { q: { en: "In which country would you find the Taj Mahal?", de: "In welchem Land steht das Taj Mahal?" }, cca3: "IND", tier: 1 },
  { q: { en: "In which country is the rock city of Petra carved into cliffs?", de: "In welchem Land liegt die Felsenstadt Petra?" }, cca3: "JOR", tier: 2 },
  { q: { en: "In which country is the temple complex of Angkor Wat?", de: "In welchem Land liegt die Tempelanlage Angkor Wat?" }, cca3: "KHM", tier: 2 },
  { q: { en: "In which country does the statue of Christ the Redeemer overlook a city?", de: "In welchem Land wacht die Christus-Statue über eine Stadt?" }, cca3: "BRA", tier: 1 },
  { q: { en: "In which country is the prehistoric monument Stonehenge?", de: "In welchem Land steht das prähistorische Monument Stonehenge?" }, cca3: "GBR", tier: 1 },
  { q: { en: "In which country would you find the Great Barrier Reef?", de: "Vor welchem Land liegt das Great Barrier Reef?" }, cca3: "AUS", tier: 1 },
  { q: { en: "In which country are the giant Moai statues of Easter Island?", de: "Zu welchem Land gehören die Moai-Statuen der Osterinsel?" }, cca3: "CHL", tier: 2 },
  { q: { en: "In which country is the ancient Colosseum?", de: "In welchem Land steht das antike Kolosseum?" }, cca3: "ITA", tier: 1 },
  { q: { en: "The Great Wall winds through which country?", de: "Durch welches Land zieht sich die Große Mauer?" }, cca3: "CHN", tier: 1 },
  { q: { en: "In which country is the temple-studded plain of Bagan?", de: "In welchem Land liegt die Tempelebene von Bagan?" }, cca3: "MMR", tier: 3 },

  // ── Culture & nature ────────────────────────────────────────
  { q: { en: "Which country is the original home of the kangaroo?", de: "Aus welchem Land stammt das Känguru?" }, cca3: "AUS", tier: 1 },
  { q: { en: "Which country is the only place lemurs live in the wild?", de: "In welchem Land leben Lemuren als einzigem Ort in freier Wildbahn?" }, cca3: "MDG", tier: 2 },
  { q: { en: "Which country is famous as the birthplace of the Olympic Games?", de: "Welches Land gilt als Geburtsort der Olympischen Spiele?" }, cca3: "GRC", tier: 1 },
  { q: { en: "Which country invented pizza and pasta?", de: "In welchem Land wurden Pizza und Pasta erfunden?" }, cca3: "ITA", tier: 1 },
  { q: { en: "Which country gifted the Statue of Liberty to the United States?", de: "Welches Land schenkte den USA die Freiheitsstatue?" }, cca3: "FRA", tier: 2 },
  { q: { en: "Which country is the home of the tango?", de: "Aus welchem Land stammt der Tango?" }, cca3: "ARG", tier: 2 },
  { q: { en: "Reggae music originated in which country?", de: "In welchem Land entstand die Reggae-Musik?" }, cca3: "JAM", tier: 2 },
];
