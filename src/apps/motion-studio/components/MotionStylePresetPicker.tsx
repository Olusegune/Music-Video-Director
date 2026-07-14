import { Badge } from "@/platform/components/ui/badge";
import { Button } from "@/platform/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/platform/lib/utils";
import { MOTION_STYLE_PRESETS } from "../lib/animationPresets";

export function MotionStylePresetPicker({
  values = [],
  onChange,
}: {
  values?: string[];
  onChange: (presetIds: string[]) => void;
}) {
  const selectedPresets = MOTION_STYLE_PRESETS.filter((p) => values.includes(p.id));

  const togglePreset = (presetId: string) => {
    const next = values.includes(presetId) ? values.filter((id) => id !== presetId) : [...values, presetId];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Motion Styles</div>
          <div className="mt-1 text-sm font-medium text-foreground">
            {selectedPresets.length === 0 ? "Not selected" : `${selectedPresets.length} selected`}
          </div>
        </div>
        {selectedPresets.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            Clear all
          </Button>
        )}
      </div>

      {selectedPresets.length > 0 && (
        <div className="space-y-2">
          {selectedPresets.map((preset) => (
            <div key={preset.id} className="rounded-lg border border-border bg-elevated p-2">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1">
                  <div className="text-xs font-semibold">{preset.label}</div>
                  <p className="text-[11px] text-muted">{preset.summary}</p>
                </div>
                <Badge variant="default" className="text-[10px] capitalize flex-shrink-0">
                  {preset.family}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-2 grid-cols-2">
        {MOTION_STYLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => togglePreset(preset.id)}
            className={cn(
              "rounded-lg border-2 p-3 text-left text-xs transition hover:border-primary/50 relative",
              values.includes(preset.id) ? "border-primary bg-primary/10" : "border-border bg-elevated"
            )}
          >
            {values.includes(preset.id) && (
              <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
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
