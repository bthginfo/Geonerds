"use client";

import { cn } from "@/lib/utils";

// Flags whose true aspect ratio isn't 4:3 — use the 1:1 source and contain it
// so they aren't stretched (Switzerland & Vatican are square; Nepal is a pennant).
const SQUARE_FLAGS = new Set(["ch", "va", "np"]);

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
  const src = square ? `/flags1x1/${code}.svg` : `/flags/${code}.svg`;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden ring-1 ring-black/10",
        // Square/pennant flags hug their real ratio, so no muted bars show.
        square ? "bg-transparent" : "bg-muted",
        rounded && "rounded-lg",
        className
      )}
      // Inline aspect-ratio overrides any aspect-[4/3] the caller passed, so the
      // wrapper matches the flag and there's no empty border around it.
      style={square ? { aspectRatio: "1 / 1" } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={cn("h-full w-full", square ? "object-contain" : "object-cover")}
      />
    </div>
  );
}
