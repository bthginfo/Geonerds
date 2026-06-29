import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ConsentState {
  /** Whether the user has acknowledged the cookie/privacy notice. */
  acknowledged: boolean;
  acknowledge: () => void;
}

export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      acknowledged: false,
      acknowledge: () => set({ acknowledged: true }),
    }),
    { name: "geonerds-consent" }
  )
);
