import { Lock } from "lucide-react";
import type { ShotBreakdown } from "@/platform/lib/types";
import { Card } from "@/platform/components/ui/card";
import { Badge } from "@/platform/components/ui/badge";
import { InlineInput, InlineTextarea } from "@/platform/components/ui/inline-edit";
import { cn } from "@/platform/lib/utils";

/** A labelled inline-editable field used across the director views. */
export function Field({
  label,
  value,
  onChange,
  textarea,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="px-1.5 text-[10px] uppercase tracking-wide text-muted">{label}</span>
      {textarea ? (
        <InlineTextarea value={value} onChange={onChange} rows={2} />
      ) : (
        <InlineInput value={value} onChange={onChange} />
      )}
    </div>
  );
}

/** Card shell with a shot header, shared by Camera and Lighting directors. */
export function ShotPlanCard({
  shot,
  icon,
  accent,
  children,
}: {
  shot: ShotBreakdown;
  icon: React.ReactNode;
  accent: "primary" | "accent";
  children: React.ReactNode;
}) {
  return (
    <Card className={shot.locked ? "opacity-90" : ""}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={accent === "primary" ? "text-primary" : "text-accent"}>{icon}</span>
          <Badge variant={accent}>Shot {shot.number}</Badge>
          <span className="text-sm font-medium">{shot.name}</span>
        </div>
        {shot.locked && <Lock className="h-3.5 w-3.5 text-primary" />}
      </div>
      <fieldset disabled={shot.locked} className="p-4 disabled:opacity-70">
        {children}
      </fieldset>
    </Card>
  );
}

export function DirectorEmpty({ note }: { note: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border py-16 text-center">
      <p className="text-sm text-muted">{note}</p>
    </div>
  );
}
