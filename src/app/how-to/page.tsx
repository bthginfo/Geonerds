"use client";

import Link from "next/link";
import { GAMES } from "@/games/registry";
import { useT } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HowToPage() {
  const { t } = useT();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 pb-24">
      <h1 className="mb-1 text-2xl font-bold">{t("nav.howto")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("app.tagline")}</p>

      <div className="space-y-3">
        {GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <div key={game.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white",
                    game.gradient
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{t(`games.${game.id}.name`)}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`howto.${game.id}`)}</p>
                  <Link href={`/play/${game.id}`}>
                    <Button size="sm" variant="outline" className="mt-3">
                      {t("common.play")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
