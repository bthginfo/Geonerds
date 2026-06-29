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
        "relative flex items-center justify-center overflow-hidden bg-muted ring-1 ring-black/10",
        rounded && "rounded-lg",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={cn("h-full w-full", square ? "object-contain p-0.5" : "object-cover")}
      />
    </div>
  );
}
