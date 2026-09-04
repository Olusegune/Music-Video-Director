/**
 * Copy Framework Presets — strategic content approaches that guide
 * tone, messaging priority, and conversion path for Web Studio projects.
 */

export interface CopyFrameworkPreset {
  id: string;
  label: string;
  focus: "product" | "story" | "proof" | "roi" | "emotion" | "authority";
  summary: string;
  description: string;
  heroApproach: string;
  proofApproach: string;
  ctaApproach: string;
  promptFragment: string;
}

export const COPY_FRAMEWORK_PRESETS: CopyFrameworkPreset[] = [
  {
    id: "copy-product-first",
    label: "Product-First",
    focus: "product",
    summary: "Lead with what it is, features, benefits, clear CTA",
    description: "Product-centric: hero highlights the product/service itself, features & benefits prominent, straightforward value prop, direct conversion CTA",
    heroApproach: "Product hero: 'Here's what we do / Here's what we built' — feature-led, action-oriented",
    proofApproach: "Benefit-driven: how features translate to customer wins, feature explanations with visual demos",
    ctaApproach: "Direct and clear: 'Start Free Trial', 'Buy Now', 'Get Started' — remove friction",
    promptFragment: "Product-first messaging strategy leading with the offering, feature benefits, and clear conversion CTAs. Tone: direct, practical, action-oriented.",
  },
  {
    id: "copy-founder-story",
    label: "Founder Story",
    focus: "story",
    summary: "Human angle: founder journey, vision, why it matters",
    description: "Personal narrative: founder origin story in hero, journey to founding, personal mission, human connection, then product as manifestation of vision",
    heroApproach: "Story hero: 'Here's why we built this' — personal, emotional, relatable journey",
    proofApproach: "Mission-driven: customer transformations, impact stories, community stories, testimonials on the founder's vision",
    ctaApproach: "Join-oriented: 'Join Us', 'Be Part of the Mission', 'Let's Build Together' — collaborative tone",
    promptFragment: "Founder-story messaging strategy emphasizing personal journey, mission-driven values, and emotional connection to the brand. Tone: authentic, inspirational, human.",
  },
  {
    id: "copy-social-proof-first",
    label: "Social Proof-First",
    focus: "proof",
    summary: "Lead with results, testimonials, case studies, validation",
    description: "Proof-heavy: hero leads with results/statistics, social proof prominent above fold, testimonials and case studies drive trust, FOMO-friendly",
    heroApproach: "Proof hero: 'Join 10,000+ satisfied customers' or 'Trusted by Fortune 500s' — social validation first",
    proofApproach: "Results-heavy: case studies, testimonials, metrics, before/after, specific outcomes, visible reviews",
    ctaApproach: "Trust-based: 'See Why Leaders Choose Us', 'Join the Movement', 'See Case Studies' — proof-led",
    promptFragment: "Social-proof-first messaging strategy foregrounding results, customer testimonials, case studies, and social validation. Tone: trusted, evidence-backed, community-focused.",
  },
  {
    id: "copy-roi-first",
    label: "ROI-First",
    focus: "roi",
    summary: "Numbers & metrics: cost savings, revenue impact, efficiency gains",
    description: "Business-value focused: hero opens with ROI/metrics, emphasizes business impact, detailed pricing/calculator, measurable outcomes, financial language",
    heroApproach: "ROI hero: 'Save $50k/year' or 'Increase Revenue by 30%' — metric-led, business language",
    proofApproach: "Metrics-driven: detailed case study numbers, cost/benefit comparisons, efficiency calculations, ROI calculator, benchmark comparisons",
    ctaApproach: "Analysis-focused: 'Calculate Your Savings', 'View ROI Calculator', 'Schedule Demo' — data-led",
    promptFragment: "ROI-first messaging strategy emphasizing business metrics, cost savings, revenue impact, and financial return on investment. Tone: data-driven, business-focused, analytical.",
  },
  {
    id: "copy-emotional-narrative",
    label: "Emotional Narrative",
    focus: "emotion",
    summary: "Story-driven transformation, emotional hooks, aspiration",
    description: "Emotional journey: hero opens with customer aspiration or problem feeling, narrative arc of transformation, aspirational language, emotional connection throughout",
    heroApproach: "Emotional hero: 'Imagine if...' or 'You deserve...' — desire-driven, transformation-focused",
    proofApproach: "Transformation stories: before/after emotional arcs, customer life changes, testimonials emphasizing feeling and transformation, vulnerability and wins",
    ctaApproach: "Aspiration-driven: 'Start Your Transformation', 'Claim Your Freedom', 'Begin Your Journey' — emotional action words",
    promptFragment: "Emotional narrative messaging strategy using transformation stories, aspirational language, and emotional connection to drive engagement. Tone: inspirational, intimate, transformative.",
  },
  {
    id: "copy-authority-expertise",
    label: "Authority & Expertise",
    focus: "authority",
    summary: "Credentials, thought leadership, methodology, insider knowledge",
    description: "Authority-led: hero establishes expertise/credentials, proprietary methodology highlighted, thought leadership content, insider perspective, educational positioning",
    heroApproach: "Authority hero: 'The #1 Expert in...' or 'Our Proprietary Method...' — credential-first, expert-positioned",
    proofApproach: "Expert-driven: published research, speaking engagements, industry awards, methodology explanations, insider tips, educational content",
    ctaApproach: "Education-focused: 'Learn from the Experts', 'Download Our Guide', 'Schedule Expert Consultation' — knowledge-sharing",
    promptFragment: "Authority-expertise messaging strategy establishing thought leadership, proprietary methodology, credentials, and educational positioning. Tone: expert, insightful, educational.",
  },
];
