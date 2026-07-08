import type { ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/platform/components/ui/button";

export function CreativeEmptyState({
  icon,
  title,
  description,
  ideas,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  ideas: string[];
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="creative-grid relative flex min-h-[430px] flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-surface px-6 py-12 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--module-accent)_12%,transparent),transparent_48%)]" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-elevated text-[var(--module-accent)] shadow-2xl">
        <span className="[&_svg]:h-9 [&_svg]:w-9">{icon}</span>
        <Sparkles className="absolute -right-2 -top-2 h-5 w-5 animate-pulse" />
      </div>
      <h2 className="relative mt-6 text-xl font-semibold">{title}</h2>
      <p className="relative mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      <div className="relative mt-6 flex flex-wrap justify-center gap-2">
        {ideas.map((idea) => (
          <span
            key={idea}
            className="rounded-full border border-border bg-background/65 px-3 py-1.5 text-xs text-muted"
          >
            {idea}
          </span>
        ))}
      </div>
      <Button className="relative mt-7" size="lg" onClick={onAction}>
        {action}
        <ArrowRight />
      </Button>
    </div>
  );
}
