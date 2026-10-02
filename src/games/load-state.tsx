"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";

/** Loading, missing assets and empty filters always offer a way back. */
export function GameLoadState({ onExit, failed = false, empty = false }: {
  onExit: () => void;
  failed?: boolean;
  empty?: boolean;
}) {
  const { t, locale } = useT();
  const message = failed
    ? locale === "de" ? "Die Spieldaten konnten nicht geladen werden. Bitte versuche es erneut." : "The game data could not load. Please try again."
    : empty
    ? locale === "de" ? "Für diese Auswahl sind keine Runden verfügbar." : "No rounds are available for this selection."
    : t("common.loading");
  return <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
    {!failed && !empty && <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />}
    <p role="status" className="max-w-sm text-sm text-muted-foreground">{message}</p>
    <Button variant="outline" onClick={onExit}>{t("nav.home")}</Button>
  </div>;
}
