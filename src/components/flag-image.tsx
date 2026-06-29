"use client";

import { cn } from "@/lib/utils";

// Flags whose true aspect ratio isn't 4:3 — use the 1:1 source and contain it
// so they aren't stretched (Switzerland & Vatican are square; Nepal is a pennant).
const SQUARE_FLAGS = new Set(["ch", "va", "np"]);

// Plain banded flags whose real proportions differ from 4:3. Rendering their
// true width/height lets near-identical flags be told apart by shape — e.g.
// Monaco (4:5) is clearly less wide than Indonesia (2:3), and Poland is 5:8.
// Only solid-band flags (no crests/emblems) are listed, so stretching the
// bands stays perfectly accurate. Values are aspect-ratio (width / height).
const FLAG_RATIOS: Record<string, string> = {
  // 1:2 — very wide
  ie: "2 / 1", // Ireland
  ng: "2 / 1", // Nigeria
  hu: "2 / 1", // Hungary
  am: "2 / 1", // Armenia
  // 3:5
  de: "5 / 3", // Germany
  bg: "5 / 3", // Bulgaria
  lt: "5 / 3", // Lithuania
  lu: "5 / 3", // Luxembourg
  // 7:11
  ee: "11 / 7", // Estonia
  // 5:8
  pl: "8 / 5", // Poland
  // 2:3
  id: "3 / 2", // Indonesia
  ua: "3 / 2", // Ukraine
  fr: "3 / 2", // France
  it: "3 / 2", // Italy
  nl: "3 / 2", // Netherlands
  ru: "3 / 2", // Russia
  at: "3 / 2", // Austria
  ro: "3 / 2", // Romania
  co: "3 / 2", // Colombia
  ye: "3 / 2", // Yemen
  ci: "3 / 2", // Côte d'Ivoire
  ml: "3 / 2", // Mali
  gn: "3 / 2", // Guinea
  sl: "3 / 2", // Sierra Leone
  // 4:5 / 13:15 — nearly square
  mc: "5 / 4", // Monaco
  be: "15 / 13", // Belgium
};

interface FlagImageProps {
  code: string;
  alt?: string;
  className?: string;
  /** Kept for API compatibility; text is no longer obscured. */
  hideText?: boolean;
  rounded?: boolean;
}

export function FlagImage({ code, alt = "", className, rounded = true }: FlagImageProps) {
  const square = SQUARE_FLAGS.has(code);
  const ratio = FLAG_RATIOS[code];
  const src = square ? `/flags1x1/${code}.svg` : `/flags/${code}.svg`;
  // Inline aspect-ratio overrides any aspect-[4/3] the caller passed, so the
  // wrapper matches the flag's true shape with no empty border around it.
  const aspect = square ? "1 / 1" : ratio;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden ring-1 ring-black/10",
        // Square/pennant flags hug their real ratio, so no muted bars show.
        square ? "bg-transparent" : "bg-muted",
        rounded && "rounded-lg",
        className
      )}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={cn(
          "h-full w-full",
          square ? "object-contain" : ratio ? "object-fill" : "object-cover"
        )}
      />
    </div>
  );
}
