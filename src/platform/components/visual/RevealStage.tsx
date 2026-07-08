import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/platform/lib/utils";

export function RevealStage({
  children,
  revealed,
  title = "Your result is ready",
  className,
}: {
  children: ReactNode;
  revealed: boolean;
  title?: string;
  className?: string;
}) {
  if (!revealed) return null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/25 bg-background p-4 shadow-2xl",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--module-accent)_16%,transparent),transparent_58%)]" />
      <div className="relative mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        <Sparkles className="h-4 w-4 text-[var(--module-accent)]" />
        {title}
      </div>
      <div className="relative animate-[studio-enter_220ms_ease-out_both]">{children}</div>
    </section>
  );
}
