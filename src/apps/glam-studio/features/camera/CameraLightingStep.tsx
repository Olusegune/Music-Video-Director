// Camera Studio + Lighting Studio — visual preset pickers for Glam Studio's
// professional photography system. Optional: the campaign's Look already
// carries baseline lens/lighting direction, so a beginner can skip this step
// entirely. Selecting a preset here refines/overrides that direction with
// real photographer vocabulary, composed straight into the generation prompt
// in buildHeroPrompt() — not decorative.
import { Aperture, Sun } from "lucide-react";
import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";
import type { GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import type { GlamFlowState } from "@/apps/glam-studio/lib/glamStore";
import { CAMERA_PRESETS, LIGHTING_PRESETS } from "@/apps/glam-studio/lib/photoPresets";

export function CameraLightingStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <Aperture className="h-3.5 w-3.5" />
          Camera Studio
          <span className="font-normal normal-case text-muted/70">— optional, refines the Look's lens</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => patch({ cameraPresetId: undefined })}
            className={cn(
              "rounded-[var(--radius-card)] border p-3 text-left text-xs transition hover:border-primary/50",
              !state.cameraPresetId ? "border-primary bg-primary/10" : "border-border bg-surface"
            )}
          >
            <div className="font-semibold">Use Look default</div>
            <p className="mt-1 text-muted">No override — the selected Look's lens direction applies.</p>
          </button>
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => patch({ cameraPresetId: preset.id })}
              className={cn(
                "overflow-hidden rounded-[var(--radius-card)] border p-3 text-left text-xs transition hover:border-primary/50",
                state.cameraPresetId === preset.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              )}
            >
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-semibold">{preset.name}</span>
                <Badge className="normal-case">{preset.family}</Badge>
              </div>
              <p className="mt-1 text-muted">{preset.summary}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <Sun className="h-3.5 w-3.5" />
          Lighting Studio
          <span className="font-normal normal-case text-muted/70">— optional, refines the Look's lighting</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => patch({ lightingPresetId: undefined })}
            className={cn(
              "rounded-[var(--radius-card)] border p-3 text-left text-xs transition hover:border-primary/50",
              !state.lightingPresetId ? "border-primary bg-primary/10" : "border-border bg-surface"
            )}
          >
            <div className="font-semibold">Use Look default</div>
            <p className="mt-1 text-muted">No override — the selected Look's lighting direction applies.</p>
          </button>
          {LIGHTING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => patch({ lightingPresetId: preset.id })}
              className={cn(
                "overflow-hidden rounded-[var(--radius-card)] border p-3 text-left text-xs transition hover:border-primary/50",
                state.lightingPresetId === preset.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              )}
            >
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-semibold">{preset.name}</span>
                <Badge className="normal-case">{preset.family}</Badge>
              </div>
              <p className="mt-1.5 text-muted">{preset.summary}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
