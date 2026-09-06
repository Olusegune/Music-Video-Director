import { describe, expect, it } from "vitest";
import { ASPECT_RATIOS, SIZE_PRESETS, resolveSize } from "@/platform/lib/imageGen";

const RATIOS = ASPECT_RATIOS.filter((a) => a !== "custom");

// Image models work in latent space and want both dimensions on a multiple of
// 8; many want 16, and several APIs reject anything else rather than rounding.
// Plain rounding gave 819x1024 for 4:5 and 1024x439 for 21:9 — five of the
// nine offered ratios were misaligned, so a generated frame did not come back
// in the aspect the user asked for.
describe("resolveSize dimension alignment", () => {
  const sizes = SIZE_PRESETS.filter((s) => s.id !== "custom").map((s) => s.id);

  it("puts every ratio at every size on a multiple of 16", () => {
    for (const aspect of RATIOS) {
      for (const sizeId of sizes) {
        const { width, height } = resolveSize(aspect, sizeId);
        expect(width % 16, `${aspect} @ ${sizeId} width ${width}`).toBe(0);
        expect(height % 16, `${aspect} @ ${sizeId} height ${height}`).toBe(0);
      }
    }
  });

  it("stays within what providers accept", () => {
    for (const aspect of RATIOS) {
      for (const sizeId of sizes) {
        const { width, height } = resolveSize(aspect, sizeId);
        expect(width).toBeGreaterThanOrEqual(256);
        expect(height).toBeGreaterThanOrEqual(256);
        expect(width).toBeLessThanOrEqual(2048);
        expect(height).toBeLessThanOrEqual(2048);
      }
    }
  });

  it("still lands close to the ratio that was asked for", () => {
    for (const aspect of RATIOS) {
      const [aw, ah] = aspect.split(":").map(Number);
      const { width, height } = resolveSize(aspect, "medium");
      const asked = aw / ah;
      const got = width / height;
      // Alignment costs a little accuracy; more than 3% would be a visibly
      // different frame rather than a rounding artefact.
      expect(Math.abs(got - asked) / asked, `${aspect} -> ${width}x${height}`).toBeLessThan(0.03);
    }
  });

  it("keeps landscape landscape and portrait portrait", () => {
    expect(resolveSize("16:9", "medium").width).toBeGreaterThan(
      resolveSize("16:9", "medium").height
    );
    expect(resolveSize("9:16", "medium").height).toBeGreaterThan(
      resolveSize("9:16", "medium").width
    );
    const square = resolveSize("1:1", "medium");
    expect(square.width).toBe(square.height);
  });

  it("offers 21:9 for cinematic scope", () => {
    expect(RATIOS).toContain("21:9");
  });
});
