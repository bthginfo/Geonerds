"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Languages, Palette, Volume2, Database } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { useSettings } from "@/store/settings";
import { Button } from "@/components/ui/button";
import { scoreStore } from "@/lib/leaderboard/local";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { t } = useT();
  const { locale } = useT();
  const setLocale = useSettings((s) => s.setLocale);
  const sound = useSettings((s) => s.sound);
  const setSound = useSettings((s) => s.setSound);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const themeOptions = [
    { value: "light", label: t("settings.theme.light") },
    { value: "dark", label: t("settings.theme.dark") },
    { value: "system", label: t("settings.theme.system") },
  ];
  const langOptions: { value: Locale; label: string }[] = [
    { value: "en", label: "English" },
    { value: "de", label: "Deutsch" },
  ];

  async function clearData() {
    if (!confirm(t("settings.clearConfirm"))) return;
    await scoreStore.clear();
    localStorage.removeItem("geonerds-settings");
    location.reload();
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 pb-24">
      <h1 className="mb-6 text-2xl font-bold">{t("settings.title")}</h1>

      <Section icon={<Languages className="h-5 w-5" />} title={t("settings.language")}>
        <Segmented
          value={locale}
          options={langOptions}
          onChange={(v) => setLocale(v as Locale)}
        />
      </Section>

      <Section icon={<Palette className="h-5 w-5" />} title={t("settings.theme")}>
        <Segmented
          value={mounted ? theme ?? "system" : "system"}
          options={themeOptions}
          onChange={setTheme}
        />
      </Section>

      <Section icon={<Volume2 className="h-5 w-5" />} title={t("settings.sound")}>
        <button
          role="switch"
          aria-checked={sound}
          onClick={() => setSound(!sound)}
          className={cn(
            "relative h-7 w-12 rounded-full transition-colors",
            sound ? "bg-primary" : "bg-input"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
              sound ? "translate-x-[1.4rem]" : "translate-x-0.5"
            )}
          />
        </button>
      </Section>

      <Section icon={<Database className="h-5 w-5" />} title={t("settings.data")}>
        <Button variant="danger" size="sm" onClick={clearData}>
          {t("settings.clearData")}
        </Button>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium transition-colors",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
