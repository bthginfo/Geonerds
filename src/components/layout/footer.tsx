"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";

const PAYPAL_URL = "https://paypal.me/JuliusIngelheim";

export function Footer() {
  const { t } = useT();
  const pathname = usePathname();
  // Keep games chrome-free.
  if (pathname.startsWith("/play/") || pathname.startsWith("/wine-nerds") || pathname.startsWith("/poke-nerds")) return null;

  return (
    <footer className="geo-nav-spacer mt-auto border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} GeoNerds · {t("footer.tagline")}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="inline-flex min-h-11 items-center rounded-md transition-colors hover:text-foreground">
            {t("footer.privacy")}
          </Link>
          <Link href="/impressum" className="inline-flex min-h-11 items-center rounded-md transition-colors hover:text-foreground">
            {t("footer.imprint")}
          </Link>
          <Link href="/how-to" className="inline-flex min-h-11 items-center rounded-md transition-colors hover:text-foreground">
            {t("nav.howto")}
          </Link>
          <a
            href={PAYPAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 rounded-md transition-colors hover:text-foreground"
          >
            <Coffee className="h-3 w-3" />
            {t("footer.support")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
