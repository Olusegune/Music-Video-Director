import type { SectionPattern } from "@/apps/webstudio/lib/types";

export const SECTION_PATTERNS: SectionPattern[] = [
  { id: "hero-split", name: "Split Hero", family: "hero", description: "Positioning and CTA beside a visual brand panel." },
  { id: "hero-centered", name: "Centered Hero", family: "hero", description: "Direct promise, proof line, and focused CTA." },
  { id: "hero-editorial", name: "Editorial Hero", family: "hero", description: "Oversized type with a premium asymmetric rhythm." },
  { id: "features-grid", name: "Feature Grid", family: "proof", description: "Three concise value pillars in a scannable grid." },
  { id: "feature-alternating", name: "Alternating Story", family: "proof", description: "A narrative value proposition with numbered beats." },
  { id: "stats-band", name: "Proof Stats", family: "proof", description: "Credibility and outcomes in a high-contrast band." },
  { id: "testimonials-grid", name: "Testimonials", family: "trust", description: "Customer proof presented as editorial quotes." },
  { id: "logo-cloud", name: "Trust Cloud", family: "trust", description: "Compact partner, press, or customer-name proof." },
  { id: "case-study", name: "Case Study", family: "trust", description: "A single transformation story with evidence." },
  { id: "pricing-simple", name: "Offer Card", family: "conversion", description: "A clear offer, inclusions, and decisive CTA." },
  { id: "faq-stack", name: "FAQ Stack", family: "conversion", description: "Objection handling in accessible details elements." },
  { id: "cta-banner", name: "Closing CTA", family: "conversion", description: "A final promise and conversion action." },
];

export function patternById(id: string) {
  return SECTION_PATTERNS.find((pattern) => pattern.id === id) ?? SECTION_PATTERNS[0];
}
