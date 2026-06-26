import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Text that looks like a label until focused, then reveals an input affordance.
 * Used to make every Prompt Pack field editable in place.
 */
export function InlineInput({
  value,
  onChange,
  className,
  placeholder,
  ...props
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-foreground",
        "hover:border-border focus:border-primary focus:bg-surface focus:outline-none",
        "placeholder:text-muted/60 transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function InlineTextarea({
  value,
  onChange,
  className,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full resize-y rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-foreground",
        "hover:border-border focus:border-primary focus:bg-surface focus:outline-none",
        "placeholder:text-muted/60 transition-colors",
        className
      )}
    />
  );
}
