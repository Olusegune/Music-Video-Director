import type { BrandDna } from "@/platform/lib/brandDna";

export type CampaignEffort = "small" | "medium" | "large";
export type CampaignChannel = "glam" | "web" | "motion" | "social" | "email";

export interface CampaignStrategy {
  positioning: string;
  keyMessage: string;
  pillars: string[];
  audienceInsight: string;
  channelPlan: string[];
}

export interface CampaignConcept {
  bigIdea: string;
  tagline: string;
  visualWorld: string;
  palette: string[];
}

export interface CampaignPlanItem {
  id: string;
  deliverableId: string;
  title: string;
  channel: CampaignChannel;
  ownerModule: "glam-studio" | "webstudio" | "motionstudio" | "campaignstudio";
  dueOffset: number;
  brief: string;
  content?: string;
}

export interface CampaignProject {
  id: string;
  name: string;
  product: string;
  productDescription: string;
  goal: string;
  audience: string;
  launchDate: string;
  effort: CampaignEffort;
  brand: BrandDna;
  strategy: CampaignStrategy;
  concept: CampaignConcept;
  plan: CampaignPlanItem[];
  createdAt: string;
  updatedAt: string;
}
