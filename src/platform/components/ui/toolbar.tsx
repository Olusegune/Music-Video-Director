// Toolbar — a horizontal action bar with consistent height, spacing, and a
// tonal (not bordered-card) separation from content below. Replaces ad-hoc
// `flex items-center gap-2 border-b border-border px-4 py-2.5`-style header
// rows that were hand-repeated across pages (MvDirector, DirectConsole, the
// three Bible sheets) with slightly different spacing each time.
import { cn } from "@/platform/lib/utils";

export function Toolbar({
  children,
  className,
  dense,
}: {
  children: React.ReactNode;
  className?: string;
  /** Tighter vertical padding — for a toolbar nested inside another toolbar's content area. */
  dense?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border bg-surface",
        dense ? "px-3 py-1.5" : "px-4 py-2.5",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Pushes everything after it to the right edge of the toolbar. */
export function ToolbarSpacer() {
  return <span className="flex-1" />;
}

/** A thin vertical rule between toolbar groups — quieter than another border-box. */
export function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;
}
