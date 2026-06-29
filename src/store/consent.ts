import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ConsentChoice = "accepted" | "necessary";

interface ConsentState {
  /** null = not decided yet (banner shown). */
  choice: ConsentChoice | null;
  setChoice: (c: ConsentChoice) => void;
}

export const useConsent = create<ConsentState>()(
  persist(
    (set) => ({
      choice: null,
      setChoice: (choice) => set({ choice }),
    }),
    { name: "geonerds-consent" }
  )
);

/** Whether optional (e.g. analytics) cookies may be used. Gate any future analytics on this. */
export function analyticsAllowed(): boolean {
  return useConsent.getState().choice === "accepted";
}
