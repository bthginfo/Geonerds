"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Ban, Check, CheckCircle2, RotateCw, Rows3, Tag, X, XCircle } from "lucide-react";
import type { PlayHandlers } from "@/components/game/game-shell";
import { GameTopBar, ScorePill, StreakPill } from "@/components/game/hud";
import { Button } from "@/components/ui/button";
import { FlagImage } from "@/components/flag-image";
import { countryName, getCountryByCca3 } from "@/data/countries";
import { useT } from "@/i18n/I18nProvider";
import { newRunSeed } from "@/lib/random";
import { sound } from "@/lib/sound";
import { haptic } from "@/lib/haptics";
import { cn, formatNumber } from "@/lib/utils";
import type { Country } from "@/lib/types";
import { useGameTimeouts } from "@/games/use-game-timeouts";
import {
  BOARD_SIZE,
  canPlace,
  createRun,
  fitsAnywhere,
  getPiece,
  nameTrayPiece,
  orientedShape,
  pieceFits,
  rotateTrayPiece,
  trayShape,
  placeTrayPiece,
  previewClear,
  suggestAnchor,
  summarize,
  trayChoices,
  type BlastState,
  type PieceShape,
} from "./engine";
import { CountryOutline, PieceBlocks, blockClass, flagSliceStyle } from "./piece-art";

const DRAG_THRESHOLD = 6;

type Anchor = { row: number; col: number };
type AimMode = "pointer" | "touch" | "keys";
interface CellFill { flag: string | null; w: number; h: number; r: number; c: number }
interface DragInfo {
  slot: number;
  pointerId: number;
  touch: boolean;
  startX: number;
  startY: number;
  x: number;
  y: number;
  started: boolean;
  grabX: number;
  grabY: number;
  pieceW: number;
  pieceH: number;
  pitch: number;
  cell: number;
  gap: number;
  grid: DOMRect;
}

const country = (cca3: string) => getCountryByCca3(cca3) as Country;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function centredAnchor(shape: PieceShape, row: number, col: number): Anchor {
  return {
    row: clamp(row - Math.floor(shape.h / 2), 0, BOARD_SIZE - shape.h),
    col: clamp(col - Math.floor(shape.w / 2), 0, BOARD_SIZE - shape.w),
  };
}

function fillFor(game: BlastState, id: number, index: number): CellFill | null {
  const placement = game.placements[id];
  if (!placement) return null;
  const shape = orientedShape(placement.cca3, placement.rotation);
  return {
    flag: placement.named ? country(placement.cca3).flag : null,
    w: shape.w,
    h: shape.h,
    r: Math.floor(index / BOARD_SIZE) - placement.row,
    c: (index % BOARD_SIZE) - placement.col,
  };
}

export function AtlasBlastGame(handlers: PlayHandlers) {
  const { t, locale } = useT();
  const reducedMotion = useReducedMotion();
  const { schedule } = useGameTimeouts();
  const { difficulty, practice } = handlers;
  const [seed] = useState(() => handlers.seed ?? newRunSeed());
  const [game, setGame] = useState(() => createRun(seed, difficulty, practice));
  const [selected, setSelected] = useState<number | null>(null);
  const [aim, setAim] = useState<AimMode>("pointer");
  const [ghost, setGhost] = useState<Anchor | null>(null);
  const [naming, setNaming] = useState<{ slot: number; pick: string | null } | null>(null);
  const [dragSlot, setDragSlot] = useState<number | null>(null);
  const [dragCell, setDragCell] = useState(40);
  const [dragGap, setDragGap] = useState(2);
  const [message, setMessage] = useState(() => t("atlasblast.status.start"));
  const [bursts, setBursts] = useState<{ key: number; origin: Anchor; cells: (CellFill & { index: number })[] } | null>(null);
  const [floater, setFloater] = useState<{ key: number; text: string; sub: string } | null>(null);
  const [showOver, setShowOver] = useState(false);
  const startedAt = useRef(0);
  const finished = useRef(false);
  const dragRef = useRef<DragInfo | null>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const trayRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ghostRef = useRef<Anchor | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const name = useCallback((cca3: string) => countryName(country(cca3), locale), [locale]);
  const selectedPiece = selected !== null ? game.tray[selected] : null;
  const selectedShape = selectedPiece ? trayShape(selectedPiece) : null;
  const activeSlot = dragSlot ?? selected;
  const activeShape = activeSlot !== null && game.tray[activeSlot] ? trayShape(game.tray[activeSlot]!) : null;
  const ghostValid = Boolean(ghost && activeShape && canPlace(game.board, activeShape, ghost.row, ghost.col));
  const ghostCells = useMemo(() => {
    if (!ghost || !activeShape) return new Set<number>();
    return new Set(activeShape.cells.map(([r, c]) => (ghost.row + r) * BOARD_SIZE + ghost.col + c));
  }, [ghost, activeShape]);
  const clearCells = useMemo(
    () => new Set(ghost && activeShape && ghostValid ? previewClear(game.board, activeShape, ghost.row, ghost.col) : []),
    [ghost, activeShape, ghostValid, game.board],
  );
  const fits = useMemo(
    () => game.tray.map((piece) => (piece ? { any: pieceFits(game.board, piece.cca3), now: fitsAnywhere(game.board, trayShape(piece)) } : { any: false, now: false })),
    [game],
  );
  const filled = game.board.filter((cell) => cell !== 0).length;

  const updateGhost = useCallback((next: Anchor | null) => {
    const current = ghostRef.current;
    if (current?.row === next?.row && current?.col === next?.col) return;
    ghostRef.current = next;
    setGhost(next);
  }, []);

  const describeGhost = useCallback((shape: PieceShape, anchor: Anchor, board: readonly number[]) => {
    const where = t("atlasblast.status.position", { row: anchor.row + 1, col: anchor.col + 1 });
    if (!canPlace(board, shape, anchor.row, anchor.col)) return `${where} ${t("atlasblast.status.blocked")}`;
    const cleared = previewClear(board, shape, anchor.row, anchor.col).length;
    if (!cleared) return `${where} ${t("atlasblast.status.fits")}`;
    // Count the lines (rows + columns) that the cleared cells form.
    const placed = [...board];
    for (const [r, c] of shape.cells) placed[(anchor.row + r) * BOARD_SIZE + anchor.col + c] = -1;
    let lines = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (placed.slice(i * BOARD_SIZE, i * BOARD_SIZE + BOARD_SIZE).every((cell) => cell !== 0)) lines++;
      if (Array.from({ length: BOARD_SIZE }, (_, j) => placed[j * BOARD_SIZE + i]).every((cell) => cell !== 0)) lines++;
    }
    return `${where} ${lines === 1 ? t("atlasblast.status.clears1") : t("atlasblast.status.clearsN", { n: lines })}`;
  }, [t]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const summary = summarize(game);
    handlers.onFinish({ ...summary, durationMs: Math.max(500, Date.now() - startedAt.current) });
  }, [game, handlers]);

  function clearSelection() {
    setSelected(null);
    updateGhost(null);
  }

  function select(slot: number, mode: AimMode) {
    const piece = game.tray[slot];
    if (!piece || game.over) return;
    if (selected === slot && mode !== "keys") {
      clearSelection();
      setMessage(t("atlasblast.status.start"));
      return;
    }
    const shape = trayShape(piece);
    setSelected(slot);
    setAim(mode);
    const label = piece.naming === "unknown" ? t("atlasblast.pieceShort", { n: slot + 1 }) : name(piece.cca3);
    if (mode === "keys") {
      const anchor = suggestAnchor(game.board, shape) ?? centredAnchor(shape, 4, 4);
      updateGhost(anchor);
      setMessage(`${t("atlasblast.status.selectedKeys", { name: label })} ${describeGhost(shape, anchor, game.board)}`);
      boardRef.current?.focus();
    } else {
      updateGhost(null);
      setMessage(t(mode === "touch" ? "atlasblast.status.selected" : "atlasblast.status.selectedPointer", { name: label }));
    }
  }

  function place(slot: number, anchor: Anchor) {
    const piece = game.tray[slot];
    if (!piece) return false;
    const next = placeTrayPiece(game, slot, anchor.row, anchor.col);
    if (!next) {
      haptic.error();
      setMessage(`${t("atlasblast.status.position", { row: anchor.row + 1, col: anchor.col + 1 })} ${t("atlasblast.status.blocked")}`);
      return false;
    }
    const last = next.last!;
    const placedName = name(piece.cca3);
    const parts = [
      piece.naming === "unknown"
        ? practice ? t("atlasblast.status.placedUnknownPractice", { name: placedName }) : t("atlasblast.status.placedUnknown", { name: placedName, points: formatNumber(last.points.total, locale) })
        : practice ? t("atlasblast.status.placedPractice", { name: placedName }) : t("atlasblast.status.placed", { name: placedName, points: formatNumber(last.points.total, locale) }),
    ];
    let sub = "";
    if (last.linesCleared) {
      sub = last.linesCleared === 1 ? t("atlasblast.status.lines1") : t("atlasblast.status.linesN", { n: last.linesCleared });
      if (last.combo >= 2) sub += ` ${t("atlasblast.status.combo", { n: last.combo })}`;
      parts.push(sub);
      sound.correct();
      haptic.success();
      if (!reducedMotion) {
        setBursts({
          key: last.placementId,
          origin: anchor,
          cells: last.cleared.map(({ index, id }) => ({ index, ...(fillFor(next, id, index) ?? { flag: null, w: 1, h: 1, r: 0, c: 0 }) })),
        });
        schedule(() => setBursts((current) => (current?.key === last.placementId ? null : current)), 700);
      }
    } else {
      haptic.tap();
    }
    if (!reducedMotion && (!practice || sub)) {
      setFloater({ key: last.placementId, text: practice ? "" : `+${formatNumber(last.points.total, locale)}`, sub });
      schedule(() => setFloater((current) => (current?.key === last.placementId ? null : current)), 1000);
    }
    setGame(next);
    clearSelection();
    setMessage(parts.join(" "));
    if (next.over) {
      schedule(() => {
        sound.finish();
        setShowOver(true);
      }, reducedMotion ? 150 : 900);
    }
    return true;
  }

  function rotate(slot: number) {
    const piece = game.tray[slot];
    if (!piece || game.over || naming || dragSlot !== null) return;
    const next = rotateTrayPiece(game, slot);
    const shape = trayShape(next.tray[slot]!);
    setGame(next);
    haptic.tap();
    let text = t("atlasblast.status.rotated", { name: piece.naming === "unknown" ? t("atlasblast.pieceShort", { n: slot + 1 }) : name(piece.cca3) });
    if (selected === slot && ghostRef.current) {
      let anchor: Anchor = { row: clamp(ghostRef.current.row, 0, BOARD_SIZE - shape.h), col: clamp(ghostRef.current.col, 0, BOARD_SIZE - shape.w) };
      // Keyboard aiming jumps to the nearest free spot when the turned piece no longer fits here.
      if (aim === "keys" && !canPlace(next.board, shape, anchor.row, anchor.col)) anchor = suggestAnchor(next.board, shape) ?? anchor;
      updateGhost(anchor);
      text += ` ${describeGhost(shape, anchor, next.board)}`;
    }
    setMessage(text);
  }

  function openNaming(slot: number) {
    const piece = game.tray[slot];
    if (!piece || piece.naming !== "unknown" || game.over) return;
    clearSelection();
    setNaming({ slot, pick: null });
  }

  function answer(pick: string) {
    if (!naming || naming.pick) return;
    const piece = game.tray[naming.slot];
    if (!piece) return;
    const next = nameTrayPiece(game, naming.slot, pick);
    const correct = pick === piece.cca3;
    if (correct) { sound.correct(); haptic.success(); } else { sound.wrong(); haptic.error(); }
    setGame(next);
    setNaming({ ...naming, pick });
    setMessage(correct
      ? practice ? t("atlasblast.status.namedRightPractice", { name: name(piece.cca3) }) : t("atlasblast.status.namedRight", { name: name(piece.cca3) })
      : t("atlasblast.status.namedWrong", { name: name(piece.cca3) }));
  }

  function closeNaming() {
    const slot = naming?.slot;
    setNaming(null);
    if (slot !== undefined) requestAnimationFrame(() => trayRefs.current[slot]?.focus());
  }

  // --- Pointer: drag from the tray, or tap to select -----------------------

  function onTrayPointerDown(event: ReactPointerEvent<HTMLButtonElement>, slot: number) {
    const piece = game.tray[slot];
    if (!piece || game.over || naming || event.button !== 0 || !gridRef.current) return;
    const shape = trayShape(piece);
    const grid = gridRef.current.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(gridRef.current).columnGap) || 2;
    const cell = (grid.width - gap * (BOARD_SIZE - 1)) / BOARD_SIZE;
    const pitch = cell + gap;
    const pieceW = shape.w * cell + (shape.w - 1) * gap;
    const pieceH = shape.h * cell + (shape.h - 1) * gap;
    const touch = event.pointerType !== "mouse";
    let grabX = pieceW / 2;
    let grabY = pieceH + Math.max(26, cell * 0.9);
    if (!touch) {
      const art = event.currentTarget.querySelector("[data-blocks]")?.getBoundingClientRect();
      const fx = art && art.width ? clamp((event.clientX - art.left) / art.width, 0, 1) : 0.5;
      const fy = art && art.height ? clamp((event.clientY - art.top) / art.height, 0, 1) : 0.5;
      grabX = fx * pieceW;
      grabY = fy * pieceH;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      slot, pointerId: event.pointerId, touch, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
      started: false, grabX, grabY, pieceW, pieceH, pitch, cell, gap, grid,
    };
  }

  function positionFloat(drag: DragInfo) {
    if (floatRef.current) floatRef.current.style.transform = `translate3d(${drag.x - drag.grabX}px, ${drag.y - drag.grabY}px, 0)`;
  }

  useLayoutEffect(() => {
    if (dragSlot !== null && dragRef.current) positionFloat(dragRef.current);
  }, [dragSlot]);

  function onTrayPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.started) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < DRAG_THRESHOLD) return;
      drag.started = true;
      setSelected(null);
      setDragCell(drag.cell);
      setDragGap(drag.gap);
      setDragSlot(drag.slot);
    }
    positionFloat(drag);
    const shape = trayShape(game.tray[drag.slot]!);
    const left = drag.x - drag.grabX;
    const top = drag.y - drag.grabY;
    const cx = left + drag.pieceW / 2;
    const cy = top + drag.pieceH / 2;
    const { grid, pitch } = drag;
    if (cx < grid.left - pitch / 2 || cx > grid.right + pitch / 2 || cy < grid.top - pitch / 2 || cy > grid.bottom + pitch / 2) {
      updateGhost(null);
      return;
    }
    updateGhost({
      row: clamp(Math.round((top - grid.top) / pitch), 0, BOARD_SIZE - shape.h),
      col: clamp(Math.round((left - grid.left) / pitch), 0, BOARD_SIZE - shape.w),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (!drag.started) {
      if (!cancelled) select(drag.slot, drag.touch ? "touch" : "pointer");
      return;
    }
    const anchor = ghostRef.current;
    setDragSlot(null);
    if (!cancelled && anchor && place(drag.slot, anchor)) return;
    updateGhost(null);
    if (!cancelled && anchor) haptic.error();
  }

  // --- Pointer on the board (after selecting a piece) ----------------------

  function cellAt(event: ReactPointerEvent<HTMLDivElement>): Anchor | null {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor(((event.clientX - rect.left) / rect.width) * BOARD_SIZE);
    const row = Math.floor(((event.clientY - rect.top) / rect.height) * BOARD_SIZE);
    if (row < 0 || col < 0 || row >= BOARD_SIZE || col >= BOARD_SIZE) return null;
    return { row, col };
  }

  function onBoardPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || selected === null || !selectedShape || dragSlot !== null) return;
    const cell = cellAt(event);
    updateGhost(cell ? centredAnchor(selectedShape, cell.row, cell.col) : null);
    if (aim !== "pointer") setAim("pointer");
  }

  function onBoardPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (selected === null || !selectedShape || dragSlot !== null || naming || game.over) return;
    const cell = cellAt(event);
    if (!cell) return;
    if (event.pointerType === "mouse") {
      place(selected, centredAnchor(selectedShape, cell.row, cell.col));
      return;
    }
    const current = ghostRef.current;
    const insideGhost = current && cell.row >= current.row && cell.row < current.row + selectedShape.h && cell.col >= current.col && cell.col < current.col + selectedShape.w;
    if (current && insideGhost && canPlace(game.board, selectedShape, current.row, current.col)) {
      place(selected, current);
      return;
    }
    const anchor = centredAnchor(selectedShape, cell.row, cell.col);
    setAim("touch");
    updateGhost(anchor);
    setMessage(describeGhost(selectedShape, anchor, game.board));
  }

  // --- Keyboard ------------------------------------------------------------

  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => {});
  const onKey = (event: KeyboardEvent) => {
    if (naming || showOver || game.over || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [role='dialog']")) return;
    const onBoard = target === boardRef.current || target === document.body;
    if (/^[1-3]$/.test(event.key)) {
      const slot = Number(event.key) - 1;
      if (game.tray[slot]) { event.preventDefault(); select(slot, "keys"); }
      return;
    }
    if (selected === null || !selectedShape) return;
    if (event.key === "Escape") {
      event.preventDefault();
      clearSelection();
      setMessage(t("atlasblast.status.start"));
      return;
    }
    if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      rotate(selected);
      return;
    }
    if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      openNaming(selected);
      return;
    }
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[event.key] && (onBoard || aim === "keys")) {
      event.preventDefault();
      const base = ghostRef.current ?? suggestAnchor(game.board, selectedShape) ?? centredAnchor(selectedShape, 4, 4);
      const [dr, dc] = moves[event.key];
      const anchor = {
        row: clamp(base.row + (ghostRef.current ? dr : 0), 0, BOARD_SIZE - selectedShape.h),
        col: clamp(base.col + (ghostRef.current ? dc : 0), 0, BOARD_SIZE - selectedShape.w),
      };
      setAim("keys");
      updateGhost(anchor);
      setMessage(describeGhost(selectedShape, anchor, game.board));
      if (!onBoard) boardRef.current?.focus();
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && onBoard) {
      event.preventDefault();
      const anchor = ghostRef.current ?? suggestAnchor(game.board, selectedShape);
      if (anchor) place(selected, anchor);
    }
  };

  useEffect(() => {
    keyHandler.current = onKey;
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyHandler.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  function onTrayKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, slot: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      select(slot, "keys");
    }
  }

  // --- Render --------------------------------------------------------------

  const flagChips = game.hits.map((cca3) => country(cca3));
  const namingPiece = naming ? game.tray[naming.slot] : null;
  const namingShape = namingPiece ? getPiece(namingPiece.cca3) : null;
  const namingChoices = naming ? trayChoices(game, naming.slot) : [];

  return (
    <div className="flex flex-1 flex-col">
      <GameTopBar title={t("games.atlas-blast.name")} onExit={handlers.onExit}>
        {!practice && <ScorePill value={game.score} />}
        <span aria-label={t("atlasblast.lines", { n: game.lines })} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground min-[420px]:text-sm">
          <Rows3 className="h-3.5 w-3.5" aria-hidden />
          {game.lines}
        </span>
        <StreakPill value={game.namingStreak} />
      </GameTopBar>

      <div className="mx-auto flex w-full max-w-[552px] flex-1 flex-col items-center gap-2.5 px-4 pb-4 pt-2.5 sm:gap-3 sm:pt-4">
        <p aria-live="polite" className="flex min-h-10 w-full items-center justify-center text-balance text-center text-[13px] font-medium leading-snug text-foreground sm:text-sm">
          {message}
        </p>

        <div className="relative flex w-full flex-col items-center gap-2.5 sm:gap-3">
          {/* Board */}
          <div
            ref={boardRef}
            tabIndex={0}
            role="application"
            aria-label={t("atlasblast.board", { n: filled })}
            aria-describedby="atlas-blast-keys"
            onPointerMove={onBoardPointerMove}
            onPointerLeave={(event) => { if (event.pointerType === "mouse" && aim === "pointer" && dragSlot === null) updateGhost(null); }}
            onPointerUp={onBoardPointerUp}
            className="relative touch-manipulation rounded-2xl [--board-room:356px] sm:[--board-room:388px] border border-border bg-card p-1 sm:p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ width: "max(288px, min(100%, 520px, calc(100dvh - var(--board-room))))" }}
          >
            <div ref={gridRef} className="grid grid-cols-9 gap-[2px] sm:gap-[3px]">
              {game.board.map((id, index) => {
                const fill = id ? fillFor(game, id, index) : null;
                const inGhost = ghostCells.has(index);
                const willClear = clearCells.has(index);
                return (
                  <div
                    key={index}
                    className={cn(
                      "relative aspect-square rounded-[18%]",
                      fill ? blockClass(fill.flag) : "bg-muted shadow-[inset_0_1px_2px_oklch(0.2_0.02_255/0.12)] dark:bg-muted/80",
                    )}
                    style={fill?.flag ? flagSliceStyle(fill.flag, fill.w, fill.h, fill.r, fill.c) : undefined}
                  >
                    {willClear && !inGhost && <span className="absolute inset-0 rounded-[inherit] bg-amber-200/45 ring-2 ring-inset ring-amber-500 dark:bg-amber-300/25 dark:ring-amber-300" />}
                    {inGhost && (
                      <span
                        className={cn(
                          "absolute inset-0 rounded-[inherit] ring-2 ring-inset",
                          ghostValid
                            ? willClear ? "bg-amber-300/60 ring-amber-500 dark:ring-amber-300" : "bg-primary/35 ring-primary"
                            : "bg-[repeating-linear-gradient(135deg,var(--danger)_0_3px,transparent_3px_8px)] bg-danger/15 ring-danger",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Clear burst */}
            {bursts && (
              <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-9 gap-[2px] p-1 sm:gap-[3px] sm:p-1.5">
                {bursts.cells.map((cell) => {
                  const row = Math.floor(cell.index / BOARD_SIZE);
                  const col = cell.index % BOARD_SIZE;
                  const distance = Math.abs(row - bursts.origin.row) + Math.abs(col - bursts.origin.col);
                  return (
                    <motion.span
                      key={`${bursts.key}-${cell.index}`}
                      className={cn("aspect-square rounded-[18%]", blockClass(cell.flag))}
                      style={{ gridRow: row + 1, gridColumn: col + 1, ...(cell.flag ? flagSliceStyle(cell.flag, cell.w, cell.h, cell.r, cell.c) : null) }}
                      initial={{ scale: 1, opacity: 1, filter: "brightness(1)" }}
                      animate={{ scale: [1, 1.14, 0.2], opacity: [1, 1, 0], filter: ["brightness(1)", "brightness(1.8)", "brightness(2)"] }}
                      transition={{ duration: 0.5, delay: Math.min(0.25, distance * 0.025), ease: "easeOut" }}
                    />
                  );
                })}
              </div>
            )}

            {floater && (
              <motion.div
                key={floater.key}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-[38%] z-10 flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: [0, 1, 1, 0], y: [10, -4, -6, -18], scale: [0.9, 1, 1, 1] }}
                transition={{ duration: 0.95, times: [0, 0.2, 0.75, 1], ease: "easeOut" }}
              >
                {floater.text && <span className="rounded-full bg-primary px-3 py-1 text-lg font-bold tabular-nums text-primary-foreground shadow-lg">{floater.text}</span>}
                {floater.sub && <span className="rounded-full bg-card px-3 py-1 text-sm font-bold text-foreground shadow-md ring-1 ring-border">{floater.sub}</span>}
              </motion.div>
            )}
          </div>

          {/* Tray */}
          <div className="grid w-full grid-cols-3 gap-2 [--cell:14px] [--gap:2px] min-[360px]:[--cell:16px] min-[380px]:[--cell:17px] sm:[--cell:20px]" style={{ maxWidth: 520 }}>
            {game.tray.map((piece, slot) => {
              if (!piece) {
                return <div key={`empty-${slot}`} className="flex min-h-[calc(5*var(--cell)+4*var(--gap)+4.75rem)] items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground"><span className="sr-only">{t("atlasblast.pieceUsed", { n: slot + 1 })}</span></div>;
              }
              const shape = trayShape(piece);
              const noRoom = !fits[slot].any;
              const rotateHint = fits[slot].any && !fits[slot].now;
              const isSelected = selected === slot || dragSlot === slot;
              const known = piece.naming !== "unknown";
              const label = t("atlasblast.piece", {
                n: slot + 1,
                country: known ? name(piece.cca3) : t("atlasblast.pieceUnknown"),
                cells: shape.cells.length,
              }) + (noRoom ? `, ${t("atlasblast.pieceNoRoom")}` : rotateHint ? `, ${t("atlasblast.rotateToFit")}` : "");
              return (
                <div key={piece.index} className={cn("relative flex flex-col gap-1 rounded-2xl border bg-card p-1", isSelected ? "border-primary ring-2 ring-primary/40" : "border-border")}>
                  <button
                    ref={(element) => { trayRefs.current[slot] = element; }}
                    type="button"
                    aria-label={label}
                    aria-pressed={selected === slot}
                    disabled={game.over}
                    onPointerDown={(event) => onTrayPointerDown(event, slot)}
                    onPointerMove={onTrayPointerMove}
                    onPointerUp={(event) => endDrag(event, false)}
                    onPointerCancel={(event) => endDrag(event, true)}
                    onKeyDown={(event) => onTrayKeyDown(event, slot)}
                    className={cn(
                      "relative flex h-[calc(5*var(--cell)+4*var(--gap)+1.75rem)] touch-none pt-5 select-none items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected ? "bg-primary/10" : "hover:bg-muted/70",
                      game.over && "cursor-default",
                    )}
                  >
                    <span aria-hidden className="absolute left-1.5 top-1 text-[11px] font-semibold tabular-nums text-muted-foreground">{slot + 1}</span>
                    <motion.span
                      className={cn("flex", dragSlot === slot && "opacity-25", noRoom && "opacity-40 grayscale")}
                      animate={reducedMotion ? undefined : { scale: isSelected ? 1.06 : 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <PieceBlocks shape={shape} flag={piece.naming === "correct" ? country(piece.cca3).flag : null} fit={5} showOutline={piece.rotation === 0} />
                    </motion.span>
                    {piece.rotation !== 0 && (
                      <span aria-hidden title={t("atlasblast.outlineNorth")} className="absolute bottom-1 left-1 flex h-8 w-8 items-center justify-center rounded-md bg-muted p-0.5">
                        <CountryOutline shape={shape} className="max-h-full max-w-full" />
                      </span>
                    )}
                    {(noRoom || rotateHint) && (
                      <span className={cn("absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-md bg-card/90 px-1 py-0.5 text-[11px] font-semibold", noRoom ? "text-danger" : "text-amber-700 dark:text-amber-300")}>
                        {noRoom ? <Ban className="h-3 w-3 shrink-0" aria-hidden /> : <RotateCw className="h-3 w-3 shrink-0" aria-hidden />}
                        {t(noRoom ? "atlasblast.noRoom" : "atlasblast.rotateToFit")}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={t("atlasblast.rotate", { n: slot + 1 })}
                    disabled={game.over}
                    onClick={() => rotate(slot)}
                    className="absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
                  >
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border bg-card shadow-sm", isSelected ? "border-primary text-primary" : "border-border")}>
                      <RotateCw className="h-4 w-4" aria-hidden />
                    </span>
                  </button>
                  {known ? (
                    <div className={cn("flex h-11 items-center justify-center gap-1 px-1 text-center text-[11px] font-semibold leading-[1.15]", piece.naming === "correct" ? "text-success" : "text-muted-foreground")}>
                      {piece.naming === "correct" ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <X className="h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />}
                      <span className={cn("line-clamp-3", piece.naming === "correct" ? "text-foreground" : "")}>{name(piece.cca3)}</span>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" className="h-11 w-full gap-1 rounded-xl px-1 text-xs" disabled={game.over} onClick={() => openNaming(slot)}>
                      <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden />{t("atlasblast.nameIt")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Naming panel */}
          {naming && namingPiece && namingShape && (
            <NamingPanel
              shape={namingShape}
              answer={namingPiece.cca3}
              choices={namingChoices}
              pick={naming.pick}
              practice={practice}
              name={name}
              onPick={answer}
              onClose={closeNaming}
            />
          )}

          {/* Game over */}
          {showOver && (
            <GameOverPanel
              score={game.score}
              practice={practice}
              lines={game.lines}
              placed={game.placed}
              bestCombo={game.bestCombo}
              hits={flagChips}
              onContinue={finish}
            />
          )}
        </div>

        <p id="atlas-blast-keys" className="hidden text-center text-xs text-muted-foreground sm:block">{t("atlasblast.keys")}</p>
      </div>

      {/* Dragged piece */}
      {dragSlot !== null && game.tray[dragSlot] && (
        <div ref={floatRef} aria-hidden className="pointer-events-none fixed left-0 top-0 z-50 drop-shadow-[0_10px_18px_oklch(0.2_0.03_255/0.35)]" style={{ "--cell": `${dragCell}px`, "--gap": `${dragGap}px` } as CSSProperties}>
          <PieceBlocks
            shape={trayShape(game.tray[dragSlot]!)}
            showOutline={game.tray[dragSlot]!.rotation === 0}
            flag={game.tray[dragSlot]!.naming === "correct" ? country(game.tray[dragSlot]!.cca3).flag : null}
            className={cn(!ghostValid && ghost && "opacity-80")}
          />
        </div>
      )}
    </div>
  );
}

function NamingPanel({
  shape,
  answer,
  choices,
  pick,
  practice,
  name,
  onPick,
  onClose,
}: {
  shape: PieceShape;
  answer: string;
  choices: string[];
  pick: string | null;
  practice: boolean;
  name: (cca3: string) => string;
  onPick: (cca3: string) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const reducedMotion = useReducedMotion();
  const firstRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const answered = pick !== null;
  const correct = pick === answer;

  useEffect(() => {
    (answered ? backRef.current : firstRef.current)?.focus();
  }, [answered]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="atlas-blast-naming-title"
      className="absolute inset-0 z-20 flex flex-col justify-center gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-xl sm:p-5"
      initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16 }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
        if (event.key === "Tab") {
          const focusable = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
          if (!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-muted p-2 sm:h-28 sm:w-28">
          <CountryOutline shape={shape} className="max-h-full max-w-full" />
        </div>
        <div className="min-w-0 flex-1" aria-live="polite">
          {answered ? (
            <>
              <p id="atlas-blast-naming-title" className={cn("flex items-center gap-1.5 text-lg font-bold", correct ? "text-success" : "text-danger")}>
                {correct ? <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> : <XCircle className="h-5 w-5 shrink-0" aria-hidden />}
                {t(correct ? "atlasblast.naming.right" : "atlasblast.naming.wrong")}
              </p>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <FlagImage code={country(answer).flag} className="h-5 shrink-0" rounded={false} />
                <span>{t("atlasblast.naming.answer", { name: name(answer) })}</span>
              </div>
              {correct && !practice && <p className="mt-1 text-xs text-muted-foreground">{t("atlasblast.naming.bonus")}</p>}
            </>
          ) : (
            <>
              <p id="atlas-blast-naming-title" className="text-lg font-bold leading-tight">{t("atlasblast.naming.title")}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(practice ? "atlasblast.naming.hintPractice" : "atlasblast.naming.hint")}</p>
            </>
          )}
        </div>
      </div>

      <div className={cn("grid gap-2", choices.length > 3 && "sm:grid-cols-2")}>
        {choices.map((cca3, index) => {
          const isAnswer = cca3 === answer;
          const isPick = cca3 === pick;
          return (
            <Button
              key={cca3}
              ref={index === 0 ? firstRef : undefined}
              variant="outline"
              disabled={answered && !isAnswer && !isPick}
              aria-disabled={answered}
              onClick={() => onPick(cca3)}
              className={cn(
                "min-h-11 w-full justify-between gap-2 text-left",
                answered && isAnswer && "border-success bg-success/10 text-foreground disabled:opacity-100",
                answered && isPick && !isAnswer && "border-danger bg-danger/10 text-foreground",
                answered && "pointer-events-none",
              )}
            >
              <span className="min-w-0 break-words">{name(cca3)}</span>
              {answered && isAnswer && <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />}
              {answered && isPick && !isAnswer && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-danger"><X className="h-4 w-4" aria-hidden />{t("atlasblast.naming.yourPick")}</span>
              )}
            </Button>
          );
        })}
      </div>

      <div className="flex justify-end">
        {answered ? (
          <Button ref={backRef} onClick={onClose} className="w-full sm:w-auto">{t("atlasblast.naming.back")}</Button>
        ) : (
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">{t("atlasblast.naming.cancel")}</Button>
        )}
      </div>
    </motion.div>
  );
}

function GameOverPanel({
  score,
  practice,
  lines,
  placed,
  bestCombo,
  hits,
  onContinue,
}: {
  score: number;
  practice: boolean;
  lines: number;
  placed: number;
  bestCombo: number;
  hits: Country[];
  onContinue: () => void;
}) {
  const { t, locale } = useT();
  const reducedMotion = useReducedMotion();
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { continueRef.current?.focus(); }, []);
  const stats = [
    ...(practice ? [] : [{ label: t("atlasblast.over.score"), value: formatNumber(score, locale) }]),
    { label: t("atlasblast.over.lines"), value: formatNumber(lines, locale) },
    { label: t("atlasblast.over.placed"), value: formatNumber(placed, locale) },
    { label: t("atlasblast.over.combo"), value: bestCombo >= 2 ? `×${bestCombo}` : "–" },
  ];
  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-labelledby="atlas-blast-over-title"
      className="absolute inset-0 z-30 flex flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-xl sm:p-5"
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="text-center">
        <p id="atlas-blast-over-title" className="text-2xl font-bold tracking-tight">{t("atlasblast.over.title")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("atlasblast.over.detail")}</p>
      </div>
      <dl className={cn("grid gap-2", stats.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-muted px-2 py-2 text-center">
            <dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
            <dd className="text-lg font-bold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <div className="min-h-0">
        <p className="mb-2 text-sm font-semibold">{t("atlasblast.over.named", { n: hits.length })}</p>
        {hits.length ? (
          <ul className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
            {hits.map((hit) => (
              <li key={hit.cca3} className="flex items-center gap-1.5 rounded-full bg-muted py-1 pl-1.5 pr-2.5 text-xs font-semibold">
                <FlagImage code={hit.flag} className="h-3.5 shrink-0" rounded={false} />
                {countryName(hit, locale)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">{t("atlasblast.over.none")}</p>
        )}
      </div>
      <Button ref={continueRef} size="lg" className="mt-auto w-full" onClick={onContinue}>{t("atlasblast.continue")}</Button>
    </motion.section>
  );
}
