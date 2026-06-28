"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";

export function AuthForm({ onDone }: { onDone?: () => void }) {
  const { t } = useT();
  const login = useAuth((s) => s.login);
  const signup = useAuth((s) => s.signup);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const err = mode === "signin" ? await login(name.trim(), passcode) : await signup(name.trim(), passcode);
    setBusy(false);
    if (err) {
      const known = [
        "name_taken",
        "invalid_credentials",
        "invalid_input",
        "not_configured",
      ];
      setError(t(`account.err.${known.includes(err) ? err : "generic"}`));
      return;
    }
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("account.name")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="username"
          maxLength={20}
          className="h-11 w-full rounded-lg border-2 border-border bg-background px-3 text-base outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("account.passcode")}</label>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          maxLength={64}
          className="h-11 w-full rounded-lg border-2 border-border bg-background px-3 text-base outline-none focus:border-primary"
        />
        {mode === "signup" && (
          <p className="mt-1 text-xs text-muted-foreground">{t("account.passcodeHint")}</p>
        )}
      </div>

      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <Button type="submit" className="w-full gap-2" disabled={busy || name.trim().length < 2 || passcode.length < 4}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "signin" ? t("account.signIn") : t("account.signUp")}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "signin" ? "signup" : "signin"));
          setError(null);
        }}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin" ? t("account.noAccount") : t("account.haveAccount")}
      </button>
    </form>
  );
}
