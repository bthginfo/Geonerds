import type { Metadata } from "next";
import { WineShell } from "@/components/wine/wine-shell";
export const metadata:Metadata={title:"Wine-Nerds",description:"Playful wine reasoning practice for ambitious enthusiasts and beginning sommeliers."};
export default function Layout({children}:{children:React.ReactNode}){return <WineShell>{children}</WineShell>}

