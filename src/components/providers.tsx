"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useAuth } from "@/store/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  const refresh = useAuth((s) => s.refresh);
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}
