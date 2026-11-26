"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { OUTLINE_UNITS, type PieceShape } from "./engine";

/** Neutral block for pieces whose country has not been named correctly. */
export const NEUTRAL_BLOCK =
  "bg-[oklch(0.6_0.055_255)] dark:bg-[oklch(0.56_0.05_255)] shadow-[inset_0_2px_0_oklch(1_0_0/0.28),inset_0_-3px_0_oklch(0.2_0.03_255/0.25)]";
const FLAG_BLOCK = "bg-muted shadow-[inset_0_2px_0_oklch(1_0_0/0.35),inset_0_-3px_0_oklch(0.15_0.02_255/0.28),inset_0_0_0_1px_oklch(0.15_0.02_255/0.18)]";

export function flagSliceStyle(flag: string, w: number, h: number, r: number, c: number): CSSProperties {
  return {
    backgroundImage: `url(/flags-true/${flag}.svg)`,
    backgroundSize: `${w * 100}% ${h * 100}%`,
    backgroundPosition: `${w > 1 ? (c / (w - 1)) * 100 : 0}% ${h > 1 ? (r / (h - 1)) * 100 : 0}%`,
    backgroundRepeat: "no-repeat",
  };
}

export function blockClass(flag: string | null) {
  return flag ? FLAG_BLOCK : NEUTRAL_BLOCK;
}

/**
 * A piece drawn with absolutely positioned blocks. Size comes from the CSS
 * variables --cell and --gap on an ancestor (or the style prop).
 */
export function PieceBlocks({
  shape,
  flag,
  showOutline = true,
  className,
  style,
}: {
  shape: PieceShape;
  /** Flag code to fill the blocks with; null for the neutral colour. */
  flag: string | null;
  showOutline?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const pitch = "(var(--cell) + var(--gap))";
  const [minX, minY, maxX, maxY] = shape.box;
  const pad = 2;
  return (
    <div
      aria-hidden
      className={cn("relative shrink-0", className)}
      style={{
        width: `calc(${shape.w} * var(--cell) + ${shape.w - 1} * var(--gap))`,
        height: `calc(${shape.h} * var(--cell) + ${shape.h - 1} * var(--gap))`,
        ...style,
      }}
    >
      {shape.cells.map(([r, c]) => (
        <span
          key={`${r}-${c}`}
          className={cn("absolute rounded-[22%]", blockClass(flag))}
          style={{
            left: `calc(${c} * ${pitch})`,
            top: `calc(${r} * ${pitch})`,
            width: "var(--cell)",
            height: "var(--cell)",
            ...(flag ? flagSliceStyle(flag, shape.w, shape.h, r, c) : null),
          }}
        />
      ))}
      {showOutline && (
        <svg
          className="pointer-events-none absolute overflow-visible"
          style={{
            left: `calc(${(minX - pad) / OUTLINE_UNITS} * ${pitch})`,
            top: `calc(${(minY - pad) / OUTLINE_UNITS} * ${pitch})`,
            width: `calc(${(maxX - minX + 2 * pad) / OUTLINE_UNITS} * ${pitch})`,
            height: `calc(${(maxY - minY + 2 * pad) / OUTLINE_UNITS} * ${pitch})`,
          }}
          viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`}
          preserveAspectRatio="none"
        >
          <path d={shape.outline} className="fill-none stroke-white/85 dark:stroke-slate-950/85" strokeWidth={3.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <path d={shape.outline} className="fill-slate-900/10 stroke-slate-900 dark:fill-white/10 dark:stroke-white" strokeWidth={1.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}

/** Stand-alone country outline (used in the naming panel). */
export function CountryOutline({ shape, className }: { shape: PieceShape; className?: string }) {
  const [minX, minY, maxX, maxY] = shape.box;
  const pad = 2;
  return (
    <svg
      aria-hidden
      className={className}
      viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`}
    >
      <path d={shape.outline} className="fill-primary/15 stroke-primary" strokeWidth={1.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
