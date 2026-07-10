import { describe, expect, it } from "vitest";
import {
  describeReferenceSupport,
  prioritize,
  resolveReferences,
} from "@/platform/lib/referenceSystem";
import type { GenerationReference } from "@/platform/lib/generationSpec";
import { generationSupportFromControls } from "@/platform/lib/modelRegistry";

const ref = (url: string, strength?: number): GenerationReference => ({
  url,
  category: "character",
  ...(strength === undefined ? {} : { strength }),
});

describe("reference prioritization", () => {
  it("orders by strength, keeping insertion order on ties", () => {
    const refs = [ref("a", 0.5), ref("b", 0.9), ref("c", 0.5), ref("d", 0.9)];
    expect(prioritize(refs).map((r) => r.url)).toEqual(["b", "d", "a", "c"]);
  });

  it("treats an unset strength as the default, not as zero", () => {
    const refs = [ref("weak", 0.2), ref("unset")];
    expect(prioritize(refs)[0].url).toBe("unset");
  });
});

describe("resolveReferences", () => {
  it("passes everything through for a multi-reference model", () => {
    const result = resolveReferences([ref("a"), ref("b")], "multi");
    expect(result.used.map((r) => r.url)).toEqual(["a", "b"]);
    expect(result.dropped).toEqual([]);
    expect(result.notice).toBeUndefined();
  });

  it("drops all references for a model that ignores them, and says so", () => {
    const result = resolveReferences([ref("a"), ref("b")], "none");
    expect(result.used).toEqual([]);
    expect(result.dropped).toHaveLength(2);
    expect(result.notice).toMatch(/ignores reference images.*2 references/i);
  });

  it("keeps the strongest reference for a single-reference model", () => {
    const result = resolveReferences(
      [ref("weak", 0.3), ref("strong", 0.95), ref("mid", 0.6)],
      "single"
    );
    expect(result.used.map((r) => r.url)).toEqual(["strong"]);
    expect(result.dropped.map((r) => r.url)).toEqual(["mid", "weak"]);
    expect(result.notice).toMatch(/takes one reference.*ignoring 2 others/i);
  });

  it("does not nag when a single-reference model gets exactly one", () => {
    const result = resolveReferences([ref("a")], "single");
    expect(result.used).toHaveLength(1);
    expect(result.notice).toBeUndefined();
  });

  it("only omni honors per-reference strength", () => {
    expect(resolveReferences([ref("a", 0.5)], "omni").strengthHonored).toBe(true);
    expect(resolveReferences([ref("a", 0.5)], "multi").strengthHonored).toBe(false);
    // ...and says the strength is ignored when the user actually set one.
    expect(resolveReferences([ref("a", 0.5)], "multi").notice).toMatch(/strength is ignored/i);
    expect(resolveReferences([ref("a")], "multi").notice).toBeUndefined();
  });

  it("is a quiet no-op when there are no references", () => {
    for (const support of ["none", "single", "multi", "omni"] as const) {
      const result = resolveReferences(undefined, support);
      expect(result.used).toEqual([]);
      expect(result.dropped).toEqual([]);
      expect(result.notice).toBeUndefined();
    }
  });

  it("ignores entries with no url rather than sending empty refs", () => {
    const result = resolveReferences([{ url: "" }, ref("a")], "multi");
    expect(result.used.map((r) => r.url)).toEqual(["a"]);
  });

  it("never silently discards: dropped + used always accounts for every input", () => {
    const refs = [ref("a", 0.9), ref("b", 0.1), ref("c", 0.5)];
    for (const support of ["none", "single", "multi", "omni"] as const) {
      const { used, dropped } = resolveReferences(refs, support);
      expect(used.length + dropped.length).toBe(refs.length);
      if (dropped.length) expect(resolveReferences(refs, support).notice).toBeTruthy();
    }
  });

  it("describes support for the generation UI", () => {
    expect(describeReferenceSupport("none")).toMatch(/not supported/i);
    expect(describeReferenceSupport("single")).toMatch(/one reference/i);
    expect(describeReferenceSupport("omni")).toMatch(/strength/i);
  });
});

describe("registry controls map to reference support", () => {
  it("no reference control means the model ignores references", () => {
    expect(generationSupportFromControls(["seed"]).references).toBe("none");
  });

  it("accepting references is 'multi'", () => {
    expect(generationSupportFromControls(["referenceImages"]).references).toBe("multi");
  });

  it("weighting references is 'omni' — the only tier that honors strength", () => {
    const support = generationSupportFromControls(["referenceImages", "referenceStrength"]);
    expect(support.references).toBe("omni");
    expect(resolveReferences([ref("a", 0.4)], support.references).strengthHonored).toBe(true);
  });

  it("declaring strength without references is still 'none'", () => {
    expect(generationSupportFromControls(["referenceStrength"]).references).toBe("none");
  });
});
