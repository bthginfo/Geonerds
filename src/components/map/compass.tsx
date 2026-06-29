"use client";

import { useT } from "@/i18n/I18nProvider";

/** N/E/S/W edge labels (German: N/O/S/W). Maps are always north-up. */
export function Compass() {
  const { locale } = useT();
  const east = locale === "de" ? "O" : "E";
  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none text-[11px] font-bold text-foreground/45">
      <span className="absolute left-1/2 top-1 -translate-x-1/2">N</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2">S</span>
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{east}</span>
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2">W</span>
    </div>
  );
}
