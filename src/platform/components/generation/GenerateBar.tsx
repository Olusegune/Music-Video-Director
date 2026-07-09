import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { cn } from "@/platform/lib/utils";
import type { StudioMode } from "@/platform/lib/settings";

export function GenerateBar({
  label = "Generate",
  busyLabel = "Generating...",
  busy,
  disabledReason,
  mode = "studio",
  note,
  className,
  onGenerate,
}: {
  label?: string;
  busyLabel?: string;
  busy?: boolean;
  disabledReason?: string;
  mode?: StudioMode;
  note?: string | null;
  className?: string;
  onGenerate: () => void;
}) {
  const disabled = busy || !!disabledReason;
  const showReason = mode !== "director" && disabledReason;
  const normalizedBusyLabel = busyLabel.includes("Ã") ? "Generating..." : busyLabel;
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 rounded-[var(--radius-card)] border border-border bg-surface/95 p-2 shadow-card backdrop-blur",
        className
      )}
    >
      <Button variant="gold" onClick={onGenerate} disabled={disabled} className="w-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? normalizedBusyLabel : label}
      </Button>
      {showReason ? (
        <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-muted">
          <AlertCircle className="h-3 w-3" />
          {disabledReason}
        </p>
      ) : note && mode !== "director" ? (
        <p className="mt-1 text-center text-[11px] text-muted">{note}</p>
      ) : null}
    </div>
  );
}
