import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/lib/types";

interface SettingsState {
  locale: Locale;
  sound: boolean;
  haptics: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  setSound: (sound: boolean) => void;
  setHaptics: (haptics: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      locale: "en",
      sound: true,
      haptics: true,
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === "en" ? "de" : "en" }),
      setSound: (sound) => set({ sound }),
      setHaptics: (haptics) => set({ haptics }),
    }),
    { name: "geonerds-settings" }
  )
);
