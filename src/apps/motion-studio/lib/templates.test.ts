import { describe, expect, it } from "vitest";
import { PRODUCTION_TYPES } from "@/apps/motion-studio/lib/templates";

describe("Motion Studio production template cards", () => {
  it("keeps all nine visual templates available", () => {
    expect(PRODUCTION_TYPES.map((template) => template.id)).toEqual([
      "saas-explainer",
      "product-launch",
      "product-reveal",
      "c4d-commercial",
      "ae-explainer",
      "ui-animation",
      "social-ad",
      "kinetic-typography",
      "mixed-media-animation",
    ]);
  });

  it("binds artwork metadata to every production template", () => {
    for (const template of PRODUCTION_TYPES) {
      expect(template.imageUrl, `${template.id} image`).toMatch(/\.(png|jpg|jpeg|webp)$/i);
      expect(template.accent, `${template.id} accent`).toMatch(/^#[0-9A-F]{6}$/i);
      expect(template.eyebrow, `${template.id} eyebrow`).toBeTruthy();
    }
  });
});
