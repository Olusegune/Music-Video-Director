import { Badge } from "@/platform/components/ui/badge";
import { Button } from "@/platform/components/ui/button";
import { cn } from "@/platform/lib/utils";
import { ANIMATION_TYPE_PRESETS } from "../lib/animationPresets";

export function AnimationTypePresetPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (presetId: string | undefined) => void;
}) {
  const selectedPreset = ANIMATION_TYPE_PRESETS.find((p) => p.id === value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Animation Type</div>
          <div className="mt-1 text-sm font-medium text-foreground">{selectedPreset?.label || "Not selected"}</div>
        </div>
        {selectedPreset && (
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Clear
          </Button>
        )}
      </div>

      {selectedPreset && (
        <div className="rounded-lg border border-border bg-elevated p-3">
          <p className="text-xs text-muted">{selectedPreset.summary}</p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted/70">{selectedPreset.promptFragment}</p>
        </div>
      )}

      <div className="grid gap-2 grid-cols-2">
        {ANIMATION_TYPE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            className={cn(
              "rounded-lg border-2 p-3 text-left text-xs transition hover:border-primary/50",
              value === preset.id ? "border-primary bg-primary/10" : "border-border bg-elevated"
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-semibold">{preset.label}</span>
              <Badge variant="default" className="text-[10px] capitalize">{preset.family}</Badge>
            </div>
            <p className="text-[11px] text-muted">{preset.summary}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
