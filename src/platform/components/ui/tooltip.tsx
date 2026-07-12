// Tooltip — lightweight, CSS-driven (no positioning library). Shows on
// hover/focus after a short delay, in the design system's small-radius,
// low-shadow style. For anything needing click-to-open with rich content,
// use HelpHint instead — this is for a single short line of context.
import { useState, useRef } from "react";
import { cn } from "@/platform/lib/utils";

export function Tooltip({
  label,
  side = "top",
  delayMs = 400,
  children,
  className,
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  delayMs?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timer.current = setTimeout(() => setVisible(true), delayMs);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  };

  const sideCls = {
    top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
    left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
    right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
  }[side];

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded border border-border bg-elevated px-1.5 py-1 text-[10px] font-medium text-foreground shadow-sm",
            sideCls
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
