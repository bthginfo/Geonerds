"use client";

import { useId, useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { validateName } from "@/lib/validate";

export function AuthForm({ onDone }: { onDone?: () => void }) {
  const { t, locale } = useT();
  const id = useId();
  const login = useAuth((s) => s.login);
  const signup = useAuth((s) => s.signup);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const submitLock = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current) return;
    if (!validateName(name) || passcode.length < 4) {
      setError(t("account.err.invalid_input"));
      return;
    }
    submitLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const err = mode === "signin" ? await login(name.trim(), passcode) : await signup(name.trim(), passcode);
      if (err) {
        const known = ["name_taken", "invalid_credentials", "invalid_input", "not_configured", "rate_limited"];
        setError(t(`account.err.${known.includes(err) ? err : "generic"}`));
        return;
      }
      onDone?.();
    } catch {
      setError(locale === "de" ? "Die Verbindung hat nicht geklappt. Deine Eingaben sind noch da – versuche es erneut." : "We couldn’t connect. Your details are still here — please try again.");
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <div className="geo-segmented grid grid-cols-2" aria-label={locale === "de" ? "Kontoaktion" : "Account action"}>
        {(["signin", "signup"] as const).map((item) => <button key={item} type="button" aria-pressed={mode === item} disabled={busy} onClick={() => { setMode(item); setError(null); }} className="geo-segment">{t(item === "signin" ? "account.signIn" : "account.signUp")}</button>)}
      </div>
      <div>
        <label htmlFor={`${id}-name`} className="mb-2 block text-sm font-semibold">{t("account.name")}</label>
        <input
          id={`${id}-name`}
          name="username"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          minLength={2}
          maxLength={20}
          disabled={busy}
          aria-describedby={`${id}-name-hint`}
          className="geo-control w-full"
        />
        <p id={`${id}-name-hint`} className="mt-2 text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "2–20 Zeichen. Buchstaben, Zahlen, Leerzeichen, Punkt, Bindestrich und Unterstrich." : "2–20 characters. Letters, numbers, spaces, periods, hyphens and underscores."}</p>
      </div>
      <div>
        <label htmlFor={`${id}-passcode`} className="mb-2 block text-sm font-semibold">{t("account.passcode")}</label>
        <div className="relative">
          <input
          id={`${id}-passcode`}
          name="password"
          type={showPasscode ? "text" : "password"}
          value={passcode}
          onChange={(e) => { setPasscode(e.target.value); setError(null); }}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={4}
          maxLength={64}
          disabled={busy}
          aria-describedby={mode === "signup" ? `${id}-passcode-hint` : undefined}
          className="geo-control w-full pr-14"
        />
          <button type="button" disabled={busy} onClick={() => setShowPasscode((value) => !value)} aria-label={showPasscode ? (locale === "de" ? "Passcode ausblenden" : "Hide passcode") : (locale === "de" ? "Passcode anzeigen" : "Show passcode")} aria-pressed={showPasscode} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{showPasscode ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}</button>
        </div>
        {mode === "signup" && (
          <p id={`${id}-passcode-hint`} className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("account.passcodeHint")}</p>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm leading-relaxed text-danger">{error}</p>}

      <Button type="submit" className="w-full gap-2" disabled={busy || name.trim().length < 2 || passcode.length < 4}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {busy ? (locale === "de" ? "Einen Moment …" : "One moment …") : mode === "signin" ? t("account.signIn") : t("account.signUp")}
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">{locale === "de" ? "Deine bisherigen Ergebnisse auf diesem Gerät bleiben erhalten." : "Your existing results on this device stay safe."}</p>
    </form>
  );
}
