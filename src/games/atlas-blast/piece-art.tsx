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
 * variables --cell and --gap on an ancestor (or the style prop). With
 * `fit`, the layout box also includes the outline (islands may reach past
 * the blocks) and shrinks so the longer side spans at most `fit` cells.
 */
export function PieceBlocks({
  shape,
  flag,
  showOutline = true,
  fit,
  className,
  style,
}: {
  shape: PieceShape;
  /** Flag code to fill the blocks with; null for the neutral colour. */
  flag: string | null;
  showOutline?: boolean;
  fit?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const pitch = "(var(--pc) + var(--pg))";
  const [minX, minY, maxX, maxY] = shape.box;
  const pad = 2;
  const u = OUTLINE_UNITS;
  // Include the outline in the layout box only when it is drawn.
  const withOutline = Boolean(fit) && showOutline;
  const x0 = withOutline ? Math.min(0, minX - pad) : 0;
  const y0 = withOutline ? Math.min(0, minY - pad) : 0;
  const x1 = withOutline ? Math.max(shape.w * u, maxX + pad) : shape.w * u;
  const y1 = withOutline ? Math.max(shape.h * u, maxY + pad) : shape.h * u;
  const scale = fit ? Math.min(1, (fit * u) / Math.max(x1 - x0, y1 - y0)) : 1;
  const vars = { "--pc": `calc(var(--cell) * ${scale.toFixed(3)})`, "--pg": `calc(var(--gap) * ${scale.toFixed(3)})` } as CSSProperties;
  return (
    <div
      aria-hidden
      className={cn("relative shrink-0", className)}
      style={{
        ...vars,
        width: fit ? `calc(${(x1 - x0) / u} * ${pitch})` : `calc(${shape.w} * var(--pc) + ${shape.w - 1} * var(--pg))`,
        height: fit ? `calc(${(y1 - y0) / u} * ${pitch})` : `calc(${shape.h} * var(--pc) + ${shape.h - 1} * var(--pg))`,
        ...style,
      }}
    >
      <div
        data-blocks
        className="absolute"
        style={{
          left: `calc(${-x0 / u} * ${pitch})`,
          top: `calc(${-y0 / u} * ${pitch})`,
          width: `calc(${shape.w} * var(--pc) + ${shape.w - 1} * var(--pg))`,
          height: `calc(${shape.h} * var(--pc) + ${shape.h - 1} * var(--pg))`,
        }}
      >
        {shape.cells.map(([r, c]) => (
          <span
            key={`${r}-${c}`}
            className={cn("absolute rounded-[22%]", blockClass(flag))}
            style={{
              left: `calc(${c} * ${pitch})`,
              top: `calc(${r} * ${pitch})`,
              width: "var(--pc)",
              height: "var(--pc)",
              ...(flag ? flagSliceStyle(flag, shape.w, shape.h, r, c) : null),
            }}
          />
        ))}
        {showOutline && (
          <svg
            className="pointer-events-none absolute overflow-visible"
            style={{
              left: `calc(${(minX - pad) / u} * ${pitch})`,
              top: `calc(${(minY - pad) / u} * ${pitch})`,
              width: `calc(${(maxX - minX + 2 * pad) / u} * ${pitch})`,
              height: `calc(${(maxY - minY + 2 * pad) / u} * ${pitch})`,
            }}
            viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`}
            preserveAspectRatio="none"
          >
            <path d={shape.outline} className="fill-none stroke-white/85 dark:stroke-slate-950/85" strokeWidth={3.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={shape.outline} className="fill-slate-900/10 stroke-slate-900 dark:fill-white/10 dark:stroke-white" strokeWidth={1.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>
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
