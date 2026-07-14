/**
 * Generation Progress Display
 * Shows status, progress bar, and estimated time
 */

import { AlertCircle, CheckCircle, Loader2, Clock } from "lucide-react";
import { cn } from "@/platform/lib/utils";
import type { GenerationState } from "./types";

interface GenerationProgressProps {
  state: GenerationState;
  onCancel?: () => void;
}

const STATUS_LABELS: Record<GenerationState["status"], string> = {
  idle: "Ready",
  validating: "Validating settings",
  queued: "Queued",
  generating: "Generating",
  completed: "Complete",
  failed: "Failed",
};

const STATUS_COLORS: Record<
  GenerationState["status"],
  { bg: string; text: string; icon: string }
> = {
  idle: { bg: "bg-muted/10", text: "text-muted", icon: "text-muted" },
  validating: { bg: "bg-blue/10", text: "text-blue-600", icon: "text-blue-600" },
  queued: { bg: "bg-amber/10", text: "text-amber-600", icon: "text-amber-600" },
  generating: { bg: "bg-amber/10", text: "text-amber-600", icon: "text-amber-600" },
  completed: { bg: "bg-green/10", text: "text-green-600", icon: "text-green-600" },
  failed: { bg: "bg-red/10", text: "text-red-600", icon: "text-red-600" },
};

export function GenerationProgress({
  state,
  onCancel,
}: GenerationProgressProps) {
  const colors = STATUS_COLORS[state.status];
  const isActive = state.status === "generating" || state.status === "queued";

  if (state.status === "idle") return null;

  return (
    <div className={cn("rounded-md border p-3", colors.bg)}>
      {/* Status Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {state.status === "generating" && (
            <Loader2 className={cn("h-4 w-4 animate-spin", colors.icon)} />
          )}
          {state.status === "completed" && (
            <CheckCircle className={cn("h-4 w-4", colors.icon)} />
          )}
          {state.status === "failed" && (
            <AlertCircle className={cn("h-4 w-4", colors.icon)} />
          )}
          {!["generating", "completed", "failed"].includes(state.status) && (
            <Clock className={cn("h-4 w-4", colors.icon)} />
          )}
          <span className={cn("text-xs font-semibold", colors.text)}>
            {STATUS_LABELS[state.status]}
          </span>
        </div>
        {isActive && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs underline hover:no-underline"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {(state.status === "generating" || state.status === "queued") && (
        <div className="mt-2 overflow-hidden rounded-full bg-background/50">
          <div
            className="h-1.5 bg-primary/60 transition-all duration-300"
            style={{ width: `${Math.max(5, state.progress ?? 0)}%` }}
          />
        </div>
      )}

      {/* Error Message */}
      {state.status === "failed" && state.error && (
        <div className="mt-2 rounded-sm bg-background/50 p-2 text-xs text-red-600">
          {state.error}
        </div>
      )}

      {/* Completion Message */}
      {state.status === "completed" && (
        <p className="mt-1 text-xs text-green-600/80">
          Generation complete. Image ready for download or refinement.
        </p>
      )}
    </div>
  );
}
