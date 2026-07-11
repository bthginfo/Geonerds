import outlines from "@/data/country-outlines.json";
import { cn } from "@/lib/utils";

export interface CountryOutlineProps {
  cca3: string;
  className?: string;
  pathClassName?: string;
  label?: string;
  decorative?: boolean;
}

export function CountryOutline({
  cca3,
  className,
  pathClassName = "fill-sky-500 stroke-sky-700 dark:fill-sky-400 dark:stroke-sky-200",
  label,
  decorative = false,
}: CountryOutlineProps) {
  const outline = outlines.countries[cca3 as keyof typeof outlines.countries];
  if (!outline) return null;
  const accessibility = decorative
    ? { "aria-hidden": true as const }
    : { role: "img", "aria-label": label ?? "Country outline" };

  return (
    <svg viewBox={outlines.viewBox} className={cn("h-full w-full", className)} preserveAspectRatio="xMidYMid meet" {...accessibility}>
      <path
        d={outline.d}
        className={cn("drop-shadow-sm", pathClassName)}
        strokeWidth={1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
