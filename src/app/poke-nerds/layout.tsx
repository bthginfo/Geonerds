import type {Metadata} from "next";
import {PokeShell} from "@/components/poke/poke-shell";
import "./poke.css";
export const metadata:Metadata={title:"Poke-Nerds · Field Research Games",description:"An unofficial bilingual fan-made learning project with ten tactile Pokémon research games."};
export default function Layout({children}:{children:React.ReactNode}){return <PokeShell>{children}</PokeShell>}
