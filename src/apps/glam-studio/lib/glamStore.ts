import type { BrandDna } from "@/platform/lib/brandDna";
import type { GeneratedAsset } from "@/platform/lib/generatedAssets";
import type { LoopRun } from "@/platform/lib/loopEngine";
import type { SeedContext } from "@/platform/lib/seedContext";
import type { GlamFormatLayout } from "@/apps/glam-studio/lib/campaignExport";

export type ProductCategory =
  "beauty" | "fashion" | "jewelry" | "fragrance" | "wellness" | "tech-luxury";

export interface LuxuryLook {
  id: string;
  name: string;
  family: string;
  palette: string[];
  set: string;
  lighting: string;
  lens: string;
}

export interface CampaignConcept {
  id: string;
  territory: string;
  headline: string;
  visualDirection: string;
  shotList: string[];
  score: number;
}

export interface ProductProfile {
  materials: string[];
  colors: string[];
  packaging: string;
  claims: string[];
  fidelityNotes: string;
  referenceImages: string[];
}

export interface GlamProject {
  id: string;
  name: string;
  productName: string;
  category: ProductCategory;
  productDescription: string;
  productProfile: ProductProfile;
  audience: string;
  brand: BrandDna;
  look: LuxuryLook;
  concept: CampaignConcept;
  heroLoop: LoopRun<string>;
  heroAssets: GeneratedAsset[];
  selectedHeroAssetId?: string;
  formatLayouts?: Record<string, GlamFormatLayout>;
  formats: string[];
  productFilm?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface GlamFlowState {
  campaignSeed?: SeedContext;
  projectName: string;
  productName: string;
  category: ProductCategory | "";
  productDescription: string;
  productPhotoNames: string[];
  productPhotoData: string[];
  materials: string;
  colors: string;
  packaging: string;
  productClaims: string;
  fidelityNotes: string;
  audience: string;
  brandName: string;
  brandTone: string;
  tagline: string;
  lookId: string;
  conceptId: string;
  formats: string[];
}

export function glamReadStored<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

/** localStorage key for saved Glam projects (shared with the workspace). */
export const LS_GLAM_PROJECTS = "mf.glam.projects";

/** All saved Glam projects (used by the workspace and the platform Project Hub). */
export function listGlamProjects(): GlamProject[] {
  return glamReadStored<GlamProject>(LS_GLAM_PROJECTS);
}
