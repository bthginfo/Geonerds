import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/lib/types";

interface SettingsState {
  locale: Locale;
  sound: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  setSound: (sound: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      locale: "en",
      sound: true,
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === "en" ? "de" : "en" }),
      setSound: (sound) => set({ sound }),
    }),
    { name: "geonerds-settings" }
  )
);
