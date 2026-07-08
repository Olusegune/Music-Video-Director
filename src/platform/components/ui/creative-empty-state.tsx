import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/platform/components/ui/button";

export function CreativeEmptyState({
  icon,
  title,
  description,
  art,
  ideas,
  action,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  art?: ReactNode;
  ideas?: string[];
  action: string;
  onAction: () => void;
}) {
  void ideas;
  return (
    <div className="creative-grid relative grid min-h-[430px] overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-card md:grid-cols-[1.05fr_.95fr]">
      <div className="relative flex flex-col justify-center px-7 py-10 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklab,var(--module-accent)_14%,transparent),transparent_44%)]" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-elevated text-[var(--module-accent)] shadow-2xl">
          <span className="[&_svg]:h-7 [&_svg]:w-7">{icon}</span>
        </div>
        <h2 className="relative mt-6 max-w-lg text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="relative mt-3 max-w-md text-sm leading-relaxed text-muted">{description}</p>
        <Button className="relative mt-7 w-fit" size="lg" onClick={onAction}>
          {action}
          <ArrowRight />
        </Button>
      </div>
      <div className="relative min-h-64 border-t border-border bg-background/60 md:border-l md:border-t-0">
        {art ?? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,color-mix(in_oklab,var(--module-accent)_25%,transparent),transparent_38%),linear-gradient(135deg,rgba(255,255,255,.06),transparent_42%)]" />
        )}
        <div className="absolute inset-x-6 bottom-6 h-24 rounded-2xl border border-white/10 bg-black/15 backdrop-blur" />
        <div className="absolute bottom-12 left-10 h-2 w-36 rounded-full bg-white/25" />
        <div className="absolute bottom-8 left-10 h-2 w-24 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
