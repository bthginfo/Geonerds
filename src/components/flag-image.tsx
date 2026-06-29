"use client";

import { cn } from "@/lib/utils";

// Flags whose true aspect ratio isn't 4:3 — use the 1:1 source and contain it
// so they aren't stretched (Switzerland & Vatican are square; Nepal is a pennant).
const SQUARE_FLAGS = new Set(["ch", "va", "np"]);

// Plain banded flags whose real proportions differ from 4:3. Rendering their
// true width/height lets near-identical flags be told apart by shape — e.g.
// Monaco (4:5) is clearly less wide than Indonesia (2:3), and Poland is 5:8.
// Only solid-band flags are listed, so stretching the bands stays accurate.
const FLAG_RATIOS: Record<string, string> = {
  mc: "5 / 4", // Monaco 4:5
  id: "3 / 2", // Indonesia 2:3
  pl: "8 / 5", // Poland 5:8
  ua: "3 / 2", // Ukraine 2:3
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
