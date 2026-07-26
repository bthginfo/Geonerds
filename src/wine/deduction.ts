import { GRAPES } from "./content";
import { shuffle } from "./engine";
import type { Grape, Localized, WineGameId } from "./types";

export type DeductionGameId=Extract<WineGameId,"terroir-detective"|"grape-dna"|"cellar-mystery">;
export interface DeductionClue {
  id:string;
  label:Localized;
  detail:Localized;
  matches:(candidate:Grape)=>boolean;
}
export interface DeductionCase {answer:Grape;suspects:Grape[];clues:DeductionClue[]}

const band=(text:string)=>{
  const value=text.toLowerCase();
  if(value.includes("warm"))return "warm";
  if(value.includes("cool"))return "cool";
  return "moderate";
};
const trait=(text:string,name:string)=>{
  const part=text.toLowerCase().split(",").find(p=>p.includes(name))??"";
  if(part.includes("very high"))return 5;if(part.includes("high"))return 4;if(part.includes("medium"))return 3;if(part.includes("low"))return 1;return 2;
};

export function buildDeductionCase(gameId:DeductionGameId,seed:number,suspectCount:number):DeductionCase{
  const answer=GRAPES[Math.abs(seed)%GRAPES.length];
  const similarity=(candidate:Grape)=>{
    let score=band(candidate.climate.en)===band(answer.climate.en)?3:0;
    score+=Math.max(0,2-Math.abs(trait(candidate.structure.en,"acidity")-trait(answer.structure.en,"acidity")));
    score+=candidate.aromas.filter(a=>answer.aromas.includes(a)).length*2;
    return score;
  };
  const plausible=shuffle(GRAPES.filter(g=>g.id!==answer.id).sort((a,b)=>similarity(b)-similarity(a)).slice(0,12),seed+4);
  const suspects=shuffle([answer,...plausible.slice(0,suspectCount-1)],seed+9);
  const climateBand=band(answer.climate.en),acid=trait(answer.structure.en,"acidity"),body=trait(answer.structure.en,"body"),aroma=answer.aromas[0];
  const base:DeductionClue[]=[
    {id:"climate",label:{en:"Climate band",de:"Klimaband"},detail:{en:`The profile commonly fits ${answer.climate.en} conditions.`,de:`Das Profil passt häufig zu ${answer.climate.de}en Bedingungen.`},matches:c=>band(c.climate.en)===climateBand},
    {id:"acidity",label:{en:"Acidity structure",de:"Säuresstruktur"},detail:{en:`The expected acidity sits near level ${acid} of 5.`,de:`Die erwartete Säure liegt etwa bei Stufe ${acid} von 5.`},matches:c=>Math.abs(trait(c.structure.en,"acidity")-acid)<=1},
    {id:"body",label:{en:"Body signature",de:"Körpersignatur"},detail:{en:`The body tendency sits near level ${body} of 5.`,de:`Die Körpertendenz liegt etwa bei Stufe ${body} von 5.`},matches:c=>Math.abs(trait(c.structure.en,"body")-body)<=1},
    {id:"aroma",label:{en:"Aroma marker",de:"Aromamarker"},detail:{en:`“${aroma}” is commonly associated in the right context.`,de:`„${aroma}“ wird im passenden Kontext häufig verbunden.`},matches:c=>c.aromas.includes(aroma)},
  ];
  if(gameId==="grape-dna"&&answer.synonyms[0])base.unshift({id:"synonym",label:{en:"Alias fragment",de:"Alias-Fragment"},detail:{en:`One documented synonym is “${answer.synonyms[0]}”.`,de:`Ein dokumentiertes Synonym ist „${answer.synonyms[0]}“.`},matches:c=>c.synonyms.includes(answer.synonyms[0])});
  if(gameId==="cellar-mystery")base.reverse();
  return {answer,suspects,clues:base};
}

export function incompatibleIds(suspects:Grape[],clues:DeductionClue[]){
  return suspects.filter(candidate=>clues.some(clue=>!clue.matches(candidate))).map(candidate=>candidate.id);
}
