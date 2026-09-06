import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/platform/store/useAppStore";

// The Cast screen's "no appearance described" warning used to be inert prose
// — it named the problem and told the user to go find that character in
// Character Designer themselves. openCharacterCard/consumePendingCharacterCardId
// is the same one-shot deep-link shape as pendingProjectOpen, so the warning's
// button can jump straight into that character's editor.
describe("Character Designer deep-open signal", () => {
  beforeEach(() => useAppStore.setState({ pendingCharacterCardId: null }));

  it("routes to Character Designer and stashes the character id", () => {
    useAppStore.getState().openCharacterCard("c-1");
    expect(useAppStore.getState().view).toBe("characters");
    expect(useAppStore.getState().pendingCharacterCardId).toBe("c-1");
  });

  it("consuming returns the id once and clears it", () => {
    useAppStore.getState().openCharacterCard("c-2");
    expect(useAppStore.getState().consumePendingCharacterCardId()).toBe("c-2");
    expect(useAppStore.getState().pendingCharacterCardId).toBeNull();
    expect(useAppStore.getState().consumePendingCharacterCardId()).toBeNull();
  });

  it("consuming with nothing pending is a harmless no-op", () => {
    expect(useAppStore.getState().consumePendingCharacterCardId()).toBeNull();
  });
});
