import type { StudioMode } from "@/platform/lib/settings";

/**
 * Progressive disclosure of UI complexity based on studio mode.
 * Follows the established pattern from Music Video Director and other studios.
 */

export function shouldShowSidePanel(mode: StudioMode): boolean {
  return mode !== "director";
}

export function shouldShowCreativeControls(mode: StudioMode): boolean {
  return mode !== "director";
}

export function shouldShowTechnicalControls(mode: StudioMode): boolean {
  return mode === "creator";
}

export function shouldShowGuidedFlow(): boolean {
  return true; // All modes show guided flow
}

export function shouldShowPromptInspection(mode: StudioMode): boolean {
  return mode === "creator";
}

export function shouldShowDesignTokenPicker(mode: StudioMode): boolean {
  return mode === "creator";
}

export function shouldShowGenerationDebug(mode: StudioMode): boolean {
  return mode === "creator";
}

export function shouldShowSectionTree(mode: StudioMode): boolean {
  return mode !== "director";
}

export function shouldShowPropertyInspector(mode: StudioMode): boolean {
  return mode !== "director";
}

/**
 * Get director-mode labels for complex concepts.
 * Simplifies language in director mode.
 */
export function getDirectorModeLabel(concept: string): string {
  const directorLabels: Record<string, string> = {
    positioning: "Your story",
    offer: "What you're saying",
    promise: "Your main benefit",
    proof: "Why they'll believe you",
    objections: "Customer concerns",
    cta: "Call to action",
    valueProps: "Key benefits",
    patterns: "Section templates",
    tokens: "Design theme",
    seo: "Search visibility",
    audit: "Quality check",
  };
  return directorLabels[concept] ?? concept;
}

/**
 * Get mode-specific descriptions for UI sections.
 */
export function getModeDescription(
  section: string,
  mode?: StudioMode
): string {
  if (mode === "director") {
    const directorDescriptions: Record<string, string> = {
      positioning: "Tell your story: what you offer, who it's for, and why people should care",
      patterns: "Choose section templates that fit your message",
      copy: "Write or edit the words and images for each section",
      tokens: "Pick a color theme for your website",
      audit: "Check if your site is ready to publish",
    };
    return directorDescriptions[section] ?? "";
  }
  return "";
}
