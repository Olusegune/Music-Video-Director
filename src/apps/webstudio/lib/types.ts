import type { BrandDna } from "@/platform/lib/brandDna";

export type PatternFamily = "hero" | "proof" | "trust" | "conversion";

export interface Positioning {
  audience: string;
  offer: string;
  promise: string;
  valueProps: string[];
  objections: string[];
  proof: string[];
  cta: string;
}

export interface SectionCopy {
  eyebrow: string;
  heading: string;
  body: string;
  items: string[];
  ctaLabel: string;
}

export interface SectionInstance {
  id: string;
  patternId: string;
  copy: SectionCopy;
  mediaUrl?: string;
  // Visual builder & positioning
  role?: "hero" | "proof" | "trust" | "conversion";
  hidden?: boolean;
  locked?: boolean;
}

export interface DesignTokens {
  background: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  fontDisplay: string;
  fontBody: string;
  radius: number;
  maxWidth: number;
}

export interface WebProject {
  id: string;
  name: string;
  businessName: string;
  businessDescription: string;
  audience: string;
  proofPoints: string[];
  ctaGoal: string;
  brand: BrandDna;
  positioning: Positioning;
  sections: SectionInstance[];
  pages?: WebPage[];
  seo?: SiteSeo;
  tokens: DesignTokens;
  createdAt: string;
  updatedAt: string;
}

export interface WebPage {
  id: string;
  title: string;
  slug: string;
  description: string;
  sections: SectionInstance[];
}

export interface SiteSeo {
  titleTemplate: string;
  siteUrl: string;
  socialImage?: string;
  indexable: boolean;
}

export interface SectionPattern {
  id: string;
  name: string;
  family: PatternFamily;
  description: string;
}
