import { describe, expect, it } from "vitest";
import { MV_ASPECTS } from "./MvDirector";
import { ASPECT_RATIOS, resolveSize } from "@/platform/lib/imageGen";

// Music Video Director kept its own aspect list, and it drifted. It offered
// 2.39:1 — which no provider takes as an aspect string, and which resolved to
// a misaligned 1024x428 — while omitting 21:9 entirely. So the cinematic-scope
// option people wanted was missing and the one on offer did not work.
describe("Music Video aspect options", () => {
  it("offers only ratios the rest of the app knows how to size", () => {
    for (const aspect of MV_ASPECTS) {
      expect(ASPECT_RATIOS, `MV offers "${aspect}"`).toContain(aspect);
    }
  });

  it("includes 21:9 and no longer offers 2.39:1", () => {
    expect(MV_ASPECTS).toContain("21:9");
    expect(MV_ASPECTS as readonly string[]).not.toContain("2.39:1");
  });

  it("sizes every offered ratio to something a model will accept", () => {
    for (const aspect of MV_ASPECTS) {
      const { width, height } = resolveSize(aspect, "medium");
      expect(width % 16, `${aspect} width ${width}`).toBe(0);
      expect(height % 16, `${aspect} height ${height}`).toBe(0);
    }
  });

  it("leads with landscape, since a music video usually is", () => {
    const { width, height } = resolveSize(MV_ASPECTS[0], "medium");
    expect(width).toBeGreaterThan(height);
  });
});
