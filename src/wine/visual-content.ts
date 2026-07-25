import type { Localized } from "./types";

const L=(en:string,de:string):Localized=>({en,de});

export type AromaWheelFamilyId="fruit"|"floral"|"herbal-spice"|"earth"|"winemaking"|"maturation";
export const AROMA_WHEEL_FAMILIES:{id:AromaWheelFamilyId;label:Localized;tokens:string[]}[]=[
 {id:"fruit",label:L("Fruit & citrus","Frucht & Zitrus"),tokens:["blackcurrant","black cherry","red cherry","tart cherry","sour cherry","strawberry","raspberry","plum","red plum","black plum","blackberry","blackberry jam","black fruit","lemon","lime","grapefruit","apple","green apple","pear","quince","peach","white peach","apricot","lychee","gooseberry","fig","grape"]},
 {id:"floral",label:L("Floral","Floral"),tokens:["violet","rose","orange blossom","white flowers"]},
 {id:"herbal-spice",label:L("Herbal & spice","Kräuter & Gewürze"),tokens:["mint","black pepper","white pepper","pepper","dried herbs","fresh herbs","tomato leaf","green pepper","liquorice","ginger","celery","bergamot","rooibos"]},
 {id:"earth",label:L("Earth & mineral association","Erdige & mineralische Assoziation"),tokens:["graphite","salt","saline"]},
 {id:"winemaking",label:L("Winemaking","Ausbau"),tokens:["butter","toast","smoke","dill","cocoa","chocolate","banana"]},
 {id:"maturation",label:L("Maturation","Reife"),tokens:["cedar","forest floor","leather","tar","petrol","honey","lemon wax","wax","almond"]},
];
export const aromaWheelFamily=(token:string)=>AROMA_WHEEL_FAMILIES.find(f=>f.tokens.includes(token))?.id??"fruit";

export interface SameGrapePair {
 id:string;grapeId:string;regionAId:string;regionBId:string;
 tendencies:{id:string;target:"a"|"b";label:Localized;rationale:Localized}[];
}
export const SAME_GRAPE_PAIRS:SameGrapePair[]=[
 {id:"riesling-mosel-clare",grapeId:"riesling",regionAId:"mosel",regionBId:"clare",tendencies:[
  {id:"lighter",target:"a",label:L("Lighter-bodied tendency","Tendenziell leichter"),rationale:L("Mosel's cooler conditions commonly support a lighter frame.","Das kühlere Moselklima begünstigt häufig einen leichteren Rahmen.")},
  {id:"delicate-fruit",target:"a",label:L("More delicate fruit expression","Feinere Fruchtausprägung"),rationale:L("Cooler ripening can retain delicate citrus and orchard-fruit expression.","Kühlere Reife kann feine Zitrus- und Kernobstnoten bewahren.")},
  {id:"ripe-citrus",target:"b",label:L("Riper citrus tendency","Tendenziell reifere Zitrusfrucht"),rationale:L("Clare's sunlight can support a riper citrus profile while nights retain freshness.","Sonne im Clare Valley kann reifere Zitrusnoten fördern, kühle Nächte bewahren Frische.")},
  {id:"weight",target:"b",label:L("Slightly broader palate","Etwas breiterer Gaumen"),rationale:L("Warmer daytime conditions can build more palate weight.","Wärmere Tagesbedingungen können mehr Gaumengewicht aufbauen.")},
 ]},
 {id:"chardonnay-burgundy-napa",grapeId:"chardonnay",regionAId:"burgundy",regionBId:"napa",tendencies:[
  {id:"fresh",target:"a",label:L("Fresher acid profile","Frischeres Säureprofil"),rationale:L("Burgundy's cooler continental setting often retains more freshness.","Burgunds kühleres Kontinentalklima bewahrt häufig mehr Frische.")},
  {id:"restrained",target:"a",label:L("More restrained fruit tendency","Zurückhaltendere Frucht"),rationale:L("Cooler sites can favour citrus and orchard-fruit restraint.","Kühlere Lagen können Zitrus und zurückhaltendes Kernobst fördern.")},
  {id:"ripe",target:"b",label:L("Riper fruit tendency","Reifere Fruchttendenz"),rationale:L("Napa's warmer conditions commonly support riper fruit.","Napas wärmere Bedingungen fördern häufig reifere Frucht.")},
  {id:"body",target:"b",label:L("Broader body tendency","Tendenziell mehr Körper"),rationale:L("Greater ripeness can contribute to a broader palate.","Mehr Reife kann zu einem breiteren Gaumen beitragen.")},
 ]},
 {id:"cab-bordeaux-napa",grapeId:"cabernet-sauvignon",regionAId:"bordeaux",regionBId:"napa",tendencies:[
  {id:"herbal",target:"a",label:L("More herbal restraint","Mehr kräuterige Zurückhaltung"),rationale:L("Moderate maritime conditions may preserve herbal detail.","Gemäßigt-maritime Bedingungen können kräuterige Details bewahren.")},
  {id:"acid",target:"a",label:L("Firmer freshness tendency","Tendenziell festere Frische"),rationale:L("Moderate ripening often retains a firmer acid line.","Gemäßigte Reife bewahrt häufig eine festere Säurelinie.")},
  {id:"blackfruit",target:"b",label:L("Riper black-fruit tendency","Reifere schwarze Frucht"),rationale:L("Napa sunlight commonly supports ripe black-fruit expression.","Napas Sonne fördert häufig reife schwarze Frucht.")},
  {id:"fuller",target:"b",label:L("Fuller body tendency","Tendenziell voller"),rationale:L("Warm conditions can increase ripeness and palate weight.","Warme Bedingungen können Reife und Gaumengewicht erhöhen.")},
 ]},
 {id:"syrah-rhone-barossa",grapeId:"syrah",regionAId:"rhone",regionBId:"barossa",tendencies:[
  {id:"pepper",target:"a",label:L("Peppery, savoury tendency","Pfeffrig-würzige Tendenz"),rationale:L("The northern Rhône expression is commonly associated with pepper and savoury detail.","Die nördliche Rhône wird häufig mit Pfeffer und würzigen Details verbunden.")},
  {id:"tension",target:"a",label:L("More structural tension","Mehr strukturelle Spannung"),rationale:L("Moderate conditions can retain a tauter profile.","Gemäßigte Bedingungen können ein strafferes Profil bewahren.")},
  {id:"richfruit",target:"b",label:L("Richer dark-fruit tendency","Reichere dunkle Frucht"),rationale:L("Barossa warmth commonly supports generous dark fruit.","Barossa-Wärme fördert häufig großzügige dunkle Frucht.")},
  {id:"alcohol",target:"b",label:L("Higher body and warmth tendency","Tendenziell mehr Körper und Wärme"),rationale:L("Greater ripeness can build body and alcohol.","Mehr Reife kann Körper und Alkohol aufbauen.")},
 ]},
 {id:"chenin-loire-stellenbosch",grapeId:"chenin-blanc",regionAId:"loire",regionBId:"stellenbosch",tendencies:[
  {id:"taut",target:"a",label:L("Tauter acid-led tendency","Straffere Säureprägung"),rationale:L("Loire's cooler context commonly highlights acidity.","Der kühlere Loire-Kontext betont häufig die Säure.")},
  {id:"apple",target:"a",label:L("Fresher orchard-fruit tendency","Frischere Kernobsttendenz"),rationale:L("Cooler ripening can retain fresher orchard-fruit notes.","Kühlere Reife kann frischere Kernobstnoten bewahren.")},
  {id:"ripe-chenin",target:"b",label:L("Riper fruit tendency","Reifere Fruchttendenz"),rationale:L("Stellenbosch warmth can support riper fruit.","Stellenboschs Wärme kann reifere Frucht fördern.")},
  {id:"texture",target:"b",label:L("Broader texture tendency","Tendenziell breitere Textur"),rationale:L("Warmer conditions can build more texture while Chenin retains acidity.","Wärmere Bedingungen können mehr Textur aufbauen, während Chenin Säure behält.")},
 ]},
];

export type VintageMetric="acidity"|"fruit"|"body"|"pressure";
export interface VintageChoice {id:string;label:Localized;effect:Localized;delta:Record<VintageMetric,number>}
export interface VintageStage {id:string;label:Localized;weather:Localized;choices:VintageChoice[]}
export interface VintageScenario {id:string;title:Localized;brief:Localized;objective:Localized;initial:Record<VintageMetric,number>;target:Record<VintageMetric,number>;stages:VintageStage[]}
const stageChoices=(variant:number):VintageStage[]=>[
 {id:"budburst",label:L("Budburst","Austrieb"),weather:L(variant%2?"Cool, unsettled start":"Dry, even start",variant%2?"Kühler, unruhiger Start":"Trockener, gleichmäßiger Start"),choices:[
  {id:"protect",label:L("Prioritise frost protection","Frostschutz priorisieren"),effect:L("Reduces exposure risk but adds vineyard pressure.","Senkt das Expositionsrisiko, erhöht aber den Arbeitsdruck."),delta:{acidity:0,fruit:0,body:0,pressure:-1}},
  {id:"canopy",label:L("Delay early canopy work","Frühe Laubarbeit verzögern"),effect:L("Preserves options, with less immediate control.","Bewahrt Optionen, bietet aber weniger direkte Kontrolle."),delta:{acidity:0,fruit:-1,body:0,pressure:1}},
 ]},
 {id:"flowering",label:L("Flowering & fruit set","Blüte & Fruchtansatz"),weather:L(variant%3?"Windy flowering window":"Warm, settled flowering",variant%3?"Windiges Blütefenster":"Warme, ruhige Blüte"),choices:[
  {id:"thin",label:L("Thin selectively","Selektiv ausdünnen"),effect:L("May improve evenness, but reduces potential yield.","Kann Gleichmäßigkeit fördern, senkt aber den möglichen Ertrag."),delta:{acidity:0,fruit:1,body:1,pressure:1}},
  {id:"observe",label:L("Observe before intervening","Beobachten vor Eingriff"),effect:L("Keeps yield potential, accepting more variation.","Erhält Ertragspotenzial, akzeptiert mehr Variation."),delta:{acidity:0,fruit:0,body:0,pressure:0}},
 ]},
 {id:"ripening",label:L("Véraison & ripening","Véraison & Reife"),weather:L(variant%2?"Warm days, cool nights":"Sustained warm spell",variant%2?"Warme Tage, kühle Nächte":"Anhaltende Wärmephase"),choices:[
  {id:"shade",label:L("Keep protective shade","Schützenden Schatten erhalten"),effect:L("Can preserve freshness and reduce sun exposure.","Kann Frische bewahren und Sonnenexposition reduzieren."),delta:{acidity:1,fruit:0,body:-1,pressure:0}},
  {id:"open",label:L("Open the fruit zone","Traubenzone öffnen"),effect:L("Can advance flavour development, with greater exposure.","Kann Aromenreife fördern, bei stärkerer Exposition."),delta:{acidity:-1,fruit:2,body:1,pressure:1}},
 ]},
 {id:"harvest",label:L("Harvest & cellar handoff","Lese & Kellerübergabe"),weather:L(variant%3===0?"Rain risk approaching":"Stable harvest window",variant%3===0?"Nahendes Regenrisiko":"Stabiles Lesefenster"),choices:[
  {id:"early",label:L("Pick for freshness","Auf Frische lesen"),effect:L("Retains acidity; fruit and body may be less developed.","Bewahrt Säure; Frucht und Körper können weniger entwickelt sein."),delta:{acidity:2,fruit:-1,body:-1,pressure:-1}},
  {id:"later",label:L("Wait for fuller ripeness","Auf vollere Reife warten"),effect:L("Builds fruit and body while increasing weather pressure.","Baut Frucht und Körper auf, erhöht aber den Wetterdruck."),delta:{acidity:-1,fruit:2,body:2,pressure:2}},
  {id:"passes",label:L("Harvest in two passes","In zwei Durchgängen lesen"),effect:L("Creates blending options at the cost of logistics.","Schafft Cuvée-Optionen bei höherem Logistikaufwand."),delta:{acidity:1,fruit:1,body:1,pressure:1}},
 ]},
];
export const VINTAGE_SCENARIOS:VintageScenario[]=Array.from({length:6},(_,i)=>({
 id:`fictional-vintage-${i+1}`,
 title:L(`Fictional hillside vintage ${i+1}`,`Fiktiver Hangjahrgang ${i+1}`),
 brief:L(i%2?"A cool-starting season turns warmer through ripening.":"A steady start gives way to a compressed harvest window.",i%2?"Eine kühl startende Saison wird zur Reife wärmer.":"Auf einen ruhigen Start folgt ein enges Lesefenster."),
 objective:i%2?L("Aim for a fresh, aromatic style.","Ziel ist ein frischer, aromatischer Stil."):L("Aim for ripe fruit with balance.","Ziel ist reife Frucht mit Balance."),
 initial:{acidity:3,fruit:2,body:2,pressure:2},
 target:i%2?{acidity:4,fruit:3,body:2,pressure:2}:{acidity:3,fruit:4,body:4,pressure:2},
 stages:stageChoices(i),
}));

export type ServiceDecision="glass"|"temperature"|"decant"|"first-step";
export interface ServiceScenario {
 id:string;title:Localized;style:Localized;context:Localized;
 answers:Record<ServiceDecision,string>;explanation:Localized;
}
const serviceRows=[
 ["sparkling","Traditional-method sparkling wine","Traditionell erzeugter Schaumwein","aperitif service","Aperitif-Service","tulip","well-chilled","no","present"],
 ["aromatic-white","Aromatic dry white","Aromatischer trockener Weißwein","spiced vegetable menu","Würziges Gemüsemenü","medium-white","cool","no","present"],
 ["textural-white","Textural mature white","Texturierter gereifter Weißwein","formal dinner","Formelles Dinner","medium-white","lightly-chilled","optional","present"],
 ["light-red","Light, fragrant red","Leichter, duftiger Rotwein","mushroom course","Pilzgang","medium-red","cellar-cool","no","present"],
 ["structured-red","Young structured red","Junger strukturierter Rotwein","main-course service","Hauptgang-Service","large-red","cellar-cool","yes","present"],
 ["mature-red","Mature delicate red","Gereifter delikater Rotwein","quiet table service","Ruhiger Tischservice","medium-red","cellar-cool","optional","present"],
 ["sweet-white","Sweet high-acid white","Süßer Weißwein mit hoher Säure","dessert course","Dessertgang","small-sweet","well-chilled","no","present"],
 ["fortified","Fortified oxidative style","Aufgespriteter oxidativer Stil","after-dinner study flight","Lernflight nach dem Essen","small-sweet","lightly-chilled","no","present"],
 ["rose","Dry rosé","Trockener Rosé","summer lunch","Sommerliches Lunch","medium-white","cool","no","present"],
 ["orange","Skin-contact white","Maischevergorener Weißwein","shared plates","Geteilte Gerichte","medium-white","cellar-cool","optional","present"],
 ["aged-sparkling","Mature sparkling wine","Gereifter Schaumwein","tasting seminar","Verkostungsseminar","tulip","cool","no","present"],
 ["full-white","Full-bodied young white","Vollmundiger junger Weißwein","rich fish course","Kräftiger Fischgang","medium-white","lightly-chilled","optional","present"],
] as const;
export const SERVICE_SCENARIOS:ServiceScenario[]=serviceRows.map(r=>({
 id:r[0],title:L(r[1],r[2]),style:L(r[1],r[2]),context:L(r[3],r[4]),
 answers:{glass:r[5],temperature:r[6],decant:r[7],"first-step":r[8]},
 explanation:L("The recommendation is a broad, defensible service starting point; bottle condition and guest preference still matter.","Die Empfehlung ist ein breiter, vertretbarer Ausgangspunkt; Flaschenzustand und Gästewunsch bleiben wichtig."),
}));
