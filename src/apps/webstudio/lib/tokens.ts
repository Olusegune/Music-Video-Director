import type { BrandDna } from "@/platform/lib/brandDna";
import type { DesignTokens } from "@/apps/webstudio/lib/types";

export const TOKEN_PRESETS: { id: string; name: string; tokens: DesignTokens }[] = [
  {
    id: "midnight",
    name: "Midnight Agency",
    tokens: {
      background: "#08090d",
      surface: "#12141b",
      text: "#f8fafc",
      muted: "#a1a1aa",
      primary: "#8b5cf6",
      accent: "#22d3ee",
      fontDisplay: "Georgia, serif",
      fontBody: "Inter, Arial, sans-serif",
      radius: 20,
      maxWidth: 1180,
    },
  },
  {
    id: "atelier",
    name: "Warm Atelier",
    tokens: {
      background: "#f7f2e9",
      surface: "#fffdf8",
      text: "#241c16",
      muted: "#75685d",
      primary: "#9a5b35",
      accent: "#d6a85f",
      fontDisplay: "Georgia, serif",
      fontBody: "Arial, sans-serif",
      radius: 10,
      maxWidth: 1140,
    },
  },
  {
    id: "signal",
    name: "Clean Signal",
    tokens: {
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
      primary: "#2563eb",
      accent: "#10b981",
      fontDisplay: "Arial, sans-serif",
      fontBody: "Arial, sans-serif",
      radius: 14,
      maxWidth: 1200,
    },
  },
];

export function tokensFromBrand(brand: BrandDna, presetId = "midnight"): DesignTokens {
  const preset = TOKEN_PRESETS.find((item) => item.id === presetId) ?? TOKEN_PRESETS[0];
  return {
    ...preset.tokens,
    primary: brand.palette[0] ?? preset.tokens.primary,
    accent: brand.palette[1] ?? preset.tokens.accent,
    fontDisplay: brand.fonts.heading
      ? `"${brand.fonts.heading}", ${preset.tokens.fontDisplay}`
      : preset.tokens.fontDisplay,
    fontBody: brand.fonts.body
      ? `"${brand.fonts.body}", ${preset.tokens.fontBody}`
      : preset.tokens.fontBody,
  };
}
