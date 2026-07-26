import type { Appellation, Aroma, Grape, Localized, WineRegion } from "./types";

const L = (en: string, de: string): Localized => ({ en, de });
const grapeRows = [
  ["cabernet-sauvignon","Cabernet Sauvignon","warm/moderate","warm/gemäßigt","full body, high tannin, bright acidity","vollmundig, hohes Tannin, frische Säure","blackcurrant|cedar|mint","Bordeaux|Napa Valley","Thick skins and late ripening; commonly gives structured, age-worthy wines.","Dicke Schalen und späte Reife; ergibt häufig strukturierte, lagerfähige Weine."],
  ["merlot","Merlot","moderate/warm","gemäßigt/warm","medium-full body, supple tannin","mittel bis voll, geschmeidiges Tannin","plum|black cherry|chocolate","Bordeaux|Chile","Earlier ripening and often rounder than Cabernet Sauvignon.","Reift früher und wirkt häufig runder als Cabernet Sauvignon."],
  ["pinot-noir","Pinot Noir","cool/moderate","kühl/gemäßigt","light-medium body, high acidity, low tannin","leicht bis mittel, hohe Säure, wenig Tannin","red cherry|strawberry|forest floor","Burgundy|Central Otago","Thin-skinned and site-sensitive, with pale colour and fragrant red fruit.","Dünnschalig und lagenempfindlich, mit heller Farbe und duftiger roter Frucht."],
  ["syrah","Syrah","moderate/warm","gemäßigt/warm","medium-full body, medium-high tannin","mittel bis voll, mittleres bis hohes Tannin","blackberry|black pepper|violet","Northern Rhône|Barossa","Climate shifts its expression from peppery and savoury to rich dark fruit.","Das Klima verschiebt den Stil von pfeffrig-würzig zu üppiger dunkler Frucht."],
  ["grenache","Grenache","warm","warm","full body, high alcohol, moderate tannin","voll, hoher Alkohol, mittleres Tannin","strawberry|dried herbs|white pepper","Southern Rhône|Priorat","Heat-loving and drought-tolerant, often bringing red fruit and warmth to blends.","Wärmeliebend und trockenheitsfest; bringt oft rote Frucht und Wärme in Cuvées."],
  ["tempranillo","Tempranillo","moderate/warm","gemäßigt/warm","medium-full body, medium-high tannin","mittel bis voll, mittleres bis hohes Tannin","red plum|leather|dill","Rioja|Ribera del Duero","Early-ripening Iberian grape with a strong affinity for oak maturation.","Früh reifende iberische Sorte mit deutlicher Affinität zur Holzreife."],
  ["sangiovese","Sangiovese","warm","warm","medium body, high acidity, medium-high tannin","mittel, hohe Säure, mittleres bis hohes Tannin","sour cherry|tomato leaf|dried herbs","Chianti|Brunello","High acidity and savoury cherry character make it notably food-friendly.","Hohe Säure und würzige Kirschfrucht machen sie besonders speisenfreundlich."],
  ["nebbiolo","Nebbiolo","moderate","gemäßigt","pale colour, high acidity, very high tannin","helle Farbe, hohe Säure, sehr hohes Tannin","rose|tart cherry|tar","Barolo|Barbaresco","Late-ripening and deceptively pale, yet intensely tannic and age-worthy.","Spät reifend und täuschend hell, dabei intensiv tanninreich und lagerfähig."],
  ["malbec","Malbec","warm","warm","full body, medium acidity, high tannin","voll, mittlere Säure, hohes Tannin","black plum|violet|cocoa","Mendoza|Cahors","Altitude can retain freshness while intense sunlight supports deep colour.","Höhenlage kann Frische bewahren, während starke Sonne tiefe Farbe fördert."],
  ["carmenere","Carménère","warm","warm","full body, medium acidity and tannin","voll, mittlere Säure und mittleres Tannin","blackberry|green pepper|smoke","Central Valley|Colchagua","Late ripening; under-ripeness can emphasise leafy pyrazine notes.","Spät reifend; bei Unreife können grünblättrige Pyrazinnoten hervortreten."],
  ["zinfandel","Zinfandel","warm","warm","full body, high alcohol, moderate tannin","voll, hoher Alkohol, mittleres Tannin","blackberry jam|pepper|liquorice","California|Lodi","Uneven ripening can combine raisined richness with fresher berries.","Ungleichmäßige Reife kann Rosinenfülle mit frischeren Beeren verbinden."],
  ["gamay","Gamay","cool/moderate","kühl/gemäßigt","light body, high acidity, low tannin","leicht, hohe Säure, wenig Tannin","red cherry|violet|banana","Beaujolais|Loire","Naturally light and vivid; some methods enhance bright fruit and floral notes.","Natürlich leicht und lebhaft; manche Methoden betonen Frucht und florale Noten."],
  ["cabernet-franc","Cabernet Franc","cool/moderate","kühl/gemäßigt","medium body, high acidity, medium tannin","mittel, hohe Säure, mittleres Tannin","raspberry|violet|graphite","Loire|Bordeaux","Earlier ripening than Cabernet Sauvignon, often fragrant and herbal.","Reift früher als Cabernet Sauvignon und wirkt oft duftig und kräutrig."],
  ["chardonnay","Chardonnay","cool/warm","kühl/warm","medium-full body, medium-high acidity","mittel bis voll, mittlere bis hohe Säure","lemon|apple|butter","Burgundy|California","A versatile, relatively neutral canvas strongly shaped by site and cellar choices.","Vielseitige, relativ neutrale Sorte, stark von Herkunft und Ausbau geprägt."],
  ["sauvignon-blanc","Sauvignon Blanc","cool/moderate","kühl/gemäßigt","light-medium body, high acidity","leicht bis mittel, hohe Säure","gooseberry|grapefruit|fresh herbs","Loire|Marlborough","Naturally aromatic with marked acidity and often herbal or citrus-led character.","Von Natur aus aromatisch, mit markanter Säure und oft kräuteriger Zitrusprägung."],
  ["riesling","Riesling","cool/moderate","kühl/gemäßigt","light body, very high acidity","leicht, sehr hohe Säure","lime|white peach|petrol","Mosel|Clare Valley","High acidity and transparent site expression across dry to sweet styles.","Hohe Säure und klare Herkunftsprägung von trocken bis süß."],
  ["chenin-blanc","Chenin Blanc","cool/moderate","kühl/gemäßigt","light-full body, very high acidity","leicht bis voll, sehr hohe Säure","quince|apple|honey","Loire|Stellenbosch","High acidity underpins still, sparkling, dry and sweet expressions.","Hohe Säure trägt stille, schäumende, trockene und süße Stile."],
  ["gewurztraminer","Gewürztraminer","cool/moderate","kühl/gemäßigt","full body, low-medium acidity","voll, niedrige bis mittlere Säure","lychee|rose|ginger","Alsace|Alto Adige","Deeply aromatic, often rich in texture and comparatively low in acidity.","Intensiv aromatisch, oft füllig und vergleichsweise säurearm."],
  ["pinot-gris","Pinot Gris","cool/moderate","kühl/gemäßigt","medium-full body, medium acidity","mittel bis voll, mittlere Säure","pear|white peach|smoke","Alsace|Oregon","Can range from crisp and light to rich, textural and gently spicy.","Reicht von frisch und leicht bis füllig, texturiert und mild würzig."],
  ["viognier","Viognier","moderate/warm","gemäßigt/warm","full body, low-medium acidity","voll, niedrige bis mittlere Säure","apricot|peach|violet","Condrieu|South Australia","Perfumed and full-bodied, needing enough warmth for its signature stone fruit.","Duftig und vollmundig; benötigt genug Wärme für typische Steinfrucht."],
  ["albarino","Albariño","cool/moderate maritime","kühl/gemäßigt maritim","light-medium body, high acidity","leicht bis mittel, hohe Säure","lemon|peach|saline","Rías Baixas|Vinho Verde","Maritime freshness, citrus and stone fruit are commonly associated features.","Maritime Frische, Zitrus und Steinfrucht gelten als typische Merkmale."],
  ["gruner-veltliner","Grüner Veltliner","cool/moderate","kühl/gemäßigt","light-full body, high acidity","leicht bis voll, hohe Säure","green apple|white pepper|celery","Wachau|Kamptal","Frequently combines vivid acidity with citrus, orchard fruit and pepper.","Verbindet häufig lebendige Säure mit Zitrus, Kernobst und Pfeffer."],
  ["semillon","Sémillon","moderate/warm","gemäßigt/warm","medium-full body, medium acidity","mittel bis voll, mittlere Säure","lemon wax|fig|toast","Bordeaux|Hunter Valley","Can age from restrained citrus into waxy, toasty complexity.","Kann von zurückhaltender Zitrusfrucht zu wachsiger, toastiger Komplexität reifen."],
  ["moscato","Muscat","warm/moderate","warm/gemäßigt","light-medium body, low-medium acidity","leicht bis mittel, niedrige bis mittlere Säure","grape|orange blossom|peach","Asti|Alsace","One of the few grapes whose wines can smell distinctly of fresh grapes.","Eine der wenigen Sorten, deren Weine deutlich nach frischen Trauben duften können."],
  ["furmint","Furmint","cool/moderate","kühl/gemäßigt","light-full body, very high acidity","leicht bis voll, sehr hohe Säure","green apple|quince|smoke","Tokaj|Somló","High acidity supports both taut dry wines and long-lived sweet styles.","Hohe Säure trägt straffe trockene und langlebige süße Stile."],
  ["touriga-nacional","Touriga Nacional","warm","warm","full body, high tannin","voll, hohes Tannin","black fruit|violet|bergamot","Douro|Dão","Small berries give colour, tannin and perfume in dry and fortified wines.","Kleine Beeren liefern Farbe, Tannin und Duft in trockenen und aufgespriteten Weinen."],
  ["corvina","Corvina","moderate/warm","gemäßigt/warm","medium body, high acidity, moderate tannin","mittel, hohe Säure, mittleres Tannin","sour cherry|dried herbs|almond","Valpolicella|Amarone","Naturally bright acidity; drying grapes can create richer, concentrated styles.","Natürlich frische Säure; Traubentrocknung kann reiche, konzentrierte Stile erzeugen."],
  ["assyrtiko","Assyrtiko","warm maritime","warm maritim","medium body, very high acidity","mittel, sehr hohe Säure","lemon|salt|smoke","Santorini|Macedonia","Retains striking acidity in heat and is often associated with saline mineral notes.","Bewahrt in Hitze markante Säure und wird oft mit salzig-mineralischen Noten verbunden."],
  ["pinotage","Pinotage","warm","warm","full body, medium-high tannin","voll, mittleres bis hohes Tannin","black plum|smoke|rooibos","Stellenbosch|Swartland","South African crossing capable of juicy fruit or dense, smoky styles.","Südafrikanische Kreuzung für saftige Frucht oder dichte, rauchige Stile."],
  ["prosecco-glera","Glera","moderate","gemäßigt","light body, high acidity","leicht, hohe Säure","pear|apple|white flowers","Prosecco|Veneto","Delicate orchard fruit suits fresh sparkling styles made to retain aroma.","Zarte Kernobstfrucht passt zu frischen Schaumweinstilen mit Aromenerhalt."],
] as const;

export const GRAPES: Grape[] = grapeRows.map((r) => ({
  id:r[0], name:r[1], climate:L(r[2],r[3]), structure:L(r[4],r[5]), aromas:r[6].split("|"),
  synonyms: r[0] === "syrah" ? ["Shiraz"] : r[0] === "zinfandel" ? ["Primitivo"] : r[0] === "pinot-gris" ? ["Pinot Grigio"] : r[0] === "moscato" ? ["Muscat"] : [],
  regions:r[7].split("|"), clue:L(r[8],r[9]),
}));

const regionRows = [
 ["bordeaux","France","Frankreich","Bordeaux",44.84,-0.58,"maritime, moderate","maritim, gemäßigt","cabernet-sauvignon|merlot|cabernet-franc"],
 ["burgundy","France","Frankreich","Burgundy","Burgund",47.05,4.38,"cool continental","kühl kontinental","pinot-noir|chardonnay"],
 ["champagne","France","Frankreich","Champagne",49.05,3.95,"cool continental","kühl kontinental","chardonnay|pinot-noir"],
 ["loire","France","Frankreich","Loire Valley","Loiretal",47.25,0.2,"cool maritime to continental","kühl maritim bis kontinental","sauvignon-blanc|chenin-blanc|cabernet-franc"],
 ["rhone","France","Frankreich","Rhône Valley","Rhônetal",44.4,4.75,"continental to Mediterranean","kontinental bis mediterran","syrah|grenache|viognier"],
 ["alsace","France","Frankreich","Alsace","Elsass",48.2,7.35,"dry continental","trocken kontinental","riesling|gewurztraminer|pinot-gris"],
 ["rioja","Spain","Spanien","Rioja",42.46,-2.45,"continental with Atlantic influence","kontinental mit Atlantikeinfluss","tempranillo|grenache"],
 ["ribera","Spain","Spanien","Ribera del Duero",41.65,-3.7,"high continental","hochgelegen kontinental","tempranillo"],
 ["rias-baixas","Spain","Spanien","Rías Baixas",42.35,-8.55,"cool maritime","kühl maritim","albarino"],
 ["priorat","Spain","Spanien","Priorat",41.15,0.85,"warm Mediterranean","warm mediterran","grenache"],
 ["mosel","Germany","Deutschland","Mosel",49.95,7.0,"cool continental, steep slopes","kühl kontinental, steile Hänge","riesling"],
 ["rheingau","Germany","Deutschland","Rheingau",50.0,8.0,"cool continental","kühl kontinental","riesling"],
 ["wachau","Austria","Österreich","Wachau",48.38,15.43,"cool continental","kühl kontinental","gruner-veltliner|riesling"],
 ["kamptal","Austria","Österreich","Kamptal",48.48,15.68,"cool continental","kühl kontinental","gruner-veltliner|riesling"],
 ["piedmont","Italy","Italien","Piedmont","Piemont",44.7,7.95,"moderate continental","gemäßigt kontinental","nebbiolo"],
 ["tuscany","Italy","Italien","Tuscany","Toskana",43.3,11.2,"warm Mediterranean","warm mediterran","sangiovese"],
 ["veneto","Italy","Italien","Veneto",45.45,11.0,"moderate continental","gemäßigt kontinental","corvina|prosecco-glera"],
 ["douoro","Portugal","Portugal","Douro",41.15,-7.7,"hot continental","heiß kontinental","touriga-nacional"],
 ["vinho-verde","Portugal","Portugal","Vinho Verde",41.7,-8.4,"cool maritime","kühl maritim","albarino"],
 ["tokaj","Hungary","Ungarn","Tokaj",48.12,21.4,"moderate continental","gemäßigt kontinental","furmint"],
 ["santorini","Greece","Griechenland","Santorini",36.4,25.43,"hot, windy maritime","heiß, windig maritim","assyrtiko"],
 ["napa","United States","USA","Napa Valley",38.5,-122.3,"warm Mediterranean","warm mediterran","cabernet-sauvignon|chardonnay"],
 ["willamette","United States","USA","Willamette Valley",45.2,-123.1,"cool maritime","kühl maritim","pinot-noir"],
 ["mendoza","Argentina","Argentinien","Mendoza",-33.0,-68.85,"dry, high altitude continental","trocken, hochgelegen kontinental","malbec"],
 ["colchagua","Chile","Chile","Colchagua Valley",-34.64,-71.2,"warm Mediterranean","warm mediterran","carmenere|cabernet-sauvignon"],
 ["maipo","Chile","Chile","Maipo Valley",-33.7,-70.7,"warm Mediterranean","warm mediterran","cabernet-sauvignon"],
 ["barossa","Australia","Australien","Barossa Valley",-34.5,139.0,"warm Mediterranean","warm mediterran","syrah"],
 ["clare","Australia","Australien","Clare Valley",-33.85,138.6,"warm with cool nights","warm mit kühlen Nächten","riesling"],
 ["hunter","Australia","Australien","Hunter Valley",-32.75,151.3,"warm humid","warm und feucht","semillon|syrah"],
 ["marlborough","New Zealand","Neuseeland","Marlborough",-41.5,173.9,"cool sunny maritime","kühl, sonnig maritim","sauvignon-blanc"],
 ["central-otago","New Zealand","Neuseeland","Central Otago",-45.0,169.2,"cool continental","kühl kontinental","pinot-noir"],
 ["stellenbosch","South Africa","Südafrika","Stellenbosch",-33.93,18.86,"warm maritime","warm maritim","chenin-blanc|pinotage"],
 ["swartland","South Africa","Südafrika","Swartland",-33.3,18.75,"warm dry Mediterranean","warm, trocken mediterran","pinotage|chenin-blanc"],
 ["okanagan","Canada","Kanada","Okanagan Valley",49.5,-119.6,"cool continental","kühl kontinental","riesling|pinot-noir"],
 ["niagara","Canada","Kanada","Niagara Peninsula",43.15,-79.2,"cool continental","kühl kontinental","riesling|cabernet-franc"],
] as const;

export const REGIONS: WineRegion[] = regionRows.map((r) => ({id:r[0], country:L(r[1],r[2]), name:L(r[3],r.length===9?r[3]:r[4] as string), lat:Number(r[r.length-4]), lng:Number(r[r.length-3]), climate:L(r[r.length-2] as string,r[r.length-1] as string), grapes:(r[r.length-1] as string).includes("|")?(r[r.length-1] as string).split("|"):[] }));

// Explicit mapping avoids ambiguity in compact region rows.
for (let i=0;i<REGIONS.length;i++) {
  const r = regionRows[i];
  const hasTranslatedName = typeof r[4] === "string";
  REGIONS[i] = {
    id:r[0], country:L(r[1],r[2]), name:L(r[3], hasTranslatedName ? String(r[4]) : r[3]),
    lat:Number(r[hasTranslatedName?5:4]), lng:Number(r[hasTranslatedName?6:5]),
    climate:L(String(r[hasTranslatedName?7:6]),String(r[hasTranslatedName?8:7])),
    grapes:String(r[hasTranslatedName?9:8]).split("|"),
  };
}

const appellationRows = [
 ["medoc","bordeaux","Médoc","regional AOC","regionale AOC","Cabernet-led red"],
 ["pauillac","bordeaux","Pauillac","communal AOC","kommunale AOC","structured Cabernet-led red"],
 ["saint-emilion","bordeaux","Saint-Émilion","communal AOC","kommunale AOC","Merlot-led red"],
 ["chablis","burgundy","Chablis","regional AOC","regionale AOC","taut Chardonnay"],
 ["meursault","burgundy","Meursault","village AOC","Village-AOC","textural Chardonnay"],
 ["gevrey","burgundy","Gevrey-Chambertin","village AOC","Village-AOC","structured Pinot Noir"],
 ["champagne-aoc","champagne","Champagne","AOC","AOC","traditional-method sparkling"],
 ["sancerre","loire","Sancerre","AOC","AOC","high-acid Sauvignon Blanc"],
 ["vouvray","loire","Vouvray","AOC","AOC","Chenin Blanc, dry to sweet"],
 ["chinon","loire","Chinon","AOC","AOC","Cabernet Franc red"],
 ["cote-rotie","rhone","Côte-Rôtie","AOC","AOC","Syrah red"],
 ["condrieu","rhone","Condrieu","AOC","AOC","aromatic Viognier"],
 ["chateauneuf","rhone","Châteauneuf-du-Pape","AOC","AOC","warm-climate red blend"],
 ["alsace-aoc","alsace","Alsace","AOC","AOC","aromatic varietal whites"],
 ["rioja-doca","rioja","Rioja","DOCa","DOCa","Tempranillo-led red"],
 ["rioja-alta","rioja","Rioja Alta","zone","Zone","fresh, age-worthy red"],
 ["ribera-do","ribera","Ribera del Duero","DO","DO","structured Tempranillo"],
 ["rias-do","rias-baixas","Rías Baixas","DO","DO","fresh Albariño"],
 ["priorat-doq","priorat","Priorat","DOQ","DOQ","concentrated Garnacha blend"],
 ["mosel-gga","mosel","Mosel","Anbaugebiet","Anbaugebiet","high-acid Riesling"],
 ["rheingau-gga","rheingau","Rheingau","Anbaugebiet","Anbaugebiet","structured Riesling"],
 ["wachau-dac","wachau","Wachau DAC","DAC","DAC","dry Grüner Veltliner or Riesling"],
 ["kamptal-dac","kamptal","Kamptal DAC","DAC","DAC","dry Grüner Veltliner or Riesling"],
 ["barolo","piedmont","Barolo","DOCG","DOCG","powerful Nebbiolo"],
 ["barbaresco","piedmont","Barbaresco","DOCG","DOCG","fragrant Nebbiolo"],
 ["chianti-classico","tuscany","Chianti Classico","DOCG","DOCG","Sangiovese-led red"],
 ["brunello","tuscany","Brunello di Montalcino","DOCG","DOCG","age-worthy Sangiovese"],
 ["valpolicella","veneto","Valpolicella","DOC","DOC","bright Corvina blend"],
 ["amarone","veneto","Amarone della Valpolicella","DOCG","DOCG","dry, rich dried-grape red"],
 ["prosecco-doc","veneto","Prosecco","DOC","DOC","fresh sparkling Glera"],
 ["douro-doc","douoro","Douro","DOC","DOC","dry or fortified blends"],
 ["vinho-verde-doc","vinho-verde","Vinho Verde","DOC","DOC","light, fresh whites"],
 ["tokaj-pdo","tokaj","Tokaj","PDO","g.U.","dry or botrytised Furmint"],
 ["santorini-pdo","santorini","Santorini","PDO","g.U.","high-acid Assyrtiko"],
 ["napa-ava","napa","Napa Valley","AVA","AVA","ripe Cabernet Sauvignon"],
 ["oakville-ava","napa","Oakville","AVA","AVA","structured Cabernet Sauvignon"],
 ["willamette-ava","willamette","Willamette Valley","AVA","AVA","cool-climate Pinot Noir"],
 ["mendoza-gi","mendoza","Mendoza","GI","GI","high-altitude Malbec"],
 ["uco-gi","mendoza","Valle de Uco","GI","GI","fresh high-altitude Malbec"],
 ["colchagua-do","colchagua","Valle de Colchagua","DO","DO","ripe Carménère"],
 ["barossa-gi","barossa","Barossa Valley","GI","GI","rich Shiraz"],
 ["clare-gi","clare","Clare Valley","GI","GI","dry lime-led Riesling"],
 ["marlborough-gi","marlborough","Marlborough","GI","GI","aromatic Sauvignon Blanc"],
 ["stellenbosch-wo","stellenbosch","Stellenbosch","WO","WO","structured reds and Chenin"],
 ["niagara-vqa","niagara","Niagara Peninsula","VQA","VQA","cool-climate still and icewine"],
] as const;
export const APPELLATIONS: Appellation[] = appellationRows.map((r) => ({
  id:r[0], regionId:r[1], country:REGIONS.find(x=>x.id===r[1])!.country, name:r[2],
  level:L(r[3],r[4]), style:L(r[5],r[5]), source:"official-register", reviewed:"2026-07",
}));

const aromaNames = [
 ["blackcurrant","Cassis"],["black-cherry","Schwarzkirsche"],["red-cherry","Sauerkirsche"],["strawberry","Erdbeere"],["raspberry","Himbeere"],["plum","Pflaume"],["blackberry","Brombeere"],["lemon","Zitrone"],["lime","Limette"],["grapefruit","Grapefruit"],["green-apple","Grüner Apfel"],["pear","Birne"],["quince","Quitte"],["peach","Pfirsich"],["apricot","Aprikose"],["lychee","Litschi"],["gooseberry","Stachelbeere"],["fig","Feige"],["violet","Veilchen"],["rose","Rose"],["orange-blossom","Orangenblüte"],["white-flowers","Weiße Blüten"],["mint","Minze"],["fresh-herbs","Frische Kräuter"],["dried-herbs","Getrocknete Kräuter"],["tomato-leaf","Tomatenblatt"],["green-pepper","Grüne Paprika"],["black-pepper","Schwarzer Pfeffer"],["white-pepper","Weißer Pfeffer"],["liquorice","Lakritz"],
 ["banana","Banane"],["bubblegum","Fruchtgummi"],["butter","Butter"],["cream","Sahne"],["yoghurt","Joghurt"],["bread-dough","Brotteig"],["brioche","Brioche"],["toast","Toast"],["vanilla","Vanille"],["coconut","Kokos"],["dill","Dill"],["smoke","Rauch"],["clove","Gewürznelke"],["coffee","Kaffee"],["chocolate","Schokolade"],
 ["cedar","Zedernholz"],["leather","Leder"],["tobacco","Tabak"],["forest-floor","Waldboden"],["mushroom","Pilz"],["honey","Honig"],["petrol","Petrol"],["wax","Wachs"],["almond","Mandel"],["walnut","Walnuss"],["dried-fruit","Trockenfrucht"],["caramel","Karamell"],["truffle","Trüffel"],["earth","Erde"],["game","Wild"],
] as const;
export const AROMAS: Aroma[] = aromaNames.map((r,i) => ({
 id:r[0], name:L(r[0].split("-").map(w=>w[0].toUpperCase()+w.slice(1)).join(" "),r[1]),
 family:i<30?"primary":i<45?"winemaking":"maturation",
 grapeIds:GRAPES.filter(g=>g.aromas.some(a=>a.toLowerCase().includes(r[0].split("-")[0]))).map(g=>g.id).slice(0,4),
 note:L(i<30?"Commonly grape- or site-linked; context still matters.":i<45?"Often associated with fermentation or maturation choices.":"Can emerge with bottle or wood maturation.",i<30?"Häufig mit Rebe oder Lage verbunden; Kontext bleibt entscheidend.":i<45?"Oft mit Gärung oder Ausbau verbunden.":"Kann durch Flaschen- oder Holzreife entstehen."),
}));

export const PAIRINGS = [
 {id:"oysters",dish:L("Oysters with lemon","Austern mit Zitrone"),a:L("crisp, light Muscadet","knackiger, leichter Muscadet"),b:L("oak-heavy red","holzbetonter Rotwein"),answer:"a",principleId:"refresh",principle:L("Acidity and low weight refresh a saline dish","Säure und geringes Gewicht erfrischen ein salziges Gericht"),modifier:L("The oysters are now grilled with smoky butter.","Die Austern werden nun mit rauchiger Butter gegrillt."),modifierAnswer:"a",why:L("Salinity and high acidity refresh the palate; the richer preparation makes a fuller white defensible, but the tannic red still dominates.","Salzigkeit und hohe Säure erfrischen; zur reicheren Zubereitung wäre ein vollerer Weißwein plausibel, der tanninreiche Rotwein dominiert dennoch."),modifierWhy:L("Texture may increase, but high acidity still resets the butter and the dish remains delicate.","Die Textur nimmt zu, doch hohe Säure fängt die Butter auf und das Gericht bleibt delikat.")},
 {id:"blue-cheese",dish:L("Blue cheese","Blauschimmelkäse"),a:L("sweet, high-acid Riesling","süßer Riesling mit hoher Säure"),b:L("dry, tannic red","trockener, tanninreicher Rotwein"),answer:"a",principleId:"contrast",principle:L("Sweetness contrasts salt; acidity cuts richness","Süße kontrastiert Salz; Säure durchschneidet Fülle"),modifier:L("Serve it with a very sweet fig conserve.","Dazu kommt eine sehr süße Feigenkonfitüre."),modifierAnswer:"b",why:L("Sweetness balances salt while acidity cuts richness.","Süße balanciert Salz, während Säure die Fülle auffängt."),modifierWhy:L("The preserve can make the sweet wine feel flatter; the less sweet option becomes more balanced, although tannin remains a risk.","Die Konfitüre kann den süßen Wein flacher wirken lassen; die weniger süße Option wird ausgewogener, auch wenn Tannin ein Risiko bleibt.")},
 {id:"thai-curry",dish:L("Spicy Thai curry","Scharfes Thai-Curry"),a:L("off-dry, low-alcohol white","feinherber Weißwein mit wenig Alkohol"),b:L("high-alcohol Shiraz","alkoholreicher Shiraz"),answer:"a",principleId:"heat",principle:L("Low alcohol and some sweetness soften heat","Wenig Alkohol und etwas Süße mildern Schärfe"),modifier:L("The kitchen removes the chilli and adds roasted beef.","Die Küche lässt Chili weg und ergänzt Rindfleisch."),modifierAnswer:"b",why:L("Moderate alcohol and a little sweetness calm heat instead of amplifying it.","Moderater Alkohol und etwas Süße beruhigen Schärfe, statt sie zu verstärken."),modifierWhy:L("Without chilli and with more protein and intensity, the structured red gains a better role.","Ohne Chili und mit mehr Protein und Intensität passt der strukturierte Rotwein besser.")},
 {id:"steak",dish:L("Grilled steak","Gegrilltes Steak"),a:L("structured Cabernet Sauvignon","strukturierter Cabernet Sauvignon"),b:L("delicate Moscato","delikater Moscato"),answer:"a",principleId:"intensity",principle:L("Match intensity; protein can soften tannin","Intensität angleichen; Protein kann Tannin mildern"),modifier:L("Replace the steak with a chilled herb salad.","Das Steak wird durch einen gekühlten Kräutersalat ersetzt."),modifierAnswer:"b",why:L("Protein softens tannin and the wine has enough body for the dish.","Protein mildert Tannin und der Wein hat genug Körper für das Gericht."),modifierWhy:L("The lighter, aromatic dish needs delicacy rather than tannin and weight.","Das leichte, aromatische Gericht braucht Feinheit statt Tannin und Gewicht.")},
 {id:"goat-cheese",dish:L("Fresh goat cheese and herbs","Frischer Ziegenkäse mit Kräutern"),a:L("high-acid Sauvignon Blanc","Sauvignon Blanc mit hoher Säure"),b:L("rich Amarone","reicher Amarone"),answer:"a",principleId:"bridge",principle:L("Echo acidity and herbal flavours","Säure und Kräuteraromen spiegeln"),modifier:L("Bake the cheese with dark fruit and walnuts.","Der Käse wird mit dunkler Frucht und Walnüssen gebacken."),modifierAnswer:"b",why:L("Matched acidity and herbal freshness make a focused bridge.","Passende Säure und Kräuterfrische bilden eine klare Brücke."),modifierWhy:L("Baking, fruit and nuts raise sweetness, richness and intensity enough for the richer wine.","Backen, Frucht und Nüsse erhöhen Süße, Fülle und Intensität zugunsten des reicheren Weins.")},
 {id:"mushroom",dish:L("Mushroom risotto","Pilzrisotto"),a:L("mature Pinot Noir","gereifter Pinot Noir"),b:L("young Muscat","junger Muscat"),answer:"a",principleId:"echo",principle:L("Echo savoury, earthy maturation notes","Würzige, erdige Reifearomen spiegeln"),modifier:L("Add lemon zest and turn it into a light mushroom salad.","Zitronenzeste macht daraus einen leichten Pilzsalat."),modifierAnswer:"b",why:L("Earthy maturation notes echo mushrooms without overwhelming them.","Erdige Reifearomen greifen Pilze auf, ohne sie zu dominieren."),modifierWhy:L("The fresher, citrus-led preparation makes aromatic lift more useful than mature earthiness.","Die frischere, zitrische Zubereitung profitiert stärker von aromatischem Auftrieb als von Reifearomen.")},
 {id:"fried-fish",dish:L("Fried fish","Frittierter Fisch"),a:L("brut sparkling wine","Brut-Schaumwein"),b:L("tannic red","tanninreicher Rotwein"),answer:"a",principleId:"refresh",principle:L("Acidity and bubbles reset fried richness","Säure und Perlage fangen Frittiertes auf"),modifier:L("Serve the fish with a sweet, smoky barbecue glaze.","Der Fisch kommt mit süßer, rauchiger Barbecue-Glasur."),modifierAnswer:"a",why:L("Bubbles and acidity cleanse fat; tannin can turn metallic with fish.","Perlage und Säure reinigen von Fett; Tannin kann mit Fisch metallisch wirken."),modifierWhy:L("The glaze adds intensity, but freshness and low tannin remain safer with fish.","Die Glasur bringt Intensität, doch Frische und wenig Tannin bleiben zu Fisch sicherer.")},
 {id:"tomato-pasta",dish:L("Tomato and basil pasta","Tomaten-Basilikum-Pasta"),a:L("high-acid Sangiovese","Sangiovese mit hoher Säure"),b:L("soft low-acid red","weicher Rotwein mit wenig Säure"),answer:"a",principleId:"acid-match",principle:L("Match the food's acidity","Säure des Gerichts angleichen"),modifier:L("Replace tomato with a cream and truffle sauce.","Tomate wird durch Sahne-Trüffel-Sauce ersetzt."),modifierAnswer:"b",why:L("Wine with enough acidity stays vivid beside tomato rather than tasting flat.","Wein mit genug Säure bleibt neben Tomate lebendig, statt flach zu wirken."),modifierWhy:L("The sauce loses its acid driver and gains texture; a softer profile becomes more comfortable.","Die Sauce verliert ihren Säuretreiber und gewinnt Textur; ein weicheres Profil wird stimmiger.")},
 {id:"lemon-tart",dish:L("Lemon tart","Zitronentarte"),a:L("sweet wine with vivid acidity","Süßwein mit lebendiger Säure"),b:L("bone-dry sparkling wine","knochentrockener Schaumwein"),answer:"a",principleId:"sweetness",principle:L("Wine should be at least as sweet as dessert","Wein sollte mindestens so süß sein wie das Dessert"),modifier:L("Turn it into a barely sweet lemon granita.","Daraus wird eine kaum süße Zitronen-Granita."),modifierAnswer:"b",why:L("Sufficient sweetness prevents the wine tasting sour while acidity mirrors the lemon.","Genug Süße verhindert einen sauren Eindruck, während Säure die Zitrone spiegelt."),modifierWhy:L("With much less sugar, the dry sparkling wine can now refresh without appearing severe.","Mit deutlich weniger Zucker kann der trockene Schaumwein erfrischen, ohne streng zu wirken.")},
 {id:"duck-cherry",dish:L("Roast duck with cherry sauce","Entenbraten mit Kirschsauce"),a:L("fruit-led Pinot Noir","fruchtbetonter Pinot Noir"),b:L("very oaky Chardonnay","stark holzbetonter Chardonnay"),answer:"a",principleId:"bridge",principle:L("Bridge fruit while matching medium intensity","Frucht spiegeln und mittlere Intensität treffen"),modifier:L("Remove the sauce and serve a buttery pastry-wrapped breast.","Die Sauce entfällt; die Brust kommt im buttrigen Teigmantel."),modifierAnswer:"b",why:L("Red-fruit character bridges the sauce and moderate tannin respects the duck.","Rote Frucht verbindet sich mit der Sauce, moderates Tannin respektiert die Ente."),modifierWhy:L("Butter and pastry create a stronger texture bridge for the broad white wine.","Butter und Teig bilden eine stärkere Texturbrücke zum breiten Weißwein.")},
 {id:"asparagus",dish:L("Asparagus with green herbs","Spargel mit grünen Kräutern"),a:L("herbal Sauvignon Blanc","kräuteriger Sauvignon Blanc"),b:L("high-tannin Nebbiolo","tanninreicher Nebbiolo"),answer:"a",principleId:"bridge",principle:L("Bridge green aromas and keep tannin low","Grüne Aromen spiegeln und Tannin niedrig halten"),modifier:L("Char the asparagus and add slow-cooked beef cheek.","Spargel wird angekohlt und mit geschmorter Rinderbacke ergänzt."),modifierAnswer:"b",why:L("A herbal, high-acid white follows the green flavours without imposing tannin.","Ein kräuteriger, säurereicher Weißwein folgt grünen Aromen ohne Tannin aufzudrängen."),modifierWhy:L("Char and braised beef radically increase intensity and protein, giving the structured red a role.","Röstaromen und geschmortes Rind erhöhen Intensität und Protein stark und geben dem Rotwein eine Rolle.")},
 {id:"sushi",dish:L("Delicate sushi assortment","Feine Sushi-Auswahl"),a:L("light, dry high-acid white","leichter, trockener Weißwein mit hoher Säure"),b:L("powerful high-alcohol red","kraftvoller, alkoholreicher Rotwein"),answer:"a",principleId:"delicacy",principle:L("Respect delicacy and avoid tannin with raw fish","Feinheit respektieren und Tannin zu rohem Fisch meiden"),modifier:L("Change the plate to grilled eel with a sweet soy glaze.","Der Teller wird zu gegrilltem Aal mit süßer Sojaglasur."),modifierAnswer:"a",why:L("Low weight and high acidity preserve detail; the red overwhelms and risks a metallic clash.","Geringes Gewicht und hohe Säure bewahren Details; der Rotwein überwältigt und riskiert einen metallischen Eindruck."),modifierWhy:L("The dish grows richer, but sweetness, fish and soy still make the low-tannin choice more defensible.","Das Gericht wird reicher, doch Süße, Fisch und Soja sprechen weiter für die tanninarme Wahl.")},
] as const;

export const DILEMMAS = Array.from({length:25},(_,i)=>({
 id:`dilemma-${i+1}`,
 setup:L(`A ${i%2?"cool":"warm"} vintage is approaching harvest. Your aim is a ${i%3===0?"fresh":"textural"} wine.`,`Ein ${i%2?"kühler":"warmer"} Jahrgang nähert sich der Lese. Ziel ist ein ${i%3===0?"frischer":"texturierter"} Wein.`),
 choices:[
  {id:"early",label:L("Harvest earlier","Früher lesen"),effect:L("More acidity and less potential alcohol; flavours may be less developed.","Mehr Säure und weniger potenzieller Alkohol; Aromen eventuell weniger reif."),delta:{freshness:2,body:-1}},
  {id:"later",label:L("Wait for fuller ripeness","Auf mehr Reife warten"),effect:L("Riper fruit and more body, with a risk of losing freshness.","Reifere Frucht und mehr Körper, mit Risiko sinkender Frische."),delta:{freshness:-1,body:2}},
  {id:"split",label:L("Harvest in two passes","In zwei Durchgängen lesen"),effect:L("A broader blending palette, at the cost of extra work.","Mehr Optionen für die Cuvée, aber höherer Aufwand."),delta:{freshness:1,body:1}},
 ]}));

export const CELLAR_BRIEFS = Array.from({length:25},(_,i)=>({
 id:`cellar-${i+1}`,budget:60+(i%5)*15,
 title:L(`Cellar brief ${i+1}`,`Keller-Briefing ${i+1}`),
 needs:i%2===0?["sparkling","white","red"]:["white","red","sweet"],
}));

export const CELLAR_BOTTLES = [
 ["brut","Crémant Brut","sparkling",22],["riesling","Dry Riesling","white",18],["chardonnay","Textural Chardonnay","white",28],
 ["pinot","Cool-climate Pinot Noir","red",31],["cabernet","Structured Cabernet","red",29],["moscato","Moscato d'Asti","sweet",16],
 ["rose","Dry Mediterranean Rosé","rosé",17],["port","Late-bottled fortified red","fortified",24],
].map(([id,name,category,price])=>({id:String(id),name:String(name),category:String(category),price:Number(price)}));

export const SOURCES = [
 {label:"EU eAmbrosia",url:"https://webgate.ec.europa.eu/eambrosia-api/"},
 {label:"OIV varietal descriptions",url:"https://www.oiv.int/index.php/node/3273"},
 {label:"OIV labelling standards",url:"https://www.oiv.int/node/2668"},
 {label:"Wine Australia education",url:"https://www.wineaustralia.com/education"},
];

export const EXAM_PROMPTS = [
 ...GRAPES.flatMap((g)=>[
  {id:`exam-grape-${g.id}`,competency:"grapes",prompt:L(`Identify the grape from this profile: ${g.clue.en}`,`Erkenne die Rebsorte an diesem Profil: ${g.clue.de}`)},
  {id:`exam-terroir-${g.id}`,competency:"terroir",prompt:L(`How could ${g.climate.en} conditions shape ${g.name}?`,`Wie könnten ${g.climate.de}e Bedingungen ${g.name} prägen?`)},
 ]),
 ...REGIONS.map((r)=>({id:`exam-map-${r.id}`,competency:"geography",prompt:L(`Locate and contextualise ${r.name.en}.`,`Verorte ${r.name.de} und ordne die Region ein.`)})),
 ...APPELLATIONS.map((a)=>({id:`exam-label-${a.id}`,competency:"theory",prompt:L(`Decode the synthetic label term ${a.name}.`,`Entschlüssele den fiktiv verwendeten Etikettenbegriff ${a.name}.`)})),
 ...AROMAS.map((a)=>({id:`exam-sensory-${a.id}`,competency:"sensory",prompt:L(`Classify ${a.name.en} by its most defensible aroma origin.`,`Ordne ${a.name.de} seiner plausibelsten Aromenherkunft zu.`)})),
 ...PAIRINGS.map((p)=>({id:`exam-pairing-${p.id}`,competency:"pairing",prompt:L(`Defend a pairing for ${p.dish.en}.`,`Begründe ein Pairing zu ${p.dish.de}.`)})),
 ...DILEMMAS.map((d)=>({id:`exam-production-${d.id}`,competency:"production",prompt:L(`Assess this production decision: ${d.setup.en}`,`Bewerte diese Produktionsentscheidung: ${d.setup.de}`)})),
 ...CELLAR_BRIEFS.map((b)=>({id:`exam-service-${b.id}`,competency:"service",prompt:L(`Build a balanced service selection under €${b.budget}.`,`Baue eine ausgewogene Service-Auswahl unter €${b.budget}.`)})),
];
