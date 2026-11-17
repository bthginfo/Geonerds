"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/I18nProvider";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const activeDialogs: HTMLElement[] = [];
let unlockedBodyOverflow = "";

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const { locale } = useT();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const titleId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose);
  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => { closeRef.current = onClose; }, [onClose]);

  React.useEffect(() => {
    if (!open || !mounted) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (activeDialogs.length === 0) unlockedBodyOverflow = document.body.style.overflow;
    activeDialogs.push(dialog);
    const isTopDialog = () => activeDialogs[activeDialogs.length - 1] === dialog;
    dialog.inert = false;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => {
      const elements = focusable();
      (elements.find((element) => element.hasAttribute("data-autofocus")) ?? elements[0] ?? dialog).focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      if (!isTopDialog()) return;
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { e.preventDefault(); dialog.focus(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    const onFocus = (e: FocusEvent) => {
      if (!isTopDialog()) return;
      if (e.target instanceof Node && !dialog.contains(e.target)) (focusable()[0] ?? dialog).focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      // Framer Motion keeps the closing panel mounted during its exit animation.
      dialog.inert = true;
      const index = activeDialogs.indexOf(dialog);
      if (index >= 0) activeDialogs.splice(index, 1);
      if (activeDialogs.length === 0) document.body.style.overflow = unlockedBodyOverflow;
      const remainingDialog = activeDialogs[activeDialogs.length - 1];
      if (previousFocus?.isConnected && (!remainingDialog || remainingDialog.contains(previousFocus))) previousFocus.focus({ preventScroll: true });
    };
  }, [open, mounted]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div aria-hidden="true" className="absolute inset-0 bg-black/35" onClick={onClose} />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : "Dialog"}
            tabIndex={-1}
            className={cn(
              "relative z-10 max-h-[90dvh] w-full min-w-0 overflow-y-auto overscroll-contain rounded-t-[24px] bg-card px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 shadow-2xl outline-none sm:max-w-md sm:rounded-2xl sm:p-6",
              className
            )}
            initial={reducedMotion ? false : { y: 24, opacity: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
              <div className="mb-4 flex items-center justify-between gap-3">
                {title ? <h2 id={titleId} className="min-w-0 text-xl font-bold tracking-tight">{title}</h2> : <span />}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={locale === "de" ? "Schließen" : "Close"}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
