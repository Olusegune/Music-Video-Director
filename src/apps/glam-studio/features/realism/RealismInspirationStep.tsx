// Human Realism (multi-select) + Inspiration Library (single-select) — both
// optional, both compose straight into buildHeroPrompt(). Small-radius cards,
// not pill chips, per the design system's "reduce pills" rule.
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Fingerprint } from "lucide-react";
import { cn } from "@/platform/lib/utils";
import { Badge } from "@/platform/components/ui/badge";
import { api } from "@/platform/lib/ipc";
import type { GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import type { GlamFlowState } from "@/apps/glam-studio/lib/glamStore";
import { REALISM_PRESETS } from "@/apps/glam-studio/lib/realismPresets";
import { INSPIRATION_PRESETS } from "@/apps/glam-studio/lib/inspirationPresets";
import { getPresetImageUrl } from "@/apps/glam-studio/lib/presetImages";
import { PresetImageDisplay } from "@/apps/glam-studio/features/PresetImageDisplay";

export function RealismInspirationStep({
  state,
  patch,
}: GuidedFlowStepComponentProps<GlamFlowState>) {
  // The only honest capability signal available: whether any image provider
  // is configured at all. Glam Studio auto-routes providers at generation
  // time rather than exposing an upfront model picker, so per-model realism
  // support (which none of them expose as a literal API flag anyway) can't
  // be checked — this is disclosed in the empty state below, not hidden.
  const { data: keyStatuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });
  const hasImageProvider = keyStatuses.some(
    (s) => s.configured && s.provider !== "gemini" && s.provider !== "elevenlabs"
  );

  const selectedRealism = new Set(state.realismPresetIds ?? []);
  const toggleRealism = (id: string) => {
    const next = new Set(selectedRealism);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    patch({ realismPresetIds: Array.from(next) });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <Fingerprint className="h-3.5 w-3.5" />
          Human Realism
          <span className="font-normal normal-case text-muted/70">
            — optional, select any that apply
          </span>
        </div>
        {!hasImageProvider ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-border bg-elevated/40 p-3 text-xs text-muted">
            No image provider is configured yet, so there's nothing to generate against — add a
            key in API Keys first. (These presets aren't gated per-model: no image provider here
            exposes a literal "skin realism" API flag to check against, so once a key is
            configured, every option below is available.)
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {REALISM_PRESETS.map((preset) => {
              const active = selectedRealism.has(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => toggleRealism(preset.id)}
                  className={cn(
                    "overflow-hidden rounded-[var(--radius-card)] border p-3 text-left text-xs transition hover:border-primary/50",
                    active ? "border-primary bg-primary/10" : "border-border bg-surface"
                  )}
                >
                  <PresetImageDisplay imageUrl={getPresetImageUrl(preset.id)} label={preset.label} className="h-32 w-full" />
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-semibold">{preset.label}</span>
                    <Badge className="normal-case">{preset.group}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <Sparkles className="h-3.5 w-3.5" />
          Inspiration Library
          <span className="font-normal normal-case text-muted/70">
            — mood &amp; composition language, optional
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => patch({ inspirationId: undefined })}
            className={cn(
              "rounded-[var(--radius-card)] border p-3 text-left text-xs transition hover:border-primary/50",
              !state.inspirationId ? "border-primary bg-primary/10" : "border-border bg-surface"
            )}
          >
            <div className="font-semibold">No inspiration direction</div>
            <p className="mt-1 text-muted">Use the Look and Camera/Lighting direction as-is.</p>
          </button>
          {INSPIRATION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => patch({ inspirationId: preset.id })}
              className={cn(
                "overflow-hidden rounded-[var(--radius-card)] border p-3 text-left text-xs transition hover:border-primary/50",
                state.inspirationId === preset.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              )}
            >
              <PresetImageDisplay imageUrl={getPresetImageUrl(preset.id)} label={preset.name} className="h-32 w-full" />
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-semibold">{preset.name}</span>
                <Badge className="normal-case">{preset.group}</Badge>
              </div>
              <p className="mt-1 text-muted">{preset.summary}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
