"use client";

import { Coffee } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const PAYPAL_URL = "https://paypal.me/JuliusIngelheim";

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
    <div className="border-t border-border px-3 pt-4">
      <h3 className="text-sm font-semibold">{t("support.title")}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {t("support.text")}
      </p>
      <a
        href={PAYPAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-xs font-semibold text-primary hover:underline"
      >
        <Coffee className="h-4 w-4" />
        {t("support.cta")}
      </a>
    </div>
  );
}
