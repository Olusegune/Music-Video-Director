import { describe, expect, it, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useGlobalShortcuts } from "@/platform/lib/useGlobalShortcuts";
import { useAppStore } from "@/platform/store/useAppStore";

// Ctrl+1..5 predate Story, Templates, and Animation Lab joining the sidebar;
// this checks the three new stages actually got wired to Ctrl+6/7/8, not
// just documented in the shortcut sheet.

function Harness() {
  useGlobalShortcuts();
  return null;
}

function pressCtrl(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true }));
}

beforeEach(() => {
  useAppStore.setState({ view: "song" });
});

describe("useGlobalShortcuts — Music Video stage jumps", () => {
  it("Ctrl+6 opens Story", () => {
    render(<Harness />);
    pressCtrl("6");
    expect(useAppStore.getState().view).toBe("magicoutput");
  });

  it("Ctrl+7 opens Templates", () => {
    render(<Harness />);
    pressCtrl("7");
    expect(useAppStore.getState().view).toBe("templates");
  });

  it("Ctrl+8 opens Animation Lab", () => {
    render(<Harness />);
    pressCtrl("8");
    expect(useAppStore.getState().view).toBe("animation");
  });

  it("still handles the original Ctrl+1..5 range unchanged", () => {
    render(<Harness />);
    pressCtrl("4");
    expect(useAppStore.getState().view).toBe("choreography");
  });
});
