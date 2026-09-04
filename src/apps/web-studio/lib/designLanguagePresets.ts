/**
 * Design Language Presets — visual style directions that guide color,
 * typography, spacing, and overall aesthetic for Web Studio projects.
 */

export interface DesignLanguagePreset {
  id: string;
  label: string;
  vibe: "minimal" | "editorial" | "energetic" | "corporate" | "boutique" | "dark" | "playful";
  summary: string;
  description: string;
  colorPalette: string;
  typography: string;
  spacing: string;
  promptFragment: string;
}

export const DESIGN_LANGUAGE_PRESETS: DesignLanguagePreset[] = [
  {
    id: "design-minimal-tech",
    label: "Minimalist Tech",
    vibe: "minimal",
    summary: "Clean white space, sans-serif, high contrast, modern",
    description: "Minimal aesthetic: generous whitespace, sans-serif (Inter, Helvetica), high contrast black/white with single accent color, grid-aligned layout",
    colorPalette: "White background, black text, single accent (blue/purple/teal), subtle grays",
    typography: "Sans-serif headlines (bold), sans-serif body (regular), generous line height",
    spacing: "Generous margins, 16-32px padding, clear visual hierarchy through space",
    promptFragment: "Minimalist tech aesthetic with abundant white space, clean sans-serif typography, high contrast, and grid-based layout emphasizing simplicity and clarity",
  },
  {
    id: "design-editorial-luxury",
    label: "Editorial Luxury",
    vibe: "editorial",
    summary: "Serif typography, high-quality imagery, elegant spacing",
    description: "Editorial sophistication: serif headlines (Georgia, Playfair), elegant spacing, rich imagery, high contrast, considered typography pairing",
    colorPalette: "Off-white/cream background, deep black text, gold/rose accents, muted earth tones",
    typography: "Serif headlines (italic/elegant), serif or sans-serif body, generous line spacing",
    spacing: "Luxurious padding, centered layouts, asymmetric white space, museum-like presentation",
    promptFragment: "Editorial luxury design with serif typography, high-quality imagery, refined color palette, and sophisticated spacing creating premium brand perception",
  },
  {
    id: "design-energetic-startup",
    label: "Energetic Startup",
    vibe: "energetic",
    summary: "Bold colors, playful, modern sans-serif, dynamic layouts",
    description: "Startup energy: bold primary colors (bright blue, vibrant pink, energetic orange), rounded corners, dynamic compositions, playful iconography",
    colorPalette: "Bold primary (blue/pink/orange), white/light backgrounds, complementary secondary colors, high saturation",
    typography: "Modern sans-serif (Poppins, Outfit) in bold weights, rounded letterforms, dynamic sizing",
    spacing: "Varied padding, asymmetric layouts, overlapping elements, visual movement",
    promptFragment: "Energetic startup aesthetic with bold colors, rounded typography, dynamic layouts, playful iconography, and modern visual language appealing to young audiences",
  },
  {
    id: "design-corporate-trust",
    label: "Corporate Trust",
    vibe: "corporate",
    summary: "Professional blue/navy, structured layout, authoritative",
    description: "Corporate professionalism: navy/blue primary, structured grid layouts, professional photography, established typography, symmetry and order",
    colorPalette: "Navy/corporate blue background or accent, white text, secondary blues/grays, minimal accent color",
    typography: "Professional sans-serif (Roboto, Open Sans) in regular/bold weights, justified alignment, clear hierarchy",
    spacing: "Structured padding on a grid, symmetrical layouts, organized information architecture",
    promptFragment: "Corporate trust aesthetic with navy/blue color scheme, structured layouts, professional imagery, authoritative typography, and organized information hierarchy",
  },
  {
    id: "design-boutique-craft",
    label: "Boutique Craft",
    vibe: "boutique",
    summary: "Warm earth tones, handmade feel, artisanal typography",
    description: "Artisanal charm: warm earth tones (terracotta, sage, cream), hand-drawn elements, variable typography, textured backgrounds, handmade aesthetic",
    colorPalette: "Warm earth tones (terracotta, sage green, warm gray), cream/natural paper, warm metallic accents (copper/bronze)",
    typography: "Mix serif and display fonts, variable weights, hand-drawn or script elements for emphasis",
    spacing: "Organic padding, asymmetric layouts, texture and pattern, gallery-like presentation",
    promptFragment: "Boutique craft aesthetic with warm earth tones, hand-drawn elements, artisanal typography, natural textures, and organic composition emphasizing authenticity and heritage",
  },
  {
    id: "design-dark-modern",
    label: "Dark Modern",
    vibe: "dark",
    summary: "Dark background, neon/bright accents, sophisticated contrast",
    description: "Dark sophistication: dark gray/black backgrounds, bright neon accents (cyan, lime, pink), modern sans-serif, high contrast, tech-forward aesthetic",
    colorPalette: "Dark gray (#1a1a1a) or black background, bright neon accents (cyan #00ffff, lime #00ff00, hot pink #ff006e), minimal white text",
    typography: "Modern sans-serif (Inter, Courier Prime), bold neon accents for emphasis, monospace for technical",
    spacing: "Generous contrast, floating elements on dark, neon highlight areas",
    promptFragment: "Dark modern aesthetic with dark backgrounds, neon/bright accents, high contrast, tech-forward typography, and sophisticated dark mode design",
  },
  {
    id: "design-playful-friendly",
    label: "Playful & Friendly",
    vibe: "playful",
    summary: "Pastel colors, rounded corners, approachable tone",
    description: "Friendly approachable: pastel color palette (soft pink, lavender, mint, peach), rounded corners throughout, playful iconography, warm and inviting",
    colorPalette: "Pastel palette (soft pink, lavender, mint, peach, light yellow), white/cream backgrounds, warm accent colors",
    typography: "Rounded sans-serif (Nunito, Poppins) in regular weights, larger visual text, approachable voice",
    spacing: "Rounded padding, generous margins, playful spacing, accessible contrast",
    promptFragment: "Playful friendly aesthetic with pastel colors, rounded corners, approachable tone, warm iconography, and inviting visual language for community-oriented brands",
  },
];
