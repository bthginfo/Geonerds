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
  compactMobileTitle = false,
}: {
  title: string;
  onExit?: () => void;
  children?: React.ReactNode;
  /** Hide the visual title below 420px when a game needs a wider status cluster. */
  compactMobileTitle?: boolean;
}) {
  return (
    <div
      className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md"
      role="banner"
      aria-label={title}
    >
      <div className="mx-auto grid h-14 w-full max-w-3xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5 px-3 sm:gap-2">
        {onExit ? (
          <button
            onClick={onExit}
            aria-label="Exit"
            className="col-start-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <Link
            href="/"
            aria-label="Exit"
            className="col-start-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Link>
        )}
        <div
          className={cn(
            "col-start-2 min-w-0 truncate text-xs font-semibold min-[420px]:text-sm",
            compactMobileTitle && "max-[419px]:hidden"
          )}
        >
          {title}
        </div>
        <div className="col-start-3 flex min-w-max items-center justify-end gap-1 sm:gap-1.5">{children}</div>
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
      className="flex min-w-0 items-center gap-1 rounded-full bg-primary/10 px-1.5 py-1 text-xs font-bold tabular-nums text-primary min-[420px]:px-2.5 min-[420px]:text-sm"
    >
      <Star className="h-3.5 w-3.5" />
      {formatNumber(value, locale)}
    </motion.div>
  );
}

export function StreakPill({ value }: { value: number }) {
  if (value < 2) return null;
  return (
    <div className="flex items-center gap-1 rounded-full bg-orange-500/15 px-1.5 py-1 text-xs font-bold tabular-nums text-orange-500 min-[420px]:px-2.5 min-[420px]:text-sm">
      <Flame className="h-3.5 w-3.5" />
      {value}
    </div>
  );
}

export function LivesPill({ lives, max }: { lives: number; max: number }) {
  return (
    <div className="flex items-center gap-0 rounded-full bg-muted px-1 py-1 min-[420px]:gap-0.5 min-[420px]:px-2">
      {Array.from({ length: max }).map((_, i) => (
        <Heart
          key={i}
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
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-1.5 py-1 text-xs font-bold tabular-nums min-[420px]:px-2.5 min-[420px]:text-sm",
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
    <div className="rounded-full bg-muted px-1.5 py-1 text-xs font-semibold tabular-nums text-muted-foreground min-[420px]:px-2.5 min-[420px]:text-sm">
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
