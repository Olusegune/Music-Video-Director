import { patternById } from "@/apps/webstudio/lib/patterns";
import type { Positioning, SectionInstance } from "@/apps/webstudio/lib/types";

export interface WebBrief {
  businessName: string;
  businessDescription: string;
  audience: string;
  proofPoints: string[];
  ctaGoal: string;
}

export function derivePositioning(brief: WebBrief): Positioning {
  const audience = brief.audience || "ambitious customers who value quality and clarity";
  const offer = brief.businessDescription || `${brief.businessName} delivers a focused, premium solution`;
  const cta = brief.ctaGoal || "Start a conversation";
  return {
    audience,
    offer,
    promise: `${brief.businessName} helps ${audience} move from uncertainty to a confident next step.`,
    valueProps: ["A clearer path to the outcome", "Expert quality without needless complexity", "A polished experience built around the customer"],
    objections: ["Will this work for my situation?", "How quickly can we get started?", "What makes this different?"],
    proof: brief.proofPoints.length ? brief.proofPoints : ["Focused expertise", "Thoughtful process", "Measurable outcomes"],
    cta,
  };
}

export function buildSections(patternIds: string[], positioning: Positioning): SectionInstance[] {
  return patternIds.map((patternId, index) => {
    const pattern = patternById(patternId);
    const base = { id: crypto.randomUUID(), patternId, copy: { eyebrow: pattern.family, heading: positioning.promise, body: positioning.offer, items: positioning.valueProps, ctaLabel: "" } };
    if (pattern.family === "hero") return { ...base, copy: { ...base.copy, eyebrow: "Built for your next move", heading: positioning.promise, items: positioning.proof, ctaLabel: positioning.cta } };
    if (pattern.family === "proof") return { ...base, copy: { ...base.copy, eyebrow: "Why it works", heading: index % 2 ? "A better way forward" : "Clarity becomes momentum", items: patternId === "stats-band" ? positioning.proof : positioning.valueProps } };
    if (pattern.family === "trust") return { ...base, copy: { ...base.copy, eyebrow: "Proof, not promises", heading: "Confidence you can verify", body: "The strongest work earns trust through specificity, evidence, and a process people can understand.", items: positioning.proof } };
    if (patternId === "faq-stack") return { ...base, copy: { ...base.copy, eyebrow: "Good questions", heading: "Everything you need to move forward", items: positioning.objections } };
    return { ...base, copy: { ...base.copy, eyebrow: "The next step", heading: "Ready when you are", body: positioning.promise, items: positioning.valueProps, ctaLabel: positioning.cta } };
  });
}
