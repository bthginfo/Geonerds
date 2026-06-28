"use client";

import { cn } from "@/lib/utils";

interface ObscureRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Solid colour matching the flag underneath, so the text reads as removed. */
  color: string;
}

/**
 * A few flags carry prominent lettering that gives the country away. We cover it
 * with a clean solid patch (not a blur) while it's a question; the full flag is
 * shown again on reveal. Most coats-of-arms have text too small to read at this
 * size, so they're left untouched.
 */
const FLAG_OBSCURE: Record<string, ObscureRegion[]> = {
  br: [{ x: 35, y: 45, w: 30, h: 11, color: "#002776" }], // "ORDEM E PROGRESSO" band on the globe
};

interface FlagImageProps {
  code: string;
  alt?: string;
  className?: string;
  /** Cover giveaway text (used in quizzes; off for reveal/results). */
  hideText?: boolean;
  rounded?: boolean;
}

export function FlagImage({ code, alt = "", className, hideText = false, rounded = true }: FlagImageProps) {
  const regions = hideText ? FLAG_OBSCURE[code] : undefined;
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted ring-1 ring-black/10",
        rounded && "rounded-lg",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/flags/${code}.svg`} alt={alt} draggable={false} className="h-full w-full object-cover" />
      {regions?.map((r, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: `${r.w}%`,
            height: `${r.h}%`,
            backgroundColor: r.color,
          }}
        />
      ))}
    </div>
  );
}
