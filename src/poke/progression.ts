import type {PokeCompetency,PokeDexStage,PokeRun} from "./types";
import {getPokeGame} from "./registry";
import {normalizedPokeRating} from "./competition";

export const POKE_COMPETENCIES:PokeCompetency[]=["exploration","locations","ecology","types","teamcraft","evolution","deckcraft","recognition","audio","taxonomy","deduction"];
export interface PokeProgressionData{xp:number;researchCredits:number;totalRuns:number;correct:number;total:number;activeDays:string[];competencyXp:Record<PokeCompetency,number>}
export const emptyPokeProgression=():PokeProgressionData=>({xp:0,researchCredits:120,totalRuns:0,correct:0,total:0,activeDays:[],competencyXp:Object.fromEntries(POKE_COMPETENCIES.map((item)=>[item,0])) as Record<PokeCompetency,number>});
export function applyPokeRun(state:PokeProgressionData,run:PokeRun):PokeProgressionData{
 if(run.practice)return state;
 const gained=Math.max(12,Math.round(run.score/8)+run.correct*8),competency=getPokeGame(run.gameId).competency,day=new Date(run.createdAt).toISOString().slice(0,10);
 return{...state,xp:state.xp+gained,researchCredits:state.researchCredits+Math.max(18,Math.round(run.score/45)),totalRuns:state.totalRuns+1,correct:state.correct+run.correct,total:state.total+run.total,activeDays:[...new Set([...state.activeDays,day])].slice(-90),competencyXp:{...state.competencyXp,[competency]:state.competencyXp[competency]+gained}};
}
export const trainerLevel=(xp:number)=>Math.floor(Math.sqrt(xp/100))+1;
export const normalizeRunScore=(run:Pick<PokeRun,"correct"|"total"|"completedRounds"|"selectedRounds"|"difficulty">)=>normalizedPokeRating({...run,questions:run.total});
export const shouldRecordDex=(practice:boolean)=>!practice;
export function pokeDexStage(correct=0,games=0):PokeDexStage{if(correct>=10&&games>=3)return"mastered";if(correct>=4&&games>=2)return"researched";if(correct>0)return"encountered";return"sealed"}
export function localCardBadgeValue(badgeId:string,opened:number,finishes:readonly string[]):number{
 if(badgeId==="collector-first")return opened;
 if(badgeId==="collector-alt")return finishes.some((finish)=>finish==="special-art"||finish==="gold")?1:0;
 return finishes.length;
}

export type PokeBadgeCategory="journey"|"accuracy"|"mastery"|"battle"|"exploration"|"collection"|"social"|"streak"|"league"|"seasonal";
export type PokeBadgeMetric="runs"|"correct"|"xp"|"games"|"cards"|"online";
export interface PokeBadgeDefinition{id:string;name:{en:string;de:string};description:{en:string;de:string};category:PokeBadgeCategory;tier:1|2|3|4;metric:PokeBadgeMetric;goal:number;verified:boolean;seasonal:boolean}
const b=(id:string,en:string,de:string,descriptionEn:string,descriptionDe:string,category:PokeBadgeCategory,tier:1|2|3|4,metric:PokeBadgeMetric,goal:number,verified=false,seasonal=false):PokeBadgeDefinition=>({id,name:{en,de},description:{en:descriptionEn,de:descriptionDe},category,tier,metric,goal,verified,seasonal});
export const POKE_BADGES:PokeBadgeDefinition[]=[
 b("journey-1","First Field Log","Erstes Feldlog","Complete one scored mission.","Schließe eine gewertete Mission ab.","journey",1,"runs",1),
 b("journey-10","Trail Regular","Routenstammgast","Complete ten scored missions.","Schließe zehn gewertete Missionen ab.","journey",2,"runs",10),
 b("journey-50","Senior Researcher","Senior-Forscher","Complete fifty scored missions.","Schließe fünfzig gewertete Missionen ab.","journey",3,"runs",50),
 b("journey-100","Century Expedition","Jahrhundert-Expedition","Complete one hundred scored missions.","Schließe hundert gewertete Missionen ab.","journey",4,"runs",100),
 b("accuracy-first","Clean Read","Saubere Messung","Finish a perfect account-linked run.","Beende einen perfekten account-verknüpften Run.","accuracy",1,"online",1,true),
 b("accuracy-perfect-10","Tenfold Lock","Zehnfach-Lock","Finish a perfect ten-round run.","Beende einen perfekten Zehn-Runden-Run.","accuracy",3,"online",1,true),
 b("accuracy-hard","Hard Proof","Harter Beweis","Finish a perfect hard run.","Beende einen perfekten schweren Run.","accuracy",4,"online",1,true),
 b("mastery-ten","Full Curriculum","Volles Curriculum","Log a result in all twelve modules.","Erfasse ein Ergebnis in allen zwölf Modulen.","mastery",4,"games",12),
 b("specialist","Module Specialist","Modulspezialist","Reach a 1,000 Field Rating in one module.","Erreiche 1.000 Feldrating in einem Modul.","mastery",3,"online",1000,true),
 b("circuit-1","Circuit Clear","Circuit geschafft","Clear one Battle Circuit.","Schließe einen Battle Circuit ab.","battle",1,"online",1,true),
 b("circuit-10","Circuit Ten","Circuit Zehn","Clear a ten-match Battle Circuit.","Schließe einen Battle Circuit mit zehn Kämpfen ab.","battle",2,"online",1,true),
 b("circuit-20","Endurance Circuit","Ausdauer-Circuit","Clear a twenty-match Battle Circuit.","Schließe einen Battle Circuit mit zwanzig Kämpfen ab.","battle",4,"online",1,true),
 b("regions-nine","Open Atlas Clearance","Offene-Atlas-Freigabe","Complete a scored map mission with the full Generation 1–9 scope.","Schließe eine gewertete Kartenmission mit vollem Gen-1–9-Umfang ab.","exploration",4,"online",1,true),
 b("collector-first","First Research Set","Erstes Forschungsset","Open your first research set.","Öffne dein erstes Forschungsset.","collection",1,"cards",1),
 b("collector-25","Variant Ledger","Varianten-Ledger","Collect twenty-five card variants.","Sammle 25 Kartenvarianten.","collection",2,"cards",25),
 b("collector-alt","Archive Rarity","Archivrarität","Discover Special Art or Gold.","Entdecke Special Art oder Gold.","collection",4,"cards",1),
 b("social-first","Sealed Challenge","Versiegelte Challenge","Complete a verified direct challenge.","Schließe eine verifizierte direkte Challenge ab.","social",1,"online",1,true),
 b("social-win","First Rival Win","Erster Rivalensieg","Win a direct challenge.","Gewinne eine direkte Challenge.","social",2,"online",1,true),
 b("social-five","Rival Network","Rivalennetz","Face five different trainers.","Tritt gegen fünf verschiedene Trainer an.","social",3,"online",5,true),
 b("social-rematch","Return Dossier","Rückkampfakte","Complete a rematch.","Schließe einen Rückkampf ab.","social",2,"online",1,true),
 b("streak-3","Three Signal","Dreiersignal","Win three challenges in a row.","Gewinne drei Challenges in Folge.","streak",2,"online",3,true),
 b("streak-5","Five Signal","Fünfersignal","Win five challenges in a row.","Gewinne fünf Challenges in Folge.","streak",3,"online",5,true),
 b("streak-10","Unbroken Ten","Ungebrochene Zehn","Win ten challenges in a row.","Gewinne zehn Challenges in Folge.","streak",4,"online",10,true),
 b("league-placed","Field Clearance","Feldfreigabe","Complete five placement matches.","Schließe fünf Platzierungsmatches ab.","league",1,"online",5,true,true),
 b("league-silver","Silver Clearance","Silber-Freigabe","Reach Silver this season.","Erreiche diese Saison Silber.","league",1,"online",1,true,true),
 b("league-gold","Gold Clearance","Gold-Freigabe","Reach Gold this season.","Erreiche diese Saison Gold.","league",2,"online",1,true,true),
 b("league-platinum","Platinum Clearance","Platin-Freigabe","Reach Platinum this season.","Erreiche diese Saison Platin.","league",3,"online",1,true,true),
 b("league-master","Master Clearance","Master-Freigabe","Reach Master this season.","Erreiche diese Saison Master.","league",4,"online",1,true,true),
 b("season-participant","Season Field Mark","Saison-Feldmarke","Post a result in the current season.","Erfasse ein Ergebnis in der aktuellen Saison.","seasonal",1,"online",1,true,true),
];
