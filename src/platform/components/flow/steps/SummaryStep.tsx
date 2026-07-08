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
            className="rounded-md border border-border bg-elevated/40 p-3"
          >
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
