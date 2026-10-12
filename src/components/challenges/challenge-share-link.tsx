"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";

export function ChallengeShareLink({ path }: { path: string }) {
  const { locale } = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(path);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    setUrl(new URL(path, window.location.origin).href);
    setCanShare(typeof navigator.share === "function");
  }, [path]);

  async function copy() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setCopied(false);
    setFallback(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setFallback(true);
      input.current?.focus();
      input.current?.select();
    } finally { lock.current = false; setBusy(false); }
  }

  async function share() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFallback(false);
    try {
      await navigator.share({ title: "GeoNerds", text: locale === "de" ? "Spiele eine Herausforderung mit mir." : "Play a challenge with me.", url });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setFallback(true);
        input.current?.focus();
        input.current?.select();
      }
    } finally { lock.current = false; setBusy(false); }
  }

  return <div className="min-w-0">
    <label htmlFor={id} className="block text-xs font-semibold">{locale === "de" ? "Einladungslink" : "Invitation link"}</label>
    <input ref={input} id={id} readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="mt-1.5 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    <div className="mt-2 flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={() => void copy()} className="gap-2">{copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}{copied ? (locale === "de" ? "Kopiert" : "Copied") : (locale === "de" ? "Link kopieren" : "Copy link")}</Button>
      {canShare && <Button type="button" variant="outline" disabled={busy} onClick={() => void share()} className="gap-2"><Share2 className="h-4 w-4" aria-hidden />{locale === "de" ? "Teilen" : "Share"}</Button>}
    </div>
    <p role="status" className="mt-2 text-xs leading-relaxed text-muted-foreground">{fallback ? (locale === "de" ? "Automatisches Teilen ist nicht verfügbar. Der Link ist markiert – kopiere ihn manuell." : "Automatic sharing is unavailable. The link is selected — copy it manually.") : copied ? (locale === "de" ? "Der Link ist in deiner Zwischenablage." : "The link is in your clipboard.") : (locale === "de" ? "Du kannst den Link auch direkt im Feld markieren und kopieren." : "You can also select and copy the link directly from the field.")}</p>
  </div>;
}
