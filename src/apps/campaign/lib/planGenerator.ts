import { createDeliverable } from "@/platform/lib/deliverables";
import type { CampaignEffort, CampaignPlanItem, CampaignStrategy } from "@/apps/campaign/lib/types";

interface PlanSeed { title: string; channel: CampaignPlanItem["channel"]; owner: CampaignPlanItem["ownerModule"]; offset: number; format: string; }

export function planBlueprint(effort: CampaignEffort): PlanSeed[] {
  const core: PlanSeed[] = [
    { title: "Campaign hero image", channel: "glam", owner: "glam-studio", offset: -14, format: "hero-image" },
    { title: "Launch landing page", channel: "web", owner: "webstudio", offset: -10, format: "landing-page" },
    { title: "Hero launch film", channel: "motion", owner: "motionstudio", offset: -7, format: "hero-film" },
    { title: "Teaser social post", channel: "social", owner: "campaignstudio", offset: -10, format: "social-copy" },
    { title: "Reveal social post", channel: "social", owner: "campaignstudio", offset: -3, format: "social-copy" },
    { title: "Launch-day social post", channel: "social", owner: "campaignstudio", offset: 0, format: "social-copy" },
    { title: "Launch announcement email", channel: "email", owner: "campaignstudio", offset: 0, format: "email-copy" },
    { title: "Launch reminder email", channel: "email", owner: "campaignstudio", offset: 3, format: "email-copy" },
  ];
  if (effort !== "small") core.push(
    { title: "Story format pack", channel: "glam", owner: "glam-studio", offset: -5, format: "story-pack" },
    { title: "Proof social post", channel: "social", owner: "campaignstudio", offset: 4, format: "social-copy" },
    { title: "Customer objection email", channel: "email", owner: "campaignstudio", offset: 6, format: "email-copy" },
  );
  if (effort === "large") core.push(
    { title: "Sustain campaign visuals", channel: "glam", owner: "glam-studio", offset: 7, format: "sustain-pack" },
    { title: "Product feature film", channel: "motion", owner: "motionstudio", offset: 5, format: "feature-film" },
    { title: "Sustain landing-page refresh", channel: "web", owner: "webstudio", offset: 10, format: "landing-page-update" },
  );
  return core;
}

export function generatePlan(campaignId: string, strategy: CampaignStrategy, effort: CampaignEffort): CampaignPlanItem[] {
  return planBlueprint(effort).map((seed) => {
    const deliverable = createDeliverable({ moduleId: seed.owner, projectId: campaignId, kind: seed.channel, format: seed.format, status: "planned", title: seed.title, assetRefs: [] });
    return { id: crypto.randomUUID(), deliverableId: deliverable.id, title: seed.title, channel: seed.channel, ownerModule: seed.owner, dueOffset: seed.offset, brief: `${strategy.keyMessage} Pillars: ${strategy.pillars.join("; ")}.` };
  });
}

export function produceNativeCopy(title: string, channel: "social" | "email", product: string, tagline: string, strategy: CampaignStrategy) {
  if (channel === "social") return `${title}\n\n${strategy.keyMessage}\n\n${strategy.pillars[0]}. ${tagline}\n\n#${product.replace(/[^a-z0-9]/gi, "")} #Launch`;
  return `Subject: ${tagline}\nPreview: ${strategy.pillars[0]}\n\nHi there,\n\n${strategy.keyMessage}\n\n${strategy.audienceInsight}\n\n${strategy.pillars.map((pillar) => `• ${pillar}`).join("\n")}\n\n${tagline}\n`;
}
