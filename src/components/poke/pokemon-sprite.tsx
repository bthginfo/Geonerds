"use client";
import {useEffect,useState} from "react";
import type {Species} from "@/poke/types";
export function PokemonSprite({entry,size=120,concealed=false,pixelated=false,label=true}:{entry:Species;size?:number;concealed?:boolean;pixelated?:boolean;label?:boolean}){
 const [src,setSrc]=useState(entry.sprite);
 useEffect(()=>setSrc(entry.sprite||entry.fallbackSprite),[entry.id,entry.sprite,entry.fallbackSprite]);
 return <img src={src} onError={()=>setSrc(entry.fallbackSprite)} width={size} height={size} draggable={false} className={`poke-sprite ${concealed?"is-concealed":""} ${pixelated?"is-pixelated":""}`} alt={label&&!concealed?entry.name.en:"Unidentified specimen"} />;
}
