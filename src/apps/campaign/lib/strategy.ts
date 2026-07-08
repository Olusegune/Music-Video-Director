import type { CampaignConcept, CampaignStrategy } from "@/apps/campaign/lib/types";

export function buildCampaignStrategy(product: string, description: string, audience: string, goal: string): CampaignStrategy {
  return {
    positioning: `${product} is the confident choice for ${audience} who want ${goal.toLowerCase()} without unnecessary friction.`,
    keyMessage: `${product} turns ${description || "a promising idea"} into a clear next move.`,
    pillars: ["A distinct promise people understand", "Proof that makes the promise credible", "A consistent experience across every channel"],
    audienceInsight: `${audience} do not need more noise; they need a specific reason to believe and an obvious next step.`,
    channelPlan: ["Lead with a visual hero", "Capture intent on a focused landing page", "Build repetition through social", "Convert with a concise email sequence"],
  };
}

export function buildCampaignConcept(product: string, strategy: CampaignStrategy): CampaignConcept {
  return {
    bigIdea: "The Moment It Clicks",
    tagline: `${product}. Make the next move obvious.`,
    visualWorld: `Confident editorial restraint: one unmistakable hero, precise negative space, and visual repetition that reinforces “${strategy.keyMessage}”.`,
    palette: ["#0B1020", "#F8FAFC", "#8B5CF6", "#22D3EE"],
  };
}
