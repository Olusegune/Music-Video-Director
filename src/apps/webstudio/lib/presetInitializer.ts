/**
 * Preset Initializer - Convert preset selection into initial site structure
 * Maps preset configuration to actual sections for generation
 */

import { nanoid } from "nanoid";
import { getPresetById, type PresetId, type WebPreset } from "./presetLibrary";
import type { WebProject, SectionInstance } from "./types";

/**
 * Generate initial sections for a preset
 * These sections will be populated with AI-generated content
 */
export function initializeSectionsFromPreset(
  presetId: PresetId
): SectionInstance[] {
  const preset = getPresetById(presetId);
  const sections: SectionInstance[] = [];

  // Map preset sections to SectionInstance objects
  preset.sections.forEach((section, index) => {
    const sectionId = `section_${index}_${nanoid(6)}`;
    const patternType = getPatterTypeForSection(section.type);

    sections.push({
      id: sectionId,
      patternId: patternType,
      copy: {
        eyebrow: section.name,
        heading: "",
        body: "",
        items: [],
        ctaLabel: "",
      },
      role: mapSectionTypeToRole(section.type),
      hidden: false,
    });
  });

  return sections;
}

/**
 * Build generation prompt for preset
 * Includes preset context, aesthetic, and interaction requirements
 */
export function buildPresetGenerationPrompt(
  presetId: PresetId,
  userBrief: string,
  businessContext: string
): string {
  const preset = getPresetById(presetId);

  const aestheticDescription = `
Design Style: ${preset.aesthetic.style}
Typography: ${preset.aesthetic.typography}
Color Palette: ${preset.aesthetic.colorPalette}
Spacing: ${preset.aesthetic.spacing}
`;

  const interactionsDescription =
    preset.interactions.length > 0
      ? `Include smooth interactions: ${preset.interactions.join(", ")}`
      : "";

  const sectionsDescription = preset.sections
    .map((s) => `- ${s.name}: ${s.description}`)
    .join("\n");

  return `
You are generating a website matching the "${preset.label}" preset design pattern.

PRESET CONFIGURATION:
${preset.promptFragment}

AESTHETIC GUIDELINES:
${aestheticDescription}

INTERACTIONS TO IMPLEMENT:
${interactionsDescription}

ACCESSIBILITY REQUIREMENTS:
${preset.a11y}

SECTIONS TO GENERATE:
${sectionsDescription}

BUSINESS CONTEXT:
${businessContext}

USER BRIEF:
${userBrief}

Generate compelling, conversion-focused content for each section that:
1. Matches the design aesthetic and style
2. Follows the section descriptions above
3. Maintains brand voice and message
4. Optimizes for the target audience
5. Includes calls-to-action appropriate to each section
6. Ensures accessibility standards (WCAG 2.1 AA minimum)
`.trim();
}

/**
 * Map section type to pattern type for generation
 */
function getPatterTypeForSection(
  sectionType: string
): string {
  const typeMap: Record<string, string> = {
    hero: "hero-splash",
    feature: "feature-grid",
    showcase: "showcase-gallery",
    testimonial: "testimonial-carousel",
    pricing: "pricing-table",
    cta: "button-group",
    footer: "footer-links",
    team: "team-grid",
    process: "timeline",
  };

  return typeMap[sectionType] || "content-block";
}

/**
 * Map section type to role for content strategy
 */
function mapSectionTypeToRole(sectionType: string): "proof" | "hero" | "trust" | "conversion" {
  const roleMap: Record<string, "proof" | "hero" | "trust" | "conversion"> = {
    hero: "hero",
    feature: "proof",
    showcase: "proof",
    testimonial: "trust",
    pricing: "conversion",
    cta: "conversion",
    footer: "trust",
    team: "trust",
    process: "proof",
  };

  return roleMap[sectionType] || "proof";
}

/**
 * Create a new WebProject initialized with preset
 */
export function createProjectFromPreset(
  presetId: PresetId,
  projectName: string,
  businessName: string,
  businessDescription: string
): Partial<WebProject> {
  const sections = initializeSectionsFromPreset(presetId);

  return {
    name: projectName,
    businessName,
    businessDescription,
    sections,
    audience: "",
    proofPoints: [],
    ctaGoal: "",
  };
}

/**
 * Get CSS variables and design tokens from preset
 */
export function getPresetDesignTokens(presetId: PresetId) {
  const preset = getPresetById(presetId);

  return {
    "--preset-accent": preset.accentColor,
    "--preset-style": preset.aesthetic.style,
    "--preset-spacing": preset.aesthetic.spacing,
    "--preset-typography": preset.aesthetic.typography,
    "--preset-palette": preset.aesthetic.colorPalette,
  };
}

/**
 * Generate prompt composition for multi-layer context
 * Combines preset + user context + business goals
 */
export function composePresetPrompt(
  presetId: PresetId,
  userInfo: {
    brief: string;
    businessContext: string;
    targetAudience?: string;
    coreMessage?: string;
  }
): {
  systemPrompt: string;
  userPrompt: string;
  context: {
    preset: WebPreset;
    businessContext: string;
    aesthetic: Record<string, string>;
  };
} {
  const preset = getPresetById(presetId);

  const systemPrompt = `You are an expert web designer creating websites that embody specific design presets and aesthetic principles.

You understand design systems, UX patterns, accessibility standards, and conversion optimization.

When generating website content and structure, you:
1. Match the visual aesthetic and brand identity from the preset
2. Ensure all interactive elements are intuitive and accessible
3. Optimize for the target audience and business goals
4. Create compelling copy that drives conversions
5. Follow WCAG 2.1 AA accessibility standards minimum
6. Maintain consistent voice and messaging throughout`;

  const userPrompt = buildPresetGenerationPrompt(
    presetId,
    userInfo.brief,
    userInfo.businessContext
  );

  return {
    systemPrompt,
    userPrompt,
    context: {
      preset,
      businessContext: userInfo.businessContext,
      aesthetic: preset.aesthetic as Record<string, string>,
    },
  };
}
