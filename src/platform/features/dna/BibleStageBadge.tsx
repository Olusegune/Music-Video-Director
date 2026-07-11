// The Details sheet is stage 4 of the visual Bible flow; StudioMode is a lens
// over it, not a separate screen — flipping to Creator mode reveals prompt/
// seed/provider inspection (via GenerationPanel's `editable={mode === "creator"}`)
// without navigating anywhere. This badge is the honest label for that: stage 4
// normally, stage 5 the moment Creator mode is on, matching the Card/Profile
// stage badges instead of inventing a screen the architecture already rejects.

import { useAppStore } from "@/platform/store/useAppStore";

export function BibleStageBadge() {
  const studioMode = useAppStore((s) => s.studioMode);
  const isCreator = studioMode === "creator";
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] text-primary">
      {isCreator ? "Stage 5 of 5 · Creator" : "Stage 4 of 5 · Details"}
    </div>
  );
}
