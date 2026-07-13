// Casting — visual card-based model direction instead of a long attribute
// form. Every axis is optional; a product-only campaign (no human model)
// skips this entirely, same "Use default" pattern as Camera & Lighting.
import { Users } from "lucide-react";
import { cn } from "@/platform/lib/utils";
import type { GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import type { GlamFlowState } from "@/apps/glam-studio/lib/glamStore";
import {
  AGE_PRESETS,
  BODY_TYPE_PRESETS,
  HAIR_PRESETS,
  SKIN_TONE_PRESETS,
  EXPRESSION_PRESETS,
  ACCESSORY_PRESETS,
  type CastingOption,
} from "@/apps/glam-studio/lib/castingPresets";

type CastingKey =
  | "castingAgeId"
  | "castingBodyTypeId"
  | "castingHairId"
  | "castingSkinToneId"
  | "castingExpressionId"
  | "castingAccessoryId";

function CastingRow({
  title,
  options,
  fieldKey,
  state,
  patch,
}: {
  title: string;
  options: CastingOption[];
  fieldKey: CastingKey;
  state: GlamFlowState;
  patch: (p: Partial<GlamFlowState>) => void;
}) {
  const selected = state[fieldKey];
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted/80">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => patch({ [fieldKey]: undefined } as Partial<GlamFlowState>)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs transition-colors",
            !selected
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted hover:bg-elevated/60"
          )}
        >
          No direction
        </button>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => patch({ [fieldKey]: opt.id } as Partial<GlamFlowState>)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              selected === opt.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted hover:bg-elevated/60"
            )}
          >
            {"swatch" in opt && (
              <span
                className="h-3 w-3 rounded-full border border-black/10"
                style={{ backgroundColor: (opt as { swatch: string }).swatch }}
              />
            )}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CastingStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-[var(--radius-card)] border border-border bg-surface p-3 text-xs text-muted">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>
          Optional — only set this if the campaign includes a human model. Every axis defaults to
          "no direction," so a product-only shoot can skip this step entirely.
        </p>
      </div>

      <CastingRow title="Age" options={AGE_PRESETS} fieldKey="castingAgeId" state={state} patch={patch} />
      <CastingRow
        title="Body type"
        options={BODY_TYPE_PRESETS}
        fieldKey="castingBodyTypeId"
        state={state}
        patch={patch}
      />
      <CastingRow title="Hair" options={HAIR_PRESETS} fieldKey="castingHairId" state={state} patch={patch} />
      <CastingRow
        title="Skin tone"
        options={SKIN_TONE_PRESETS}
        fieldKey="castingSkinToneId"
        state={state}
        patch={patch}
      />
      <CastingRow
        title="Expression"
        options={EXPRESSION_PRESETS}
        fieldKey="castingExpressionId"
        state={state}
        patch={patch}
      />
      <CastingRow
        title="Accessories"
        options={ACCESSORY_PRESETS}
        fieldKey="castingAccessoryId"
        state={state}
        patch={patch}
      />
    </div>
  );
}
