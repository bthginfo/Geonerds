import { LANDMARKS } from "@/data/landmarks";

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
  /** Primary reference for place/culture questions when available. */
  source?: string;
}

export const FACT_QUESTIONS: FactQuestion[] = [
  // ── Superlatives ────────────────────────────────────────────
  { q: { en: "Which country is the largest in the world by area?", de: "Welches Land ist das flächengrößte der Welt?" }, cca3: "RUS", tier: 1 },
  { q: { en: "Which country has the longest coastline in the world?", de: "Welches Land hat die längste Küstenlinie der Welt?" }, cca3: "CAN", tier: 2 },
  { q: { en: "Which country contains Banff National Park in the Rocky Mountains?", de: "In welchem Land liegt der Banff-Nationalpark in den Rocky Mountains?" }, cca3: "CAN", tier: 2, source: "https://whc.unesco.org/en/list/304/" },
  { q: { en: "Which country includes the overseas regions of Réunion and Martinique?", de: "Zu welchem Land gehören die Überseeregionen Réunion und Martinique?" }, cca3: "FRA", tier: 3 },
  { q: { en: "In which country are the Nubian pyramids of Meroë?", de: "In welchem Land stehen die nubischen Pyramiden von Meroe?" }, cca3: "SDN", tier: 3, source: "https://whc.unesco.org/en/list/1336/" },
  { q: { en: "Which country contains both the mainland state of Victoria and the island state of Tasmania?", de: "Zu welchem Land gehören der Festlandstaat Victoria und der Inselstaat Tasmanien?" }, cca3: "AUS", tier: 1 },
  { q: { en: "Which country is the world's largest archipelago?", de: "Welches Land ist der größte Inselstaat (Archipel) der Welt?" }, cca3: "IDN", tier: 2 },
  { q: { en: "Which country includes the islands of Java and Sulawesi?", de: "Zu welchem Land gehören die Inseln Java und Sulawesi?" }, cca3: "IDN", tier: 2 },
  { q: { en: "In which country was the planned capital Brasília built?", de: "In welchem Land wurde die Planhauptstadt Brasília erbaut?" }, cca3: "BRA", tier: 2, source: "https://whc.unesco.org/en/list/445/" },
  { q: { en: "In which country is Taï National Park?", de: "In welchem Land liegt der Taï-Nationalpark?" }, cca3: "CIV", tier: 3, source: "https://whc.unesco.org/en/list/195/" },
  { q: { en: "In which country are Venice and its lagoon?", de: "In welchem Land liegen Venedig und seine Lagune?" }, cca3: "ITA", tier: 2, source: "https://whc.unesco.org/en/list/394/" },
  { q: { en: "In which country is the archaeological site of Hegra?", de: "In welchem Land liegt die archäologische Stätte Hegra?" }, cca3: "SAU", tier: 3, source: "https://whc.unesco.org/en/list/1293/" },
  { q: { en: "Which country contains the Atacama Desert's coastal cities of Antofagasta and Iquique?", de: "In welchem Land liegen die Atacama-Küstenstädte Antofagasta und Iquique?" }, cca3: "CHL", tier: 2 },
  { q: { en: "Which country has the world's largest salt flat, Salar de Uyuni?", de: "In welchem Land liegt die größte Salzwüste der Welt, der Salar de Uyuni?" }, cca3: "BOL", tier: 3 },
  { q: { en: "Which country contains most of the Amazon rainforest?", de: "In welchem Land liegt der größte Teil des Amazonas-Regenwaldes?" }, cca3: "BRA", tier: 1 },
  { q: { en: "Which country has the highest administrative capital, La Paz?", de: "Welches Land hat den höchstgelegenen Regierungssitz, La Paz?" }, cca3: "BOL", tier: 2 },
  { q: { en: "Which country has the world's northernmost capital city?", de: "Welches Land hat die nördlichste Hauptstadt der Welt?" }, cca3: "ISL", tier: 2 },

  // ── Distinctive geography ───────────────────────────────────
  { q: { en: "Which country is completely surrounded by South Africa?", de: "Welches Land ist vollständig von Südafrika umschlossen?" }, cca3: "LSO", tier: 2 },
  { q: { en: "Which country surrounds the small kingdom of Lesotho?", de: "Welches Land umschließt das kleine Königreich Lesotho?" }, cca3: "ZAF", tier: 2 },
  { q: { en: "Which country is the only one with a non-rectangular national flag?", de: "Welches Land hat als einziges keine rechteckige Nationalflagge?" }, cca3: "NPL", tier: 2 },
  { q: { en: "In which country is Sagarmatha National Park, containing Mount Everest's southern slopes?", de: "In welchem Land liegt der Sagarmatha-Nationalpark mit den Südhängen des Mount Everest?" }, cca3: "NPL", tier: 1, source: "https://whc.unesco.org/en/list/120/" },
  { q: { en: "Which country is home to Angel Falls, the world's tallest waterfall?", de: "In welchem Land liegt der höchste Wasserfall der Welt, der Angel Falls?" }, cca3: "VEN", tier: 2 },
  { q: { en: "In which country are the Prambanan Temple Compounds?", de: "In welchem Land liegen die Tempelanlagen von Prambanan?" }, cca3: "IDN", tier: 3, source: "https://whc.unesco.org/en/list/642/" },
  { q: { en: "Which country is the largest in Africa by area?", de: "Welches Land ist das flächengrößte Afrikas?" }, cca3: "DZA", tier: 2 },
  { q: { en: "Which is the largest country located entirely in Europe?", de: "Welches ist das größte Land, das vollständig in Europa liegt?" }, cca3: "UKR", tier: 2 },
  { q: { en: "Which country is the most populous in Africa?", de: "Welches Land ist das bevölkerungsreichste Afrikas?" }, cca3: "NGA", tier: 2 },
  { q: { en: "Which country is the most populous in South America?", de: "Welches Land ist das bevölkerungsreichste Südamerikas?" }, cca3: "BRA", tier: 1 },
  { q: { en: "Which country made South African Sign Language its twelfth official language in 2023?", de: "Welches Land machte die südafrikanische Gebärdensprache 2023 zu seiner zwölften Amtssprache?" }, cca3: "ZAF", tier: 3, source: "https://www.gov.za/about-sa/south-africas-people" },

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
  { q: { en: "Which country has a red kangaroo and an emu on its Commonwealth coat of arms?", de: "Welches Land hat ein Rotes Riesenkänguru und einen Emu im Staatswappen?" }, cca3: "AUS", tier: 1, source: "https://www.pmc.gov.au/honours-and-symbols/commonwealth-coat-arms" },
  { q: { en: "Which country is home to Ranomafana National Park and its native lemurs?", de: "In welchem Land liegt der Ranomafana-Nationalpark mit seinen heimischen Lemuren?" }, cca3: "MDG", tier: 2, source: "https://whc.unesco.org/en/list/1257/" },
  { q: { en: "Which country is famous as the birthplace of the Olympic Games?", de: "Welches Land gilt als Geburtsort der Olympischen Spiele?" }, cca3: "GRC", tier: 1 },
  { q: { en: "In which country is Naples, home of the UNESCO-listed art of the Neapolitan pizzaiuolo?", de: "In welchem Land liegt Neapel, Heimat der von der UNESCO gewürdigten Kunst der Pizzabäcker?" }, cca3: "ITA", tier: 1, source: "https://ich.unesco.org/en/RL/art-of-neapolitan-pizzaiuolo-00722" },
  { q: { en: "Which country gifted the Statue of Liberty to the United States?", de: "Welches Land schenkte den USA die Freiheitsstatue?" }, cca3: "FRA", tier: 2 },
  { q: { en: "Which country has Buenos Aires, one of the two cities where the tango tradition developed?", de: "In welchem Land liegt Buenos Aires, eine der beiden Städte, in denen die Tango-Tradition entstand?" }, cca3: "ARG", tier: 2, source: "https://ich.unesco.org/en/RL/tango-00258" },
  { q: { en: "Reggae music originated in which country?", de: "In welchem Land entstand die Reggae-Musik?" }, cca3: "JAM", tier: 2 },
  ...LANDMARKS.map((place): FactQuestion => ({
    q: { en: `Which country is home to this place: ${place.en}?`, de: `In welchem Land befindet sich diese Stätte: ${place.de}?` },
    cca3: place.cca3,
    tier: place.tier,
    source: place.source,
  })),
];
