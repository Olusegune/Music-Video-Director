import { describe, expect, it } from "vitest";
import { textProviderIsReady } from "@/platform/features/dna/bibleProfileAi";

describe("bible profile AI readiness", () => {
  it("only enables enhancement for the native structured-text provider", () => {
    expect(textProviderIsReady([{ provider: "openai", configured: true }])).toBe(false);
    expect(textProviderIsReady([{ provider: "gemini", configured: false }])).toBe(false);
    expect(textProviderIsReady([{ provider: "gemini", configured: true }])).toBe(true);
  });
});
