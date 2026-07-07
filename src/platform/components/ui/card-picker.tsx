// A compact trigger + popover grid of visual cards — the "select, but as
// recognizable icon+tagline cards" pattern used across Magic Mode's Video Type
// step, the Choreography style picker, and Cast's role/dance-style pickers.
// Reach for this instead of a native <select> whenever the options are a
// small, fixed, human-recognizable set (not an open-ended/user-generated list).

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/platform/lib/utils";

export interface CardPickerOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
  tagline?: string;
}

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
  const current = options.find((o) => o.key === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center gap-2 rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm text-foreground hover:border-primary/40"
        aria-label={ariaLabel}
        aria-expanded={open}
        type="button"
      >
        {current?.icon}
        <span className="flex-1 truncate text-left">{current?.label ?? placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div
            className={cn(
              "absolute left-0 top-full z-20 mt-1.5 grid w-[28rem] max-w-[90vw] gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-card",
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
                    active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
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
        </>
      )}
    </div>
  );
}
