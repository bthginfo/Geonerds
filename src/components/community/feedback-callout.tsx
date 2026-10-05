"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Loader2, MessageCircleHeart, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useT } from "@/i18n/I18nProvider";
import { FEEDBACK_MAX_LENGTH, FEEDBACK_MIN_LENGTH, parseFeedbackMessage } from "@/lib/community";
import { apiSubmitFeedback, type CommunityRequestError } from "@/lib/community-online";
import { formatNumber } from "@/lib/utils";
import { useAuth } from "@/store/auth";

export function FeedbackCallout() {
  const { locale } = useT();
  const user = useAuth((state) => state.user);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<CommunityRequestError | null>(null);
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const pendingLock = useRef(false);
  const mounted = useRef(true);
  const draftRevision = useRef(0);
  const submission = useRef<{ id: string; message: string; owner: string } | null>(null);
  const isCreator = user?.name.toLowerCase() === "thecreator";

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (open) (sent ? successRef.current : textareaRef.current)?.focus({ preventScroll: true });
  }, [sent, open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingLock.current) return;
    const trimmedMessage = parseFeedbackMessage(message);
    if (!trimmedMessage) {
      setError({ ok: false, error: "invalid_message", status: 400 });
      return;
    }
    const owner = useAuth.getState().user?.id ?? "anonymous";
    if (!submission.current || submission.current.message !== trimmedMessage || submission.current.owner !== owner) {
      submission.current = { id: crypto.randomUUID(), message: trimmedMessage, owner };
    }
    const attempt = submission.current;
    const revision = draftRevision.current;
    pendingLock.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await apiSubmitFeedback(attempt.id, attempt.message);
      if (!mounted.current || draftRevision.current !== revision) return;
      if (owner !== (useAuth.getState().user?.id ?? "anonymous")) {
        setError({ ok: false, error: "identity_changed", status: 0 });
        submission.current = null;
        return;
      }
      if (!result.ok) { setError(result); return; }
      setSent(true);
      setMessage("");
      submission.current = null;
      draftRevision.current += 1;
    } finally {
      pendingLock.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return (
    <>
      <section aria-labelledby="feedback-callout-title" className="mx-auto mb-5 grid w-full max-w-2xl grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-2xl border border-accent/25 bg-accent/5 px-3 py-3 sm:mb-7 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-center sm:px-4 sm:py-3.5 dark:border-accent/20 dark:bg-accent/8">
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground dark:text-accent">
          <MessageCircleHeart className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 id="feedback-callout-title" className="text-sm font-semibold leading-5 text-foreground">{locale === "de" ? "Deine Ideen machen GeoNerds besser" : "Your ideas make GeoNerds better"}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{locale === "de" ? "Ein neues Spiel, ein Wunsch oder eine kleine Verbesserung? Erzähl uns davon – jede Idee hilft." : "A new game, a wish or a small improvement? Tell us about it — every idea helps."}</p>
        </div>
        <div className="col-start-2 flex min-w-0 flex-col items-start gap-1 sm:col-start-3 sm:row-start-1 sm:items-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-11 shrink-0 whitespace-nowrap rounded-lg border border-accent/25 bg-accent/15 px-3.5 text-xs font-semibold text-accent-foreground hover:bg-accent/25 dark:text-accent">{locale === "de" ? "Idee teilen" : "Share an idea"}</Button>
          {isCreator && <Link href="/admin/feedback" className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-md text-[11px] leading-4 text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="min-w-0">{locale === "de" ? "Einsendungen ansehen" : "View submissions"}</span><ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /></Link>}
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title={locale === "de" ? "Deine Idee für GeoNerds" : "Your idea for GeoNerds"}>
        {sent ? (
          <div className="py-2">
            <div ref={successRef} role="status" aria-live="polite" tabIndex={-1} className="outline-none">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-emerald-700 dark:text-emerald-300"><Check aria-hidden="true" className="h-6 w-6" /></span>
              <h3 className="text-xl font-bold">{locale === "de" ? "Danke fürs Mitgestalten!" : "Thanks for helping shape GeoNerds!"}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Deine Idee ist angekommen. Sie landet direkt bei TheCreator." : "Your idea has been received. It goes straight to TheCreator."}</p>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={() => setOpen(false)}>{locale === "de" ? "Weiter entdecken" : "Keep exploring"}</Button>
              <Button type="button" variant="ghost" onClick={() => { setSent(false); setError(null); }}>{locale === "de" ? "Weitere Idee teilen" : "Share another idea"}</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p id={`${textareaId}-hint`} className="mb-5 text-sm leading-relaxed text-muted-foreground">{locale === "de" ? "Was fehlt dir? Teile eine Spielidee, einen Fehler oder eine kleine Verbesserung. Jede Entdeckung zählt." : "What's missing? Share a game idea, a bug or a small improvement. Every discovery counts."}</p>
            <label htmlFor={textareaId} className="mb-2 block text-sm font-semibold">{locale === "de" ? "Deine Nachricht" : "Your message"}</label>
            <textarea
              id={textareaId}
              ref={textareaRef}
              data-autofocus
              value={message}
              maxLength={FEEDBACK_MAX_LENGTH}
              disabled={pending}
              rows={5}
              aria-describedby={`${textareaId}-hint ${textareaId}-count${error ? ` ${textareaId}-error` : ""}`}
              aria-invalid={error?.error === "invalid_message" || undefined}
              placeholder={locale === "de" ? "Ich würde mich freuen, wenn …" : "I'd love it if …"}
              onChange={(event) => {
                const value = event.target.value;
                if (submission.current && parseFeedbackMessage(value) !== submission.current.message) submission.current = null;
                draftRevision.current += 1;
                setMessage(value);
                setError(null);
              }}
              className="min-h-36 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
            />
            <p id={`${textareaId}-count`} className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground"><span>{locale === "de" ? `Mindestens ${FEEDBACK_MIN_LENGTH} Zeichen` : `At least ${FEEDBACK_MIN_LENGTH} characters`}</span><span className="tabular-nums">{formatNumber(message.length, locale)} / {formatNumber(FEEDBACK_MAX_LENGTH, locale)}</span></p>
            <p className="mt-4 break-words text-xs leading-relaxed text-muted-foreground">{user ? <>{locale === "de" ? "Du sendest als " : "Sending as "}<span className="font-semibold text-foreground">{user.name}</span>.</> : locale === "de" ? "Du sendest anonym. Keine E-Mail oder Anmeldung nötig." : "Sending anonymously. No email or sign-in needed."}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{locale === "de" ? `Nachricht und Zeitpunkt${user ? " sowie dein Kontoname" : ""} werden privat für TheCreator gespeichert. Bitte teile keine sensiblen persönlichen Angaben.` : `Your message and its time${user ? ", plus your account name," : ""} are stored privately for TheCreator. Please leave out sensitive personal details.`}</p>
            {error && <p id={`${textareaId}-error`} role="alert" className="mt-4 rounded-xl border border-danger/25 bg-danger/5 p-3 text-sm leading-relaxed">{feedbackError(error, locale)}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{locale === "de" ? "Schließen" : "Close"}</Button>
              <Button type="submit" disabled={pending || message.trim().length < FEEDBACK_MIN_LENGTH} className="gap-2">{pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}{pending ? (locale === "de" ? "Wird gesendet …" : "Sending …") : (locale === "de" ? "Idee senden" : "Send idea")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function feedbackError(error: CommunityRequestError, locale: string) {
  const de = locale === "de";
  if (error.error === "invalid_message") return de ? `Bitte schreibe ${FEEDBACK_MIN_LENGTH} bis ${FEEDBACK_MAX_LENGTH} Zeichen und entferne ungewöhnliche Steuerzeichen.` : `Please write ${FEEDBACK_MIN_LENGTH}–${FEEDBACK_MAX_LENGTH} characters and remove unusual control characters.`;
  if (error.error === "rate_limited") {
    const minutes = Math.max(1, Math.ceil((error.retryAfter ?? 60) / 60));
    return de ? `Kurz durchatmen: Bitte versuche es in ${minutes} ${minutes === 1 ? "Minute" : "Minuten"} erneut. Dein Entwurf bleibt hier.` : `A little breather: please try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}. Your draft is still here.`;
  }
  if (error.error === "not_configured") return de ? "Ideen können gerade nicht gespeichert werden, weil die Online-Verbindung noch fehlt. Behalte deinen Entwurf und versuche es später erneut." : "Ideas can't be saved yet because the online service isn't connected. Keep your draft and try again later.";
  if (error.error === "network_error") return de ? "Wir konnten nicht bestätigen, ob deine Idee angekommen ist. Dein Entwurf bleibt hier. Du kannst dieselbe Nachricht sicher erneut senden." : "We couldn't confirm whether your idea arrived. Your draft is still here. You can safely retry the same message.";
  if (error.error === "identity_changed") return de ? "Dein Konto hat sich während des Sendens geändert. Die Idee könnte mit der vorherigen Anmeldung angekommen sein. Dein Entwurf bleibt zur Prüfung hier." : "Your account changed while sending. The idea may have arrived under your previous sign-in. Your draft is kept here for you to review.";
  if (error.error === "submission_conflict") return de ? "Dieser Sendeversuch konnte nicht wiederverwendet werden. Bearbeite deine Nachricht und versuche es erneut." : "This sending attempt couldn't be reused. Edit your message and try again.";
  if (["invalid_origin", "forbidden", "invalid_id", "bad_request"].includes(error.error)) return de ? "Diese Anfrage wurde nicht akzeptiert. Dein Entwurf ist unverändert. Bitte versuche es später erneut." : "This request wasn't accepted. Your draft is unchanged. Please try again later.";
  return de ? "Die Online-Verbindung ist gerade nicht verfügbar. Deine Idee wurde nicht bestätigt; dein Entwurf bleibt hier. Versuche es erneut." : "The online service is currently unavailable. Your idea hasn't been confirmed; your draft is still here. Please try again.";
}
