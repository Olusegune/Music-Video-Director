import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimationLab } from "./AnimationLab";

// Animation Lab's flow already ran top-to-bottom in the right order — subject,
// then motion, then generate, then the saved gallery — but nothing on screen
// said so. This checks the numbered step labels exist and stay in that order,
// not just that the screen renders; a purely cosmetic change here would be
// easy to get backwards (e.g. "Generate" numbered before "Motion test") and
// have nothing catch it.

vi.mock("@/platform/lib/ipc", async () => {
  const actual = await vi.importActual<typeof import("@/platform/lib/ipc")>("@/platform/lib/ipc");
  return {
    ...actual,
    api: {
      ...actual.api,
      listCharacters: vi.fn().mockResolvedValue([]),
      listEnvironments: vi.fn().mockResolvedValue([]),
      listProps: vi.fn().mockResolvedValue([]),
    },
  };
});

function setup() {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <AnimationLab />
    </QueryClientProvider>
  );
}

describe("AnimationLab step labels", () => {
  it("labels all four sections of the existing flow, in order", () => {
    setup();
    const labels = ["Choose your subject", "Pick a motion test", "Generate & preview", "Saved tests"];
    const positions = labels.map((text) => {
      const el = screen.getByText(text);
      // DOM position, not just presence — order matters as much as content.
      return Array.from(document.querySelectorAll("body *")).indexOf(el);
    });
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i], `"${labels[i]}" should come after "${labels[i - 1]}"`).toBeGreaterThan(
        positions[i - 1]
      );
    }
  });

  it("numbers each step 1 through 4", () => {
    setup();
    for (const n of ["1", "2", "3", "4"]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });
});
