"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { X, Heart, Flame, Clock, Star } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { formatNumber, formatTime, cn } from "@/lib/utils";

export function GameTopBar({
  title,
  onExit,
  children,
}: {
  title: string;
  onExit?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-3">
        {onExit ? (
          <button
            onClick={onExit}
            aria-label="Exit"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <Link
            href="/"
            aria-label="Exit"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Link>
        )}
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="ml-auto flex items-center gap-1.5">{children}</div>
      </div>
    </div>
  );
}

export function ScorePill({ value }: { value: number }) {
  const { locale } = useT();
  return (
    <motion.div
      key={value}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-bold tabular-nums text-primary"
    >
      <Star className="h-3.5 w-3.5" />
      {formatNumber(value, locale)}
    </motion.div>
  );
}

export function StreakPill({ value }: { value: number }) {
  if (value < 2) return null;
  return (
    <div className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-sm font-bold tabular-nums text-orange-500">
      <Flame className="h-3.5 w-3.5" />
      {value}
    </div>
  );
}

export function LivesPill({ lives, max }: { lives: number; max: number }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-1">
      {Array.from({ length: max }).map((_, i) => (
        <Heart
          key={i}
          className={cn(
            "h-4 w-4",
            i < lives ? "fill-danger text-danger" : "text-muted-foreground/40"
          )}
        />
      ))}
    </div>
  );
}

export function TimerPill({ ms, danger }: { ms: number; danger?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums",
        danger ? "bg-danger/15 text-danger" : "bg-muted text-foreground"
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {formatTime(ms)}
    </div>
  );
}

export function RoundPill({ current, total }: { current: number; total: number }) {
  return (
    <div className="rounded-full bg-muted px-2.5 py-1 text-sm font-semibold tabular-nums text-muted-foreground">
      {current}/{total}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={false}
        animate={{ width: `${Math.min(100, Math.max(0, value)) * 100}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
}
