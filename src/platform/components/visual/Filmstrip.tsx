import type { ReactNode } from "react";
import { cn } from "@/platform/lib/utils";

export function Filmstrip({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {label ? (
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          {label}
        </h2>
      ) : null}
      <div className="flex snap-x gap-4 overflow-x-auto pb-3">{children}</div>
    </section>
  );
}

export function FilmstripItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("w-72 shrink-0 snap-start", className)}>{children}</div>;
}
