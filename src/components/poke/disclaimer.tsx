"use client";
import {useT} from "@/i18n/I18nProvider";
export function PokeDisclaimer({full=false}:{full?:boolean}){
 const {locale}=useT();
 const compact=locale==="de"?"Inoffizielles Fan- und Lernprojekt · nicht mit den Rechteinhabern verbunden.":"Unofficial fan-made learning project · not affiliated with the rights holders.";
 const fullText=locale==="de"
 ?"Poke-Nerds ist ein inoffizielles Fan- und Lernprojekt und steht in keiner Verbindung zu Nintendo, Creatures Inc., GAME FREAK inc. oder The Pokémon Company. Es wird von diesen Unternehmen weder unterstützt noch genehmigt. Pokémon und Pokémon-Charakternamen sind Marken von Nintendo. © 1995–2026 Nintendo/Creatures Inc./GAME FREAK inc. Spieldaten: PokéAPI. Die Karten in Poke-Nerds sind eigens erstellte, schematische Darstellungen und nicht maßstabsgetreu."
 :"Poke-Nerds is an unofficial fan-made learning project and is not affiliated with, endorsed, sponsored, or approved by Nintendo, Creatures Inc., GAME FREAK inc., or The Pokémon Company. Pokémon and Pokémon character names are trademarks of Nintendo. © 1995–2026 Nintendo/Creatures Inc./GAME FREAK inc. Game data: PokéAPI. Maps in Poke-Nerds are original schematic representations and are not to scale.";
 return <aside className={`poke-disclaimer ${full?"is-full":""}`}><span aria-hidden>ⓘ</span><p>{full?fullText:compact} {full&&<a href="https://pokeapi.co/" target="_blank" rel="noreferrer">PokéAPI ↗</a>}</p></aside>;
}

