"use client";
import {useT} from "@/i18n/I18nProvider";
import {useSettings} from "@/store/settings";
export function PokeLanguageSwitch(){
 const {locale}=useT();const setLocale=useSettings((state)=>state.setLocale);
 return <div className="poke-lang" role="group" aria-label="Language / Sprache">{(["en","de"] as const).map((language)=><button key={language} type="button" aria-pressed={locale===language} onClick={()=>setLocale(language)}>{language.toUpperCase()}</button>)}</div>;
}

