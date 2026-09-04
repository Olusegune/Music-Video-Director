import type { ConcreteModuleId } from "@/platform/lib/moduleManifest";

// Which product is this build? Set at build time via VITE_PRODUCT_EDITION.
// "suite" (default): the full Director Studio, all five studios.
// "musicvideo": Music Video Director standalone — every other studio door is
// compiled out of every nav/search/help/wizard surface (see moduleManifest.ts's
// listModuleManifests(), the one place all of those surfaces should read from).
//
// This is a presentation-layer filter only — no app code or platform engine
// code is forked or duplicated. `npm run build:mv` / `npm run dev:mv` set the
// env var; the default `npm run build` / `npm run dev` are unaffected.
export type ProductEdition = "suite" | "musicvideo";

export const PRODUCT_EDITION: ProductEdition =
  import.meta.env.VITE_PRODUCT_EDITION === "musicvideo" ? "musicvideo" : "suite";

export const ENABLED_MODULES: ConcreteModuleId[] =
  PRODUCT_EDITION === "musicvideo"
    ? ["musicvideo"]
    : ["musicvideo", "motion", "glam", "web", "campaign"];

export function isModuleEnabled(id: ConcreteModuleId): boolean {
  return ENABLED_MODULES.includes(id);
}

export const PRODUCT_NAME: string =
  PRODUCT_EDITION === "musicvideo" ? "Music Video Director" : "Director Studio";
