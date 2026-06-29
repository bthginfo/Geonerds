"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie } from "lucide-react";
import { useConsent } from "@/store/consent";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

export function CookieBanner() {
  const { t } = useT();
  const acknowledged = useConsent((s) => s.acknowledged);
  const acknowledge = useConsent((s) => s.acknowledge);
  // Avoid hydration mismatch: only render after mount (persist is client-only).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || acknowledged) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4"
        role="dialog"
        aria-label={t("consent.title")}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md sm:flex-row sm:items-center">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{t("consent.title")}</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t("consent.text")}{" "}
              <Link href="/privacy" className="font-medium text-primary underline-offset-2 hover:underline">
                {t("consent.more")}
              </Link>
            </p>
          </div>
          <Button onClick={acknowledge} className="shrink-0 sm:self-center">
            {t("consent.accept")}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
