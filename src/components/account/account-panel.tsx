"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { UserCircle2, LogOut, Loader2, ChevronRight } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { AuthForm } from "./auth-form";

export function AccountPanel() {
  const { t, locale } = useT();
  const user = useAuth((s) => s.user);
  const configured = useAuth((s) => s.configured);
  const loaded = useAuth((s) => s.loaded);
  const logout = useAuth((s) => s.logout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const logoutLock = useRef(false);

  async function signOut() {
    if (logoutLock.current) return;
    logoutLock.current = true;
    setBusy(true);
    setError(false);
    try { await logout(); } catch { setError(true); }
    finally { logoutLock.current = false; setBusy(false); }
  }

  if (!loaded) return <div role="status" className="geo-surface flex min-h-24 items-center gap-3 p-4 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" aria-hidden />{locale === "de" ? "Konto wird geladen …" : "Loading account …"}</div>;

  if (!configured) {
    return (
      <div className="geo-inset p-4 text-sm leading-relaxed text-muted-foreground">
        {t("account.err.not_configured")}
      </div>
    );
  }

  if (user) {
    return (
      <div className="geo-surface p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <UserCircle2 className="h-10 w-10 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{t("account.signedInAs")}</div>
            <div className="break-words font-semibold">{user.name}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5" disabled={busy} onClick={() => void signOut()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogOut className="h-4 w-4" aria-hidden />}
          {t("account.logout")}
        </Button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{locale === "de" ? "Abmelden hat nicht geklappt. Bitte versuche es erneut." : "Sign-out failed. Please try again."}</p>}
        <Link href={`/u/${encodeURIComponent(user.name)}`} className="mt-3 flex min-h-11 items-center justify-between gap-3 border-t border-border pt-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{locale === "de" ? "Dein öffentliches Profil" : "Your public profile"}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
      </div>
    );
  }

  return (
    <div className="geo-surface p-4 sm:p-5">
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{t("account.subtitle")}</p>
      <AuthForm />
    </div>
  );
}
