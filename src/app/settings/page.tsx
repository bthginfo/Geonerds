"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowLeft, Languages, Palette, Volume2, Database, Vibrate, Loader2 } from "lucide-react";
import { AccountPanel } from "@/components/account/account-panel";
import { useT } from "@/i18n/I18nProvider";
import { useSettings } from "@/store/settings";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { scoreStore } from "@/lib/leaderboard/local";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { clearGameplayStorage } from "@/lib/reset";

export default function SettingsPage() {
  const { t, locale } = useT();
  const { setLocale, sound, setSound, haptics, setHaptics } = useSettings();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState(false);
  const clearLock = useRef(false);
  useEffect(() => setMounted(true), []);
  const de = locale === "de";

  async function clearData() {
    if (clearLock.current) return;
    clearLock.current = true;
    setClearing(true);
    setClearError(false);
    try {
      await scoreStore.clear();
      clearGameplayStorage(localStorage);
      localStorage.removeItem("geonerds-settings");
      location.reload();
    } catch {
      clearLock.current = false;
      setClearing(false);
      setClearError(true);
    }
  }

  return <div className="mx-auto w-full min-w-0 max-w-2xl px-4 py-6 pb-28 sm:py-8">
    <Link href="/profile" className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" aria-hidden />{t("nav.profile")}</Link>
    <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{de ? "Mach GeoNerds zu deinem Ort zum Spielen." : "Make GeoNerds feel right for you."}</p>
    <section className="mt-7" aria-labelledby="settings-account-title"><h2 id="settings-account-title" className="mb-3 text-base font-semibold">{t("account.title")}</h2><AccountPanel /></section>
    <section className="mt-7" aria-labelledby="settings-preferences-title">
      <h2 id="settings-preferences-title" className="mb-3 text-base font-semibold">{de ? "Anzeige & Sprache" : "Appearance & language"}</h2>
      <div className="geo-surface divide-y divide-border">
        <Section icon={<Languages className="h-5 w-5" />} title={t("settings.language")}><Segmented label={t("settings.language")} value={locale} options={[{ value: "en", label: "English" }, { value: "de", label: "Deutsch" }]} onChange={(value) => setLocale(value as Locale)} /></Section>
        <Section icon={<Palette className="h-5 w-5" />} title={t("settings.theme")} description={de ? "„System“ folgt dem Modus deines Geräts." : "System follows your device’s appearance."}><Segmented label={t("settings.theme")} value={mounted ? theme ?? "system" : "system"} options={[{ value: "light", label: t("settings.theme.light") }, { value: "dark", label: t("settings.theme.dark") }, { value: "system", label: t("settings.theme.system") }]} onChange={setTheme} /></Section>
      </div>
    </section>
    <section className="mt-7" aria-labelledby="settings-feedback-title">
      <h2 id="settings-feedback-title" className="mb-3 text-base font-semibold">{de ? "Spiel-Feedback" : "Game feedback"}</h2>
      <div className="geo-surface divide-y divide-border">
        <Section icon={<Volume2 className="h-5 w-5" />} title={t("settings.sound")} description={de ? "Kurze Töne bei Antworten und Erfolgen." : "Short sounds for answers and achievements."}><Switch label={t("settings.sound")} checked={sound} onChange={setSound} /></Section>
        <Section icon={<Vibrate className="h-5 w-5" />} title={t("settings.haptics")} description={de ? "Sanfte Vibration, wenn dein Gerät sie unterstützt." : "Gentle vibration where your device supports it."}><Switch label={t("settings.haptics")} checked={haptics} onChange={setHaptics} /></Section>
      </div>
    </section>
    <details className="geo-surface mt-7 p-4 sm:p-5"><summary className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Database className="h-5 w-5 text-muted-foreground" aria-hidden />{t("settings.data")}</summary><p className="mb-4 mt-3 text-sm leading-relaxed text-muted-foreground">{de ? "Lokale Spielstände und Einstellungen dieses Browsers verwalten. Dein Online-Konto wird hierdurch nicht gelöscht." : "Manage saved games and settings in this browser. This does not delete your online account."}</p><Button variant="outline" className="text-danger" onClick={() => { setClearError(false); setConfirmOpen(true); }}>{t("settings.clearData")}</Button></details>
    <Modal open={confirmOpen} onClose={() => { if (!clearing) setConfirmOpen(false); }} title={de ? "Daten auf diesem Gerät löschen?" : "Clear data on this device?"}>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("settings.clearConfirm")}</p><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{de ? "Dein Online-Konto und veröffentlichte Ergebnisse bleiben bestehen. Lokale Fortschritte lassen sich nicht wiederherstellen." : "Your online account and published scores remain. Local progress cannot be restored."}</p>
      {clearError && <p role="alert" className="mt-4 text-sm text-danger">{de ? "Die Daten konnten nicht vollständig gelöscht werden. Bitte versuche es erneut." : "The data could not be fully cleared. Please try again."}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3"><Button data-autofocus variant="secondary" disabled={clearing} onClick={() => setConfirmOpen(false)}>{de ? "Abbrechen" : "Cancel"}</Button><Button variant="danger" disabled={clearing} onClick={() => void clearData()}>{clearing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{de ? "Lokale Daten löschen" : "Clear local data"}</Button></div>
    </Modal>
  </div>;
}

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5"><div className="flex min-w-0 flex-1 items-start gap-3"><span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden>{icon}</span><div className="min-w-0"><p className="font-medium">{title}</p>{description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>}</div></div><div className="max-w-full self-end sm:self-auto">{children}</div></div>;
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <div className="geo-segmented flex max-w-full flex-wrap" aria-label={label}>{options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className="geo-segment flex-1">{option.label}</button>)}</div>;
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-11 min-w-14 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className={cn("inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors", checked ? "bg-primary" : "bg-input")}><span className={cn("inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none", checked ? "translate-x-5" : "translate-x-0")} /></span></button>;
}
