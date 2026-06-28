"use client";

import { UserCircle2, LogOut } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { AuthForm } from "./auth-form";

export function AccountPanel() {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const configured = useAuth((s) => s.configured);
  const loaded = useAuth((s) => s.loaded);
  const logout = useAuth((s) => s.logout);

  if (!loaded) return null;

  if (!configured) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
        {t("account.err.not_configured")}
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <UserCircle2 className="h-9 w-9 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">{t("account.signedInAs")}</div>
            <div className="font-semibold">{user.name}</div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          {t("account.logout")}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm text-muted-foreground">{t("account.subtitle")}</p>
      <AuthForm />
    </div>
  );
}
