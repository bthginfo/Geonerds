import {typeMultiplier} from "./type-chart";
import {shuffleBag} from "./variety";

export type GymDifficulty="easy"|"medium"|"hard";

export interface GymTrial {
 id:string;
 type:string;
 label:{en:string;de:string};
 field:{en:string;de:string};
}

const TRIALS:readonly Omit<GymTrial,"id">[]=[
 {type:"water",label:{en:"Tidal Vault",de:"Gezeitenkammer"},field:{en:"Rain amplifies the pressure.",de:"Regen verstärkt den Druck."}},
 {type:"fire",label:{en:"Magma Relay",de:"Magmastaffel"},field:{en:"Heat distorts the arena.",de:"Hitze verzerrt die Arena."}},
 {type:"psychic",label:{en:"Mind Prism",de:"Gedankenprisma"},field:{en:"Signals arrive out of order.",de:"Signale treffen versetzt ein."}},
 {type:"dragon",label:{en:"Drake Summit",de:"Drachengipfel"},field:{en:"A veteran guardian holds the line.",de:"Ein erfahrener Wächter hält die Linie."}},
 {type:"ground",label:{en:"Fault Chamber",de:"Bruchkammer"},field:{en:"The floor shifts under every step.",de:"Der Boden verschiebt sich bei jedem Schritt."}},
 {type:"flying",label:{en:"Jetstream Ring",de:"Jetstream-Ring"},field:{en:"Crosswinds punish slow counters.",de:"Seitenwinde bestrafen langsame Konter."}},
 {type:"steel",label:{en:"Alloy Foundry",de:"Legierungsgießerei"},field:{en:"Armoured targets resist weak coverage.",de:"Gepanzerte Ziele widerstehen schwacher Coverage."}},
 {type:"fairy",label:{en:"Glimmer Court",de:"Schimmerhof"},field:{en:"Misdirection hides the clean opening.",de:"Ablenkungen verbergen das klare Zeitfenster."}},
 {type:"dark",label:{en:"Night Relay",de:"Nachtstaffel"},field:{en:"Only the next target is illuminated.",de:"Nur das nächste Ziel ist beleuchtet."}},
 {type:"rock",label:{en:"Quarry Gate",de:"Steinbruchtor"},field:{en:"Dense cover rewards a decisive counter.",de:"Dichte Deckung belohnt einen klaren Konter."}},
 {type:"electric",label:{en:"Voltage Deck",de:"Spannungsdeck"},field:{en:"Static charge floods the platform.",de:"Statische Ladung flutet die Plattform."}},
 {type:"grass",label:{en:"Canopy Trial",de:"Kronendach-Prüfung"},field:{en:"Thick growth closes every neutral route.",de:"Dichter Bewuchs schließt neutrale Routen."}},
 {type:"ice",label:{en:"Whiteout Lab",de:"Whiteout-Labor"},field:{en:"Low visibility tests type discipline.",de:"Geringe Sicht prüft die Typendisziplin."}},
 {type:"fighting",label:{en:"Impact Dojo",de:"Impakt-Dojo"},field:{en:"Direct pressure leaves little recovery time.",de:"Direkter Druck lässt kaum Erholungszeit."}},
 {type:"ghost",label:{en:"Phantom Archive",de:"Phantomarchiv"},field:{en:"The target phases between scan bands.",de:"Das Ziel wechselt zwischen Scanbändern."}},
 {type:"poison",label:{en:"Toxin Garden",de:"Toxingarten"},field:{en:"Attrition makes roster depth matter.",de:"Zermürbung macht Teamtiefe entscheidend."}},
 {type:"bug",label:{en:"Swarm Array",de:"Schwarmmatrix"},field:{en:"Many small signals mask the lead target.",de:"Viele kleine Signale verdecken das Hauptziel."}},
] as const;

export function buildGymTrials(count:number,seed:string):GymTrial[]{
 return shuffleBag(TRIALS,count,`${seed}:gym-trials`,(trial)=>trial.type)
  .map((trial,index)=>({...trial,id:`trial-${index+1}-${trial.type}`}));
}

export function gymMemberUses(roundCount:number,difficulty:GymDifficulty):number {
 return Math.ceil(Math.max(1,roundCount)/6)+(difficulty==="easy"?1:0);
}

export interface GymDeployment {
 effectiveness:number;
 resistance:number;
 points:number;
 success:boolean;
 grade:"counter"|"neutral"|"resisted"|"immune";
}

export function evaluateGymDeployment(
 attackTypes:readonly string[],
 trialType:string,
 usedBefore:number,
 maxUses:number,
 difficulty:GymDifficulty,
):GymDeployment {
 const effectiveness=Math.max(...attackTypes.map((type)=>typeMultiplier(type,[trialType])));
 const resistance=typeMultiplier(trialType,[...attackTypes]);
 const base=(effectiveness>=2?560:effectiveness===1?280:effectiveness>0?130:50)+(resistance===0?220:resistance<1?120:resistance>1?-80:0);
 const fatiguePenalty=Math.round((usedBefore/Math.max(1,maxUses))*120);
 const pressure=difficulty==="hard"?0.9:difficulty==="easy"?1.08:1;
 return {
  effectiveness,
  resistance,
  points:Math.max(40,Math.round((base-fatiguePenalty)*pressure)),
  success:effectiveness>1||resistance<1,
  grade:effectiveness>=2?"counter":effectiveness===1?"neutral":effectiveness>0?"resisted":"immune",
 };
}
