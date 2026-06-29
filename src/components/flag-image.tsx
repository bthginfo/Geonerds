"use client";

import { cn } from "@/lib/utils";
import ratios from "@/data/flag-ratios.json";

// True width/height aspect ratio per flag (from the real, proportioned SVGs).
const RATIOS = ratios as Record<string, number>;

interface FlagImageProps {
  code: string;
  alt?: string;
  className?: string;
  /** Kept for API compatibility; text is no longer obscured. */
  hideText?: boolean;
  rounded?: boolean;
}

export function FlagImage({ code, alt = "", className, rounded = true }: FlagImageProps) {
  const ratio = RATIOS[code];
  const src = `/flags-true/${code}.svg`;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-transparent ring-1 ring-black/10",
        rounded && "rounded-lg",
        className
      )}
      // Use the flag's real proportions; this overrides any aspect-[4/3] the
      // caller passed, so every flag is shown at its true shape with no bars.
      style={ratio ? { aspectRatio: String(ratio) } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className="h-full w-full object-contain" />
    </div>
  );
}
