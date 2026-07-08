import { PickCardStep } from "@/platform/components/flow";
import type { GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import { GLAM_FORMATS } from "@/apps/glam-studio/lib/campaignExport";
import type { GlamFlowState } from "@/apps/glam-studio/lib/glamStore";

const FORMAT_OPTIONS = GLAM_FORMATS.map((format) => ({
  ...format,
  description: `${format.width} x ${format.height} campaign asset`,
}));

export function FormatsStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <PickCardStep
      columns={4}
      value=""
      onChange={(id) => {
        const formats = state.formats.includes(id)
          ? state.formats.filter((format) => format !== id)
          : [...state.formats, id];
        patch({ formats });
      }}
      options={FORMAT_OPTIONS.map((format) => ({
        id: format.id,
        title: format.title,
        description: format.description,
        badge: state.formats.includes(format.id) ? "Included" : "Add",
        visual: (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-300/25 via-black/10 to-fuchsia-400/20">
            <span
              className="rounded border border-white/35 bg-white/10"
              style={{
                width: `${Math.max(34, Math.min(74, format.width / 24))}px`,
                height: `${Math.max(28, Math.min(74, format.height / 24))}px`,
              }}
            />
          </span>
        ),
      }))}
    />
  );
}
