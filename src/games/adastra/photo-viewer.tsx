"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Loader2, Minus, Plus, RotateCcw, ImageOff, Move } from "lucide-react";
import type { NightPhoto } from "@/data/adastra";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

export function NightPhotoViewer({ photo, revealed, onReady, onExit }: {
  photo: NightPhoto;
  revealed: boolean;
  onReady: (ready: boolean) => void;
  onExit: () => void;
}) {
  const { t } = useT();
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const [dragging, setDragging] = useState(false);

  function changeZoom(next: number) {
    if (status !== "ready") return;
    const bounded = Math.min(4, Math.max(1, next));
    const view = viewport.current;
    if (!view || bounded === zoom) return;
    const centerX = (view.scrollLeft + view.clientWidth / 2) / (view.clientWidth * zoom);
    const centerY = (view.scrollTop + view.clientHeight / 2) / (view.clientHeight * zoom);
    setZoom(bounded);
    requestAnimationFrame(() => {
      if (viewport.current !== view) return;
      view.scrollLeft = bounded === 1 ? 0 : centerX * view.clientWidth * bounded - view.clientWidth / 2;
      view.scrollTop = bounded === 1 ? 0 : centerY * view.clientHeight * bounded - view.clientHeight / 2;
    });
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    // Touch uses native overflow scrolling: no competing gesture or capture logic.
    if (event.pointerType === "touch" || event.button !== 0 || zoom <= 1) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    event.currentTarget.scrollLeft = start.left - (event.clientX - start.x);
    event.currentTarget.scrollTop = start.top - (event.clientY - start.y);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "+" || event.key === "=") { event.preventDefault(); changeZoom(zoom + 0.5); }
    if (event.key === "-") { event.preventDefault(); changeZoom(zoom - 0.5); }
    if (event.key === "0") { event.preventDefault(); changeZoom(1); }
  }

  return <figure className="min-w-0 overflow-hidden rounded-2xl border border-sky-900/60 bg-[#061221] text-slate-100 shadow-[0_16px_48px_-24px_rgba(0,0,0,0.8)]">
    <div className="relative">
      <div ref={viewport} role="region" tabIndex={0} aria-label={t("adastra.viewerLabel")} aria-describedby="adastra-viewer-help" aria-busy={status === "loading"}
        onKeyDown={keyboard} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
        className={cn("aspect-[4/3] w-full overflow-auto overscroll-contain bg-[#02070d] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 sm:aspect-[16/10]", zoom > 1 ? dragging ? "cursor-grabbing" : "cursor-grab" : "cursor-default")}>
        <div className="relative" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
          {/* Authentic photo: never recropped, recolored or synthesized. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={retry} src={photo.src} alt={revealed ? photo.title : t("adastra.photoAlt")} draggable={false}
            onLoad={() => { setStatus("ready"); onReady(true); }} onError={() => { setStatus("error"); onReady(false); }}
            className={cn("h-full w-full select-none object-contain", status !== "ready" && "invisible")} />
        </div>
      </div>
      {status === "loading" && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#061221] px-5 text-center" role="status">
        <Loader2 className="h-7 w-7 animate-spin text-sky-300" aria-hidden /><p className="text-sm font-medium text-sky-100">{t("adastra.loading")}</p>
      </div>}
      {status === "error" && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#061221] px-4 text-center" role="alert">
        <ImageOff className="h-7 w-7 text-amber-300" aria-hidden /><p className="max-w-sm text-sm leading-relaxed text-slate-200">{t("adastra.failed")}</p>
        <div className="flex flex-wrap justify-center gap-2"><Button variant="secondary" className="bg-sky-100 text-slate-950 hover:bg-white" onClick={() => { setStatus("loading"); onReady(false); setRetry((value) => value + 1); }}>{t("adastra.retry")}</Button><Button variant="ghost" className="text-slate-100 hover:bg-slate-800" onClick={onExit}>{t("adastra.exit")}</Button></div>
      </div>}
      {zoom > 1 && status === "ready" && <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] items-center gap-2 rounded-lg bg-black/80 px-2.5 py-1.5 text-xs text-slate-100"><Move className="h-3.5 w-3.5 shrink-0" />{t("adastra.viewHint")}</span>}
    </div>
    <figcaption className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-sky-950 bg-[#0b1b2c] p-2 sm:px-3">
      <span className="px-1 text-xs font-semibold tabular-nums text-sky-100">{zoom.toFixed(1)}×</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={status !== "ready" || zoom === 1} onClick={() => changeZoom(zoom - 0.5)} aria-label={t("adastra.zoomOut")} title={t("adastra.zoomOut")} className="text-sky-100 hover:bg-sky-900/60"><Minus className="h-4 w-4" aria-hidden /></Button>
        <Button variant="ghost" size="icon" disabled={status !== "ready" || zoom === 4} onClick={() => changeZoom(zoom + 0.5)} aria-label={t("adastra.zoomIn")} title={t("adastra.zoomIn")} className="text-sky-100 hover:bg-sky-900/60"><Plus className="h-4 w-4" aria-hidden /></Button>
        <Button variant="ghost" size="icon" disabled={status !== "ready" || zoom === 1} onClick={() => changeZoom(1)} aria-label={t("adastra.reset")} title={t("adastra.reset")} className="text-sky-100 hover:bg-sky-900/60"><RotateCcw className="h-4 w-4" aria-hidden /></Button>
      </div>
    </figcaption>
    <p id="adastra-viewer-help" className="border-t border-sky-950 px-3 py-2 text-[11px] leading-relaxed text-slate-300">{t("adastra.viewerHelp")}</p>
  </figure>;
}
