import { beforeEach, describe, expect, it } from "vitest";
import { createPromptCompareRun, listLoopRuns } from "@/platform/lib/loopEngine";

describe("loopEngine prompt comparison", () => {
  beforeEach(() => localStorage.clear());

  it("persists both A/B variants as one side-by-side loop round", () => {
    const run = createPromptCompareRun({
      variantA: { prompt: "editorial portrait", results: ["a.png"] },
      variantB: { prompt: "cinematic portrait", results: ["b.png"] },
    });
    expect(run.target).toBe("Prompt A/B comparison");
    expect(run.events.map((event) => event.stage)).toEqual(["generate", "score"]);
    expect(listLoopRuns<typeof run.value>()[0].value.variantB.results).toEqual(["b.png"]);
  });
});
