"use client";

import { useT } from "@/i18n/I18nProvider";
import { useSettings } from "@/store/settings";
import styles from "./wine-language-switch.module.css";

const languages = [
  {
    locale: "en",
    label: "EN",
    ariaLabel: "Switch to English / Auf Englisch wechseln",
  },
  {
    locale: "de",
    label: "DE",
    ariaLabel: "Auf Deutsch wechseln / Switch to German",
  },
] as const;

export function WineLanguageSwitch() {
  const { locale } = useT();
  const setLocale = useSettings((state) => state.setLocale);

  return (
    <div
      className={styles.switch}
      role="group"
      aria-label="Language / Sprache"
    >
      {languages.map((language) => (
        <button
          key={language.locale}
          type="button"
          className={styles.option}
          aria-label={language.ariaLabel}
          aria-pressed={locale === language.locale}
          onClick={() => setLocale(language.locale)}
        >
          {language.label}
        </button>
      ))}
    </div>
  );
}
