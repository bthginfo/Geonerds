/**
 * Major non-capital cities, keyed by country (cca3).
 * Used by the "Cities" mode of the Capitals & Cities game.
 * City names are largely language-neutral; a German form is given where it differs.
 */
export interface CityEntry {
  en: string;
  de?: string;
}

export const CITIES: Record<string, CityEntry[]> = {
  USA: [{ en: "New York" }, { en: "Los Angeles" }, { en: "Chicago" }, { en: "Houston" }, { en: "Miami" }, { en: "San Francisco" }],
  CAN: [{ en: "Toronto" }, { en: "Montreal", de: "Montréal" }, { en: "Vancouver" }, { en: "Calgary" }],
  BRA: [{ en: "São Paulo" }, { en: "Rio de Janeiro" }, { en: "Salvador" }, { en: "Belo Horizonte" }],
  MEX: [{ en: "Guadalajara" }, { en: "Monterrey" }, { en: "Cancún" }, { en: "Tijuana" }],
  ARG: [{ en: "Córdoba" }, { en: "Rosario" }, { en: "Mendoza" }],
  GBR: [{ en: "Manchester" }, { en: "Liverpool" }, { en: "Birmingham" }, { en: "Glasgow" }, { en: "Edinburgh" }],
  FRA: [{ en: "Marseille" }, { en: "Lyon" }, { en: "Nice", de: "Nizza" }, { en: "Bordeaux" }],
  DEU: [{ en: "Munich", de: "München" }, { en: "Hamburg" }, { en: "Cologne", de: "Köln" }, { en: "Frankfurt" }, { en: "Stuttgart" }],
  ITA: [{ en: "Milan", de: "Mailand" }, { en: "Naples", de: "Neapel" }, { en: "Turin", de: "Turin" }, { en: "Venice", de: "Venedig" }, { en: "Florence", de: "Florenz" }],
  ESP: [{ en: "Barcelona" }, { en: "Valencia" }, { en: "Seville", de: "Sevilla" }, { en: "Bilbao" }],
  PRT: [{ en: "Porto" }, { en: "Braga" }],
  NLD: [{ en: "Rotterdam" }, { en: "The Hague", de: "Den Haag" }, { en: "Eindhoven" }],
  CHE: [{ en: "Zurich", de: "Zürich" }, { en: "Geneva", de: "Genf" }, { en: "Basel" }],
  AUT: [{ en: "Graz" }, { en: "Salzburg" }, { en: "Innsbruck" }],
  POL: [{ en: "Kraków" }, { en: "Łódź" }, { en: "Wrocław" }, { en: "Gdańsk", de: "Danzig" }],
  RUS: [{ en: "Saint Petersburg", de: "Sankt Petersburg" }, { en: "Novosibirsk" }, { en: "Yekaterinburg" }],
  UKR: [{ en: "Kharkiv" }, { en: "Odesa", de: "Odessa" }, { en: "Lviv", de: "Lemberg" }],
  TUR: [{ en: "Istanbul" }, { en: "Izmir" }, { en: "Antalya" }],
  CHN: [{ en: "Shanghai" }, { en: "Guangzhou" }, { en: "Shenzhen" }, { en: "Chengdu" }, { en: "Hong Kong", de: "Hongkong" }],
  JPN: [{ en: "Osaka" }, { en: "Yokohama" }, { en: "Kyoto" }, { en: "Nagoya" }, { en: "Sapporo" }],
  KOR: [{ en: "Busan" }, { en: "Incheon" }, { en: "Daegu" }],
  IND: [{ en: "Mumbai" }, { en: "Bangalore", de: "Bengaluru" }, { en: "Kolkata", de: "Kalkutta" }, { en: "Chennai" }, { en: "Hyderabad" }],
  PAK: [{ en: "Karachi" }, { en: "Lahore" }, { en: "Faisalabad" }],
  IDN: [{ en: "Surabaya" }, { en: "Bandung" }, { en: "Medan" }],
  THA: [{ en: "Chiang Mai" }, { en: "Phuket" }, { en: "Pattaya" }],
  VNM: [{ en: "Ho Chi Minh City" }, { en: "Da Nang" }, { en: "Haiphong" }],
  SAU: [{ en: "Jeddah", de: "Dschidda" }, { en: "Mecca", de: "Mekka" }, { en: "Medina" }],
  ARE: [{ en: "Dubai" }, { en: "Sharjah" }],
  ISR: [{ en: "Tel Aviv" }, { en: "Haifa" }],
  IRN: [{ en: "Mashhad" }, { en: "Isfahan", de: "Isfahan" }, { en: "Shiraz" }],
  EGY: [{ en: "Alexandria", de: "Alexandria" }, { en: "Giza", de: "Gizeh" }, { en: "Luxor" }],
  ZAF: [{ en: "Johannesburg" }, { en: "Durban" }, { en: "Cape Town", de: "Kapstadt" }],
  NGA: [{ en: "Lagos" }, { en: "Kano" }, { en: "Ibadan" }],
  KEN: [{ en: "Mombasa" }, { en: "Kisumu" }],
  MAR: [{ en: "Casablanca" }, { en: "Marrakesh", de: "Marrakesch" }, { en: "Fez", de: "Fès" }],
  AUS: [{ en: "Sydney" }, { en: "Melbourne" }, { en: "Brisbane" }, { en: "Perth" }],
  NZL: [{ en: "Auckland" }, { en: "Christchurch" }],
  COL: [{ en: "Medellín" }, { en: "Cali" }, { en: "Barranquilla" }],
  PER: [{ en: "Arequipa" }, { en: "Cusco", de: "Cusco" }, { en: "Trujillo" }],
  CHL: [{ en: "Valparaíso" }, { en: "Concepción" }],
  ECU: [{ en: "Guayaquil" }],
  SWE: [{ en: "Gothenburg", de: "Göteborg" }, { en: "Malmö" }],
  NOR: [{ en: "Bergen" }, { en: "Trondheim" }],
  FIN: [{ en: "Tampere" }, { en: "Turku" }],
  DNK: [{ en: "Aarhus" }, { en: "Odense" }],
  BEL: [{ en: "Antwerp", de: "Antwerpen" }, { en: "Ghent", de: "Gent" }, { en: "Bruges", de: "Brügge" }],
  GRC: [{ en: "Thessaloniki" }, { en: "Patras" }],
  CZE: [{ en: "Brno" }, { en: "Ostrava" }],
  ROU: [{ en: "Cluj-Napoca" }, { en: "Timișoara" }],
  HUN: [{ en: "Debrecen" }, { en: "Szeged" }],
  IRL: [{ en: "Cork" }, { en: "Galway" }],
  IRQ: [{ en: "Basra" }, { en: "Mosul" }],
  PHL: [{ en: "Cebu" }, { en: "Davao" }],
  MYS: [{ en: "George Town" }, { en: "Johor Bahru" }],
  BGD: [{ en: "Chittagong" }, { en: "Khulna" }],
};

/** Country codes (cca3) that have at least one curated non-capital city. */
export const CITY_COUNTRY_CODES = new Set(Object.keys(CITIES));
