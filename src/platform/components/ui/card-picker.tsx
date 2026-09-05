// A compact trigger + popover grid of visual cards — the "select, but as
// recognizable icon+tagline cards" pattern used across Magic Mode's Video Type
// step, the Choreography style picker, and Cast's role/dance-style pickers.
// Reach for this instead of a native <select> whenever the options are a
// small, fixed, human-recognizable set (not an open-ended/user-generated list).

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/platform/lib/utils";

export interface CardPickerOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
  tagline?: string;
}

// The popover width class below, mirrored so the open-position math can keep
// it inside the viewport without waiting for a layout pass.
const PANEL_WIDTH_PX = 448; // w-[28rem]

export function CardPicker({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "Choose…",
  columns = 2,
}: {
  value: string;
  options: CardPickerOption[];
  onChange: (key: string) => void;
  ariaLabel: string;
  placeholder?: string;
  columns?: 2 | 3;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.key === value);

  // Rendered via a portal (see below) so the popover escapes any ancestor
  // with overflow-hidden/overflow-auto — a card, a scroll panel, a modal —
  // instead of being silently clipped inside it. Position is computed from
  // the trigger's own viewport rect, so `position: fixed` placement holds up
  // regardless of what's between this button and <body> in the DOM tree.
  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const maxLeft = Math.max(8, window.innerWidth - PANEL_WIDTH_PX - 8);
      setPos({ top: rect.bottom + 6, left: Math.min(rect.left, maxLeft) });
    }
    setOpen(true);
  };

  // The panel's height depends on its content (2 vs 3 columns, tagline
  // length, option count), so it can't be known before it's actually
  // mounted. Once it is, re-clamp: flip above the trigger when there isn't
  // room below, and never let the top edge scroll off-screen either — a
  // trigger near the bottom of a scrolling card (Cast's Dance style picker,
  // reported as "clips inside the box") was opening a panel whose bottom
  // ran past the window edge with nothing to pull it back on-screen.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = panel.offsetHeight;
    const fitsBelow = rect.bottom + 6 + panelHeight <= window.innerHeight - 8;
    const top = fitsBelow
      ? rect.bottom + 6
      : Math.max(8, rect.top - 6 - panelHeight);
    setPos((prev) => (prev && prev.top === top ? prev : { ...prev!, top }));
    // Only re-measure when the panel opens or its own size changes — not on
    // every `pos` update this effect itself causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex h-9 w-full items-center gap-2 rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm text-foreground hover:border-primary/40"
        aria-label={ariaLabel}
        aria-expanded={open}
        type="button"
      >
        {current?.icon}
        <span className="flex-1 truncate text-left">{current?.label ?? placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
      </button>
      {open &&
        pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <div
              ref={panelRef}
              style={{ top: pos.top, left: pos.left }}
              className={cn(
                "fixed z-50 grid w-[28rem] max-w-[90vw] gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-card",
                columns === 3 ? "grid-cols-3" : "grid-cols-2"
              )}
            >
              {options.map((o) => {
                const active = o.key === value;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => {
                      onChange(o.key);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-[var(--radius-card)] border p-2.5 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {o.icon && (
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg",
                          active ? "bg-primary/20 text-primary" : "bg-elevated text-muted"
                        )}
                      >
                        {o.icon}
                      </span>
                    )}
                    <span className="text-xs font-semibold leading-tight">{o.label}</span>
                    {o.tagline && (
                      <span className="text-[10px] leading-snug text-muted">{o.tagline}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
