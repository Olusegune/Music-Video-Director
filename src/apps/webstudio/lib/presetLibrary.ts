/**
 * Web Studio Preset Library
 * 24 comprehensive presets covering modern web design patterns
 * Organized across 6 categories with reference images and generation prompts
 */

export type PresetCategory =
  | "hero-landing"
  | "portfolio-creative"
  | "product-ecommerce"
  | "tech-web3"
  | "corporate-brand"
  | "entertainment-lifestyle";

export type PresetId =
  | "immersive-video-hero"
  | "product-showcase"
  | "minimalist-modern"
  | "storytelling-narrative"
  | "grid-portfolio"
  | "creative-studio"
  | "agency-portfolio"
  | "designer-showcase"
  | "luxury-product"
  | "saas-dashboard"
  | "fast-fashion"
  | "food-beverage"
  | "web3-crypto"
  | "enterprise-tech"
  | "ai-ml"
  | "corporate-mission"
  | "b2b-services"
  | "sustainability"
  | "music-artist"
  | "event-conference"
  | "fitness-wellness"
  | "travel-adventure"
  | "fashion-brand"
  | "restaurant-hospitality";

export interface WebPreset {
  id: PresetId;
  label: string;
  category: PresetCategory;
  description: string;
  summary: string;
  /** URL path to reference image in public/presets/ */
  referenceImage: string;
  /** Color palette accent */
  accentColor: string;
  /** Key sections this preset includes */
  sections: Array<{
    name: string;
    type: "hero" | "feature" | "showcase" | "testimonial" | "pricing" | "cta" | "footer" | "team" | "process";
    description: string;
  }>;
  /** Generation prompt fragment for AI */
  promptFragment: string;
  /** Design characteristics */
  aesthetic: {
    style: "minimal" | "bold" | "luxury" | "playful" | "corporate" | "creative";
    typography: "serif" | "sans-serif" | "mixed";
    colorPalette: string;
    spacing: "tight" | "balanced" | "spacious";
  };
  /** Animation/interaction style */
  interactions: string[];
  /** Accessibility notes */
  a11y: string;
}

export const WEB_PRESETS: Record<PresetId, WebPreset> = {
  // CATEGORY 1: HERO & LANDING
  "immersive-video-hero": {
    id: "immersive-video-hero",
    label: "Immersive Video Hero",
    category: "hero-landing",
    description: "Full-screen video background with text overlay, parallax scroll reveal, and animated CTA",
    summary: "Cinematic, high-impact entry point with video storytelling",
    referenceImage: "/presets/ignite-festival.png",
    accentColor: "#FF1B6D",
    sections: [
      { name: "Video Hero", type: "hero", description: "Full-screen video with text overlay" },
      { name: "Featured Items", type: "showcase", description: "Grid of featured performers/projects" },
      { name: "Schedule Preview", type: "feature", description: "Key dates and timeline" },
      { name: "Call to Action", type: "cta", description: "Primary booking/signup CTA" },
    ],
    promptFragment: "full-screen immersive video hero with cinematic text overlay, parallax scroll animations, bold accent colors (#FF1B6D), featured content grid, schedule preview section, prominent CTA button with hover effects",
    aesthetic: {
      style: "bold",
      typography: "sans-serif",
      colorPalette: "dark with neon accent",
      spacing: "spacious",
    },
    interactions: ["parallax-scroll", "hover-expand", "smooth-transitions", "animated-text"],
    a11y: "Ensure video has captions, text contrast >= 4.5:1 against video, keyboard navigation for all CTAs",
  },

  "product-showcase": {
    id: "product-showcase",
    label: "Product Showcase",
    category: "hero-landing",
    description: "Large product render (left/right split), feature list with staggered animations, specs sidebar",
    summary: "Premium product-focused landing with detailed specifications",
    referenceImage: "/presets/aurvana-headphones.png",
    accentColor: "#D4AF37",
    sections: [
      { name: "Product Hero", type: "hero", description: "Large product image with specs" },
      { name: "Features", type: "feature", description: "Key features with animations" },
      { name: "Specifications", type: "showcase", description: "Technical details and specs" },
      { name: "Preorder CTA", type: "cta", description: "Purchase or preorder button" },
    ],
    promptFragment: "premium product showcase with large high-quality product imagery, split-layout design, staggered feature list animations on scroll, specification sidebar with luxury design elements, limited edition messaging, gold accents (#D4AF37)",
    aesthetic: {
      style: "luxury",
      typography: "serif",
      colorPalette: "dark with gold accents",
      spacing: "balanced",
    },
    interactions: ["scroll-reveal", "staggered-animation", "image-zoom", "smooth-scroll"],
    a11y: "Product images have detailed alt text, specs table uses proper semantic markup, color contrast meets WCAG AA",
  },

  "minimalist-modern": {
    id: "minimalist-modern",
    label: "Minimalist Modern",
    category: "hero-landing",
    description: "Clean breathing space aesthetic, animated text reveals on scroll, micro-interactions, single accent color",
    summary: "Contemporary minimal design with subtle animations",
    referenceImage: "/presets/aurora-lifestyle.png",
    accentColor: "#2D2D2D",
    sections: [
      { name: "Hero Text", type: "hero", description: "Animated typography reveal" },
      { name: "Brand Story", type: "feature", description: "Minimal narrative with breathing space" },
      { name: "Curated Products", type: "showcase", description: "Simple grid of featured items" },
      { name: "Values", type: "feature", description: "Brand values with icons" },
    ],
    promptFragment: "minimalist modern design with abundant white space, animated text reveals on scroll, single accent color throughout, minimal geometric illustrations, subtle micro-interactions, clean typography, refined product photography",
    aesthetic: {
      style: "minimal",
      typography: "sans-serif",
      colorPalette: "light with subtle accents",
      spacing: "spacious",
    },
    interactions: ["text-reveal", "fade-in", "subtle-hover", "smooth-scroll"],
    a11y: "Sufficient line-height and letter-spacing for readability, high contrast for minimal color palette, screen reader friendly animations",
  },

  "storytelling-narrative": {
    id: "storytelling-narrative",
    label: "Storytelling Narrative",
    category: "hero-landing",
    description: "Sequential section flow telling a story, mixed media (video + images + text), full-width immersive sections",
    summary: "Progressive narrative with media-rich storytelling",
    referenceImage: "/presets/villa-lumiere.png",
    accentColor: "#C9A961",
    sections: [
      { name: "Scene 1", type: "hero", description: "Story opening with hero image" },
      { name: "Scene 2", type: "feature", description: "Narrative development section" },
      { name: "Scene 3", type: "showcase", description: "Visual sequence or gallery" },
      { name: "Resolution", type: "cta", description: "Call to action conclusion" },
    ],
    promptFragment: "sequential storytelling layout with full-width immersive sections, mixed media (video clips, high-res images, text), scene transitions with parallax, progressive narrative flow, luxury hospitality aesthetic, warm golden tones (#C9A961)",
    aesthetic: {
      style: "luxury",
      typography: "serif",
      colorPalette: "warm earth tones with gold",
      spacing: "spacious",
    },
    interactions: ["parallax-scroll", "fade-transitions", "video-autoplay", "full-width-scroll"],
    a11y: "Video has captions and transcripts, text over images has sufficient contrast, scene structure is logical for screen readers",
  },

  // CATEGORY 2: PORTFOLIO & CREATIVE
  "grid-portfolio": {
    id: "grid-portfolio",
    label: "Grid Portfolio",
    category: "portfolio-creative",
    description: "Masonry/grid layout of work samples, hover expand to full-screen, filter by category, lightbox gallery",
    summary: "Dynamic portfolio grid with filtering and lightbox",
    referenceImage: "/presets/alex-morgan-photography.png",
    accentColor: "#1A1A1A",
    sections: [
      { name: "Portfolio Grid", type: "showcase", description: "Masonry/grid of work samples" },
      { name: "Category Filters", type: "feature", description: "Filter buttons by project type" },
      { name: "Lightbox View", type: "showcase", description: "Full-screen project detail view" },
      { name: "Project Details", type: "feature", description: "Description and metadata" },
    ],
    promptFragment: "portfolio grid layout with masonry or asymmetric arrangement, hover expand to full-screen lightbox, category filter buttons, responsive grid that adapts to screen size, smooth transitions between states, photography-focused aesthetic",
    aesthetic: {
      style: "creative",
      typography: "sans-serif",
      colorPalette: "dark with white text",
      spacing: "balanced",
    },
    interactions: ["hover-expand", "lightbox-modal", "filter-animation", "smooth-transitions"],
    a11y: "Grid uses semantic list structure, lightbox has close button and keyboard support (Esc to close), alt text for all images",
  },

  "creative-studio": {
    id: "creative-studio",
    label: "Creative Studio",
    category: "portfolio-creative",
    description: "Asymmetric playful layout, vintage/nostalgic aesthetic, 3D rendered objects, personality-driven design",
    summary: "Playful and creative layout with distinctive personality",
    referenceImage: "/presets/elena-marcova-artist.png",
    accentColor: "#8B7355",
    sections: [
      { name: "Featured Work", type: "hero", description: "Hero project with asymmetric layout" },
      { name: "Project Series", type: "showcase", description: "Grid of related projects" },
      { name: "Studio Info", type: "feature", description: "About the studio/artist" },
      { name: "Exhibitions", type: "showcase", description: "Current and upcoming shows" },
    ],
    promptFragment: "asymmetric creative layout with playful composition, vintage or nostalgic aesthetic touches, 3D rendered objects or illustrations, personality-driven design with unique typography, artist or studio bio section, exhibition listings",
    aesthetic: {
      style: "creative",
      typography: "mixed",
      colorPalette: "earth tones with accents",
      spacing: "tight",
    },
    interactions: ["asymmetric-scroll", "hover-reveals", "animated-text", "unique-typography"],
    a11y: "Asymmetric layouts maintain logical reading order for screen readers, sufficient contrast for earth tone palette, text sizing accommodates readability",
  },

  "agency-portfolio": {
    id: "agency-portfolio",
    label: "Agency Portfolio",
    category: "portfolio-creative",
    description: "Project case studies with before/after sliders, client testimonials, team showcase, project timeline",
    summary: "Professional agency portfolio with case studies and social proof",
    referenceImage: "/presets/obsidian-agency.png",
    accentColor: "#E74C3C",
    sections: [
      { name: "Case Studies", type: "showcase", description: "Before/after project sliders" },
      { name: "Testimonials", type: "testimonial", description: "Client quotes and reviews" },
      { name: "Team", type: "team", description: "Agency team member profiles" },
      { name: "Work Timeline", type: "feature", description: "Notable projects and timeline" },
    ],
    promptFragment: "professional agency portfolio with case study projects, before/after comparison sliders, client testimonials with photos and quotes, team member showcase with bios, awards and recognition badges, bold red accent (#E74C3C), corporate professional aesthetic",
    aesthetic: {
      style: "corporate",
      typography: "sans-serif",
      colorPalette: "dark with red accents",
      spacing: "balanced",
    },
    interactions: ["slider-before-after", "hover-highlights", "testimonial-carousel", "smooth-scroll"],
    a11y: "Before/after sliders accessible via keyboard, testimonial carousel has navigation controls, team member images have descriptive alt text",
  },

  "designer-showcase": {
    id: "designer-showcase",
    label: "Designer Showcase",
    category: "portfolio-creative",
    description: "Full-width project cards shifting on scroll, detailed descriptions, process breakdown, award badges",
    summary: "Premium designer portfolio with detailed process documentation",
    referenceImage: "/presets/alex-richards-designer.png",
    accentColor: "#5A4A42",
    sections: [
      { name: "Featured Project", type: "hero", description: "Large full-width project card" },
      { name: "Project Details", type: "feature", description: "Detailed description and process" },
      { name: "Related Work", type: "showcase", description: "Related or similar projects" },
      { name: "Awards", type: "feature", description: "Recognition and certifications" },
    ],
    promptFragment: "full-width project cards with smooth scroll shift animation, detailed project descriptions and design process breakdown, related projects gallery, award badges and recognitions, designer portfolio aesthetic, refined typography and generous spacing",
    aesthetic: {
      style: "minimal",
      typography: "serif",
      colorPalette: "light with warm accents",
      spacing: "spacious",
    },
    interactions: ["scroll-shift", "card-animations", "smooth-transitions", "detail-reveals"],
    a11y: "Full-width cards maintain readable content width, award badges are descriptive, process steps are clearly numbered and structured",
  },

  // CATEGORY 3: PRODUCT & E-COMMERCE
  "luxury-product": {
    id: "luxury-product",
    label: "Luxury Product Launch",
    category: "product-ecommerce",
    description: "High-end product photography, animated spec details, limited edition countdown, premium color palette",
    summary: "Exclusive luxury product launch experience",
    referenceImage: "/presets/aurvana-headphones.png",
    accentColor: "#D4AF37",
    sections: [
      { name: "Product Hero", type: "hero", description: "Hero product photography" },
      { name: "Key Innovations", type: "feature", description: "Feature highlights with animations" },
      { name: "Specifications", type: "showcase", description: "Technical specifications" },
      { name: "Limited Edition CTA", type: "cta", description: "Exclusive offer countdown" },
    ],
    promptFragment: "luxury product launch with high-end studio photography, animated specification details and innovations, limited edition countdown timer, premium black and gold color palette (#D4AF37), exclusive messaging, scarcity-driven design",
    aesthetic: {
      style: "luxury",
      typography: "serif",
      colorPalette: "black with gold accents",
      spacing: "balanced",
    },
    interactions: ["countdown-timer", "spec-animations", "smooth-hover", "luxury-transitions"],
    a11y: "Countdown timer has accessible time format, specs are in semantic tables, product images have detailed alt text",
  },

  "saas-dashboard": {
    id: "saas-dashboard",
    label: "SaaS Dashboard Teaser",
    category: "product-ecommerce",
    description: "Product screenshot carousel, feature icons, demo videos, pricing table with scroll reveal",
    summary: "SaaS product showcase with interface previews and pricing",
    referenceImage: "/presets/nexora-api.png",
    accentColor: "#7C3AED",
    sections: [
      { name: "Hero", type: "hero", description: "Value proposition with CTA" },
      { name: "Dashboard Preview", type: "showcase", description: "Product screenshot carousel" },
      { name: "Features", type: "feature", description: "Key features with icons" },
      { name: "Pricing", type: "showcase", description: "Pricing tiers table" },
    ],
    promptFragment: "SaaS product showcase with dashboard screenshots carousel, feature icons and descriptions, demo video integration, pricing comparison table with tier highlighting, free trial CTA, metrics showing product value, developer-friendly aesthetic",
    aesthetic: {
      style: "corporate",
      typography: "sans-serif",
      colorPalette: "dark with purple accent",
      spacing: "balanced",
    },
    interactions: ["screenshot-carousel", "feature-carousel", "pricing-compare", "smooth-scroll"],
    a11y: "Screenshots have alt text describing dashboard state, pricing table uses proper semantic markup, feature icons are accompanied by text labels",
  },

  "fast-fashion": {
    id: "fast-fashion",
    label: "Fast Fashion / Retail",
    category: "product-ecommerce",
    description: "High-volume product grid with infinite scroll, trending section, size guides, social proof",
    summary: "High-velocity retail grid with infinite scroll and social proof",
    referenceImage: "/presets/aurora-lifestyle.png",
    accentColor: "#F3F4F6",
    sections: [
      { name: "Hero Collection", type: "hero", description: "Featured/trending collection" },
      { name: "Product Grid", type: "showcase", description: "Infinite scroll product grid" },
      { name: "Quick View", type: "feature", description: "Modal product preview" },
      { name: "Social Proof", type: "testimonial", description: "Reviews and user-generated content" },
    ],
    promptFragment: "high-volume retail product grid with infinite scroll, featured trending section with video backgrounds, quick-view overlays for fast browsing, size guide integration, customer reviews and ratings, user-generated content showcase, modern retail aesthetic",
    aesthetic: {
      style: "minimal",
      typography: "sans-serif",
      colorPalette: "light neutral with accent",
      spacing: "tight",
    },
    interactions: ["infinite-scroll", "quick-view-modal", "hover-expand", "filter-products"],
    a11y: "Infinite scroll includes pagination fallback, product cards are properly structured, quick-view modal is keyboard accessible",
  },

  "food-beverage": {
    id: "food-beverage",
    label: "Coffee Shop / Food & Beverage",
    category: "product-ecommerce",
    description: "Mouth-watering food photography, location/ambiance carousel, menu preview, Instagram integration",
    summary: "Appetite-appeal food photography with menu and ambiance",
    referenceImage: "/presets/ora-restaurant.png",
    accentColor: "#8B6F47",
    sections: [
      { name: "Hero Dish", type: "hero", description: "Hero food photography" },
      { name: "Menu Preview", type: "showcase", description: "Menu items with descriptions" },
      { name: "Ambiance", type: "showcase", description: "Location and interior photos" },
      { name: "Reservation CTA", type: "cta", description: "Booking or ordering" },
    ],
    promptFragment: "food & beverage website with professional food photography, menu preview with descriptions and pricing, location ambiance carousel, chef/founder bio, Instagram feed integration, reservation or online ordering CTA, warm earth tones (#8B6F47)",
    aesthetic: {
      style: "luxury",
      typography: "serif",
      colorPalette: "warm earth tones",
      spacing: "spacious",
    },
    interactions: ["image-carousel", "menu-hover", "reservation-modal", "smooth-scroll"],
    a11y: "Food images have descriptive alt text, menu has proper semantic markup, reservation form is accessible and labeled",
  },

  // CATEGORY 4: TECH & WEB3
  "web3-crypto": {
    id: "web3-crypto",
    label: "Web3 / Crypto Brand",
    category: "tech-web3",
    description: "Bold gradients, animated accents, glowing neon, technology visualizations, community social proof",
    summary: "Bold tech-forward Web3 brand presence",
    referenceImage: "/presets/nexora-blockchain.png",
    accentColor: "#00D9FF",
    sections: [
      { name: "Hero", type: "hero", description: "Bold gradient hero with neon effects" },
      { name: "Features", type: "feature", description: "Key platform features" },
      { name: "Technology", type: "showcase", description: "Tech stack and architecture" },
      { name: "Community", type: "testimonial", description: "Discord/community stats" },
    ],
    promptFragment: "Web3/crypto brand with bold gradients and animated neon accents, blockchain architecture visualizations, animated charts and network diagrams, community social proof with Discord/Twitter stats, energy and movement through animations, cyan glow effects (#00D9FF)",
    aesthetic: {
      style: "bold",
      typography: "sans-serif",
      colorPalette: "dark with neon cyan",
      spacing: "balanced",
    },
    interactions: ["gradient-animations", "neon-glow", "chart-animations", "hover-effects"],
    a11y: "Gradient overlays don't reduce text readability, neon animations have reduced-motion alternative, technical content is explained in plain language",
  },

  "enterprise-tech": {
    id: "enterprise-tech",
    label: "Enterprise Tech",
    category: "tech-web3",
    description: "Corporate professional aesthetic, data dashboard preview, integration logos, security/compliance badges",
    summary: "Enterprise-grade technology platform",
    referenceImage: "/presets/nexora-enterprise.png",
    accentColor: "#1F2937",
    sections: [
      { name: "Hero", type: "hero", description: "Corporate value proposition" },
      { name: "Dashboard Preview", type: "showcase", description: "Product interface showcase" },
      { name: "Integrations", type: "feature", description: "Integration partner logos" },
      { name: "Security", type: "feature", description: "Compliance and security badges" },
    ],
    promptFragment: "enterprise technology platform with corporate professional aesthetic, dashboard and data visualization previews, integration partner logos (15-20), security certification badges (SOC2, ISO, GDPR), customer testimonials and case studies, trusted-by section",
    aesthetic: {
      style: "corporate",
      typography: "sans-serif",
      colorPalette: "dark gray with blue accents",
      spacing: "balanced",
    },
    interactions: ["hover-highlights", "tab-navigation", "smooth-scroll", "tooltip-info"],
    a11y: "Dashboard screenshots described in detail, certification badges link to verification, integration logos have alt text",
  },

  "ai-ml": {
    id: "ai-ml",
    label: "AI / Machine Learning",
    category: "tech-web3",
    description: "Abstract neural visualizations, animated data flows, use-case demos, algorithm visualization",
    summary: "AI/ML technology showcase with visual abstractions",
    referenceImage: "/presets/nexora-api.png",
    accentColor: "#7C3AED",
    sections: [
      { name: "Hero", type: "hero", description: "AI value proposition" },
      { name: "Algorithm Viz", type: "showcase", description: "Animated algorithm visualization" },
      { name: "Use Cases", type: "feature", description: "Real-world application examples" },
      { name: "Get Started", type: "cta", description: "Developer CTA" },
    ],
    promptFragment: "AI/ML technology showcase with abstract neural network visualizations, animated data flow diagrams, use-case demonstrations with interactive elements, algorithm explanations with visual aids, developer-focused language and code examples, purple accent color (#7C3AED)",
    aesthetic: {
      style: "bold",
      typography: "sans-serif",
      colorPalette: "dark with purple accents",
      spacing: "balanced",
    },
    interactions: ["algorithm-animations", "data-flow-viz", "interactive-demos", "code-snippets"],
    a11y: "Animated visualizations have text descriptions, algorithm explanations are thorough, code snippets are properly formatted",
  },

  // CATEGORY 5: CORPORATE & BRAND
  "corporate-mission": {
    id: "corporate-mission",
    label: "Corporate Mission-Driven",
    category: "corporate-brand",
    description: "Full-screen cinematic video/image, dark dramatic palette, mission statement, values with animations",
    summary: "Cinematic mission-driven brand storytelling",
    referenceImage: "/presets/obsidian-agency.png",
    accentColor: "#E74C3C",
    sections: [
      { name: "Hero Video", type: "hero", description: "Full-screen cinematic video/image" },
      { name: "Mission Statement", type: "feature", description: "Core mission with bold typography" },
      { name: "Values", type: "feature", description: "Brand values with icon animations" },
      { name: "Call to Action", type: "cta", description: "Mission-aligned CTA" },
    ],
    promptFragment: "mission-driven corporate brand with full-screen cinematic video or image background, dark dramatic color palette, bold typography mission statement, animated values section with icons, inspiring and aspirational messaging, red accent color (#E74C3C)",
    aesthetic: {
      style: "bold",
      typography: "serif",
      colorPalette: "dark with red accents",
      spacing: "spacious",
    },
    interactions: ["video-autoplay", "text-reveals", "icon-animations", "parallax-scroll"],
    a11y: "Video has captions, mission text has sufficient contrast (>4.5:1), values are listed accessibly",
  },

  "b2b-services": {
    id: "b2b-services",
    label: "B2B Professional Services",
    category: "corporate-brand",
    description: "Clean trustworthy aesthetic, client success stories with metrics, service tiers, expert bios with testimonials",
    summary: "Professional B2B services platform with social proof",
    referenceImage: "/presets/summit-strategy.png",
    accentColor: "#003366",
    sections: [
      { name: "Hero", type: "hero", description: "Value proposition for businesses" },
      { name: "Services", type: "feature", description: "Service tiers and offerings" },
      { name: "Case Studies", type: "showcase", description: "Client success with metrics" },
      { name: "Team", type: "team", description: "Expert bios and experience" },
    ],
    promptFragment: "B2B professional services with clean trustworthy aesthetic, expert team biographies with photos, client success stories and case studies with ROI metrics, service tiers comparison, consultation CTA, dark blue color scheme (#003366), corporate credibility",
    aesthetic: {
      style: "corporate",
      typography: "sans-serif",
      colorPalette: "dark blue with white",
      spacing: "balanced",
    },
    interactions: ["hover-highlights", "case-study-modals", "team-hover-cards", "smooth-scroll"],
    a11y: "Case study metrics clearly labeled, team photos have alt text and names, service comparison table uses proper semantic markup",
  },

  "sustainability": {
    id: "sustainability",
    label: "Sustainability / ESG Brand",
    category: "corporate-brand",
    description: "Nature photography, impact metrics with animated counters, supply chain transparency, certification showcase",
    summary: "Impact-focused sustainability brand messaging",
    referenceImage: "/presets/hope-in-action.png",
    accentColor: "#10B981",
    sections: [
      { name: "Hero Mission", type: "hero", description: "Sustainability mission hero" },
      { name: "Impact Metrics", type: "showcase", description: "Animated impact statistics" },
      { name: "Process", type: "feature", description: "Sustainable practices explained" },
      { name: "Certifications", type: "feature", description: "ESG and sustainability badges" },
    ],
    promptFragment: "sustainability and ESG brand with nature photography, animated impact metrics and counters, supply chain transparency section, sustainable practices explanation, certification badges and environmental logos, green accent color (#10B981), authentic and mission-driven",
    aesthetic: {
      style: "minimal",
      typography: "sans-serif",
      colorPalette: "green with earth tones",
      spacing: "balanced",
    },
    interactions: ["counter-animations", "metric-reveals", "image-carousel", "scroll-triggers"],
    a11y: "Animated metrics have accessible number formats, nature images have descriptive alt text, certification information is clearly presented",
  },

  // CATEGORY 6: ENTERTAINMENT & LIFESTYLE
  "music-artist": {
    id: "music-artist",
    label: "Music Artist / Creator",
    category: "entertainment-lifestyle",
    description: "Large album art/artist photo, music player with visualizer, tour dates, social media feed",
    summary: "Artist presence with music player and tour information",
    referenceImage: "/presets/riven-artist.png",
    accentColor: "#FF7A00",
    sections: [
      { name: "Hero", type: "hero", description: "Large album art or artist photo" },
      { name: "Music Player", type: "feature", description: "Embedded music player with visualizer" },
      { name: "Tour Dates", type: "showcase", description: "Upcoming performances" },
      { name: "Social Feed", type: "feature", description: "Social media integration" },
    ],
    promptFragment: "music artist website with large album artwork or promotional photo, embedded music player with animated visualizer, tour dates with ticket CTAs, social media feed integration (Instagram, TikTok), merchandise showcase, streaming platform links, energetic and dynamic design",
    aesthetic: {
      style: "bold",
      typography: "sans-serif",
      colorPalette: "dark with orange accent",
      spacing: "balanced",
    },
    interactions: ["music-player", "visualizer-animation", "tour-date-modal", "social-feed-scroll"],
    a11y: "Music player has keyboard controls and volume labels, tour dates are clearly formatted with venues, social feed is described for screen readers",
  },

  "event-conference": {
    id: "event-conference",
    label: "Event / Conference",
    category: "entertainment-lifestyle",
    description: "Countdown timer with stage viz, speaker showcase with videos, agenda timeline, ticket purchase",
    summary: "Event registration page with speaker and schedule details",
    referenceImage: "/presets/ignite-festival.png",
    accentColor: "#FF1B6D",
    sections: [
      { name: "Hero Countdown", type: "hero", description: "Event countdown timer" },
      { name: "Speakers", type: "showcase", description: "Speaker cards with bios and videos" },
      { name: "Schedule", type: "feature", description: "Agenda timeline" },
      { name: "Tickets", type: "cta", description: "Ticket purchasing" },
    ],
    promptFragment: "event/conference website with countdown timer showing days to event, speaker showcase with headshots and video bios, schedule/agenda timeline with scroll reveal, sponsor logos, ticket pricing tiers, venue information and map, registration CTA",
    aesthetic: {
      style: "bold",
      typography: "sans-serif",
      colorPalette: "dark with pink/magenta accent",
      spacing: "spacious",
    },
    interactions: ["countdown-timer", "speaker-hover-cards", "timeline-scroll", "ticket-modal"],
    a11y: "Countdown in accessible time format, speaker videos have captions, schedule is in proper semantic markup, ticket form is keyboard accessible",
  },

  "fitness-wellness": {
    id: "fitness-wellness",
    label: "Fitness / Wellness",
    category: "entertainment-lifestyle",
    description: "Transformation before/after carousel, workout videos, testimonials, class schedule with booking",
    summary: "Fitness program showcase with transformation proof",
    referenceImage: "/presets/elevate-fitness.png",
    accentColor: "#E8D556",
    sections: [
      { name: "Hero", type: "hero", description: "Fitness motivation hero" },
      { name: "Transformation", type: "showcase", description: "Before/after carousel" },
      { name: "Programs", type: "feature", description: "Program offerings" },
      { name: "Schedule", type: "showcase", description: "Class schedule and booking" },
    ],
    promptFragment: "fitness and wellness website with transformation before/after carousel, embedded workout videos, program offerings and descriptions, class schedule with booking integration, testimonials with client transformations, coach/instructor profiles, membership pricing tiers, motivational photography",
    aesthetic: {
      style: "bold",
      typography: "sans-serif",
      colorPalette: "dark with yellow accent",
      spacing: "balanced",
    },
    interactions: ["before-after-slider", "video-autoplay", "schedule-modal", "booking-form"],
    a11y: "Before/after sliders accessible via keyboard, workout videos captioned, class schedule uses semantic markup, booking form is labeled and accessible",
  },

  "travel-adventure": {
    id: "travel-adventure",
    label: "Travel / Adventure",
    category: "entertainment-lifestyle",
    description: "Full-screen destination photos with parallax, interactive map, experience cards with video, itinerary builder",
    summary: "Destination-focused travel booking experience",
    referenceImage: "/presets/villa-lumiere.png",
    accentColor: "#C9A961",
    sections: [
      { name: "Destination Hero", type: "hero", description: "Full-screen destination imagery with parallax" },
      { name: "Experiences", type: "showcase", description: "Activity cards with video previews" },
      { name: "Interactive Map", type: "feature", description: "Location highlights" },
      { name: "Booking CTA", type: "cta", description: "Reservation system" },
    ],
    promptFragment: "travel and adventure website with full-screen destination photography with parallax scroll, interactive map with location highlights and activities, experience cards with video previews, itinerary builder tool, booking and availability system, luxury travel aesthetic with warm golden tones",
    aesthetic: {
      style: "luxury",
      typography: "serif",
      colorPalette: "warm earth with gold accents",
      spacing: "spacious",
    },
    interactions: ["parallax-scroll", "interactive-map", "experience-video-preview", "itinerary-builder"],
    a11y: "Destination images have descriptive alt text, interactive map has keyboard navigation, itinerary builder is screen-reader friendly",
  },

  "fashion-brand": {
    id: "fashion-brand",
    label: "Fashion Brand",
    category: "entertainment-lifestyle",
    description: "Bold centered product photography, color/size visualizer, collection launch timeline, style guide",
    summary: "Fashion brand with product showcase and styling inspiration",
    referenceImage: "/presets/aurora-fashion.png",
    accentColor: "#1F2937",
    sections: [
      { name: "Hero Collection", type: "hero", description: "Bold product photography hero" },
      { name: "Lookbook", type: "showcase", description: "Style guide and inspiration" },
      { name: "Shop", type: "showcase", description: "Product grid with options" },
      { name: "Story", type: "feature", description: "Brand story and values" },
    ],
    promptFragment: "fashion brand website with bold centered product photography, color and size option visualizer, collection launch timeline, lookbook with styling inspiration, model photography and lifestyle shots, new collection hero sections, premium fashion aesthetic",
    aesthetic: {
      style: "minimal",
      typography: "serif",
      colorPalette: "neutral with bold accents",
      spacing: "spacious",
    },
    interactions: ["product-hover", "color-visualizer", "size-selector", "lookbook-gallery"],
    a11y: "Product images have descriptive alt text, color options are labeled, size guide is clearly presented, lookbook gallery is keyboard navigable",
  },

  "restaurant-hospitality": {
    id: "restaurant-hospitality",
    label: "Restaurant / Hospitality",
    category: "entertainment-lifestyle",
    description: "Menu preview with food photography, reservation integration, ambiance carousel, chef/owner story",
    summary: "Restaurant experience with menu and reservations",
    referenceImage: "/presets/ora-restaurant.png",
    accentColor: "#8B6F47",
    sections: [
      { name: "Hero Dish", type: "hero", description: "Signature dish hero" },
      { name: "Menu", type: "showcase", description: "Menu with descriptions and photos" },
      { name: "Ambiance", type: "showcase", description: "Interior and atmosphere photos" },
      { name: "Reservation", type: "cta", description: "Booking system" },
    ],
    promptFragment: "restaurant hospitality website with beautiful food photography, menu preview with dish descriptions and pricing, restaurant interior and ambiance carousel, chef or owner story and philosophy, seasonal specials, reservation system integration, wine or beverage pairings, warm hospitality aesthetic with earth tones",
    aesthetic: {
      style: "luxury",
      typography: "serif",
      colorPalette: "warm earth tones",
      spacing: "spacious",
    },
    interactions: ["menu-hover", "image-carousel", "reservation-modal", "smooth-scroll"],
    a11y: "Food images have descriptive alt text, menu is in semantic markup with pricing, reservation form is accessible and labeled, ambiance photos have alt text",
  },
};

export const PRESETS_BY_CATEGORY: Record<PresetCategory, PresetId[]> = {
  "hero-landing": [
    "immersive-video-hero",
    "product-showcase",
    "minimalist-modern",
    "storytelling-narrative",
  ],
  "portfolio-creative": [
    "grid-portfolio",
    "creative-studio",
    "agency-portfolio",
    "designer-showcase",
  ],
  "product-ecommerce": [
    "luxury-product",
    "saas-dashboard",
    "fast-fashion",
    "food-beverage",
  ],
  "tech-web3": [
    "web3-crypto",
    "enterprise-tech",
    "ai-ml",
  ],
  "corporate-brand": [
    "corporate-mission",
    "b2b-services",
    "sustainability",
  ],
  "entertainment-lifestyle": [
    "music-artist",
    "event-conference",
    "fitness-wellness",
    "travel-adventure",
    "fashion-brand",
    "restaurant-hospitality",
  ],
};

export function getPresetById(id: PresetId): WebPreset {
  return WEB_PRESETS[id];
}

export function getPresetsByCategory(category: PresetCategory): WebPreset[] {
  return PRESETS_BY_CATEGORY[category].map(id => WEB_PRESETS[id]);
}

export function getAllPresets(): WebPreset[] {
  return Object.values(WEB_PRESETS);
}
