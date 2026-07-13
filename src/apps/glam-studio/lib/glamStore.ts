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
  /** Optional Camera Studio override — refines the Look's baked-in lens direction. */
  cameraPresetId?: string;
  /** Optional Lighting Studio override — refines the Look's baked-in lighting direction. */
  lightingPresetId?: string;
  /** Casting — all optional; a product-only campaign leaves these unset. */
  castingAgeId?: string;
  castingBodyTypeId?: string;
  castingHairId?: string;
  castingSkinToneId?: string;
  castingExpressionId?: string;
  castingAccessoryId?: string;
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

function writeGlamProjects(projects: GlamProject[]): void {
  localStorage.setItem(LS_GLAM_PROJECTS, JSON.stringify(projects));
}

/** Insert or update a Glam project (workspace + platform Project Hub). */
export function saveGlamProject(project: GlamProject): GlamProject {
  const projects = listGlamProjects();
  const index = projects.findIndex((item) => item.id === project.id);
  if (index >= 0) projects[index] = project;
  else projects.unshift(project);
  writeGlamProjects(projects);
  return project;
}

export function deleteGlamProject(id: string): void {
  writeGlamProjects(listGlamProjects().filter((project) => project.id !== id));
}
