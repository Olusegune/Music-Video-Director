import type { CampaignConcept, CampaignStrategy } from "@/apps/campaign/lib/types";

export const CAMPAIGN_IDEA_SCHEMA = JSON.stringify({
  strategy: { positioning: "string", keyMessage: "string", pillars: ["string", "string", "string"], audienceInsight: "string", channelPlan: ["string"] },
  concept: { bigIdea: "string", tagline: "string", visualWorld: "string", palette: ["#hex", "#hex", "#hex", "#hex"] },
});
export const CAMPAIGN_COPY_SCHEMA = JSON.stringify({ content: "string" });

const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
export function parseCampaignIdea(raw: string): { strategy: CampaignStrategy; concept: CampaignConcept } {
  const value = JSON.parse(raw) as Record<string, unknown>;
  if (!value.strategy || !value.concept || typeof value.strategy !== "object" || typeof value.concept !== "object") throw new Error("Campaign response omitted strategy or concept.");
  const strategy = value.strategy as Record<string, unknown>;
  const concept = value.concept as Record<string, unknown>;
  if (typeof strategy.positioning !== "string" || typeof strategy.keyMessage !== "string" || !strings(strategy.pillars) || strategy.pillars.length < 3 || typeof strategy.audienceInsight !== "string" || !strings(strategy.channelPlan)) throw new Error("Campaign strategy failed schema validation.");
  if (typeof concept.bigIdea !== "string" || typeof concept.tagline !== "string" || typeof concept.visualWorld !== "string" || !strings(concept.palette) || concept.palette.length < 3) throw new Error("Campaign concept failed schema validation.");
  return { strategy: { positioning: strategy.positioning, keyMessage: strategy.keyMessage, pillars: strategy.pillars.slice(0, 5), audienceInsight: strategy.audienceInsight, channelPlan: strategy.channelPlan.slice(0, 6) }, concept: { bigIdea: concept.bigIdea, tagline: concept.tagline, visualWorld: concept.visualWorld, palette: concept.palette.slice(0, 5) } };
}
export function parseCampaignCopy(raw: string) { const value = JSON.parse(raw) as { content?: unknown }; if (typeof value.content !== "string" || value.content.trim().length < 20) throw new Error("Campaign copy failed schema validation."); return value.content.trim(); }
