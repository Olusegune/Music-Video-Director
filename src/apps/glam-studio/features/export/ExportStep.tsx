import { SummaryStep } from "@/platform/components/flow";
import type { GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import type { GlamFlowState } from "@/apps/glam-studio/lib/glamStore";

export function ExportStep({ state }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <SummaryStep
      title="Ready to create the Glam project"
      items={[
        { label: "Product", value: state.productName || "Untitled product" },
        { label: "Category", value: state.category || "Uncategorized" },
        { label: "Brand", value: state.brandName || "New Brand DNA" },
        { label: "Look", value: state.lookId },
        { label: "Formats", value: `${state.formats.length} deliverables` },
      ]}
    />
  );
}
