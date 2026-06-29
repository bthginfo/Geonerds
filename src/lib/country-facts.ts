/**
 * Hand-curated, surprising facts per country (cca3), bilingual.
 * Used as the post-answer "Did you know?" across the quiz games — flavour
 * that templated data can't provide. These may name the country/landmarks,
 * so they are NOT used as trivia clues (which must avoid giving the answer away).
 */
export interface Fact {
  en: string;
  de: string;
}

export const COUNTRY_FACTS: Record<string, Fact[]> = {
  FRA: [
    { en: "France is the most visited country on Earth — about 90 million tourists a year.", de: "Frankreich ist das meistbesuchte Land der Welt – rund 90 Mio. Touristen pro Jahr." },
    { en: "The Eiffel Tower grows up to 15 cm taller in summer as its iron expands in the heat.", de: "Der Eiffelturm wird im Sommer bis zu 15 cm höher, weil sich das Eisen in der Hitze ausdehnt." },
  ],
  ITA: [
    { en: "Italy has more UNESCO World Heritage sites than any other country.", de: "Italien hat mehr UNESCO-Welterbestätten als jedes andere Land." },
    { en: "Rome is older than Italy itself — the city is over 2,700 years old.", de: "Rom ist älter als Italien selbst – die Stadt ist über 2.700 Jahre alt." },
  ],
  ESP: [
    { en: "Spain's Sagrada Família has been under construction since 1882 and still isn't finished.", de: "Spaniens Sagrada Família wird seit 1882 gebaut und ist noch immer nicht fertig." },
    { en: "Spanish is the world's second-most spoken native language.", de: "Spanisch ist die weltweit am zweithäufigsten gesprochene Muttersprache." },
  ],
  DEU: [
    { en: "Germany has over 1,500 different kinds of beer and around 1,300 breweries.", de: "Deutschland hat über 1.500 Biersorten und rund 1.300 Brauereien." },
    { en: "Parts of the Autobahn still have no general speed limit.", de: "Teile der Autobahn haben bis heute kein generelles Tempolimit." },
  ],
  GBR: [
    { en: "The UK has no single written constitution.", de: "Das Vereinigte Königreich hat keine einzige geschriebene Verfassung." },
    { en: "London's Underground is the world's oldest, opened in 1863.", de: "Londons U-Bahn ist die älteste der Welt, eröffnet 1863." },
  ],
  IRL: [
    { en: "Halloween grew out of the ancient Irish festival of Samhain.", de: "Halloween entstand aus dem alten irischen Fest Samhain." },
    { en: "Ireland has no native snakes.", de: "In Irland gibt es keine heimischen Schlangen." },
  ],
  NLD: [
    { en: "About a quarter of the Netherlands lies below sea level.", de: "Etwa ein Viertel der Niederlande liegt unter dem Meeresspiegel." },
    { en: "There are more bicycles than people in the Netherlands.", de: "In den Niederlanden gibt es mehr Fahrräder als Menschen." },
  ],
  CHE: [
    { en: "Switzerland has enough nuclear shelters for its entire population.", de: "Die Schweiz hat genug Atomschutzbunker für ihre gesamte Bevölkerung." },
    { en: "It has four official languages: German, French, Italian and Romansh.", de: "Sie hat vier Amtssprachen: Deutsch, Französisch, Italienisch und Rätoromanisch." },
  ],
  AUT: [
    { en: "The croissant was invented in Vienna, not in France.", de: "Das Croissant wurde in Wien erfunden, nicht in Frankreich." },
    { en: "Austria gave the world the snow globe and the sewing machine.", de: "Österreich schenkte der Welt die Schneekugel und die Nähmaschine." },
  ],
  NOR: [
    { en: "Norway introduced salmon sushi to Japan in the 1980s.", de: "Norwegen brachte Japan in den 1980ern das Lachs-Sushi." },
    { en: "In summer the midnight sun never sets in northern Norway.", de: "Im Sommer geht im Norden Norwegens die Mitternachtssonne nie unter." },
  ],
  SWE: [
    { en: "Sweden recycles so well it has imported rubbish to fuel power plants.", de: "Schweden recycelt so gut, dass es Müll importierte, um Kraftwerke zu befeuern." },
    { en: "The Celsius scale is named after Swedish astronomer Anders Celsius.", de: "Die Celsius-Skala ist nach dem schwedischen Astronomen Anders Celsius benannt." },
  ],
  FIN: [
    { en: "Finland has around 3 million saunas — almost one per household.", de: "Finnland hat rund 3 Mio. Saunen – fast eine pro Haushalt." },
    { en: "It's been ranked the world's happiest country for years running.", de: "Es wurde jahrelang in Folge zum glücklichsten Land der Welt gekürt." },
  ],
  ISL: [
    { en: "Iceland runs almost entirely on renewable geothermal and hydro power.", de: "Island läuft fast vollständig mit erneuerbarer Erdwärme und Wasserkraft." },
    { en: "It has no mosquitoes.", de: "Es gibt dort keine Mücken." },
  ],
  PRT: [
    { en: "Portugal is home to the oldest bookshop in the world (Lisbon, 1732).", de: "In Portugal steht die älteste Buchhandlung der Welt (Lissabon, 1732)." },
    { en: "Cork from Portuguese oak makes most of the world's wine stoppers.", de: "Kork aus portugiesischen Eichen liefert die meisten Weinkorken der Welt." },
  ],
  GRC: [
    { en: "Greece has around 6,000 islands, but only about 230 are inhabited.", de: "Griechenland hat rund 6.000 Inseln, aber nur etwa 230 sind bewohnt." },
    { en: "The Olympic Games began in ancient Olympia in 776 BC.", de: "Die Olympischen Spiele begannen 776 v. Chr. im antiken Olympia." },
  ],
  RUS: [
    { en: "Russia spans 11 time zones — more than any other country.", de: "Russland erstreckt sich über 11 Zeitzonen – mehr als jedes andere Land." },
    { en: "Lake Baikal holds about 20% of the world's unfrozen fresh water.", de: "Der Baikalsee enthält rund 20 % des ungefrorenen Süßwassers der Erde." },
  ],
  POL: [
    { en: "Poland is home to Europe's heaviest land animal, the wisent (bison).", de: "In Polen lebt Europas schwerstes Landtier, der Wisent." },
    { en: "Marie Curie, the first person to win two Nobel Prizes, was Polish.", de: "Marie Curie, die erste Person mit zwei Nobelpreisen, war Polin." },
  ],
  CZE: [
    { en: "Czechs drink more beer per person than anyone else on Earth.", de: "Tschechen trinken pro Kopf mehr Bier als alle anderen weltweit." },
    { en: "The word 'robot' comes from a 1920 Czech play.", de: "Das Wort „Roboter“ stammt aus einem tschechischen Theaterstück von 1920." },
  ],
  USA: [
    { en: "The US has no official national language at the federal level.", de: "Die USA haben auf Bundesebene keine offizielle Landessprache." },
    { en: "Alaska has both the easternmost and westernmost points of the US.", de: "Alaska hat sowohl den östlichsten als auch den westlichsten Punkt der USA." },
  ],
  CAN: [
    { en: "Canada has more lakes than the rest of the world combined.", de: "Kanada hat mehr Seen als der Rest der Welt zusammen." },
    { en: "Its coastline is the longest of any country on Earth.", de: "Seine Küste ist die längste aller Länder der Welt." },
  ],
  MEX: [
    { en: "Mexico City is slowly sinking — up to 50 cm a year in places.", de: "Mexiko-Stadt sinkt langsam ab – stellenweise bis zu 50 cm pro Jahr." },
    { en: "Chocolate, chillies and corn were all first cultivated in Mexico.", de: "Schokolade, Chili und Mais wurden zuerst in Mexiko kultiviert." },
  ],
  BRA: [
    { en: "The Amazon in Brazil produces around 20% of the world's oxygen.", de: "Der Amazonas in Brasilien erzeugt rund 20 % des Sauerstoffs der Welt." },
    { en: "Brazil has won the football World Cup a record five times.", de: "Brasilien gewann die Fußball-WM rekordverdächtige fünf Mal." },
  ],
  ARG: [
    { en: "Argentina has the world's southernmost city, Ushuaia.", de: "Argentinien hat die südlichste Stadt der Welt, Ushuaia." },
    { en: "The tango was born in the streets of Buenos Aires.", de: "Der Tango entstand in den Straßen von Buenos Aires." },
  ],
  CHL: [
    { en: "Chile's Atacama Desert is the driest place on Earth.", de: "Chiles Atacama-Wüste ist der trockenste Ort der Erde." },
    { en: "The country stretches over 4,300 km from north to south.", de: "Das Land erstreckt sich über 4.300 km von Nord nach Süd." },
  ],
  PER: [
    { en: "Peru is home to Machu Picchu, a 15th-century Inca citadel.", de: "Peru beheimatet Machu Picchu, eine Inka-Zitadelle aus dem 15. Jh." },
    { en: "There are over 3,000 varieties of potato native to Peru.", de: "In Peru gibt es über 3.000 heimische Kartoffelsorten." },
  ],
  BOL: [
    { en: "Bolivia's Salar de Uyuni is the world's largest salt flat.", de: "Boliviens Salar de Uyuni ist die größte Salzwüste der Welt." },
    { en: "It has two capitals: Sucre and La Paz.", de: "Es hat zwei Hauptstädte: Sucre und La Paz." },
  ],
  COL: [
    { en: "Colombia is the world's second-most biodiverse country.", de: "Kolumbien ist das artenreichste Land nach Brasilien." },
    { en: "It's the only South American country with both Pacific and Caribbean coasts.", de: "Es ist das einzige südamerikanische Land mit Pazifik- und Karibikküste." },
  ],
  CHN: [
    { en: "The Great Wall of China is over 21,000 km long in total.", de: "Die Chinesische Mauer ist insgesamt über 21.000 km lang." },
    { en: "China uses a single time zone despite spanning five.", de: "China nutzt eine einzige Zeitzone, obwohl es fünf umfasst." },
  ],
  JPN: [
    { en: "Japan has more than 5 million vending machines.", de: "Japan hat mehr als 5 Millionen Verkaufsautomaten." },
    { en: "It's made up of over 14,000 islands.", de: "Es besteht aus über 14.000 Inseln." },
  ],
  KOR: [
    { en: "South Korea has the world's fastest average internet speeds.", de: "Südkorea hat im Schnitt die schnellsten Internetgeschwindigkeiten der Welt." },
    { en: "Korean age tradition once counted everyone as 1 at birth.", de: "Nach koreanischer Tradition galt jeder bei der Geburt als 1 Jahr alt." },
  ],
  IND: [
    { en: "India is the world's most populous country and largest democracy.", de: "Indien ist das bevölkerungsreichste Land und die größte Demokratie der Welt." },
    { en: "The number zero as a concept was developed in ancient India.", de: "Die Zahl Null als Konzept wurde im alten Indien entwickelt." },
  ],
  THA: [
    { en: "Bangkok's full ceremonial name is the longest city name in the world.", de: "Bangkoks vollständiger Zeremonienname ist der längste Stadtname der Welt." },
    { en: "Thailand was never colonised by a European power.", de: "Thailand wurde nie von einer europäischen Macht kolonisiert." },
  ],
  VNM: [
    { en: "Vietnam is the world's second-largest coffee exporter.", de: "Vietnam ist der zweitgrößte Kaffeeexporteur der Welt." },
    { en: "Its Sơn Đoòng is among the largest caves on the planet.", de: "Seine Höhle Sơn Đoòng zählt zu den größten der Welt." },
  ],
  IDN: [
    { en: "Indonesia is made up of more than 17,000 islands.", de: "Indonesien besteht aus mehr als 17.000 Inseln." },
    { en: "It sits on the Pacific 'Ring of Fire' with around 130 active volcanoes.", de: "Es liegt am pazifischen „Feuerring“ mit rund 130 aktiven Vulkanen." },
  ],
  SAU: [
    { en: "Saudi Arabia has no permanent rivers at all.", de: "Saudi-Arabien hat überhaupt keine dauerhaften Flüsse." },
    { en: "Mecca, the holiest city of Islam, lies in Saudi Arabia.", de: "Mekka, die heiligste Stadt des Islam, liegt in Saudi-Arabien." },
  ],
  ARE: [
    { en: "Dubai is home to the world's tallest building, the Burj Khalifa.", de: "Dubai beherbergt das höchste Gebäude der Welt, den Burj Khalifa." },
    { en: "Around 80% of UAE residents are foreign-born.", de: "Rund 80 % der Bewohner der VAE sind im Ausland geboren." },
  ],
  TUR: [
    { en: "Istanbul is the only major city spanning two continents.", de: "Istanbul ist die einzige Großstadt auf zwei Kontinenten." },
    { en: "Tulips originated in Turkey before becoming famous in the Netherlands.", de: "Tulpen stammen aus der Türkei, bevor sie in den Niederlanden berühmt wurden." },
  ],
  ISR: [
    { en: "The Dead Sea shore is the lowest land on Earth, ~430 m below sea level.", de: "Das Ufer des Toten Meeres ist der tiefste Landpunkt der Erde, ~430 m unter dem Meer." },
    { en: "Cherry tomatoes were developed in Israel.", de: "Cherrytomaten wurden in Israel entwickelt." },
  ],
  EGY: [
    { en: "The Great Pyramid stood as the tallest human structure for ~3,800 years.", de: "Die Cheops-Pyramide war ~3.800 Jahre lang das höchste Bauwerk der Menschheit." },
    { en: "The Nile is generally considered the longest river on Earth.", de: "Der Nil gilt allgemein als längster Fluss der Erde." },
  ],
  ZAF: [
    { en: "South Africa has three capital cities.", de: "Südafrika hat drei Hauptstädte." },
    { en: "The first human heart transplant took place in Cape Town in 1967.", de: "Die erste Herztransplantation fand 1967 in Kapstadt statt." },
  ],
  KEN: [
    { en: "Kenya's Great Rift Valley is visible from space.", de: "Kenias Großer Afrikanischer Grabenbruch ist aus dem All sichtbar." },
    { en: "It's famous for producing many of the world's top marathon runners.", de: "Es ist berühmt für viele der weltbesten Marathonläufer." },
  ],
  NGA: [
    { en: "Nigeria is Africa's most populous country.", de: "Nigeria ist das bevölkerungsreichste Land Afrikas." },
    { en: "Its film industry, 'Nollywood', is among the world's largest by output.", de: "Seine Filmindustrie „Nollywood“ gehört zu den produktivsten der Welt." },
  ],
  MAR: [
    { en: "Morocco's Fez has one of the world's oldest universities (859 AD).", de: "Marokkos Fès hat eine der ältesten Universitäten der Welt (859 n. Chr.)." },
    { en: "The blue city of Chefchaouen is painted in countless shades of blue.", de: "Die blaue Stadt Chefchaouen ist in unzähligen Blautönen gestrichen." },
  ],
  AUS: [
    { en: "Australia is home to the Great Barrier Reef, the largest living structure.", de: "Australien beherbergt das Great Barrier Reef, die größte lebende Struktur." },
    { en: "It has more kangaroos than people.", de: "Es gibt dort mehr Kängurus als Menschen." },
  ],
  NZL: [
    { en: "New Zealand was the first country to give women the vote, in 1893.", de: "Neuseeland gab Frauen 1893 als erstes Land das Wahlrecht." },
    { en: "It has roughly five sheep for every person.", de: "Auf jeden Menschen kommen dort etwa fünf Schafe." },
  ],
  AFG: [
    { en: "Afghanistan sits at the crossroads of the ancient Silk Road.", de: "Afghanistan liegt an der Kreuzung der alten Seidenstraße." },
  ],
  NPL: [
    { en: "Nepal has the only national flag that isn't a rectangle.", de: "Nepal hat die einzige Nationalflagge, die kein Rechteck ist." },
    { en: "Eight of the world's ten highest peaks are in Nepal.", de: "Acht der zehn höchsten Berge der Welt liegen in Nepal." },
  ],
  MNG: [
    { en: "Mongolia is the world's most sparsely populated sovereign country.", de: "Die Mongolei ist der am dünnsten besiedelte souveräne Staat der Welt." },
    { en: "Much of its population is still nomadic.", de: "Ein großer Teil der Bevölkerung lebt noch nomadisch." },
  ],
  SGP: [
    { en: "Singapore is one of only three surviving city-states.", de: "Singapur ist einer von nur drei verbliebenen Stadtstaaten." },
    { en: "Chewing gum sales have been restricted there since 1992.", de: "Der Verkauf von Kaugummi ist dort seit 1992 eingeschränkt." },
  ],
  VAT: [
    { en: "Vatican City is the smallest country in the world.", de: "Die Vatikanstadt ist das kleinste Land der Welt." },
  ],
  MCO: [
    { en: "Monaco is the most densely populated country on Earth.", de: "Monaco ist das am dichtesten besiedelte Land der Erde." },
  ],
  CUB: [
    { en: "Cuba has two currencies and famously classic 1950s American cars.", de: "Kuba hatte zwei Währungen und ist bekannt für klassische US-Autos der 1950er." },
  ],
  JAM: [
    { en: "Jamaica gave the world reggae and sprinter Usain Bolt.", de: "Jamaika schenkte der Welt Reggae und den Sprinter Usain Bolt." },
  ],
  ETH: [
    { en: "Ethiopia uses its own calendar, which runs about 7–8 years behind.", de: "Äthiopien nutzt einen eigenen Kalender, der etwa 7–8 Jahre zurückliegt." },
    { en: "It's widely regarded as the birthplace of coffee.", de: "Es gilt weithin als die Wiege des Kaffees." },
  ],
  KAZ: [
    { en: "Kazakhstan is the world's largest landlocked country.", de: "Kasachstan ist das größte Binnenland der Welt." },
  ],
  CRI: [
    { en: "Costa Rica abolished its army in 1948.", de: "Costa Rica schaffte 1948 seine Armee ab." },
  ],
  BTN: [
    { en: "Bhutan measures progress by 'Gross National Happiness'.", de: "Bhutan misst Fortschritt am „Bruttonationalglück“." },
    { en: "It's the world's only carbon-negative country.", de: "Es ist das einzige CO₂-negative Land der Welt." },
  ],
  LUX: [
    { en: "Luxembourg made all public transport free nationwide in 2020.", de: "Luxemburg machte 2020 als erstes Land den ÖPNV landesweit kostenlos." },
  ],
};

export function hasFacts(cca3: string): boolean {
  return !!COUNTRY_FACTS[cca3]?.length;
}
