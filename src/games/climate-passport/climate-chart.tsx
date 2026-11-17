"use client";

import { useId, useState } from "react";
import { CloudRain, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClimateChartProps {
  temperatureC: readonly number[];
  precipitationMm: readonly number[];
  locale: "en" | "de";
}

const MONTHS = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
} as const;

const SHORT_MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  de: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
} as const;

function radialPoint(radius: number, angle: number) {
  return [140 + radius * Math.sin(angle), 140 - radius * Math.cos(angle)];
}

function rainSector(month: number, radius: number) {
  const start = (month / 12) * Math.PI * 2 + 0.025;
  const end = ((month + 1) / 12) * Math.PI * 2 - 0.025;
  const innerStart = radialPoint(36, start);
  const outerStart = radialPoint(radius, start);
  const outerEnd = radialPoint(radius, end);
  const innerEnd = radialPoint(36, end);
  return `M ${innerStart.join(" ")} L ${outerStart.join(" ")} A ${radius} ${radius} 0 0 1 ${outerEnd.join(" ")} L ${innerEnd.join(" ")} A 36 36 0 0 0 ${innerStart.join(" ")} Z`;
}

/** Sourced monthly climate values stay inspectable without hover or color perception. */
export function ClimateChart({ temperatureC, precipitationMm, locale }: ClimateChartProps) {
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<"charts" | "wheel">("charts");
  const descriptionId = useId();
  const de = locale === "de";
  const decimalFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const integerFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const number = (value: number, digits = 1) => (digits === 0 ? integerFormat : decimalFormat).format(value);
  const months = MONTHS[locale];
  const shortMonths = SHORT_MONTHS[locale];
  const temperatureMin = Math.floor(Math.min(0, ...temperatureC) / 10) * 10;
  const temperatureMax = Math.max(temperatureMin + 10, Math.ceil(Math.max(...temperatureC) / 10) * 10);
  const rainMax = Math.max(50, Math.ceil(Math.max(...precipitationMm) / 50) * 50);
  const x = (index: number) => (index + 0.5) * 50;
  const temperatureY = (value: number) => 116 - (value - temperatureMin) / (temperatureMax - temperatureMin) * 108;
  const temperatureLine = temperatureC.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${temperatureY(value)}`).join(" ");
  const monthSummary = `${months[selected]}: ${number(temperatureC[selected])} °C, ${number(precipitationMm[selected], 0)} ${de ? "mm Niederschlag" : "mm precipitation"}`;

  return <section className="min-w-0 rounded-2xl bg-card p-4 sm:p-5" aria-label={de ? "Klimadiagramm" : "Climate evidence"}>
    <div className="geo-segmented mb-5 flex" role="group" aria-label={de ? "Diagrammansicht" : "Chart view"}>
      {(["charts", "wheel"] as const).map((option) => <button key={option} type="button" aria-pressed={view === option}
        onClick={() => setView(option)} className="geo-segment min-h-11 min-w-0 flex-1 px-2 text-sm">
        {option === "charts" ? de ? "Diagramme" : "Monthly charts" : de ? "Niederschlag" : "Precipitation wheel"}
      </button>)}
    </div>

    {view === "charts" ? <div className="space-y-5" aria-describedby={descriptionId}>
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Thermometer className="h-4 w-4 text-warning" aria-hidden />{de ? "Temperatur" : "Temperature"}<span className="ml-auto text-xs font-medium text-muted-foreground">°C</span></p>
        <div className="flex gap-2">
          <div className="relative h-28 w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground" aria-hidden>
            <span className="absolute right-0 top-0">{temperatureMax}</span>
            <span className="absolute right-0 top-1/2 -translate-y-1/2">{number((temperatureMax + temperatureMin) / 2, 0)}</span>
            <span className="absolute bottom-0 right-0">{temperatureMin}</span>
          </div>
          <svg viewBox="0 0 600 124" preserveAspectRatio="none" className="h-28 min-w-0 flex-1 overflow-visible" aria-hidden="true">
            {[8, 62, 116].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
            {temperatureMin < 0 && temperatureMax > 0 && <line x1="0" x2="600" y1={temperatureY(0)} y2={temperatureY(0)} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
            <rect x={selected * 50} y="0" width="50" height="124" fill="var(--primary)" opacity="0.08" />
            <path d={temperatureLine} fill="none" stroke="var(--warning)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {temperatureC.map((value, index) => <circle key={index} cx={x(index)} cy={temperatureY(value)} r={index === selected ? 5 : 3} fill={index === selected ? "var(--foreground)" : "var(--warning)"} />)}
          </svg>
        </div>
        <div className="ml-10 mt-1 grid grid-cols-12 text-center text-xs text-muted-foreground" aria-hidden>{shortMonths.map((month, index) => <span key={index}>{month[0]}</span>)}</div>
      </div>
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><CloudRain className="h-4 w-4 text-primary" aria-hidden />{de ? "Niederschlag" : "Precipitation"}<span className="ml-auto text-xs font-medium text-muted-foreground">{de ? "mm / Monat" : "mm / month"}</span></p>
        <div className="flex gap-2">
          <div className="relative h-28 w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground" aria-hidden>
            <span className="absolute right-0 top-0">{rainMax}</span>
            <span className="absolute right-0 top-1/2 -translate-y-1/2">{number(rainMax / 2, 0)}</span>
            <span className="absolute bottom-0 right-0">0</span>
          </div>
          <svg viewBox="0 0 600 124" preserveAspectRatio="none" className="h-28 min-w-0 flex-1" aria-hidden="true">
            {[8, 62, 116].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
            <rect x={selected * 50} y="0" width="50" height="124" fill="var(--primary)" opacity="0.08" />
            {precipitationMm.map((value, index) => {
              const height = value / rainMax * 108;
              return <rect key={index} x={index * 50 + 9} y={116 - height} width="32" height={height} rx="3" fill={index === selected ? "var(--foreground)" : "var(--primary)"} />;
            })}
          </svg>
        </div>
        <div className="ml-10 mt-1 grid grid-cols-12 text-center text-xs text-muted-foreground" aria-hidden>{shortMonths.map((month, index) => <span key={index}>{month[0]}</span>)}</div>
      </div>
    </div> : <div className="text-center">
      <p className="text-sm font-semibold">{de ? "Niederschlag im Jahresverlauf" : "Precipitation through the year"}</p>
      <svg viewBox="0 0 280 280" className="mx-auto w-full max-w-64" aria-hidden="true">
        <circle cx="140" cy="140" r="104" fill="none" stroke="var(--border)" strokeDasharray="3 4" />
        {precipitationMm.map((value, index) => {
          const label = radialPoint(122, (index + 0.5) / 12 * Math.PI * 2);
          return <g key={index}>
            <path d={rainSector(index, 36 + value / rainMax * 68)} fill={index === selected ? "var(--foreground)" : "var(--primary)"} />
            <text x={label[0]} y={label[1]} dy="0.35em" textAnchor="middle" fill="var(--muted-foreground)" fontSize="13" fontFamily="inherit">{shortMonths[index]}</text>
          </g>;
        })}
        <text x="140" y="137" textAnchor="middle" fontSize="16" fill="var(--foreground)" fontWeight="700">{number(precipitationMm[selected], 0)}</text>
        <text x="140" y="154" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">mm</text>
      </svg>
      <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">{de ? `Längere Segmente bedeuten mehr Niederschlag. Der äußere Kreis entspricht ${number(rainMax, 0)} mm pro Monat.` : `Longer segments mean more precipitation. The outer circle represents ${number(rainMax, 0)} mm per month.`}</p>
    </div>}

    <div className="mt-5 rounded-xl bg-muted px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm" role="status" aria-live="polite" aria-atomic="true">
        <span className="font-bold">{months[selected]}</span>
        <span className="flex flex-wrap gap-x-3 gap-y-1 tabular-nums"><span>{number(temperatureC[selected])} °C</span><span>{number(precipitationMm[selected], 0)} mm</span></span>
      </div>
      <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-muted-foreground">{de ? "Wähle einen Monat, um seine Werte zu vergleichen. Die beiden Diagramme haben unterschiedliche Skalen." : "Choose a month to compare its values. The two charts use separate scales."}</p>
    </div>
    <div className="mt-2 grid grid-cols-6 gap-1" role="group" aria-label={de ? "Monat auswählen" : "Inspect a month"}>
      {shortMonths.map((month, index) => <button key={index} type="button" aria-pressed={selected === index}
        aria-label={`${months[index]}: ${number(temperatureC[index])} °C, ${number(precipitationMm[index], 0)} ${de ? "mm Niederschlag" : "mm precipitation"}`}
        onClick={() => setSelected(index)} className={cn("min-h-11 min-w-0 rounded-lg px-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none", selected === index ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
        {month}
      </button>)}
    </div>
    <table className="sr-only">
      <caption>{de ? "Monatliche Klimamittelwerte" : "Monthly climate averages"}</caption>
      <thead><tr><th scope="col">{de ? "Monat" : "Month"}</th><th scope="col">°C</th><th scope="col">{de ? "Niederschlag in mm" : "Precipitation in mm"}</th></tr></thead>
      <tbody>{months.map((month, index) => <tr key={month}><th scope="row">{month}</th><td>{number(temperatureC[index])}</td><td>{number(precipitationMm[index], 0)}</td></tr>)}</tbody>
    </table>
    <span className="sr-only">{monthSummary}</span>
  </section>;
}
