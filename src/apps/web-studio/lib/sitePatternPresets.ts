/**
 * Site Pattern Presets — layout archetypes that define section order,
 * positioning roles, and customer journey flow for Web Studio projects.
 */

export interface SitePatternPreset {
  id: string;
  label: string;
  category: "agency" | "saas" | "commerce" | "content" | "service" | "creator" | "nonprofit" | "luxury";
  summary: string;
  description: string;
  sectionOrder: Array<"hero" | "proof" | "trust" | "conversion" | "detail" | "faq" | "cta">;
  promptFragment: string;
}

export const SITE_PATTERN_PRESETS: SitePatternPreset[] = [
  {
    id: "pattern-agency-portfolio",
    label: "Agency Portfolio",
    category: "agency",
    summary: "Showcase agency work with portfolio cases, team, process",
    description: "Perfect for creative/design agencies: hero → work showcase → case study deep-dives → team → capabilities → contact",
    sectionOrder: ["hero", "proof", "detail", "trust", "conversion"],
    promptFragment: "Agency portfolio website emphasizing creative work, case studies, and team expertise with visual-first storytelling",
  },
  {
    id: "pattern-saas-landing",
    label: "SaaS Landing",
    category: "saas",
    summary: "Convert prospects with problem→solution→proof→CTA",
    description: "SaaS growth playbook: hero → problem/solution → features/benefits → social proof → pricing/CTA",
    sectionOrder: ["hero", "detail", "proof", "trust", "conversion"],
    promptFragment: "SaaS landing page optimized for conversion with clear problem statement, solution positioning, feature highlights, and social proof",
  },
  {
    id: "pattern-ecommerce-showcase",
    label: "E-Commerce Showcase",
    category: "commerce",
    summary: "Product-focused with hero, features, reviews, conversion",
    description: "E-commerce homepage: hero product → gallery/details → benefits → reviews → related items → cart CTA",
    sectionOrder: ["hero", "detail", "proof", "trust", "conversion"],
    promptFragment: "E-commerce product showcase emphasizing visual presentation, detailed specifications, customer reviews, and frictionless checkout",
  },
  {
    id: "pattern-blog-hub",
    label: "Blog/Content Hub",
    category: "content",
    summary: "Organize content discovery with featured posts, categories",
    description: "Content-first: hero → featured articles → category browsing → author/expertise → newsletter signup",
    sectionOrder: ["hero", "detail", "proof", "trust", "conversion"],
    promptFragment: "Content hub designed for article discovery with featured posts, category navigation, author credibility, and newsletter conversion",
  },
  {
    id: "pattern-service-directory",
    label: "Service Directory",
    category: "service",
    summary: "Service listing with specialties, providers, booking",
    description: "Service marketplace: hero → service categories → provider profiles → social proof → booking CTA",
    sectionOrder: ["hero", "detail", "proof", "trust", "conversion"],
    promptFragment: "Service directory emphasizing service categories, provider expertise, client reviews, and easy booking process",
  },
  {
    id: "pattern-case-study-hub",
    label: "Case Study Hub",
    category: "agency",
    summary: "Deep-dive storytelling with before/after, results, methodology",
    description: "Results-focused: hero → featured case → methodology → metrics/ROI → related cases → contact",
    sectionOrder: ["hero", "detail", "proof", "conversion", "trust"],
    promptFragment: "Case study showcase highlighting problem/solution, methodology, measurable results, and business impact with visual storytelling",
  },
  {
    id: "pattern-consulting-homepage",
    label: "Consulting Homepage",
    category: "agency",
    summary: "Establish authority with expertise, industries, approach",
    description: "B2B consulting: hero → industries served → methodology/approach → client results → team → contact",
    sectionOrder: ["hero", "trust", "detail", "proof", "conversion"],
    promptFragment: "Consulting firm website emphasizing industry expertise, proprietary methodology, client success stories, and thought leadership",
  },
  {
    id: "pattern-restaurant-local",
    label: "Restaurant/Local Business",
    category: "commerce",
    summary: "Highlight location, menu, hours, reservations, reviews",
    description: "Local business: hero → location/hours → menu showcase → reviews/ratings → reservation/contact CTA",
    sectionOrder: ["hero", "detail", "proof", "trust", "conversion"],
    promptFragment: "Local business website with location/hours prominence, menu highlights, customer reviews, and seamless reservation/contact flow",
  },
  {
    id: "pattern-creator-portfolio",
    label: "Creator Portfolio",
    category: "creator",
    summary: "Personal brand with portfolio, bio, social proof, contact",
    description: "Creator: hero/bio → portfolio grid → testimonials → behind-the-scenes → collaboration/booking CTA",
    sectionOrder: ["hero", "proof", "detail", "trust", "conversion"],
    promptFragment: "Creator/freelancer portfolio showcasing best work, client testimonials, creative process insights, and collaboration opportunities",
  },
  {
    id: "pattern-nonprofit-mission",
    label: "Nonprofit Mission-Driven",
    category: "nonprofit",
    summary: "Lead with impact story, mission, results, donations",
    description: "Nonprofit: hero/mission → impact stories → statistics/results → beneficiary stories → donation CTA",
    sectionOrder: ["hero", "proof", "detail", "trust", "conversion"],
    promptFragment: "Nonprofit website emphasizing mission impact, beneficiary stories, measurable outcomes, donation pathways, and volunteer opportunities",
  },
  {
    id: "pattern-luxury-experience",
    label: "Luxury/High-End",
    category: "luxury",
    summary: "Prestige through visual luxury, exclusivity, heritage",
    description: "Luxury: hero → signature offerings → craftsmanship/heritage → exclusive access → personalized contact",
    sectionOrder: ["hero", "detail", "trust", "proof", "conversion"],
    promptFragment: "Luxury brand website emphasizing heritage, craftsmanship, exclusivity, and personalized experience with high-end visual presentation",
  },
  {
    id: "pattern-real-estate-showcase",
    label: "Real Estate Showcase",
    category: "commerce",
    summary: "Property listings with gallery, details, agent, contact",
    description: "Real estate: hero → featured properties → search/filter → agent profiles → virtual tour → inquiry CTA",
    sectionOrder: ["hero", "detail", "proof", "trust", "conversion"],
    promptFragment: "Real estate website with property showcase, virtual tours, neighborhood details, agent profiles, and mortgage/inquiry tools",
  },
];
