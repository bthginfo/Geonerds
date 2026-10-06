import type { NightCity } from "./adastra";

// Scope comes from the linked NASA captions; small towns are clues, never targets.
export const NIGHT_AREA_DEFINITIONS: readonly NightCity[] = [
  {
    "id": "san-francisco-bay-area",
    "kind": "metro",
    "name": {
      "en": "San Francisco Bay Area",
      "de": "San Francisco Bay Area"
    },
    "aliases": [
      "San Francisco Bay Area",
      "Bay Area",
      "San Francisco–Oakland–San Jose",
      "San Francisco",
      "SF Bay"
    ],
    "cca3": "USA",
    "region": "North America",
    "regionHint": {
      "en": "Western North America / Pacific coast",
      "de": "Westliches Nordamerika / Pazifikküste"
    },
    "clue": {
      "en": "Look for several bright urban centers wrapping around a large dark bay, with more towns beyond the hills.",
      "de": "Achte auf mehrere helle Stadtkerne um eine große dunkle Bucht und weitere Städte jenseits der Hügel."
    },
    "explanation": {
      "en": "This is the San Francisco Bay Area. NASA identifies San Francisco, San Jose and Oakland, with Stockton and Modesto farther inland; the entire view is wider than San Francisco alone. The photo may be rotated; north is not necessarily at the top.",
      "de": "Das ist die San Francisco Bay Area. NASA nennt San Francisco, San Jose und Oakland sowie Stockton und Modesto weiter im Landesinneren. Die Aufnahme zeigt also mehr als nur San Francisco. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      37.75,
      -122.2
    ],
    "overlaps": [
      "western-united-states"
    ]
  },
  {
    "id": "greater-tokyo",
    "kind": "metro",
    "name": {
      "en": "Greater Tokyo",
      "de": "Großraum Tokio"
    },
    "aliases": [
      "Greater Tokyo",
      "Großraum Tokio",
      "Tokyo metropolitan area",
      "Tokyo Bay metropolitan area",
      "Tokyo–Yokohama",
      "Tokyo",
      "Tokio"
    ],
    "cca3": "JPN",
    "region": "Asia",
    "regionHint": {
      "en": "East Asia / Pacific coast",
      "de": "Ostasien / Pazifikküste"
    },
    "clue": {
      "en": "A very large connected urban glow follows a bay; look for port districts and separate bright suburban centers.",
      "de": "Ein sehr großes zusammenhängendes Lichterfeld folgt einer Bucht. Suche Hafenbereiche und mehrere helle Vorstadtkerne."
    },
    "explanation": {
      "en": "This is Greater Tokyo, not just its central city. NASA identifies Tokyo, Yokohama and the municipalities surrounding Tokyo Bay. The photo may be rotated; north is not necessarily at the top.",
      "de": "Das ist der Großraum Tokio, nicht nur die Innenstadt. NASA identifiziert Tokio, Yokohama und die Gemeinden rund um die Bucht von Tokio. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      35.6,
      139.7
    ],
    "overlaps": [
      "tokyo-osaka-corridor"
    ]
  },
  {
    "id": "washington-baltimore",
    "kind": "metro",
    "name": {
      "en": "Washington–Baltimore",
      "de": "Washington–Baltimore"
    },
    "aliases": [
      "Washington–Baltimore",
      "Washington-Baltimore",
      "Baltimore–Washington",
      "Baltimore-Washington",
      "Washington and Baltimore"
    ],
    "cca3": "USA",
    "region": "North America",
    "regionHint": {
      "en": "Eastern North America / Atlantic coast",
      "de": "Östliches Nordamerika / Atlantikküste"
    },
    "clue": {
      "en": "Look for two large neighboring urban clusters, each with branching roads and extensive suburbs.",
      "de": "Achte auf zwei große benachbarte Lichterfelder mit verzweigten Straßen und ausgedehnten Vororten."
    },
    "explanation": {
      "en": "NASA identifies Washington, D.C. and Baltimore, together with their surrounding suburbs. The target is this two-city metropolitan corridor, not one suburban town. The photo may be rotated; north is not necessarily at the top.",
      "de": "NASA identifiziert Washington, D.C. und Baltimore samt ihren Vororten. Gesucht ist der Ballungsraum zwischen beiden Städten, keine einzelne Vorstadt. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      39.08,
      -76.82
    ],
    "overlaps": [
      "northeastern-us-urban-corridor"
    ]
  },
  {
    "id": "new-york-metropolitan-area",
    "kind": "metro",
    "name": {
      "en": "New York metropolitan area",
      "de": "Großraum New York"
    },
    "aliases": [
      "New York metropolitan area",
      "Großraum New York",
      "New York metro",
      "New York–Newark–Jersey City",
      "New York-Newark-Jersey City",
      "New York/New Jersey metropolitan area",
      "New York",
      "New York City",
      "NYC"
    ],
    "cca3": "USA",
    "region": "North America",
    "regionHint": {
      "en": "Northeastern North America / Atlantic coast",
      "de": "Nordöstliches Nordamerika / Atlantikküste"
    },
    "clue": {
      "en": "Follow the dark coastal water and river, then notice how the lights spread far beyond one compact city center.",
      "de": "Folge dem dunklen Küstenwasser und dem Fluss. Die Lichter reichen weit über einen kompakten Stadtkern hinaus."
    },
    "explanation": {
      "en": "This is the New York metropolitan area, extending across New York and New Jersey, with parts of Connecticut in the wider region. NASA identifies the metropolitan area rather than Manhattan alone. The photo may be rotated; north is not necessarily at the top.",
      "de": "Das ist der Großraum New York mit Gebieten in New York und New Jersey sowie Teilen von Connecticut im weiteren Ballungsraum. NASA benennt den Großraum und nicht nur Manhattan. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      40.72,
      -74
    ],
    "overlaps": [
      "northeastern-us-urban-corridor"
    ]
  },
  {
    "id": "greater-montreal",
    "kind": "metro",
    "name": {
      "en": "Greater Montreal",
      "de": "Großraum Montréal"
    },
    "aliases": [
      "Greater Montreal",
      "Großraum Montréal",
      "Greater Montréal",
      "Montreal metropolitan area",
      "Montréal metropolitan area",
      "Montreal",
      "Montréal"
    ],
    "cca3": "CAN",
    "region": "North America",
    "regionHint": {
      "en": "Northeastern North America / Canada",
      "de": "Nordöstliches Nordamerika / Kanada"
    },
    "clue": {
      "en": "Find a bright urban island beside broad dark waterways, with a loose ring of smaller towns around it.",
      "de": "Suche eine helle Stadtinsel neben breiten dunklen Wasserläufen und einen lockeren Ring kleinerer Städte darum."
    },
    "explanation": {
      "en": "This is Greater Montreal. NASA identifies the city on its island beside the St. Lawrence and a ring of surrounding towns, including Sorel-Tracy and Saint-Hyacinthe; those towns are clues, not obscure answer targets. The photo may be rotated; north is not necessarily at the top.",
      "de": "Das ist der Großraum Montréal. NASA nennt die Stadt auf ihrer Insel am Sankt-Lorenz-Strom und umliegende Orte wie Sorel-Tracy und Saint-Hyacinthe. Diese Orte sind Hinweise, nicht die gesuchte Antwort. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      45.53,
      -73.65
    ]
  },
  {
    "id": "beijing-tianjin",
    "kind": "metro",
    "name": {
      "en": "Beijing–Tianjin",
      "de": "Peking–Tianjin"
    },
    "aliases": [
      "Beijing–Tianjin",
      "Peking–Tianjin",
      "Beijing-Tianjin",
      "Peking-Tianjin",
      "Beijing and Tianjin"
    ],
    "cca3": "CHN",
    "region": "Asia",
    "regionHint": {
      "en": "East Asia / northern China",
      "de": "Ostasien / Nordchina"
    },
    "clue": {
      "en": "Look for two major city grids separated by dark agricultural land, with smaller illuminated settlements between them.",
      "de": "Achte auf zwei große Stadtraster, dunkles Agrarland dazwischen und kleinere beleuchtete Siedlungen entlang der Verbindung."
    },
    "explanation": {
      "en": "This view shows the Beijing–Tianjin urban area. NASA identifies both cities and Langfang between them; Beijing’s street grid and ring roads provide additional clues. The photo may be rotated; north is not necessarily at the top.",
      "de": "Die Aufnahme zeigt den Raum Peking–Tianjin. NASA identifiziert beide Städte und das dazwischenliegende Langfang. Pekings Straßengitter und Ringstraßen sind zusätzliche Hinweise. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      39.5,
      116.95
    ]
  },
  {
    "id": "greater-chicago",
    "kind": "metro",
    "name": {
      "en": "Greater Chicago",
      "de": "Großraum Chicago"
    },
    "aliases": [
      "Greater Chicago",
      "Großraum Chicago",
      "Chicago metropolitan area",
      "Chicagoland",
      "Chicago"
    ],
    "cca3": "USA",
    "region": "North America",
    "regionHint": {
      "en": "Central North America / Great Lakes",
      "de": "Zentrales Nordamerika / Große Seen"
    },
    "clue": {
      "en": "A broad urban area meets the dark edge of a huge lake. Follow the street grid into the surrounding suburbs.",
      "de": "Ein ausgedehnter Ballungsraum trifft auf die dunkle Kante eines riesigen Sees. Folge dem Straßenraster bis in die Vororte."
    },
    "explanation": {
      "en": "This is Greater Chicago on Lake Michigan’s southwestern shore. NASA describes a nearly vertical view of the lake shore and the wider metropolitan area. The photo may be rotated; north is not necessarily at the top.",
      "de": "Das ist der Großraum Chicago am Südwestufer des Michigansees. NASA beschreibt eine nahezu senkrechte Aufnahme der Küste und des gesamten Ballungsraums. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      41.88,
      -87.63
    ],
    "overlaps": [
      "us-midwest"
    ]
  },
  {
    "id": "greater-los-angeles",
    "kind": "metro",
    "name": {
      "en": "Greater Los Angeles",
      "de": "Großraum Los Angeles"
    },
    "aliases": [
      "Greater Los Angeles",
      "Großraum Los Angeles",
      "Los Angeles metropolitan area",
      "Los Angeles metro",
      "Los Angeles",
      "LA"
    ],
    "cca3": "USA",
    "region": "North America",
    "regionHint": {
      "en": "Western North America / Pacific coast",
      "de": "Westliches Nordamerika / Pazifikküste"
    },
    "clue": {
      "en": "A dense urban grid stretches inland from a dark Pacific coastline, with especially bright industrial port districts.",
      "de": "Ein dichtes Stadtraster erstreckt sich von einer dunklen Pazifikküste landeinwärts. Industrie- und Hafenbereiche sind besonders hell."
    },
    "explanation": {
      "en": "NASA identifies Los Angeles and Terminal Island. The illuminated port and the broad surrounding street grid are clues to the Los Angeles urban area, not all of California. The photo may be rotated; north is not necessarily at the top.",
      "de": "NASA identifiziert Los Angeles und Terminal Island. Der beleuchtete Hafen und das weit ausgedehnte Straßengitter verweisen auf den Ballungsraum, nicht auf ganz Kalifornien. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      34.02,
      -118.2
    ],
    "overlaps": [
      "southern-california",
      "western-united-states"
    ]
  },
  {
    "id": "jeddah-mecca-corridor",
    "kind": "metro",
    "name": {
      "en": "Jeddah–Mecca corridor",
      "de": "Dschidda–Mekka-Korridor"
    },
    "aliases": [
      "Jeddah–Mecca corridor",
      "Dschidda–Mekka-Korridor",
      "Jeddah-Mecca corridor",
      "Jeddah–Mecca",
      "Jeddah-Mecca",
      "Dschidda–Mekka",
      "Dschidda-Mekka"
    ],
    "cca3": "SAU",
    "region": "Asia",
    "regionHint": {
      "en": "Western Asia / Arabian Peninsula",
      "de": "Westasien / Arabische Halbinsel"
    },
    "clue": {
      "en": "Look for two bright urban clusters, one on a very dark coast and the other inland, separated by dark desert.",
      "de": "Achte auf zwei helle Stadtfelder: eines an einer sehr dunklen Küste, das andere im Landesinneren. Dazwischen liegt dunkle Wüste."
    },
    "explanation": {
      "en": "NASA identifies Jeddah by the Red Sea and Mecca farther inland. The target is the familiar two-city corridor, not an unnamed small desert settlement. The photo may be rotated; north is not necessarily at the top.",
      "de": "NASA identifiziert Dschidda am Roten Meer und das weiter landeinwärts gelegene Mekka. Gesucht ist der Korridor zwischen diesen bekannten Städten, keine kleine namenlose Wüstensiedlung. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      21.45,
      39.49
    ]
  },
  {
    "id": "us-midwest",
    "kind": "region",
    "name": {
      "en": "US Midwest",
      "de": "Mittlerer Westen der USA"
    },
    "aliases": [
      "US Midwest",
      "Mittlerer Westen der USA",
      "Midwestern United States",
      "American Midwest",
      "Mittlerer Westen"
    ],
    "cca3": "USA",
    "region": "North America",
    "regionHint": {
      "en": "Central North America",
      "de": "Zentrales Nordamerika"
    },
    "clue": {
      "en": "Look for many city clusters within a regular rural grid, major roads radiating from them, and a large dark lake beside the brightest cluster.",
      "de": "Suche viele Städte in einem regelmäßigen ländlichen Raster, strahlenförmige Fernstraßen und einen großen dunklen See neben dem hellsten Lichterfeld."
    },
    "explanation": {
      "en": "NASA identifies this as the Midwestern United States: Chicago beside Lake Michigan, St. Louis, Minneapolis–St. Paul and Omaha–Council Bluffs are visible. The green glow is an aurora, not a city or a road. The photo may be rotated; north is not necessarily at the top.",
      "de": "NASA identifiziert den Mittleren Westen der USA: Chicago am Michigansee, St. Louis, Minneapolis–St. Paul und Omaha–Council Bluffs sind sichtbar. Das grüne Leuchten ist ein Polarlicht, keine Stadt oder Straße. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      42,
      -90
    ],
    "overlaps": [
      "greater-chicago"
    ]
  },
  {
    "id": "northeastern-us-urban-corridor",
    "kind": "region",
    "name": {
      "en": "Northeastern US urban corridor",
      "de": "Städtegürtel im Nordosten der USA"
    },
    "aliases": [
      "Northeastern US urban corridor",
      "Städtegürtel im Nordosten der USA",
      "Northeast US corridor",
      "Northeastern United States",
      "US Northeast",
      "Northeast megalopolis",
      "Atlantic Seaboard Conurbation"
    ],
    "cca3": "USA",
    "region": "North America",
    "regionHint": {
      "en": "Eastern North America / Atlantic coast",
      "de": "Östliches Nordamerika / Atlantikküste"
    },
    "clue": {
      "en": "Several major urban clusters form a long chain beside the dark Atlantic, with smaller towns and transport links inland.",
      "de": "Mehrere große Ballungsräume bilden eine lange Kette neben dem dunklen Atlantik; kleinere Städte und Verkehrsachsen reichen ins Landesinnere."
    },
    "explanation": {
      "en": "This is the northeastern US urban corridor. NASA’s caption identifies the Atlantic Seaboard Conurbation and its New York, Philadelphia, Baltimore and Washington clusters; Boston lies outside this particular frame. The photo may be rotated; north is not necessarily at the top.",
      "de": "Das ist der Städtegürtel im Nordosten der USA. NASA nennt die Atlantic Seaboard Conurbation mit New York, Philadelphia, Baltimore und Washington. Boston liegt außerhalb dieses Bildausschnitts. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      40.15,
      -74.8
    ],
    "overlaps": [
      "new-york-metropolitan-area",
      "washington-baltimore"
    ]
  },
  {
    "id": "western-united-states",
    "kind": "region",
    "name": {
      "en": "Western United States",
      "de": "Westliche USA"
    },
    "aliases": [
      "Western United States",
      "Westliche USA",
      "Western US",
      "American West",
      "US West"
    ],
    "cca3": "USA",
    "region": "North America",
    "regionHint": {
      "en": "Western North America",
      "de": "Westliches Nordamerika"
    },
    "clue": {
      "en": "Separate chains of city lights sit between dark mountain ranges. One inland urban chain is much brighter than the surrounding sparsely lit terrain.",
      "de": "Getrennte Lichterketten liegen zwischen dunklen Gebirgszügen. Eine größere Ballungsraumkette im Landesinneren hebt sich vom dünn besiedelten Umland ab."
    },
    "explanation": {
      "en": "This broad panorama covers the western United States from Portland toward Phoenix, with California’s cities on the horizon and the Ogden–Salt Lake City–Provo chain lower in the frame. It is not a photograph of one entire state. The photo may be rotated; north is not necessarily at the top.",
      "de": "Das weite Panorama zeigt die westlichen USA von Portland in Richtung Phoenix: Kaliforniens Städte am Horizont und die Kette Ogden–Salt Lake City–Provo weiter unten im Bild. Es ist keine Aufnahme eines einzelnen ganzen Bundesstaats. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      38,
      -115
    ],
    "overlaps": [
      "southern-california",
      "san-francisco-bay-area",
      "greater-los-angeles"
    ]
  },
  {
    "id": "southern-california",
    "kind": "region",
    "name": {
      "en": "Southern California",
      "de": "Südkalifornien"
    },
    "aliases": [
      "Southern California",
      "Südkalifornien",
      "SoCal",
      "Suedkalifornien"
    ],
    "cca3": "USA",
    "region": "North America",
    "regionHint": {
      "en": "Southwestern North America / Pacific coast",
      "de": "Südwestliches Nordamerika / Pazifikküste"
    },
    "clue": {
      "en": "Look for a bright Pacific-coast urban belt beside much darker desert and a long peninsula to the south.",
      "de": "Achte auf einen hellen Städtebogen an der Pazifikküste, dunkle Wüste und eine lange Halbinsel weiter südlich."
    },
    "explanation": {
      "en": "NASA identifies Southern California, with Mexico’s Baja California and the Gulf of California also in view. The target is the well-lit Californian region; the wider photograph crosses a national border. The photo may be rotated; north is not necessarily at the top.",
      "de": "NASA identifiziert Südkalifornien; auch das mexikanische Baja California und der Golf von Kalifornien liegen im Bild. Gesucht ist die beleuchtete kalifornische Region, während das weitere Foto eine Landesgrenze überschreitet. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      33.5,
      -117
    ],
    "overlaps": [
      "greater-los-angeles",
      "western-united-states"
    ]
  },
  {
    "id": "us-gulf-coast",
    "kind": "region",
    "name": {
      "en": "US Gulf Coast",
      "de": "US-Golfküste"
    },
    "aliases": [
      "US Gulf Coast",
      "US-Golfküste",
      "U.S. Gulf Coast",
      "United States Gulf Coast",
      "Gulf Coast of the United States",
      "US Golfkueste"
    ],
    "cca3": "USA",
    "region": "North America",
    "regionHint": {
      "en": "Southern North America / Gulf coast",
      "de": "Südliches Nordamerika / Golfküste"
    },
    "clue": {
      "en": "Follow the sweeping coastline: large coastal cities and smaller inland light clusters are connected across several states.",
      "de": "Folge der weit geschwungenen Küste. Große Küstenstädte und kleinere Lichterfelder im Landesinneren erstrecken sich über mehrere Bundesstaaten."
    },
    "explanation": {
      "en": "NASA identifies the US Gulf Coast, including the Texas and Louisiana coastlines and a network of inland cities. The photographed region crosses state boundaries; it must not be labelled simply Houston or Texas. The photo may be rotated; north is not necessarily at the top.",
      "de": "NASA identifiziert die US-Golfküste mit den Küsten von Texas und Louisiana sowie vielen Städten im Landesinneren. Die Aufnahme reicht über mehrere Bundesstaaten und ist nicht einfach nur Houston oder Texas. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      29.6,
      -92
    ]
  },
  {
    "id": "british-isles",
    "kind": "region",
    "name": {
      "en": "British Isles",
      "de": "Britische Inseln"
    },
    "aliases": [
      "British Isles",
      "Britische Inseln",
      "Great Britain and Ireland",
      "Britain and Ireland",
      "Großbritannien und Irland",
      "Grossbritannien und Irland"
    ],
    "cca3": "GBR",
    "region": "Europe",
    "regionHint": {
      "en": "Northwestern Europe / islands",
      "de": "Nordwesteuropa / Inseln"
    },
    "clue": {
      "en": "Several coastal light networks are separated by dark sea channels. One very large urban glow stands out from the other clusters.",
      "de": "Mehrere Küstennetze aus Lichtern sind durch dunkle Meeresarme getrennt. Ein besonders großer Ballungsraum hebt sich von den übrigen ab."
    },
    "explanation": {
      "en": "NASA captions this view as the British Isles, with Dublin and London identified. The geographic region includes Ireland as well as Great Britain; it is not synonymous with the United Kingdom. The photo may be rotated; north is not necessarily at the top.",
      "de": "NASA bezeichnet die Ansicht als Britische Inseln und nennt Dublin und London. Die geografische Region umfasst Irland und Großbritannien und ist nicht mit dem Vereinigten Königreich gleichzusetzen. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      54,
      -3
    ],
    "countryCodes": [
      "GBR",
      "IRL"
    ]
  },
  {
    "id": "iberian-peninsula",
    "kind": "region",
    "name": {
      "en": "Iberian Peninsula",
      "de": "Iberische Halbinsel"
    },
    "aliases": [
      "Iberian Peninsula",
      "Iberische Halbinsel",
      "Iberia",
      "Iberien"
    ],
    "cca3": "ESP",
    "region": "Europe",
    "regionHint": {
      "en": "Southwestern Europe / Atlantic and Mediterranean",
      "de": "Südwesteuropa / Atlantik und Mittelmeer"
    },
    "clue": {
      "en": "A broad peninsula contains both coastal light chains and a very large inland cluster. Many smaller towns fill the dark interior.",
      "de": "Eine breite Halbinsel zeigt Lichterketten an der Küste und einen sehr großen Ballungsraum im Inland. Viele kleinere Städte liegen im dunklen Inneren."
    },
    "explanation": {
      "en": "This is the Iberian Peninsula. NASA identifies Madrid in the interior, Lisbon on the Atlantic coast, Seville near the Strait of Gibraltar, and networks of smaller Spanish and Portuguese towns. The photo may be rotated; north is not necessarily at the top.",
      "de": "Das ist die Iberische Halbinsel. NASA nennt Madrid im Landesinneren, Lissabon an der Atlantikküste, Sevilla nahe der Straße von Gibraltar sowie viele kleinere spanische und portugiesische Städte. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      40,
      -4
    ],
    "countryCodes": [
      "ESP",
      "PRT",
      "AND"
    ]
  },
  {
    "id": "po-valley",
    "kind": "region",
    "name": {
      "en": "Western Po Valley",
      "de": "Westliche Po-Ebene"
    },
    "aliases": [
      "Po Valley",
      "Po-Ebene",
      "Po River Valley",
      "Pianura Padana",
      "Po Ebene",
      "Western Po Valley",
      "Westliche Po-Ebene"
    ],
    "cca3": "ITA",
    "region": "Europe",
    "regionHint": {
      "en": "Southern Europe / northern Italy",
      "de": "Südeuropa / Norditalien"
    },
    "clue": {
      "en": "Find two large city clusters on a broad plain beside darker, snow-lit mountains; thin light strings lead into mountain valleys.",
      "de": "Suche zwei große Lichterfelder auf einer weiten Ebene neben dunkleren, im Mondlicht sichtbaren Bergen. Schmale Lichterketten führen in Gebirgstäler."
    },
    "explanation": {
      "en": "This photograph shows the western Po Valley, with Turin and Milan identified by NASA and the Alps to their north. It is the western portion of the region, not the entire Italian peninsula. The photo may be rotated; north is not necessarily at the top.",
      "de": "Die Aufnahme zeigt den westlichen Teil der Po-Ebene mit dem von NASA identifizierten Turin und Mailand sowie den Alpen nördlich davon. Sie zeigt nicht die gesamte italienische Halbinsel. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      45.15,
      8.6
    ]
  },
  {
    "id": "nile-delta",
    "kind": "region",
    "name": {
      "en": "Nile Delta",
      "de": "Nildelta"
    },
    "aliases": [
      "Nile Delta",
      "Nildelta",
      "Nil-Delta"
    ],
    "cca3": "EGY",
    "region": "Africa",
    "regionHint": {
      "en": "Northeastern Africa / Mediterranean coast",
      "de": "Nordöstliches Afrika / Mittelmeerküste"
    },
    "clue": {
      "en": "Look for a network of smaller settlements and branching waterways rather than just one central city.",
      "de": "Achte auf ein Netz kleinerer Siedlungen und verzweigter Wasserläufe statt auf nur ein Stadtzentrum."
    },
    "explanation": {
      "en": "This is the Nile Delta in Egypt. NASA identifies the delta’s waterways and surrounding cities; in wider photographs Cairo and Alexandria help locate this densely settled region. The photo may be rotated; north is not necessarily at the top.",
      "de": "Das ist das Nildelta in Ägypten. NASA identifiziert die Wasserläufe und umliegenden Städte. In weiteren Ansichten helfen Kairo und Alexandria, die dicht besiedelte Region zu erkennen. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      30.8,
      31
    ]
  },
  {
    "id": "korean-peninsula",
    "kind": "region",
    "name": {
      "en": "Korean Peninsula",
      "de": "Koreanische Halbinsel"
    },
    "aliases": [
      "Korean Peninsula",
      "Koreanische Halbinsel",
      "Korea peninsula",
      "Korea"
    ],
    "cca3": "KOR",
    "region": "Asia",
    "regionHint": {
      "en": "East Asia / peninsula",
      "de": "Ostasien / Halbinsel"
    },
    "clue": {
      "en": "A densely lit part of the peninsula contrasts sharply with a much darker neighboring land area. Do not mistake all that darkness for sea.",
      "de": "Ein dicht beleuchteter Teil der Halbinsel steht in starkem Kontrast zu einem dunkleren benachbarten Landgebiet. Nicht jede dunkle Fläche ist Meer."
    },
    "explanation": {
      "en": "NASA identifies the Korean Peninsula: South Korea’s dense lights contrast with much darker North Korea. Seoul is a major bright cluster, while Pyongyang is isolated farther north. Darkness alone does not prove that an area is ocean or uninhabited. The photo may be rotated; north is not necessarily at the top.",
      "de": "NASA identifiziert die Koreanische Halbinsel: Die dichten Lichter Südkoreas kontrastieren mit dem viel dunkleren Nordkorea. Seoul ist ein großes Lichterfeld, Pjöngjang liegt weiter nördlich. Dunkelheit bedeutet nicht automatisch Meer oder unbewohntes Land. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      38,
      127.5
    ],
    "countryCodes": [
      "KOR",
      "PRK"
    ]
  },
  {
    "id": "tokyo-osaka-corridor",
    "kind": "region",
    "name": {
      "en": "Tokyo–Osaka corridor",
      "de": "Tokio–Osaka-Korridor"
    },
    "aliases": [
      "Tokyo–Osaka corridor",
      "Tokio–Osaka-Korridor",
      "Tokyo-Osaka corridor",
      "Tokyo–Nagoya–Osaka",
      "Tokyo-Nagoya-Osaka",
      "Tokaido corridor",
      "Tokio-Osaka-Korridor"
    ],
    "cca3": "JPN",
    "region": "Asia",
    "regionHint": {
      "en": "East Asia / Japanese archipelago",
      "de": "Ostasien / japanischer Archipel"
    },
    "clue": {
      "en": "Several very large urban concentrations form a long coastal belt, separated by darker mountainous land and sea.",
      "de": "Mehrere sehr große Ballungsräume bilden einen langen Küstengürtel, unterbrochen von dunkleren Berggebieten und Meer."
    },
    "explanation": {
      "en": "NASA identifies the lights of Tokyo, Nagoya and Osaka in this view. The game groups them as the Tokyo–Osaka urban corridor, rather than choosing one of the smaller towns or treating the photograph as all of Japan. The photo may be rotated; north is not necessarily at the top.",
      "de": "NASA identifiziert in dieser Ansicht die Lichter von Tokio, Nagoya und Osaka. Das Spiel fasst sie zum Tokio–Osaka-Städtekorridor zusammen, statt eine kleine Nebenstadt oder ganz Japan als Antwort zu verlangen. Das Foto kann gedreht sein; Norden liegt nicht unbedingt oben."
    },
    "latlng": [
      35.2,
      137.3
    ],
    "overlaps": [
      "greater-tokyo"
    ]
  }
];
