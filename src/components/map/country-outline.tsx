import { cn } from "@/lib/utils";

export interface CountryOutlineProps {
  /** The shape is deliberately passed in by an unlocked discovery payload. */
  d: string;
  className?: string;
  pathClassName?: string;
  label?: string;
  decorative?: boolean;
}

export function CountryOutline({
  d,
  className,
  pathClassName = "fill-sky-500 stroke-sky-700 dark:fill-sky-400 dark:stroke-sky-200",
  label,
  decorative = false,
}: CountryOutlineProps) {
  if (!d) return null;
  const accessibility = decorative
    ? { "aria-hidden": true as const }
    : { role: "img", "aria-label": label ?? "Country outline" };

  return (
    <svg viewBox="0 0 280 280" className={cn("h-full w-full", className)} preserveAspectRatio="xMidYMid meet" {...accessibility}>
      <path
        d={d}
        className={cn("drop-shadow-sm", pathClassName)}
        strokeWidth={1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
