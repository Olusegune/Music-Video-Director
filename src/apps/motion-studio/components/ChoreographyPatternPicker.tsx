import { Button } from "@/platform/components/ui/button";
import { cn } from "@/platform/lib/utils";
import { CHOREOGRAPHY_PATTERN_PRESETS } from "../lib/animationPresets";

export function ChoreographyPatternPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (presetId: string | undefined) => void;
}) {
  const selectedPreset = CHOREOGRAPHY_PATTERN_PRESETS.find((p) => p.id === value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Choreography Pattern</div>
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
          {selectedPreset.formation && (
            <div className="mt-2 rounded-md bg-surface p-2 font-mono text-[10px] leading-4 text-muted/70 whitespace-pre-wrap">
              {selectedPreset.formation}
            </div>
          )}
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted/70">{selectedPreset.promptFragment}</p>
        </div>
      )}

      <div className="grid gap-2 grid-cols-2">
        {CHOREOGRAPHY_PATTERN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            className={cn(
              "rounded-lg border-2 p-3 text-left text-xs transition hover:border-primary/50",
              value === preset.id ? "border-primary bg-primary/10" : "border-border bg-elevated"
            )}
          >
            <div className="font-semibold mb-1">{preset.label}</div>
            <p className="text-[11px] text-muted">{preset.summary}</p>
            {preset.formation && (
              <div className="mt-2 rounded-sm bg-surface/50 p-1 font-mono text-[9px] leading-3 text-muted/50">
                {preset.formation.split("\n").slice(0, 2).join("\n")}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
