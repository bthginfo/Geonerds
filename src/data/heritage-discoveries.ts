/** Factual place/country associations checked against UNESCO, November 2026.
 * Questions are original DE/EN wording, not copied UNESCO descriptions.
 * No UNESCO photographs, logos or descriptive text are redistributed.
 */
export interface HeritageDiscovery {
  en: string;
  de: string;
  cca3: string;
  tier: 1 | 2 | 3;
  source: string;
  question: { en: string; de: string };
}

type Entry = [string, string, string, 1 | 2 | 3, number, string, string];
const entries: Entry[] = [
  ["Old Town of Tallinn", "Altstadt von Tallinn", "EST", 2, 822, "Which country contains Tallinn's Hanseatic old town?", "In welchem Land liegt die hansische Altstadt von Tallinn?"],
  ["Historic Centre of Riga", "Historisches Zentrum von Riga", "LVA", 2, 852, "In which country can you explore Riga's Art Nouveau streets?", "In welchem Land kannst du Rigas Jugendstilstraßen erkunden?"],
  ["Vilnius Historic Centre", "Historisches Zentrum von Vilnius", "LTU", 2, 541, "Which country contains the historic centre of Vilnius?", "In welchem Land liegt das historische Zentrum von Vilnius?"],
  ["Hanseatic Town of Visby", "Hansestadt Visby", "SWE", 2, 731, "Visby's medieval town walls stand on Gotland. Which country is it in?", "Visbys mittelalterliche Stadtmauer steht auf Gotland. Zu welchem Land gehört die Insel?"],
  ["Old Rauma", "Alt-Rauma", "FIN", 3, 582, "Which country contains the wooden old town of Rauma?", "In welchem Land liegt die hölzerne Altstadt von Rauma?"],
  ["Bay of Kotor", "Bucht von Kotor", "MNE", 2, 125, "Which country contains Kotor's historic Adriatic harbour?", "In welchem Land liegt Kotors historischer Hafen an der Adria?"],
  ["Medieval Bardejov", "Mittelalterliches Bardejov", "SVK", 3, 973, "Which country contains the fortified medieval town of Bardejov?", "In welchem Land liegt die befestigte mittelalterliche Stadt Bardejov?"],
  ["Gardens and Castle at Kroměříž", "Gärten und Schloss Kroměříž", "CZE", 3, 860, "Kroměříž has a UNESCO-listed Baroque castle and gardens. Which country contains them?", "Kroměříž besitzt ein UNESCO-geschütztes Barockschloss mit Gärten. In welchem Land liegt es?"],
  ["Old Bridge of Mostar", "Alte Brücke von Mostar", "BIH", 2, 946, "In which country does Mostar's Old Bridge cross the Neretva?", "In welchem Land überspannt die Alte Brücke von Mostar die Neretva?"],
  ["Historic Centres of Berat and Gjirokastra", "Historische Zentren von Berat und Gjirokastra", "ALB", 3, 569, "Which country contains the historic towns of Berat and Gjirokastra?", "In welchem Land liegen die historischen Städte Berat und Gjirokastra?"],
  ["Antigua Guatemala", "Antigua Guatemala", "GTM", 2, 65, "Which country contains the former colonial capital Antigua Guatemala?", "In welchem Land liegt die frühere Kolonialhauptstadt Antigua Guatemala?"],
  ["Ruins of León Viejo", "Ruinen von León Viejo", "NIC", 3, 613, "In which country are the ruins of the early colonial settlement León Viejo?", "In welchem Land liegen die Ruinen der frühen Kolonialsiedlung León Viejo?"],
  ["Historic Paramaribo", "Historisches Paramaribo", "SUR", 3, 940, "Which South American country contains Paramaribo's historic wooden buildings?", "In welchem südamerikanischen Land stehen Paramaribos historische Holzbauten?"],
  ["Fray Bentos Industrial Landscape", "Industrielandschaft Fray Bentos", "URY", 3, 1464, "Which country contains the former meat-processing complex at Fray Bentos?", "In welchem Land liegt der frühere Fleischverarbeitungskomplex von Fray Bentos?"],
  ["Colonia del Sacramento Historic Quarter", "Historisches Viertel von Colonia del Sacramento", "URY", 3, 747, "In which country is Colonia del Sacramento, founded by the Portuguese on the Río de la Plata?", "In welchem Land liegt Colonia del Sacramento, eine portugiesische Gründung am Río de la Plata?"],
  ["Coro and its Port", "Coro und sein Hafen", "VEN", 3, 658, "Which country contains Coro's historic earthen architecture?", "In welchem Land liegt Coro mit seiner historischen Lehmbauarchitektur?"],
  ["Historic City of Sucre", "Historische Stadt Sucre", "BOL", 2, 566, "Which country contains the historic city of Sucre?", "In welchem Land liegt die historische Stadt Sucre?"],
  ["Historic Centre of Santa Ana de los Ríos de Cuenca", "Historisches Zentrum von Santa Ana de los Ríos de Cuenca", "ECU", 3, 863, "Santa Ana de los Ríos de Cuenca lies in an Andean valley. Which country is it in?", "Santa Ana de los Ríos de Cuenca liegt in einem Andental. In welchem Land?"],
  ["Historic Centre of Zacatecas", "Historisches Zentrum von Zacatecas", "MEX", 3, 676, "Which country contains the silver-mining city of Zacatecas?", "In welchem Land liegt die Silberbergbaustadt Zacatecas?"],
  ["Trinidad and the Valley de los Ingenios", "Trinidad und das Valle de los Ingenios", "CUB", 2, 460, "Which country contains the sugar-trade heritage of Trinidad and the Valley de los Ingenios?", "In welchem Land liegen Trinidad und das vom Zuckerhandel geprägte Valle de los Ingenios?"],
  ["Historic Centre of Cienfuegos", "Historisches Zentrum von Cienfuegos", "CUB", 3, 1202, "In which country is Cienfuegos, a Caribbean port founded in 1819?", "In welchem Land liegt Cienfuegos, eine 1819 gegründete karibische Hafenstadt?"],
  ["Vat Phou", "Vat Phou", "LAO", 3, 481, "Which country contains the Vat Phou temple complex in the Champasak landscape?", "In welchem Land liegt die Tempelanlage Vat Phou in der Kulturlandschaft Champasak?"],
  ["Kunya-Urgench", "Kunya-Urgench", "TKM", 3, 1199, "Which country contains the historic monuments of Kunya-Urgench near the Amu Darya?", "In welchem Land liegen die historischen Monumente von Kunya-Urgench nahe dem Amudarja?"],
  ["Parthian Fortresses of Nisa", "Parthische Festungen von Nisa", "TKM", 3, 1242, "In which country are the Parthian fortresses of Nisa?", "In welchem Land liegen die parthischen Festungen von Nisa?"],
  ["Nan Madol", "Nan Madol", "FSM", 3, 1503, "Which country contains Nan Madol's artificial islets off Pohnpei?", "In welchem Land liegen Nan Madols künstliche Inseln vor Pohnpei?"],
  ["Kuk Early Agricultural Site", "Frühe Agrarlandschaft Kuk", "PNG", 3, 887, "Which country contains the ancient agricultural wetlands at Kuk?", "In welchem Land liegt die frühe landwirtschaftliche Feuchtlandschaft Kuk?"],
  ["East Rennell", "East Rennell", "SLB", 3, 854, "East Rennell and Lake Tegano belong to which Pacific country?", "Zu welchem Pazifikstaat gehören East Rennell und der Tegano-See?"],
  ["Levuka Historical Port Town", "Historische Hafenstadt Levuka", "FJI", 3, 1399, "Which country contains Levuka, its former colonial capital?", "In welchem Land liegt Levuka, seine frühere Kolonialhauptstadt?"],
  ["Chief Roi Mata's Domain", "Domäne von Häuptling Roi Mata", "VUT", 3, 1280, "Chief Roi Mata's Domain includes sites on Efate, Lelepa and Artok. Which country contains them?", "Die Domäne von Häuptling Roi Mata umfasst Stätten auf Efate, Lelepa und Artok. Zu welchem Land gehören sie?"],
  ["Aapravasi Ghat", "Aapravasi Ghat", "MUS", 3, 1227, "Which country contains the immigration heritage site Aapravasi Ghat in Port Louis?", "In welchem Land liegt die Einwanderungsstätte Aapravasi Ghat in Port Louis?"],
  ["Cidade Velha", "Cidade Velha", "CPV", 3, 1310, "Which island country contains Cidade Velha on Santiago?", "In welchem Inselstaat liegt Cidade Velha auf Santiago?"],
  ["Kunta Kinteh Island", "Kunta-Kinteh-Insel", "GMB", 3, 761, "Kunta Kinteh Island lies in the river of which West African country?", "In welchem westafrikanischen Land liegt die Kunta-Kinteh-Insel im gleichnamigen Fluss?"],
];

export const HERITAGE_DISCOVERIES: HeritageDiscovery[] = entries.map(([en, de, cca3, tier, id, questionEn, questionDe]) => ({
  en, de, cca3, tier, source: `https://whc.unesco.org/en/list/${id}/`, question: { en: questionEn, de: questionDe },
}));
