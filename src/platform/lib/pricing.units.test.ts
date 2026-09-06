import { describe, expect, it } from "vitest";
import { estimateCost } from "@/platform/lib/pricing";

// estimateCost returns the TOTAL for `units`, under a field still named
// perUnit. A caller that multiplied by units again billed an 87-second
// transcription as 87 x 87 x the rate.
describe("estimateCost units handling", () => {
  it("returns the total for the units asked for, not a per-unit rate", () => {
    const one = estimateCost("gemini", "", "transcribe", 1).perUnit;
    const many = estimateCost("gemini", "", "transcribe", 87).perUnit;
    expect(many).toBeCloseTo(one * 87, 10);
  });

  it("treats a single unit as the default", () => {
    expect(estimateCost("gemini", "", "transcribe").perUnit).toBeCloseTo(
      estimateCost("gemini", "", "transcribe", 1).perUnit,
      10
    );
  });

  it("keeps a transcription of a whole song well under the cost of one image", () => {
    // 300s of audio — a full track — against one Nano Banana Pro frame.
    const song = estimateCost("gemini", "", "transcribe", 300).perUnit;
    const oneImage = estimateCost("google_imagen", "nano_banana_pro", "image", 1).perUnit;
    expect(song).toBeLessThan(oneImage);
  });

  it("reports no cost rather than guessing for an unknown provider", () => {
    expect(estimateCost("nope", "", "image", 3).perUnit).toBe(0);
  });
});
