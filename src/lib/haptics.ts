import { useSettings } from "@/store/settings";

type HapticPattern = number | number[];

function vibrate(pattern: HapticPattern) {
  if (typeof navigator === "undefined" || !useSettings.getState().haptics) return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate(pattern);
}

export const haptic = {
  tap: () => vibrate(8),
  success: () => vibrate([14, 35, 22]),
  error: () => vibrate([35, 45, 35]),
};
