import type { SeedContext } from "@/platform/lib/seedContext";
import type { CampaignPlanItem, CampaignProject } from "@/apps/campaign/lib/types";

export function buildSeedContext(project: CampaignProject, item: CampaignPlanItem): SeedContext {
  return { campaignId: project.id, campaignName: project.name, sourceDeliverableId: item.deliverableId, brandDnaId: project.brand.id, product: project.product, goal: project.goal, audience: project.audience, messaging: { promise: project.strategy.keyMessage, pillars: project.strategy.pillars, tagline: project.concept.tagline }, lookId: "noir-editorial" };
}
