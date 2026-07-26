import rawSpecies from "./data/species.json";
import type { Species } from "./types";

export const SPECIES = rawSpecies as Species[];
export const SPECIES_BY_ID = new Map(SPECIES.map((species)=>[species.id,species]));
export const species = (id:number) => {
  const found=SPECIES_BY_ID.get(id);
  if(!found) throw new Error(`Unknown National Dex id ${id}`);
  return found;
};
export const STARTERS = [1,4,7].map(species);
export const PLAY_ROSTER_IDS = [1,4,7,10,12,16,19,21,25,27,29,32,35,37,39,41,43,46,48,50,52,54,56,58,60,63,66,69,72,74,77,79,81,84,86,88,90,92,95,96,98,100,102,104,109,111,113,115,116,118,120,123,124,125,126,127,128,129,131,133,137,138,140,142,143,147,149].map(species);

