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
  tokens: DesignTokens;
  createdAt: string;
  updatedAt: string;
}

export interface SectionPattern {
  id: string;
  name: string;
  family: PatternFamily;
  description: string;
}
