import { describe, expect, it } from "vitest";
import type { ProviderId } from "@/platform/lib/types";
import type { RouterConfig } from "@/platform/lib/providers";
import { routeProviderChain } from "@/platform/lib/providers";
import {
  canUseNetworkForSpec,
  resolveGenerationCandidates,
  runWithProviderFallback,
  unsupportedGenerationParams,
  type GenerationSpec,
} from "@/platform/lib/generationSpec";
import { listModuleManifests } from "@/platform/lib/moduleManifest";
import { generationSupportForProviderKey } from "@/platform/lib/modelRegistry";

const configured = new Set<ProviderId>(["openai", "fal", "kie", "wavespeed", "gemini"]);

function spec(
  moduleId: string,
  capability: GenerationSpec["capability"] = "image"
): GenerationSpec {
  return {
    capability,
    prompt: "A clean product hero image",
    negativePrompt: "blurry",
    seed: 42,
    batch: 2,
    aspect: "16:9",
    resolution: { width: 1536, height: 864 },
    references: [{ url: "asset://ref.png", category: "product", strength: 0.8 }],
    modelHint: capability === "video" ? "seedance" : "gpt-image",
    moduleId,
  };
}

describe("GenerationSpec routing contract", () => {
  it("local mode never produces network candidates", () => {
    const cfg: RouterConfig = { mode: "local", manual: {}, preferredAggregators: {} };
    expect(resolveGenerationCandidates(spec("glam"), cfg, configured)).toEqual([]);
    expect(canUseNetworkForSpec(spec("glam"), cfg, configured)).toBe(false);
  });

  it("manual mode starts with the selected provider", () => {
    const cfg: RouterConfig = {
      mode: "manual",
      manual: { image: "fal" },
      preferredAggregators: {},
    };
    expect(routeProviderChain("image", cfg, configured)[0]).toBe("fal");
  });

  it("providerPref outranks mode scoring", () => {
    const cfg: RouterConfig = { mode: "quality", manual: {}, preferredAggregators: {} };
    expect(routeProviderChain("image", cfg, configured, { providerPref: "wavespeed" })[0]).toBe(
      "wavespeed"
    );
  });

  it("preferred aggregator outranks score for a model hint", () => {
    const cfg: RouterConfig = {
      mode: "quality",
      manual: {},
      preferredAggregators: { "gpt-image": "kie" },
    };
    expect(routeProviderChain("image", cfg, configured, { modelHint: "gpt-image" })[0]).toBe("kie");
  });

  it("unsupported params are reported for providers that cannot use them", () => {
    const support = {
      negativePrompt: false,
      seed: false,
      batch: false,
      resolution: true,
      references: "none" as const,
    };
    expect(unsupportedGenerationParams(spec("campaign"), support)).toEqual([
      "negative prompt",
      "seed",
      "batch",
      "references",
    ]);
  });

  it("registry exposes provider support flags from model controls", () => {
    expect(generationSupportForProviderKey("openai", "image")).toMatchObject({
      negativePrompt: true,
      resolution: true,
    });
  });

  it.each(listModuleManifests())(
    "$label honors local mode with no network candidates",
    (manifest) => {
      const cfg: RouterConfig = { mode: "local", manual: {}, preferredAggregators: {} };
      for (const capability of manifest.generationCapabilities) {
        expect(resolveGenerationCandidates(spec(manifest.id, capability), cfg, configured)).toEqual(
          []
        );
      }
    }
  );

  it.each(listModuleManifests())(
    "$label has at least one configured manual-mode path for declared generation capabilities",
    (manifest) => {
      const cfg: RouterConfig = {
        mode: "manual",
        manual: { text: "gemini", image: "openai", video: "fal", audio: "elevenlabs" },
        preferredAggregators: {},
      };
      for (const capability of manifest.generationCapabilities) {
        const available = capability === "audio" ? new Set<ProviderId>(["elevenlabs"]) : configured;
        expect(
          resolveGenerationCandidates(spec(manifest.id, capability), cfg, available).length
        ).toBeGreaterThan(0);
      }
    }
  );
});

describe("runWithProviderFallback", () => {
  const recoverable = () => true;

  it("returns the first provider's result when it succeeds", async () => {
    const seen: ProviderId[] = [];
    const result = await runWithProviderFallback<string>(
      ["kie", "wavespeed", "fal"],
      async (p) => {
        seen.push(p);
        return `ok:${p}`;
      },
      { isRecoverable: recoverable }
    );
    expect(result).toBe("ok:kie");
    expect(seen).toEqual(["kie"]);
  });

  it("advances to the next provider on a recoverable failure and announces it", async () => {
    const hops: Array<[ProviderId, ProviderId]> = [];
    const result = await runWithProviderFallback<string>(
      ["kie", "wavespeed", "fal"],
      async (p) => {
        if (p === "kie") throw new Error("429 rate limit");
        return `ok:${p}`;
      },
      { isRecoverable: recoverable, onFallback: (from, to) => hops.push([from, to]) }
    );
    expect(result).toBe("ok:wavespeed");
    expect(hops).toEqual([["kie", "wavespeed"]]);
  });

  it("does not advance on a non-recoverable failure", async () => {
    await expect(
      runWithProviderFallback<string>(["kie", "fal"], async () => {
        throw new Error("bad prompt");
      }, { isRecoverable: () => false })
    ).rejects.toThrow("bad prompt");
  });

  it("throws the last error when the whole chain fails", async () => {
    await expect(
      runWithProviderFallback<string>(["kie", "fal"], async (p) => {
        throw new Error(`500 ${p}`);
      }, { isRecoverable: recoverable })
    ).rejects.toThrow("500 fal");
  });

  it("throws when no providers are supplied", async () => {
    await expect(
      runWithProviderFallback<string>([], async () => "x")
    ).rejects.toThrow(/no configured provider/i);
  });
});
