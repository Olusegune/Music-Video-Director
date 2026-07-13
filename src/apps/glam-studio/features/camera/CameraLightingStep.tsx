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
                "rounded-[var(--radius-card)] border p-3 text-left text-xs transition hover:border-primary/50",
                state.cameraPresetId === preset.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              )}
            >
              <div className="flex items-center justify-between gap-2">
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
                "rounded-[var(--radius-card)] border p-3 text-left text-xs transition hover:border-primary/50",
                state.lightingPresetId === preset.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{preset.name}</span>
                <Badge className="normal-case">{preset.family}</Badge>
              </div>
              {/* Lightweight CSS "diagram" instead of a real illustration —
                  a small light-source dot positioned per the preset's angle,
                  cheap to render and still visual rather than pure text. */}
              <div className="relative mt-2 h-10 w-full overflow-hidden rounded bg-elevated/60">
                <span className="absolute left-1/2 top-full h-6 w-6 -translate-x-1/2 rounded-full bg-muted/20" />
                <LightDot presetId={preset.id} />
              </div>
              <p className="mt-1.5 text-muted">{preset.summary}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Positions a small "key light" dot on the mini diagram per preset angle. */
function LightDot({ presetId }: { presetId: string }) {
  const pos: Record<string, string> = {
    "light-rembrandt": "left-[30%] top-1",
    "light-butterfly": "left-1/2 top-0 -translate-x-1/2",
    "light-loop": "left-[35%] top-1",
    "light-split": "left-1 top-1/2 -translate-y-1/2",
    "light-soft-beauty": "left-1/2 top-1 -translate-x-1/2",
    "light-hard-editorial": "left-[20%] top-1",
    "light-high-key": "left-1/2 top-1 -translate-x-1/2",
    "light-low-key": "left-[15%] top-1",
    "light-three-point": "left-1/2 top-1 -translate-x-1/2",
    "light-window": "left-1 top-1/2 -translate-y-1/2",
    "light-golden-hour": "right-1 bottom-1",
    "light-blue-hour": "right-1 top-1",
    "light-ring": "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
    "light-strip": "left-1 top-1",
    "light-practical": "right-1/2 top-1/2",
  };
  return (
    <span
      className={cn(
        "absolute h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_2px_var(--color-accent)]",
        pos[presetId] ?? "left-1/2 top-1 -translate-x-1/2"
      )}
    />
  );
}
