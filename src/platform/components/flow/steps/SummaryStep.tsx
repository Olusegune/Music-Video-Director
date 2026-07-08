import { CheckCircle2 } from "lucide-react";
import { Button } from "@/platform/components/ui/button";

interface SummaryStepProps {
  title: string;
  items: { label: string; value: string }[];
  actionLabel?: string;
  onAction?: () => void;
}

export function SummaryStep({
  title,
  items,
  actionLabel = "Finish",
  onAction,
}: SummaryStepProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="group relative overflow-hidden rounded-lg border border-border bg-elevated/40 p-3 pl-4 transition hover:border-primary/30"
          >
            <span className="absolute inset-y-0 left-0 w-0.5 bg-success/70" />
            <dt className="text-xs text-muted">{item.label}</dt>
            <dd className="mt-1 text-sm font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>
      {onAction ? (
        <Button onClick={onAction}>
          <CheckCircle2 /> {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
