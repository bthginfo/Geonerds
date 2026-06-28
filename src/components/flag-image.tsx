"use client";

import { cn } from "@/lib/utils";

/**
 * Flags whose lettering would give the country away. We blur just the text
 * region (percentages of the 4:3 flag box) so the flag stays recognisable
 * while the name/motto becomes unreadable.
 */
const FLAG_OBSCURE: Record<string, { x: number; y: number; w: number; h: number }[]> = {
  br: [{ x: 33, y: 39, w: 34, h: 22 }], // "ORDEM E PROGRESSO"
  sv: [{ x: 35, y: 28, w: 30, h: 44 }], // coat of arms text ring
  ni: [{ x: 37, y: 33, w: 26, h: 34 }], // "REPUBLICA DE NICARAGUA"
  cr: [{ x: 30, y: 30, w: 26, h: 40 }], // "REPUBLICA COSTA RICA"
  bo: [{ x: 35, y: 28, w: 30, h: 44 }], // "BOLIVIA"
  do: [{ x: 39, y: 28, w: 22, h: 44 }], // "República Dominicana"
  gt: [{ x: 36, y: 38, w: 28, h: 24 }], // scroll text
  bn: [{ x: 28, y: 58, w: 44, h: 20 }], // Jawi banner naming Brunei
};

interface FlagImageProps {
  code: string;
  alt?: string;
  className?: string;
  /** Obscure giveaway text (used in quizzes; off for reveal/results). */
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
      <img
        src={`/flags/${code}.svg`}
        alt={alt}
        draggable={false}
        className="h-full w-full object-cover"
      />
      {regions?.map((r, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute backdrop-blur-md"
          style={{
            left: `${r.x}%`,
            top: `${r.y}%`,
            width: `${r.w}%`,
            height: `${r.h}%`,
          }}
        />
      ))}
    </div>
  );
}
