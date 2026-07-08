import { CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/platform/components/ui/button";

interface ReviewGateStepProps {
  title: string;
  summary: string;
  approveLabel?: string;
  reviseLabel?: string;
  onApprove: () => void;
  onRevise?: () => void;
}

export function ReviewGateStep({
  title,
  summary,
  approveLabel = "Approve",
  reviseLabel = "Revise",
  onApprove,
  onRevise,
}: ReviewGateStepProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-elevated/40 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onApprove}>
          <CheckCircle2 /> {approveLabel}
        </Button>
        {onRevise ? (
          <Button variant="secondary" onClick={onRevise}>
            <RefreshCw /> {reviseLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
