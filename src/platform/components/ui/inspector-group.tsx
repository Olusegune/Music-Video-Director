// InspectorGroup — the "section title, thin divider, content" pattern the
// design brief asks for, replacing the repeated "rounded outer box, icon,
// title row, chevron toggle" pattern that was hand-built independently in
// ShotRow's collapsible panels (Director's notes, Camera, Lighting, View
// Final Prompt, ...) and dnaKit's <Section>. One primitive, one place to
// keep the collapse/expand and disclosure styling consistent.
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/platform/lib/utils";

export function InspectorGroup({
  icon,
  title,
  badge,
  defaultOpen = true,
  collapsible = true,
  open: openProp,
  onOpenChange,
  children,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  /** Small trailing note, e.g. a count or current value — not a full Badge pill. */
  badge?: string;
  defaultOpen?: boolean;
  /** Set false for a group that's always expanded (no chevron, no toggle). */
  collapsible?: boolean;
  /** Controlled open state — pass with onOpenChange when the host needs to
   *  drive expansion itself (e.g. an "expand everything" mode toggle).
   *  Uncontrolled (internal state) when omitted. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  };
  const expanded = !collapsible || open;

  return (
    <div className={cn("border-t border-border pt-3 first:border-t-0 first:pt-0", className)}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={expanded}
          className="flex w-full items-center gap-1.5 text-left"
        >
          {icon && <span className="shrink-0 text-muted">{icon}</span>}
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {title}
          </span>
          {badge && <span className="text-[11px] text-muted/70">— {badge}</span>}
          <ChevronDown
            className={cn(
              "ml-auto h-3.5 w-3.5 shrink-0 text-muted transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          {icon && <span className="shrink-0 text-muted">{icon}</span>}
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {title}
          </span>
          {badge && <span className="text-[11px] text-muted/70">— {badge}</span>}
        </div>
      )}
      {expanded && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

/** Label + control row inside an InspectorGroup — replaces one-off `<Field>` copies. */
export function InspectorField({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", full && "col-span-full")}>
      <span className="text-[11px] text-muted">{label}</span>
      {children}
    </div>
  );
}
