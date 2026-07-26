"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Vibrate } from "lucide-react";
import { sound } from "@/lib/sound";
import { haptic } from "@/lib/haptics";
import { useSettings } from "@/store/settings";

export type GameFeelEventType =
  | "select"
  | "scan"
  | "reveal"
  | "impact"
  | "success"
  | "error"
  | "combo"
  | "score"
  | "round"
  | "finish";
export interface GameFeelEvent {
  id: string;
  type: GameFeelEventType;
  label?: string;
  value?: number;
  focus?: string;
  particles?: boolean;
}
const CHANNEL = "poke:game-feel";
export function emitGameFeel(event: GameFeelEvent) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent<GameFeelEvent>(CHANNEL, { detail: event }),
    );
}

export function GameFeelLayer({ locale }: { locale: "en" | "de" }) {
  const soundEnabled = useSettings((state) => state.sound),
    hapticsEnabled = useSettings((state) => state.haptics);
  const setSound = useSettings((state) => state.setSound),
    setHaptics = useSettings((state) => state.setHaptics);
  const seen = useRef(new Set<string>()),
    interacting = useRef(false),
    clear = useRef<number | null>(null);
  const [event, setEvent] = useState<GameFeelEvent | null>(null),
    [live, setLive] = useState("");
  const handle = useCallback((next: GameFeelEvent) => {
    if (seen.current.has(next.id)) return;
    seen.current.add(next.id);
    if (seen.current.size > 80)
      seen.current = new Set([...seen.current].slice(-40));
    setEvent(next);
    setLive(
      [
        next.label,
        next.value !== undefined
          ? next.value > 0
            ? `plus ${next.value}`
            : `minus ${Math.abs(next.value)}`
          : "",
      ]
        .filter(Boolean)
        .join(", "),
    );
    if (clear.current) window.clearTimeout(clear.current);
    clear.current = window.setTimeout(() => setEvent(null), 900);
    if (
      next.type === "success" ||
      next.type === "combo" ||
      next.type === "finish"
    ) {
      sound.correct();
      haptic.success();
    } else if (next.type === "error") {
      sound.wrong();
      haptic.error();
    } else {
      sound.tick();
      haptic.tap();
    }
    if (next.focus && !interacting.current)
      window.requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(next.focus!);
        if (!target || interacting.current) return;
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const rect = target.getBoundingClientRect();
        const topSafe = 148;
        const fullyVisible =
          rect.top >= topSafe && rect.bottom <= window.innerHeight - 24;
        if (!fullyVisible)
          target.scrollIntoView({
            behavior: reduce ? "auto" : "smooth",
            block: "nearest",
          });
        if (target.matches("button,[href],input,select,[tabindex]"))
          target.focus({ preventScroll: true });
      });
  }, []);
  useEffect(() => {
    const listener = (raw: Event) =>
      handle((raw as CustomEvent<GameFeelEvent>).detail);
    const start = (raw: Event) => {
        const target = raw.target as HTMLElement | null;
        interacting.current =
          raw.type === "pointerdown" ||
          !!target?.closest("input,textarea,select,[contenteditable=true]");
      },
      end = () => {
        interacting.current = false;
      };
    window.addEventListener(CHANNEL, listener);
    window.addEventListener("pointerdown", start, { capture: true });
    window.addEventListener("pointerup", end, { capture: true });
    window.addEventListener("pointercancel", end, { capture: true });
    window.addEventListener("focusin", start, { capture: true });
    window.addEventListener("focusout", end, { capture: true });
    return () => {
      window.removeEventListener(CHANNEL, listener);
      window.removeEventListener("pointerdown", start, { capture: true });
      window.removeEventListener("pointerup", end, { capture: true });
      window.removeEventListener("pointercancel", end, { capture: true });
      window.removeEventListener("focusin", start, { capture: true });
      window.removeEventListener("focusout", end, { capture: true });
      if (clear.current) window.clearTimeout(clear.current);
    };
  }, [handle]);
  return (
    <div className="poke-game-feel-layer">
      <div className="sr-only" role="status" aria-live="polite">
        {live}
      </div>
      <div
        className="poke-live-toggles"
        aria-label={locale === "de" ? "Spiel-Feedback" : "Game feedback"}
      >
        <button
          type="button"
          aria-pressed={soundEnabled}
          onClick={() => setSound(!soundEnabled)}
          aria-label={
            soundEnabled
              ? locale === "de"
                ? "Spielklänge ausschalten"
                : "Mute game sounds"
              : locale === "de"
                ? "Spielklänge einschalten"
                : "Enable game sounds"
          }
        >
          {soundEnabled ? <Volume2 /> : <VolumeX />}
          <span>
            <b>{locale === "de" ? "KLANG" : "SOUND"}</b>
            <small>
              {soundEnabled
                ? locale === "de"
                  ? "AN"
                  : "ON"
                : locale === "de"
                  ? "AUS"
                  : "OFF"}
            </small>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={hapticsEnabled}
          onClick={() => setHaptics(!hapticsEnabled)}
          aria-label={
            hapticsEnabled
              ? locale === "de"
                ? "Vibration ausschalten"
                : "Disable vibration"
              : locale === "de"
                ? "Vibration einschalten"
                : "Enable vibration"
          }
        >
          <Vibrate />
          <span>
            <b>HAPTIC</b>
            <small>
              {hapticsEnabled
                ? locale === "de"
                  ? "AN"
                  : "ON"
                : locale === "de"
                  ? "AUS"
                  : "OFF"}
            </small>
          </span>
        </button>
      </div>
      {event && (
        <div
          key={event.id}
          className={`poke-feel-burst is-${event.type}`}
          aria-hidden="true"
        >
          <b>
            {event.value !== undefined
              ? `${event.value > 0 ? "+" : ""}${event.value}`
              : event.label}
          </b>
          {(event.particles ||
            ["success", "combo", "finish"].includes(event.type)) && (
            <span>
              {Array.from({ length: 9 }, (_, index) => (
                <i
                  key={index}
                  style={{ "--particle": index } as React.CSSProperties}
                />
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
