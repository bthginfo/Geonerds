"use client";

import { Coffee } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const PAYPAL_URL = "https://www.paypal.me/JuliusIngelheim";

/** Inline pill link — used after finishing a level. */
export function SupportLink({ className }: { className?: string }) {
  const { t } = useT();
  return (
    <a
      href={PAYPAL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-amber-600",
        className
      )}
    >
      <Coffee className="h-3.5 w-3.5" />
      {t("support.short")}
    </a>
  );
}

/** Friendly card — used at the bottom of the home page. */
export function SupportCard() {
  const { t } = useT();
  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
        <Coffee className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-bold">{t("support.title")}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {t("support.text")}
      </p>
      <a
        href={PAYPAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
      >
        <Coffee className="h-4 w-4" />
        {t("support.cta")}
      </a>
    </div>
  );
}
