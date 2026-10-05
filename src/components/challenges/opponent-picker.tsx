"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search, UsersRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { apiGeoChallengeUsers, type GeoChallengeUser } from "@/lib/challenge-online";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";

type DirectoryError = { code: string; cursor: string | null; retryAfter?: number };
type PickerProps = { value: string; onChange: (name: string) => void; disabled?: boolean };

function directoryErrorMessage(error: DirectoryError, locale: Locale) {
  if (error.code === "unauthorized") return locale === "de" ? "Bitte melde dich erneut an, um die Spielerliste zu laden." : "Sign in again to load the player list.";
  if (error.code === "rate_limited") {
    if (error.retryAfter && Number.isFinite(error.retryAfter)) {
      const seconds = Math.max(1, Math.ceil(error.retryAfter));
      return locale === "de" ? `Bitte warte ${seconds} Sekunden, bevor du die Spielerliste erneut lädst.` : `Please wait ${seconds} seconds before loading the player list again.`;
    }
    return locale === "de" ? "Die Spielerliste wurde zu oft abgerufen. Bitte warte kurz und versuche es erneut." : "The player list was requested too often. Wait a moment and try again.";
  }
  if (error.code === "invalid_request") return locale === "de" ? "Prüfe deine Suche. Sie darf höchstens 20 Zeichen enthalten." : "Check your search. It can contain up to 20 characters.";
  if (error.code === "not_configured") return locale === "de" ? "Die Spielerliste ist derzeit nicht verfügbar." : "The player list is currently unavailable.";
  if (error.code === "network_error") return locale === "de" ? "Die Spielerliste konnte nicht geladen werden. Prüfe deine Verbindung." : "Could not load the player list. Check your connection.";
  return locale === "de" ? "Die Spielerliste konnte nicht geladen werden. Bitte versuche es erneut." : "Could not load the player list. Please try again.";
}

export function OpponentPicker(props: PickerProps) {
  const user = useAuth((state) => state.user);
  // A different account gets fresh directory state, even without a page navigation.
  return <OpponentField key={user?.id ?? "signed-out"} {...props} userId={user?.id} selfName={user?.name} />;
}

function OpponentField({ value, onChange, disabled = false, userId, selfName }: PickerProps & { userId?: string; selfName?: string }) {
  const { locale } = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<GeoChallengeUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<"initial" | "more" | null>(null);
  const [error, setError] = useState<DirectoryError | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const opponentRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSequence = useRef(0);
  const queryRef = useRef("");
  const selected = Boolean(selectedName && selectedName === value);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => () => {
    requestSequence.current += 1;
    controllerRef.current?.abort();
    if (searchTimer.current !== null) clearTimeout(searchTimer.current);
  }, []);

  function cancelPending() {
    requestSequence.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (searchTimer.current !== null) clearTimeout(searchTimer.current);
    searchTimer.current = null;
  }

  async function loadPlayers(requestQuery: string, cursor: string | null) {
    if (!userId || useAuth.getState().user?.id !== userId || controllerRef.current || requestQuery !== queryRef.current) return;
    const controller = new AbortController();
    const sequence = ++requestSequence.current;
    controllerRef.current = controller;
    setLoading(cursor ? "more" : "initial");
    setError(null);
    const isCurrent = () => !controller.signal.aborted && sequence === requestSequence.current && useAuth.getState().user?.id === userId && requestQuery === queryRef.current;
    try {
      const result = await apiGeoChallengeUsers({ query: requestQuery, cursor, signal: controller.signal });
      if (!isCurrent()) return;
      if (result.error || !result.configured) {
        setError({ code: result.error ?? "not_configured", cursor, retryAfter: result.retryAfter });
        if (result.error === "unauthorized") void useAuth.getState().refresh().catch(() => undefined);
        return;
      }
      setPlayers((previous) => {
        const combined = cursor ? [...previous] : [];
        const seen = new Set(combined.map((player) => player.name));
        for (const player of result.users) {
          if (seen.has(player.name) || player.name.toLocaleLowerCase() === selfName?.toLocaleLowerCase()) continue;
          seen.add(player.name);
          combined.push(player);
        }
        return combined;
      });
      setNextCursor(result.nextCursor);
    } catch {
      if (isCurrent()) setError({ code: "network_error", cursor });
    } finally {
      if (isCurrent()) {
        controllerRef.current = null;
        setLoading(null);
      }
    }
  }

  function closePicker(focusToggle = true) {
    cancelPending();
    setOpen(false);
    setLoading(null);
    if (focusToggle) toggleRef.current?.focus();
  }

  function togglePicker() {
    if (disabled || !userId) return;
    if (open) { closePicker(); return; }
    cancelPending();
    queryRef.current = "";
    setQuery("");
    setPlayers([]);
    setNextCursor(null);
    setError(null);
    setOpen(true);
    void loadPlayers("", null);
  }

  function searchPlayers(nextQuery: string) {
    cancelPending();
    queryRef.current = nextQuery;
    setQuery(nextQuery);
    setPlayers([]);
    setNextCursor(null);
    setError(null);
    setLoading("initial");
    searchTimer.current = setTimeout(() => {
      searchTimer.current = null;
      void loadPlayers(nextQuery, null);
    }, 280);
  }

  function selectPlayer(name: string) {
    if (disabled || loading === "initial" || useAuth.getState().user?.id !== userId) return;
    onChange(name);
    setSelectedName(name);
    closePicker(false);
    opponentRef.current?.focus();
  }

  return <div className="min-w-0">
    <label htmlFor={`${id}-opponent`} className="block text-xs font-semibold">{locale === "de" ? "Benutzername deines Gegenübers" : "Your opponent’s username"}</label>
    <input
      ref={opponentRef}
      id={`${id}-opponent`}
      name="opponentName"
      autoComplete="off"
      autoCapitalize="none"
      required
      minLength={2}
      maxLength={20}
      disabled={disabled}
      value={value}
      onChange={(event) => { setSelectedName(""); onChange(event.target.value); }}
      aria-describedby={`${id}-help`}
      className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
      placeholder={locale === "de" ? "z. B. AtlasFan" : "e.g. AtlasFan"}
    />
    <p id={`${id}-help`} className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{locale === "de" ? "Nutze den bestehenden GeoNerds-Kontonamen, keine E-Mail-Adresse." : "Use an existing GeoNerds account name, not an email address."}</p>
    <Button ref={toggleRef} type="button" variant="outline" disabled={disabled || !userId} aria-expanded={open} aria-controls={`${id}-directory`} onClick={togglePicker} className="mt-2 h-auto min-h-11 max-w-full gap-2 rounded-xl px-3 py-2 text-xs leading-snug">
      <UsersRound aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 whitespace-normal text-left">{open ? (locale === "de" ? "Spielerliste schließen" : "Close player list") : (locale === "de" ? "Aus Spielerliste wählen" : "Choose from players")}</span>
      <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
    </Button>
    <p role="status" aria-live="polite" className={cn("break-words text-[11px] leading-relaxed text-primary", selected && "mt-2")}>
      {selected ? (locale === "de" ? `${selectedName} ausgewählt. Die Einladung ist noch nicht gesendet.` : `${selectedName} selected. The invitation has not been sent.`) : ""}
    </p>

    {open && <section id={`${id}-directory`} aria-labelledby={`${id}-title`} className="mt-3 min-w-0 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pt-1"><h3 id={`${id}-title`} className="text-xs font-semibold">{locale === "de" ? "Spieler auswählen" : "Choose a player"}</h3><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{locale === "de" ? "Registrierte Konten, alphabetisch" : "Registered accounts, A–Z"}</p></div>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => closePicker()} aria-label={locale === "de" ? "Spielerliste schließen" : "Close player list"} className="-mr-1 -mt-1 shrink-0"><X aria-hidden="true" className="h-4 w-4" /></Button>
      </div>
      <label htmlFor={`${id}-search`} className="mt-3 block text-xs font-semibold">{locale === "de" ? "Nach Benutzername suchen" : "Search by username"}</label>
      <div className="relative mt-1.5">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <input ref={searchRef} id={`${id}-search`} type="search" autoComplete="off" autoCapitalize="none" maxLength={20} disabled={disabled} value={query} onChange={(event) => searchPlayers(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); } if (event.key === "Escape") { event.preventDefault(); closePicker(); } }} placeholder={locale === "de" ? "Name oder Teil des Namens" : "Name or part of a name"} className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" />
      </div>

      <p role="status" aria-live="polite" className="mt-3 flex min-h-4 items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        {loading && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin" />}
        {loading === "initial" ? (locale === "de" ? "Spieler werden geladen…" : "Loading players…") : loading === "more" ? (locale === "de" ? "Weitere Spieler werden geladen…" : "Loading more players…") : error ? "" : players.length ? (locale === "de" ? `${players.length} Spieler geladen` : `${players.length} players loaded`) : (query ? (locale === "de" ? "Keine passenden Konten gefunden. Versuche einen anderen Namen." : "No matching accounts. Try a different name.") : (locale === "de" ? "Noch keine anderen Konten gefunden." : "No other accounts found yet."))}
      </p>
      {players.length > 0 && <ul aria-label={locale === "de" ? "Verfügbare Spieler" : "Available players"} aria-busy={loading !== null} className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain p-1">
        {players.map((player) => <li key={player.name}>
          <button type="button" disabled={disabled || loading === "initial"} aria-pressed={Boolean(selected && selectedName === player.name)} onClick={() => selectPlayer(player.name)} className={cn("flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", selected && selectedName === player.name ? "border-primary/40 bg-primary/5" : "border-border bg-card")}>
            <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">{Array.from(player.name.trim())[0]?.toLocaleUpperCase(locale)}</span>
            <span className="min-w-0 flex-1 break-words text-sm font-medium [overflow-wrap:anywhere]">{player.name}</span>
            {selected && selectedName === player.name && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
          </button>
        </li>)}
      </ul>}
      {error && <div className="mt-2 rounded-lg border border-danger/20 bg-danger/5 p-3">
        <p role="alert" className="text-xs leading-relaxed text-danger">{directoryErrorMessage(error, locale)}</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{locale === "de" ? "Du kannst den Kontonamen weiterhin direkt eintragen." : "You can still enter the account name directly."}</p>
        <Button type="button" variant="outline" disabled={disabled || loading !== null} onClick={() => void loadPlayers(query, error.cursor)} className="mt-2 h-auto min-h-11 w-full rounded-lg px-3 py-2 text-xs">{locale === "de" ? "Erneut laden" : "Try again"}</Button>
      </div>}
      {nextCursor && !error && <Button type="button" variant="outline" disabled={disabled || loading !== null} onClick={() => void loadPlayers(query, nextCursor)} className="mt-2 h-auto min-h-11 w-full rounded-lg px-3 py-2 text-xs">{loading === "more" ? (locale === "de" ? "Wird geladen…" : "Loading…") : (locale === "de" ? "Weitere Spieler laden" : "Load more players")}</Button>}
    </section>}
  </div>;
}
