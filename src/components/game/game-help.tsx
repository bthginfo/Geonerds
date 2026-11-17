"use client";

import { createContext, useContext, useState } from "react";
import { CircleHelp, Volume2, Vibrate, Timer } from "lucide-react";
import type { GameId } from "@/lib/types";
import { useT } from "@/i18n/I18nProvider";
import { useSettings } from "@/store/settings";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const GameHelpContext = createContext<(() => void) | null>(null);

export function GameHelpProvider({ gameId, timed, children }: { gameId: GameId; timed: boolean; children: React.ReactNode }) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  return <GameHelpContext.Provider value={() => setOpen(true)}>
    {children}
    <Modal open={open} onClose={() => setOpen(false)} title={t(`games.${gameId}.name`)}>
      <GameHelpContent gameId={gameId} />
      {timed && <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm leading-relaxed text-foreground"><Timer className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{locale === "de" ? "Der Timer läuft weiter, während diese Hilfe geöffnet ist." : "The timer keeps running while this help is open."}</p>}
      <Button className="mt-5 w-full" onClick={() => setOpen(false)}>{locale === "de" ? "Zurück zum Spiel" : "Back to game"}</Button>
    </Modal>
  </GameHelpContext.Provider>;
}

export function GameHelpButton() {
  const open = useContext(GameHelpContext);
  const { t } = useT();
  if (!open) return null;
  return <button type="button" onClick={open} aria-label={t("nav.howto")} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><CircleHelp className="h-5 w-5" aria-hidden /></button>;
}

export function GameHelpContent({ gameId }: { gameId: GameId }) {
  const { t, locale } = useT();
  const sound = useSettings((state) => state.sound);
  const haptics = useSettings((state) => state.haptics);
  const setSound = useSettings((state) => state.setSound);
  const setHaptics = useSettings((state) => state.setHaptics);
  return <>
    <p className="text-sm leading-relaxed text-foreground">{t(`howto.${gameId}`)}</p>
    <fieldset className="geo-inset mt-5 divide-y divide-border/60 overflow-hidden rounded-xl">
      <legend className="mb-2 text-sm font-semibold">{locale === "de" ? "Spiel-Feedback" : "Game feedback"}</legend>
      <FeedbackSwitch checked={sound} onChange={setSound} icon={<Volume2 className="h-4 w-4" aria-hidden />} label={locale === "de" ? "Töne" : "Sound"} />
      <FeedbackSwitch checked={haptics} onChange={setHaptics} icon={<Vibrate className="h-4 w-4" aria-hidden />} label={locale === "de" ? "Vibration, falls unterstützt" : "Vibration, where supported"} />
    </fieldset>
  </>;
}

function FeedbackSwitch({ checked, onChange, icon, label }: { checked: boolean; onChange: (checked: boolean) => void; icon: React.ReactNode; label: string }) {
  return <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2">{icon}{label}</span><input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-6 w-6 shrink-0 accent-primary" /></label>;
}
