import {PokePublicProfile} from "@/components/poke/poke-public-profile";
export default async function Page({params}:{params:Promise<{name:string}>}){const{name}=await params;return <PokePublicProfile name={decodeURIComponent(name)}/>}
