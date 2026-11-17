"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { X, Heart, Flame, Clock, Star } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { formatNumber, formatTime, cn } from "@/lib/utils";
import { GameHelpButton } from "./game-help";

export function GameTopBar({
  title,
  onExit,
  children,
  compactMobileTitle = false,
}: {
  title: string;
  onExit?: () => void;
  children?: React.ReactNode;
  /** Hide the visual title below 420px when a game needs a wider status cluster. */
  compactMobileTitle?: boolean;
}) {
  const { locale } = useT();
  const exitLabel = locale === "de" ? "Spiel verlassen" : "Exit game";
  return (
    <div
      className="geo-glass sticky top-0 z-30 border-b border-border/60"
      role="region"
      aria-label={title}
    >
      <div className="mx-auto flex min-h-14 w-full max-w-3xl flex-wrap items-center gap-x-1 gap-y-1 px-3 py-1.5 sm:gap-x-2">
        {onExit ? (
          <button
            onClick={onExit}
            aria-label={exitLabel}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <Link
            href="/"
            aria-label={exitLabel}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X className="h-5 w-5" />
          </Link>
        )}
        <div
          className={cn(
            "min-w-0 flex-1 break-words text-sm font-semibold",
            compactMobileTitle && "max-[419px]:text-xs"
          )}
        >
          {title}
        </div>
        <GameHelpButton />
        <div className="flex min-w-0 basis-full flex-wrap items-center justify-end gap-1.5 pb-1 sm:basis-auto sm:pb-0">{children}</div>
      </div>
    </div>
  );
}

export function ScorePill({ value }: { value: number }) {
  const { locale } = useT();
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      key={value}
      initial={{ scale: 1 }}
      animate={{ scale: reducedMotion ? 1 : [1, 1.08, 1] }}
      transition={{ duration: 0.3 }}
      aria-label={`${locale === "de" ? "Punkte" : "Score"}: ${formatNumber(value, locale)}`}
      className="flex min-w-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary min-[420px]:text-sm"
    >
      <Star className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {formatNumber(value, locale)}
    </motion.div>
  );
}

export function StreakPill({ value }: { value: number }) {
  const { locale } = useT();
  if (value < 2) return null;
  return (
    <div aria-label={`${locale === "de" ? "Serie" : "Streak"}: ${value}`} className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-orange-700 dark:text-orange-300 min-[420px]:text-sm">
      <Flame className="h-3.5 w-3.5" aria-hidden />
      {value}
    </div>
  );
}

export function LivesPill({ lives, max }: { lives: number; max: number }) {
  const { locale } = useT();
  return (
    <div aria-label={locale === "de" ? `${lives} von ${max} Leben` : `${lives} of ${max} lives`} className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-1">
      {Array.from({ length: max }).map((_, i) => (
        <Heart
          key={i}
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 min-[420px]:h-4 min-[420px]:w-4",
            i < lives ? "fill-danger text-danger" : "text-muted-foreground/40"
          )}
        />
      ))}
    </div>
  );
}

export function TimerPill({ ms, danger }: { ms: number; danger?: boolean }) {
  const { locale } = useT();
  return (
    <div
      aria-label={`${locale === "de" ? "Verbleibende Zeit" : "Time remaining"}: ${formatTime(ms)}`}
      className={cn(
        "flex items-center gap-1 rounded-full px-1.5 py-1 text-xs font-bold tabular-nums min-[420px]:px-2.5 min-[420px]:text-sm",
        danger ? "bg-danger/15 text-danger" : "bg-muted text-foreground"
      )}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {formatTime(ms)}
    </div>
  );
}

export function RoundPill({ current, total }: { current: number; total: number }) {
  const { locale } = useT();
  return (
    <div aria-label={locale === "de" ? `Runde ${current} von ${total}` : `Round ${current} of ${total}`} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground min-[420px]:text-sm">
      {current}/{total}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const { locale } = useT();
  const reducedMotion = useReducedMotion();
  const progress = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return (
    <div role="progressbar" aria-label={locale === "de" ? "Spielfortschritt" : "Game progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={false}
        animate={{ width: `${progress * 100}%` }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
      />
    </div>
  );
}
