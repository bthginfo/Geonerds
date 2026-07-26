import {species} from "./data";
import {EVOLUTION_FAMILIES} from "./fixtures";
import {seedHash,seededShuffle,shuffleBag} from "./variety";

export type EvolutionFamily=(typeof EVOLUTION_FAMILIES)[number];
export type EvolutionEdge=EvolutionFamily["edges"][number];

export function isBranchingFamily(family:EvolutionFamily):boolean {
 const outgoing=new Map<number,number>();
 for(const edge of family.edges)outgoing.set(edge.from,(outgoing.get(edge.from)??0)+1);
 return [...outgoing.values()].some((count)=>count>1);
}

export function eligibleEvolutionFamilies(generationCap:number):EvolutionFamily[]{
 return EVOLUTION_FAMILIES.filter((family)=>family.nodes.every((id)=>species(id).generation<=generationCap));
}

export function evolutionFamilySequence(generationCap:number,count:number,seed:string):EvolutionFamily[]{
 const eligible=eligibleEvolutionFamilies(generationCap);
 if(!eligible.length)return [EVOLUTION_FAMILIES[0]];
 const sequence=shuffleBag(eligible,count,`${seed}:evolution-families`,(family)=>family.id);
 const branches=eligible.filter(isBranchingFamily);
 if(count>0&&branches.length&&sequence.every((family)=>!isBranchingFamily(family))){
  const branch=seededShuffle(branches,`${seed}:branch-injection`)[0];
  sequence[seedHash(`${seed}:branch-slot`)%sequence.length]=branch;
 }
 return sequence;
}

export function evolutionDepths(family:EvolutionFamily):Map<number,number> {
 const depths=new Map<number,number>(family.nodes.map((id)=>[id,0]));
 for(let pass=0;pass<family.nodes.length;pass++){
  for(const edge of family.edges){
   const next=(depths.get(edge.from)??0)+1;
   if(next>(depths.get(edge.to)??0))depths.set(edge.to,next);
  }
 }
 return depths;
}

export function evolutionLevels(family:EvolutionFamily):number[][] {
 const depths=evolutionDepths(family);
 const max=Math.max(...depths.values());
 return Array.from({length:max+1},(_,depth)=>
  family.nodes.filter((id)=>depths.get(id)===depth),
 );
}

export function evolutionEdgeKey(edge:{from:number;to:number}):string {
 return `${edge.from}-${edge.to}`;
}

export function shuffledEvolutionNodes(family:EvolutionFamily,seed:string):number[]{
 return seededShuffle(family.nodes,`${seed}:specimen-drawer`);
}
