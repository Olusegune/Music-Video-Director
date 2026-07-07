// HelpHint — a compact "?" affordance that answers "What is this?" (and
// optionally "Show example") inline, so a dense pro tool never leaves the user
// lost without dragging them off to the Help Center. Click to toggle a small
// popover anchored to the icon; click anywhere else to dismiss.
import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/platform/lib/utils";

export function HelpHint({
  title,
  body,
  example,
  className,
}: {
  /** Short "What is this?" heading, e.g. "Energy map". */
  title: string;
  /** One or two sentences explaining what it is and what changing it does. */
  body: string;
  /** Optional concrete "Show example" — a line the user can reveal. */
  example?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showExample, setShowExample] = useState(false);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`What is ${title}?`}
        aria-expanded={open}
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full text-muted transition-colors hover:text-primary",
          open && "text-primary"
        )}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
          <span className="absolute left-0 top-5 z-30 block w-64 rounded-[var(--radius-card)] border border-border bg-surface p-3 text-left shadow-card">
            <span className="mb-1 block text-xs font-semibold text-foreground">{title}</span>
            <span className="block text-[11px] leading-relaxed text-muted">{body}</span>
            {example && (
              <>
                <button
                  type="button"
                  onClick={() => setShowExample((s) => !s)}
                  className="mt-1.5 block text-[11px] font-medium text-primary hover:underline"
                >
                  {showExample ? "Hide example" : "Show example"}
                </button>
                {showExample && (
                  <span className="mt-1 block rounded-[var(--radius-input)] border border-border bg-elevated/50 px-2 py-1.5 text-[11px] italic leading-relaxed text-foreground">
                    {example}
                  </span>
                )}
              </>
            )}
          </span>
        </>
      )}
    </span>
  );
}
