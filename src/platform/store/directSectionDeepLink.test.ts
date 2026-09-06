import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/platform/store/useAppStore";

// The Story screen's scene cards used to have nowhere to send you — clicking
// one did nothing beyond what looking at the card already told you.
// openDirectAtSection/consumePendingDirectSectionId is the same one-shot
// deep-link shape as pendingProjectOpen and pendingCharacterCardId, so a card
// click can jump Direct straight to that section's first shot.
describe("Direct section deep-open signal", () => {
  beforeEach(() => useAppStore.setState({ pendingDirectSectionId: null }));

  it("routes to Direct and stashes the section id", () => {
    useAppStore.getState().openDirectAtSection("sec-chorus");
    expect(useAppStore.getState().view).toBe("mvdirector");
    expect(useAppStore.getState().pendingDirectSectionId).toBe("sec-chorus");
  });

  it("consuming returns the id once and clears it", () => {
    useAppStore.getState().openDirectAtSection("sec-verse");
    expect(useAppStore.getState().consumePendingDirectSectionId()).toBe("sec-verse");
    expect(useAppStore.getState().pendingDirectSectionId).toBeNull();
    expect(useAppStore.getState().consumePendingDirectSectionId()).toBeNull();
  });
});
