"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy, Share2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { msUntilNextDaily, shareText } from "./puzzle-kit";

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * End-of-puzzle panel shared by the daily-format games: outcome, a spoiler-free
 * share text, the countdown to the next daily board and the Continue action
 * that hands the run to the regular results screen.
 */
export function PuzzleWrapUp({
  solved,
  title,
  detail,
  share,
  daily,
  onContinue,
  className,
}: {
  solved: boolean;
  title: string;
  detail?: string;
  /** Spoiler-free text for sharing; omit to hide the share action. */
  share?: string;
  daily: boolean;
  onContinue: () => void;
  className?: string;
}) {
  const { locale } = useT();
  const de = locale === "de";
  const [status, setStatus] = useState<"idle" | "shared" | "copied" | "failed">("idle");
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!daily) return;
    const tick = () => setLeft(msUntilNextDaily());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [daily]);

  return (
    <section
      aria-live="polite"
      className={cn(
        "rounded-3xl border p-5 text-center shadow-sm",
        solved ? "border-success/40 bg-success/10" : "border-border bg-card",
        className,
      )}
    >
      <p className={cn("text-lg font-bold", solved ? "text-success" : "text-foreground")}>{title}</p>
      {detail && <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{detail}</p>}
      {share && (
        <pre className="mx-auto mt-4 w-fit max-w-full whitespace-pre-wrap break-words rounded-2xl bg-muted/70 px-4 py-3 text-left font-mono text-sm leading-snug" aria-label={de ? "Ergebnis zum Teilen" : "Shareable result"}>{share}</pre>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {share && (
          <Button variant="outline" className="gap-2" onClick={async () => setStatus(await shareText(share))}>
            {status === "copied" ? <Check className="h-4 w-4" aria-hidden /> : status === "shared" ? <Check className="h-4 w-4" aria-hidden /> : typeof navigator !== "undefined" && "share" in navigator ? <Share2 className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {status === "copied" ? (de ? "Kopiert" : "Copied") : status === "shared" ? (de ? "Geteilt" : "Shared") : (de ? "Ergebnis teilen" : "Share result")}
          </Button>
        )}
        <Button className="gap-2" onClick={onContinue}>
          {de ? "Weiter" : "Continue"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      {status === "failed" && <p role="status" className="mt-2 text-xs text-muted-foreground">{de ? "Teilen war nicht möglich. Markiere den Text oben, um ihn zu kopieren." : "Sharing was not possible. Select the text above to copy it."}</p>}
      {daily && left !== null && (
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Timer className="h-3.5 w-3.5" aria-hidden />
          {de ? "Nächstes Tagesrätsel in" : "Next daily puzzle in"} <span className="tabular-nums">{formatCountdown(left)}</span>
        </p>
      )}
    </section>
  );
}
