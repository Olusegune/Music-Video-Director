import * as React from "react";
import { cn } from "@/platform/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-20 w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors",
      "placeholder:text-muted focus-visible:outline-none focus-visible:border-primary",
      "disabled:cursor-not-allowed disabled:opacity-50 resize-y",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
