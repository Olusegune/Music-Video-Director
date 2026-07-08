import type { Positioning, SectionCopy } from "@/apps/webstudio/lib/types";

export const POSITIONING_SCHEMA = JSON.stringify({
  audience: "string", offer: "string", promise: "string", valueProps: ["string", "string", "string"],
  objections: ["string", "string", "string"], proof: ["string"], cta: "string",
});

export const COPY_SCHEMA = JSON.stringify({
  sections: [{ patternId: "string", eyebrow: "string", heading: "string", body: "string", items: ["string"], ctaLabel: "string" }],
});

const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

export function parsePositioning(raw: string): Positioning {
  const value = JSON.parse(raw) as Record<string, unknown>;
  if (typeof value.audience !== "string" || typeof value.offer !== "string" || typeof value.promise !== "string" || typeof value.cta !== "string" || !strings(value.valueProps) || !strings(value.objections) || !strings(value.proof)) {
    throw new Error("The positioning response did not match the required schema.");
  }
  if (value.valueProps.length < 3 || value.objections.length < 2 || value.proof.length < 1) throw new Error("The positioning response was incomplete.");
  return { audience: value.audience, offer: value.offer, promise: value.promise, cta: value.cta, valueProps: value.valueProps.slice(0, 5), objections: value.objections.slice(0, 5), proof: value.proof.slice(0, 6) };
}

export function parseCopyDrafts(raw: string, allowedPatternIds: string[]): Record<string, SectionCopy> {
  const value = JSON.parse(raw) as { sections?: unknown };
  if (!Array.isArray(value.sections)) throw new Error("The copy response did not contain a sections array.");
  const allowed = new Set(allowedPatternIds);
  const output: Record<string, SectionCopy> = {};
  for (const entry of value.sections) {
    if (!entry || typeof entry !== "object") throw new Error("A section copy entry was invalid.");
    const item = entry as Record<string, unknown>;
    if (typeof item.patternId !== "string" || !allowed.has(item.patternId) || typeof item.eyebrow !== "string" || typeof item.heading !== "string" || typeof item.body !== "string" || typeof item.ctaLabel !== "string" || !strings(item.items)) throw new Error("A section copy entry did not match the required schema.");
    output[item.patternId] = { eyebrow: item.eyebrow, heading: item.heading, body: item.body, items: item.items.slice(0, 6), ctaLabel: item.ctaLabel };
  }
  if (Object.keys(output).length !== allowed.size) throw new Error("The copy response omitted one or more selected sections.");
  return output;
}
