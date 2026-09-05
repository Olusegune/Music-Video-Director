import { Select } from "@/platform/components/ui/select";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BookmarkPlus,
  Crown,
  Download,
  FileArchive,
  Image,
  Loader2,
  PackageCheck,
  RefreshCw,
  Shirt,
  Sparkles,
  Wand2,
  Video,
} from "lucide-react";
import { Badge } from "@/platform/components/ui/badge";
import { Button } from "@/platform/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";
import { Textarea } from "@/platform/components/ui/textarea";
import { GuidedFlowShell } from "@/platform/components/flow";
import { createBrandDna, getBrandDna, type BrandDna } from "@/platform/lib/brandDna";
import { consumeSeedContext, type SeedContext } from "@/platform/lib/seedContext";
import {
  createDeliverable,
  deliverableThumbnail,
  listDeliverables,
  saveDeliverable,
  type Deliverable,
} from "@/platform/lib/deliverables";
import {
  approveLoopRun,
  createLoopRun,
  improveLoopRun,
  type LoopRun,
} from "@/platform/lib/loopEngine";
import {
  loadRouterConfig,
  providerInfo,
  routeProvider,
  routeReferenceImageProvider,
  ROUTER_MODES,
} from "@/platform/lib/providers";
import { api } from "@/platform/lib/ipc";
import { addAsset, type GeneratedAsset } from "@/platform/lib/generatedAssets";
import type { ProviderId } from "@/platform/lib/types";
import {
  buildZip,
  DEFAULT_GLAM_LAYOUT,
  downloadBlob,
  GLAM_FORMATS,
  renderGlamFormat,
  type GlamFormatLayout,
} from "@/apps/glam-studio/lib/campaignExport";
import type { GuidedFlowDefinition, GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import { ModeCards } from "@/platform/components/visual/ModeCards";
import { cn } from "@/platform/lib/utils";
import { usePendingProjectOpen } from "@/platform/lib/usePendingProjectOpen";
import { addMember } from "@/platform/lib/directorProject";
import { useAppStore } from "@/platform/store/useAppStore";
import { CreativeEmptyState } from "@/platform/components/ui/creative-empty-state";
import { ModuleHeader, ProjectCard, ProjectHome } from "@/platform/components/visual";
import {
  buildProductFilmPlan,
  productFilmMarkdown,
  type ProductFilmPlan,
} from "@/apps/glam-studio/lib/productFilm";
import {
  BrandStep,
  CategoryStep,
  ProductStep,
} from "@/apps/glam-studio/features/intake/IntakeSteps";
import { LookStep } from "@/apps/glam-studio/features/looks/LookStep";
import { ConceptStep } from "@/apps/glam-studio/features/hero/ConceptStep";
import { CameraLightingStep } from "@/apps/glam-studio/features/camera/CameraLightingStep";
import { CAMERA_PRESETS, LIGHTING_PRESETS } from "@/apps/glam-studio/lib/photoPresets";
import { CastingStep } from "@/apps/glam-studio/features/casting/CastingStep";
import {
  AGE_PRESETS,
  BODY_TYPE_PRESETS,
  HAIR_PRESETS,
  SKIN_TONE_PRESETS,
  EXPRESSION_PRESETS,
  ACCESSORY_PRESETS,
} from "@/apps/glam-studio/lib/castingPresets";
import { REALISM_PRESETS } from "@/apps/glam-studio/lib/realismPresets";
import { INSPIRATION_PRESETS } from "@/apps/glam-studio/lib/inspirationPresets";
import { RealismInspirationStep } from "@/apps/glam-studio/features/realism/RealismInspirationStep";
import { FormatsStep } from "@/apps/glam-studio/features/pack/FormatsStep";
import { ExportStep } from "@/apps/glam-studio/features/export/ExportStep";
import { UniversalGenerationPanel } from "@/platform/components/generation/UniversalGenerationPanel";
import { AssetImage } from "@/platform/components/ui/asset-image";
import type { GenerationState } from "@/platform/components/generation/types";

type ProductCategory = "beauty" | "fashion" | "jewelry" | "fragrance" | "wellness" | "tech-luxury";

interface LuxuryLook {
  id: string;
  name: string;
  family: string;
  palette: string[];
  set: string;
  lighting: string;
  lens: string;
}

interface CampaignConcept {
  id: string;
  territory: string;
  headline: string;
  visualDirection: string;
  shotList: string[];
  score: number;
}

interface GlamProject {
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
  productFilm?: ProductFilmPlan;
  createdAt: string;
  updatedAt: string;
}

interface ProductProfile {
  materials: string[];
  colors: string[];
  packaging: string;
  claims: string[];
  fidelityNotes: string;
  referenceImages: string[];
}

interface GlamFlowState {
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
  cameraPresetId?: string;
  lightingPresetId?: string;
  castingAgeId?: string;
  castingBodyTypeId?: string;
  castingHairId?: string;
  castingSkinToneId?: string;
  castingExpressionId?: string;
  castingAccessoryId?: string;
  /** Human Realism — multi-select, applies universally (see realismPresets.ts honesty note). */
  realismPresetIds?: string[];
  /** Inspiration Library — mood/composition/lighting language, not a named style. */
  inspirationId?: string;
  formats: string[];
}

const LS_GLAM_PROJECTS = "mf.glam.projects";
const LS_GLAM_LOOKS = "mf.glam.looks";
const LS_GLAM_CONCEPTS = "mf.glam.concepts";

const LOOKS: LuxuryLook[] = [
  {
    id: "noir-editorial",
    name: "Noir Editorial",
    family: "Beauty / fashion",
    palette: ["#050509", "#F8FAFC", "#D4AF37", "#8B5CF6"],
    set: "black lacquer set with mirror reflections",
    lighting: "hard rim light, soft frontal beauty fill",
    lens: "85mm editorial compression",
  },
  {
    id: "golden-hour-atelier",
    name: "Golden Hour Atelier",
    family: "Skincare / fragrance",
    palette: ["#281A12", "#F8E7C7", "#F59E0B", "#FDF2F8"],
    set: "warm plaster studio with silk and glass props",
    lighting: "late sun streaks with polished highlights",
    lens: "macro closeups and tactile product crops",
  },
  {
    id: "clinical-minimal",
    name: "Clinical Minimal",
    family: "Wellness / skincare",
    palette: ["#F8FAFC", "#DDEAF6", "#0F172A", "#38BDF8"],
    set: "white laboratory plinths and translucent acrylic",
    lighting: "clean high-key gradients",
    lens: "precise packshot lensing",
  },
  {
    id: "neon-tech",
    name: "Neon Tech",
    family: "Luxury tech / street",
    palette: ["#030712", "#22D3EE", "#A855F7", "#FB7185"],
    set: "glossy black tabletop with neon glass",
    lighting: "cyan-magenta edge lights and smoke",
    lens: "low-angle cinematic macro",
  },
  {
    id: "baroque-opulence",
    name: "Baroque Opulence",
    family: "Jewelry / fragrance",
    palette: ["#160B12", "#7C2D12", "#D4AF37", "#F5E6C8"],
    set: "carved stone, velvet, antique mirror, and restrained gilt details",
    lighting: "painterly chiaroscuro with warm jewel highlights",
    lens: "cinematic 50mm with selective macro inserts",
  },
  {
    id: "automotive-cinematic",
    name: "Automotive Cinematic",
    family: "Luxury tech / hardware",
    palette: ["#020617", "#334155", "#94A3B8", "#EF4444"],
    set: "architectural concrete stage with wet reflections and precision light strips",
    lighting: "long specular highlights and controlled volumetric haze",
    lens: "24mm low hero angle with 85mm detail coverage",
  },
  {
    id: "soft-monochrome",
    name: "Soft Monochrome",
    family: "Fashion / wellness",
    palette: ["#FAF7F2", "#D6D3D1", "#78716C", "#292524"],
    set: "tonal paper architecture, soft fabric, and quiet negative space",
    lighting: "large diffused source with delicate contact shadows",
    lens: "70mm natural compression and calm editorial framing",
  },
  {
    id: "crystal-futurism",
    name: "Crystal Futurism",
    family: "Beauty / luxury tech",
    palette: ["#07111F", "#CFFAFE", "#67E8F9", "#E879F9"],
    set: "prismatic glass, liquid chrome, and translucent geometric plinths",
    lighting: "cool caustics with iridescent edge separation",
    lens: "sharp macro optics with wide crystalline establishing shots",
  },
];

const FORMAT_OPTIONS = GLAM_FORMATS.map((format) => ({
  ...format,
  description: `${format.width} x ${format.height} campaign asset`,
}));

const INITIAL_FLOW: GlamFlowState = {
  projectName: "New Glam Campaign",
  productName: "",
  category: "",
  productDescription: "",
  productPhotoNames: [],
  productPhotoData: [],
  materials: "",
  colors: "",
  packaging: "",
  productClaims: "",
  fidelityNotes: "",
  audience: "",
  brandName: "",
  brandTone: "premium, direct, sensory",
  tagline: "",
  lookId: "noir-editorial",
  conceptId: "concept-1",
  formats: ["ig-square", "ig-portrait", "story", "hero"],
};

function splitList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "glam-campaign"
  );
}

function downloadText(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildProductProfile(state: GlamFlowState): ProductProfile {
  return {
    materials: splitList(state.materials),
    colors: splitList(state.colors),
    packaging: state.packaging.trim(),
    claims: splitList(state.productClaims),
    fidelityNotes: state.fidelityNotes.trim(),
    referenceImages: state.productPhotoData,
  };
}

function readStored<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function readProjects(): GlamProject[] {
  return readStored<GlamProject>(LS_GLAM_PROJECTS);
}

function readSavedLooks(): LuxuryLook[] {
  return readStored<LuxuryLook>(LS_GLAM_LOOKS);
}

function readSavedConcepts(): CampaignConcept[] {
  return readStored<CampaignConcept>(LS_GLAM_CONCEPTS);
}

function saveLibraryItem<T extends { id: string }>(key: string, item: T) {
  const items = readStored<T>(key);
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) items[index] = item;
  else items.unshift(item);
  localStorage.setItem(key, JSON.stringify(items.slice(0, 40)));
}

function saveProject(project: GlamProject): GlamProject {
  const next = { ...project, updatedAt: new Date().toISOString() };
  const projects = readProjects();
  const index = projects.findIndex((item) => item.id === project.id);
  if (index >= 0) projects[index] = next;
  else projects.unshift(next);
  localStorage.setItem(LS_GLAM_PROJECTS, JSON.stringify(projects));
  return next;
}

function lookById(id: string): LuxuryLook {
  return [...readSavedLooks(), ...LOOKS].find((look) => look.id === id) ?? LOOKS[0];
}

function conceptById(state: GlamFlowState): CampaignConcept {
  return (
    [...readSavedConcepts(), ...conceptsFor(state)].find(
      (concept) => concept.id === state.conceptId
    ) ?? conceptsFor(state)[0]
  );
}

function conceptsFor(state: GlamFlowState): CampaignConcept[] {
  const product = state.productName || "the product";
  const audience = state.audience || "style-conscious customers";
  const look = lookById(state.lookId);
  return [
    {
      id: "concept-1",
      territory: "The Signature Object",
      headline: state.tagline || `${product} becomes the room's quiet obsession`,
      visualDirection: `${look.name}: isolate ${product} as a sculptural hero on ${look.set}.`,
      shotList: [
        "Macro texture reveal",
        "Hero packshot on set",
        "Lifestyle crop with negative space",
        "Format-safe headline crop",
      ],
      score: 91,
    },
    {
      id: "concept-2",
      territory: "Ritual Of Arrival",
      headline: `Made for the moment ${audience} step into`,
      visualDirection: `Build a polished ritual sequence around touch, reveal, and brand color accents.`,
      shotList: [
        "Hands entering frame",
        "Product opening / reveal",
        "Texture or material moment",
        "Approved hero crop",
      ],
      score: 86,
    },
    {
      id: "concept-3",
      territory: "Future Classic",
      headline: `${product}, designed to feel inevitable`,
      visualDirection: `Pair minimal set geometry with premium light control and confident type overlays.`,
      shotList: [
        "Symmetric packshot",
        "Shadow detail",
        "Color-world variant",
        "Campaign hero layout",
      ],
      score: 84,
    },
  ];
}

function buildCastingLine(state: GlamFlowState): string {
  const parts = [
    AGE_PRESETS.find((o) => o.id === state.castingAgeId)?.promptFragment,
    BODY_TYPE_PRESETS.find((o) => o.id === state.castingBodyTypeId)?.promptFragment,
    HAIR_PRESETS.find((o) => o.id === state.castingHairId)?.promptFragment,
    SKIN_TONE_PRESETS.find((o) => o.id === state.castingSkinToneId)?.promptFragment,
    EXPRESSION_PRESETS.find((o) => o.id === state.castingExpressionId)?.promptFragment,
    ACCESSORY_PRESETS.find((o) => o.id === state.castingAccessoryId)?.promptFragment,
  ].filter((s): s is string => Boolean(s && s.trim()));
  return parts.length ? `Model: ${parts.join(", ")}.` : "";
}

function buildHeroPrompt(state: GlamFlowState, concept: CampaignConcept, look: LuxuryLook) {
  const profile = buildProductProfile(state);
  const cameraPreset = CAMERA_PRESETS.find((c) => c.id === state.cameraPresetId);
  const lightingPreset = LIGHTING_PRESETS.find((l) => l.id === state.lightingPresetId);
  const castingLine = buildCastingLine(state);
  const realismFragments = (state.realismPresetIds ?? [])
    .map((id) => REALISM_PRESETS.find((r) => r.id === id)?.promptFragment)
    .filter((s): s is string => Boolean(s));
  const inspiration = INSPIRATION_PRESETS.find((i) => i.id === state.inspirationId);
  return [
    `Luxury advertising hero image for ${state.productName || "a premium product"}.`,
    `Product details: ${state.productDescription || "premium materials, refined silhouette, hero product fidelity."}`,
    profile.materials.length ? `Exact materials: ${profile.materials.join(", ")}.` : "",
    profile.colors.length ? `Exact product colors: ${profile.colors.join(", ")}.` : "",
    profile.packaging ? `Packaging and silhouette: ${profile.packaging}.` : "",
    profile.claims.length
      ? `Benefits to imply visually, never paint as text: ${profile.claims.join(", ")}.`
      : "",
    profile.fidelityNotes ? `Non-negotiable product fidelity: ${profile.fidelityNotes}.` : "",
    `Brand tone: ${state.brandTone}.`,
    `Look: ${look.name}; palette ${look.palette.join(", ")}; ${look.lighting}; ${look.lens}.`,
    // Casting — only present when the campaign includes a human model.
    castingLine,
    // Camera/Lighting Studio overrides — refine, not replace, the Look's baseline.
    cameraPreset ? cameraPreset.promptFragment : "",
    lightingPreset ? lightingPreset.promptFragment : "",
    // Human Realism — only meaningful alongside a casting/model direction.
    realismFragments.length ? `Realism direction: ${realismFragments.join(", ")}.` : "",
    // Inspiration Library — mood/composition language, not a named style.
    inspiration ? `Visual language: ${inspiration.promptFragment}.` : "",
    `Campaign territory: ${concept.territory}.`,
    `Visual direction: ${concept.visualDirection}`,
    "Leave clean negative space for real typography overlays. Do not render text in the image.",
  ]
    .filter(Boolean)
    .join(" ");
}

function CreativeControls({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <Textarea
      value={state.productDescription}
      onChange={(event) => patch({ productDescription: event.target.value })}
      placeholder="Studio notes: retouching, product fidelity constraints, material details, campaign don'ts."
      className="min-h-28"
    />
  );
}

function CreatorControls({ state }: GuidedFlowStepComponentProps<GlamFlowState>) {
  const look = lookById(state.lookId);
  const concept = conceptById(state);
  return (
    <pre className="max-h-52 overflow-auto rounded-md border border-border bg-background/70 p-3 text-xs text-muted">
      {buildHeroPrompt(state, concept, look)}
    </pre>
  );
}

function createProjectFromState(state: GlamFlowState): GlamProject {
  const look = lookById(state.lookId);
  const concept = conceptById(state);
  const brand =
    getBrandDna(state.campaignSeed?.brandDnaId) ??
    createBrandDna({
      name: state.brandName || `${state.productName || "Untitled"} Brand`,
      tone: state.brandTone,
      productLine: state.productName,
      tagline: state.tagline || concept.headline,
      palette: look.palette,
    });
  const prompt = buildHeroPrompt(state, concept, look);
  const timestamp = new Date().toISOString();
  const project: GlamProject = {
    id: crypto.randomUUID(),
    name: state.projectName || `${state.productName || "Untitled"} Glam Campaign`,
    productName: state.productName || "Untitled product",
    category: (state.category || "beauty") as ProductCategory,
    productDescription: state.productDescription,
    productProfile: buildProductProfile(state),
    audience: state.audience,
    brand,
    look,
    concept,
    heroLoop: createLoopRun("hero image prompt", prompt, concept.score),
    heroAssets: [],
    formatLayouts: Object.fromEntries(
      state.formats.map((format) => [format, { ...DEFAULT_GLAM_LAYOUT }])
    ),
    formats: state.formats,
    productFilm: buildProductFilmPlan(state.productName, concept.headline, look),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  saveProject(project);
  state.formats.forEach((format) =>
    createDeliverable({
      moduleId: "glam-studio",
      projectId: project.id,
      kind: "ad-format",
      format,
      status: "planned",
      title: FORMAT_OPTIONS.find((item) => item.id === format)?.title ?? format,
      assetRefs: [],
    })
  );
  if (state.campaignSeed) {
    const source = listDeliverables().find(
      (deliverable) => deliverable.id === state.campaignSeed?.sourceDeliverableId
    );
    if (source) saveDeliverable({ ...source, status: "draft" });
    // Real containment: this Glam project is now a member of the campaign's
    // DirectorProject (replaces the write-only `glam-project:<id>` assetRef).
    addMember(state.campaignSeed.campaignId, {
      moduleId: "glam",
      projectId: project.id,
      role: "hero",
    });
  }
  return project;
}

function promptPackFor(project: GlamProject) {
  return {
    schemaVersion: 1,
    moduleId: "glam-studio",
    project: {
      id: project.id,
      name: project.name,
      productName: project.productName,
      category: project.category,
      audience: project.audience,
    },
    productProfile: {
      ...project.productProfile,
      referenceImages:
        project.productProfile?.referenceImages.map(
          (_, index) => `product-reference-${index + 1}`
        ) ?? [],
    },
    brandDna: project.brand,
    luxuryLook: project.look,
    concept: project.concept,
    heroPrompt: project.heroLoop.value,
    selectedHeroAssetId: project.selectedHeroAssetId ?? project.heroAssets?.[0]?.id ?? null,
    formats: project.formats.map((id) => FORMAT_OPTIONS.find((item) => item.id === id) ?? { id }),
    formatLayouts: project.formatLayouts ?? {},
    typographyRule:
      "Render campaign typography as a real overlay; never ask an image model to paint the headline.",
  };
}

function promptPackMarkdown(project: GlamProject) {
  const pack = promptPackFor(project);
  return [
    `# ${project.name}`,
    "",
    `**Product:** ${project.productName} (${project.category})`,
    `**Brand:** ${project.brand.name}`,
    `**Look:** ${project.look.name}`,
    `**Campaign territory:** ${project.concept.territory}`,
    "",
    "## Hero prompt",
    "",
    project.heroLoop.value,
    "",
    "## Product fidelity",
    "",
    `- Materials: ${project.productProfile?.materials.join(", ") || "Not specified"}`,
    `- Colors: ${project.productProfile?.colors.join(", ") || "Not specified"}`,
    `- Packaging: ${project.productProfile?.packaging || "Not specified"}`,
    `- Must preserve: ${project.productProfile?.fidelityNotes || "Not specified"}`,
    "",
    "## Deliverables",
    "",
    ...pack.formats.map(
      (format) =>
        `- ${"title" in format ? format.title : format.id}: ${"description" in format ? format.description : "custom format"}`
    ),
    "",
    "> Typography is composited as a real overlay. Do not render headline text in the generated image.",
  ].join("\n");
}

function ProjectPreview({
  project,
  deliverables,
  onImprove,
  onApprove,
  onExport,
  generationNote,
  onExportCampaign,
  exportingCampaign,
  onSelectHero,
  onSaveLook,
  onSaveConcept,
  onLayoutChange,
  onDownloadFormat,
  downloadingFormat,
}: {
  project: GlamProject;
  deliverables: Deliverable[];
  onImprove: () => void;
  onApprove: () => void;
  onExport: (format: "json" | "markdown") => void;
  generationNote: string;
  onExportCampaign: () => void;
  exportingCampaign: boolean;
  onSelectHero: (assetId: string) => void;
  onSaveLook: () => void;
  onSaveConcept: () => void;
  onLayoutChange: (formatId: string, layout: GlamFormatLayout) => void;
  onDownloadFormat: (formatId: string) => void;
  downloadingFormat: string;
}) {
  const heroAssets = project.heroAssets ?? [];
  const selectedHero =
    heroAssets.find((asset) => asset.id === project.selectedHeroAssetId) ?? heroAssets[0];
  const hasProductReferences = Boolean(project.productProfile?.referenceImages.length);
  const selectedProvider = selectedHero
    ? providerInfo(selectedHero.provider as ProviderId)
    : undefined;
  const fidelityLabel = !hasProductReferences
    ? "No product reference"
    : selectedProvider?.supportsImageReferences
      ? "Product-faithful provider"
      : "Look-alike mode";
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" /> Hero Direction
          </CardTitle>
          <CardDescription>{project.concept.territory}</CardDescription>
          <div>
            <Badge
              variant={
                hasProductReferences && selectedProvider?.supportsImageReferences
                  ? "success"
                  : "default"
              }
            >
              {fidelityLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-elevated">
            {selectedHero?.url ? (
              <AssetImage
                src={selectedHero.url}
                alt={`${project.productName} campaign hero`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div
              className="absolute inset-0"
              hidden={Boolean(selectedHero?.url)}
              style={{
                background: `linear-gradient(135deg, ${project.look.palette[0]}, ${project.look.palette[1]} 38%, ${project.look.palette[2]} 68%, ${project.look.palette[3]})`,
              }}
            />
            <div className="absolute left-[10%] top-[18%] h-[54%] w-[30%] rounded-2xl bg-white/20 shadow-2xl ring-1 ring-white/30 backdrop-blur" />
            <div className="absolute bottom-[14%] right-[9%] max-w-[48%] text-right">
              <div className="text-3xl font-black leading-tight text-white drop-shadow">
                {project.concept.headline}
              </div>
              <div className="mt-3 text-xs font-semibold uppercase text-white/75">
                {project.brand.name}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={onImprove}>
              <RefreshCw /> Improve
            </Button>
            <Button onClick={onApprove}>
              <BadgeCheck /> Approve hero
            </Button>
            <Button variant="secondary" onClick={onSaveLook}>
              <BookmarkPlus /> Save Look
            </Button>
            <Button variant="secondary" onClick={onSaveConcept}>
              <BookmarkPlus /> Save Concept
            </Button>
          </div>
          {generationNote ? <p className="text-xs text-muted">{generationNote}</p> : null}
          {heroAssets.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {heroAssets.slice(0, 4).map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelectHero(asset.id)}
                  className={cn(
                    "overflow-hidden rounded-md border",
                    selectedHero?.id === asset.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border"
                  )}
                >
                  <AssetImage
                    src={asset.url}
                    alt="Hero variant"
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-primary" /> Format Pack
            </CardTitle>
            <CardDescription>{deliverables.length} planned deliverables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {deliverables.map((deliverable) => {
              const layout = project.formatLayouts?.[deliverable.format] ?? DEFAULT_GLAM_LAYOUT;
              const preset = GLAM_FORMATS.find((format) => format.id === deliverable.format);
              const copyTop = layout.copyPosition.startsWith("top");
              const copyRight = layout.copyPosition.endsWith("right");
              return (
                <div
                  key={deliverable.id}
                  className="space-y-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span>{deliverable.title}</span>
                    <Badge variant={deliverable.status === "approved" ? "success" : "default"}>
                      {deliverable.status}
                    </Badge>
                  </div>
                  {preset ? (
                    <div
                      className="relative mx-auto w-full max-w-44 overflow-hidden rounded border border-border bg-elevated"
                      style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
                    >
                      {selectedHero?.url ? (
                        <AssetImage
                          src={selectedHero.url}
                          alt={`${preset.title} preview`}
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{ objectPosition: `${layout.cropPosition} center` }}
                        />
                      ) : null}
                      <div
                        className={cn(
                          "absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25",
                          copyTop && "rotate-180"
                        )}
                      />
                      <div
                        className={cn(
                          "absolute left-2 right-2 text-[8px] font-bold leading-tight text-white drop-shadow",
                          copyTop ? "top-2" : "bottom-2",
                          copyRight ? "text-right" : "text-left"
                        )}
                      >
                        {project.concept.headline}
                        <div className="mt-1 text-[6px] uppercase tracking-widest text-white/75">
                          {project.brand.name}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] text-muted">
                      Crop
                      <Select
                        value={layout.cropPosition}
                        onChange={(value: string) =>
                          onLayoutChange(deliverable.format, {
                            ...layout,
                            cropPosition: value as GlamFormatLayout["cropPosition"],
                          })
                        }
                        className="mt-1 h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-foreground"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </Select>
                    </label>
                    <label className="text-[10px] text-muted">
                      Headline
                      <Select
                        value={layout.copyPosition}
                        onChange={(value: string) =>
                          onLayoutChange(deliverable.format, {
                            ...layout,
                            copyPosition: value as GlamFormatLayout["copyPosition"],
                          })
                        }
                        className="mt-1 h-8 w-full rounded-md border border-border bg-surface px-2 text-xs text-foreground"
                      >
                        <option value="top-left">Top left</option>
                        <option value="top-right">Top right</option>
                        <option value="bottom-left">Bottom left</option>
                        <option value="bottom-right">Bottom right</option>
                      </Select>
                    </label>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => onDownloadFormat(deliverable.format)}
                    disabled={downloadingFormat === deliverable.format || !selectedHero?.url}
                  >
                    {downloadingFormat === deliverable.format ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Download />
                    )}{" "}
                    Download PNG
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" /> Product Film
            </CardTitle>
            <CardDescription>
              Director-ready 15-second master with reference-safe prompts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(
              project.productFilm ??
              buildProductFilmPlan(project.productName, project.concept.headline, project.look)
            ).shots.map((shot, index) => (
              <div key={shot.id} className="flex gap-3 rounded-md border border-border p-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold">{shot.frame}</p>
                    <Badge>{shot.duration}s</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{shot.motion}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" /> Prompt Pack
            </CardTitle>
            <CardDescription>Portable local-mode production instructions.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={onExportCampaign} disabled={exportingCampaign || !selectedHero?.url}>
              {exportingCampaign ? <Loader2 className="animate-spin" /> : <FileArchive />} Campaign
              ZIP
            </Button>
            <Button variant="secondary" onClick={() => onExport("markdown")}>
              Markdown
            </Button>
            <Button variant="secondary" onClick={() => onExport("json")}>
              JSON
            </Button>
            {!selectedHero?.url ? (
              <p className="w-full text-xs text-muted">
                Generate a hero before exporting rendered campaign assets.
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Loop Log
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.heroLoop.events.map((event) => (
              <div key={event.id} className="rounded-md bg-elevated/50 px-3 py-2 text-xs">
                <div className="font-semibold capitalize">{event.stage}</div>
                <div className="mt-1 text-muted">{event.summary}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function GlamStudioWorkspace() {
  const { studioMode, setStudioMode, openSettings } = useAppStore();
  const [routerConfig] = useState(() => loadRouterConfig());
  const [projects, setProjects] = useState<GlamProject[]>(() => readProjects());
  const [activeProjectId, setActiveProjectId] = useState(() => readProjects()[0]?.id ?? "");
  const [campaignSeed] = useState(() => consumeSeedContext("glamstudio"));
  const [flowOpen, setFlowOpen] = useState(
    () => Boolean(campaignSeed) || readProjects().length === 0
  );
  usePendingProjectOpen("glam", (id) => {
    setActiveProjectId(id);
    setFlowOpen(false);
  });
  const [generationNote, setGenerationNote] = useState("");
  const [exportingCampaign, setExportingCampaign] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState("");
  const [selectedProviderPref, setSelectedProviderPref] = useState<ProviderId | undefined>(undefined);
  const [generationState, setGenerationState] = useState<GenerationState>({
    mode: "auto",
    status: "idle",
    prompt: "",
  });
  // No `?? projects[0]` fallback: an explicitly cleared activeProjectId (Studio
  // Home) must mean "no active project," not "silently pin the first one again."
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;
  const deliverables = activeProject
    ? listDeliverables({ moduleId: "glam-studio", projectId: activeProject.id })
    : [];
  const allGlamDeliverables = listDeliverables({ moduleId: "glam-studio" });
  const routerMode = ROUTER_MODES.find((mode) => mode.id === routerConfig.mode)?.label ?? "Auto";

  async function generateHeroImage() {
    if (!activeProject) return;
    try {
      setGenerationState((prev) => ({ ...prev, status: "validating" }));
      setGenerationNote("Checking configured image providers...");

      const statuses = await api.getProviderKeyStatuses();
      const configured = new Set<ProviderId>(
        statuses.filter((item) => item.configured).map((item) => item.provider)
      );

      const references = activeProject.productProfile?.referenceImages ?? [];
      const referenceProvider = references.length
        ? routeReferenceImageProvider(routerConfig, configured)
        : null;

      const provider = selectedProviderPref
        ? selectedProviderPref
        : referenceProvider ?? routeProvider("image", routerConfig, configured);

      if (!provider) {
        setGenerationNote("No image provider configured. Add a key in Settings.");
        setGenerationState((prev) => ({ ...prev, status: "failed", error: "No provider" }));
        return;
      }

      setGenerationState((prev) => ({ ...prev, status: "queued" }));
      setGenerationNote(`Queued with ${providerInfo(provider)?.name ?? provider}...`);

      const url = await api.generateImageFromSpec({
        capability: "image",
        prompt: activeProject.heroLoop.value,
        negativePrompt: generationState.negativePrompt || "misspelled labels, distorted packaging, fake text, extra logos",
        batch: generationState.batch || 1,
        aspect: generationState.aspectRatio || "3:2",
        resolution: { width: 1536, height: 1024, label: "1536x1024" },
        seed: generationState.seed,
        references: references.length > 0 && provider === referenceProvider
          ? references.map((url) => ({ url, category: "product", strength: 0.85 }))
          : [],
        providerPref: provider,
        modelHint: generationState.selectedModel || "glam-hero",
        moduleId: "glam",
        projectRef: { moduleId: "glam", projectId: activeProject.id },
      });

      setGenerationState((prev) => ({ ...prev, status: "completed", resultUrl: url }));
      setGenerationNote(`Hero generated via ${providerInfo(provider)?.name ?? provider}.`);

      const asset = addAsset({
        entityId: activeProject.id,
        entityKind: "glam",
        entityName: activeProject.productName,
        url,
        filePath: url,
        provider,
        model: providerInfo(provider)?.name ?? provider,
        prompt: activeProject.heroLoop.value,
        aspectRatio: generationState.aspectRatio || "3:2",
        width: 1536,
        height: 1024,
        sheetType: "Glam campaign hero",
      });

      const nextProject = saveProject({
        ...activeProject,
        heroAssets: [asset, ...(activeProject.heroAssets ?? [])].slice(0, 12),
        selectedHeroAssetId: asset.id,
      });

      setProjects(readProjects());
      setActiveProjectId(nextProject.id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Generation failed";
      setGenerationNote(errorMsg);
      setGenerationState((prev) => ({ ...prev, status: "failed", error: errorMsg }));
    }
  }

  const definition = useMemo<GuidedFlowDefinition<GlamFlowState>>(
    () => ({
      id: "glam-studio.campaign-pack",
      moduleId: "glam-studio",
      version: 1,
      title: "New Glam Campaign",
      description:
        "Create a luxury product campaign pack with Brand DNA, Look DNA, concepts, hero prompt, and format deliverables.",
      initialState: campaignSeed
        ? {
            ...INITIAL_FLOW,
            campaignSeed,
            projectName: `${campaignSeed.campaignName} · Glam Assets`,
            productName: campaignSeed.product,
            productDescription: campaignSeed.messaging.promise,
            audience: campaignSeed.audience,
            brandName: getBrandDna(campaignSeed.brandDnaId)?.name ?? campaignSeed.product,
            brandTone: getBrandDna(campaignSeed.brandDnaId)?.voice.tone ?? INITIAL_FLOW.brandTone,
            tagline: campaignSeed.messaging.tagline,
            lookId: campaignSeed.lookId ?? INITIAL_FLOW.lookId,
          }
        : INITIAL_FLOW,
      steps: [
        {
          id: "product",
          title: "Product Intake",
          subtitle: "Describe the hero product and add reference file names.",
          component: ProductStep,
          validate: (state) => Boolean(state.productName.trim()) || "Name the product first.",
          advancedComponent: CreativeControls,
          technicalComponent: CreatorControls,
        },
        {
          id: "category",
          title: "Product Type",
          subtitle: "Choose the campaign category.",
          component: CategoryStep,
          validate: (state) => Boolean(state.category) || "Choose a product type.",
        },
        {
          id: "brand",
          title: "Brand DNA",
          subtitle: "Capture the brand voice, product line, and tagline seed.",
          component: BrandStep,
          validate: (state) => Boolean(state.brandName.trim()) || "Add a brand name.",
          advancedComponent: CreativeControls,
          technicalComponent: CreatorControls,
        },
        {
          id: "look",
          title: "Luxury Look",
          subtitle: "Select the art direction system for the campaign.",
          component: LookStep,
          advancedComponent: CreativeControls,
          technicalComponent: CreatorControls,
        },
        {
          id: "casting",
          title: "Casting",
          subtitle: "Optional — only for campaigns with a human model.",
          component: CastingStep,
          technicalComponent: CreatorControls,
        },
        {
          id: "realism-inspiration",
          title: "Realism & Inspiration",
          subtitle: "Optional — human realism detail and mood/composition language.",
          component: RealismInspirationStep,
          technicalComponent: CreatorControls,
        },
        {
          id: "camera-lighting",
          title: "Camera & Lighting",
          subtitle: "Optional — dial in professional lens and lighting direction.",
          component: CameraLightingStep,
          technicalComponent: CreatorControls,
        },
        {
          id: "concept",
          title: "Campaign Concept",
          subtitle: "Pick one polished concept route.",
          component: ConceptStep,
          advancedComponent: CreativeControls,
          technicalComponent: CreatorControls,
        },
        {
          id: "formats",
          title: "Format Pack",
          subtitle: "Choose deliverables for the starter campaign pack.",
          component: FormatsStep,
          validate: (state) => state.formats.length > 0 || "Choose at least one format.",
          technicalComponent: CreatorControls,
        },
        {
          id: "export",
          title: "Approve Pack",
          subtitle: "Save the Glam project and planned deliverables.",
          component: ExportStep,
          technicalComponent: CreatorControls,
        },
      ],
      onComplete: (state) => {
        const project = createProjectFromState(state);
        const next = readProjects();
        setProjects(next);
        setActiveProjectId(project.id);
        setFlowOpen(false);
      },
    }),
    [campaignSeed]
  );

  function improveHero() {
    if (!activeProject) return;
    const improved = improveLoopRun(
      activeProject.heroLoop,
      `${activeProject.heroLoop.value} Add a cleaner silhouette, stronger product fidelity, and one alternate crop for paid social.`,
      "Tightened product fidelity, negative space, and format adaptability."
    );
    const nextProject = saveProject({ ...activeProject, heroLoop: improved });
    setProjects(readProjects());
    setActiveProjectId(nextProject.id);
  }


  function exportPromptPack(format: "json" | "markdown") {
    if (!activeProject) return;
    const name = slug(activeProject.name);
    if (format === "json") {
      downloadText(
        `${name}-prompt-pack.json`,
        JSON.stringify(promptPackFor(activeProject), null, 2),
        "application/json"
      );
    } else {
      downloadText(`${name}-prompt-pack.md`, promptPackMarkdown(activeProject), "text/markdown");
    }
    setGenerationNote(`${format === "json" ? "JSON" : "Markdown"} prompt pack exported.`);
  }

  async function exportCampaignPack() {
    if (!activeProject || exportingCampaign) return;
    const hero =
      activeProject.heroAssets?.find((asset) => asset.id === activeProject.selectedHeroAssetId) ??
      activeProject.heroAssets?.[0];
    if (!hero?.url) {
      setGenerationNote("Generate and approve a hero before exporting the rendered campaign pack.");
      return;
    }
    setExportingCampaign(true);
    setGenerationNote("Rendering exact-size campaign formats with real typography…");
    try {
      const selected = GLAM_FORMATS.filter((format) => activeProject.formats.includes(format.id));
      const rendered = [] as { name: string; bytes: Uint8Array }[];
      for (const format of selected) {
        const bytes = await renderGlamFormat(format, {
          heroUrl: hero.url,
          headline: activeProject.concept.headline,
          brandName: activeProject.brand.name,
          productName: activeProject.productName,
          palette: activeProject.look.palette,
          layout: activeProject.formatLayouts?.[format.id] ?? DEFAULT_GLAM_LAYOUT,
        });
        rendered.push({ name: `assets/${format.id}-${format.width}x${format.height}.png`, bytes });
      }
      const encoder = new TextEncoder();
      rendered.push({
        name: "prompt-pack.json",
        bytes: encoder.encode(JSON.stringify(promptPackFor(activeProject), null, 2)),
      });
      rendered.push({
        name: "README.md",
        bytes: encoder.encode(promptPackMarkdown(activeProject)),
      });
      rendered.push({
        name: "product-film/15-second-master.md",
        bytes: encoder.encode(
          productFilmMarkdown(
            activeProject.productFilm ??
              buildProductFilmPlan(
                activeProject.productName,
                activeProject.concept.headline,
                activeProject.look
              )
          )
        ),
      });
      const blob = buildZip(rendered);
      downloadBlob(blob, `${slug(activeProject.name)}-campaign-pack.zip`);
      const assetIds = [hero.id];
      deliverables.forEach((deliverable) =>
        saveDeliverable({ ...deliverable, status: "approved", assetRefs: assetIds })
      );
      setGenerationNote(
        `Exported ${selected.length} exact-size PNG assets plus prompt and production specs.`
      );
    } catch (error) {
      setGenerationNote(error instanceof Error ? error.message : "Campaign pack export failed.");
    } finally {
      setExportingCampaign(false);
    }
  }

  async function downloadCampaignFormat(formatId: string) {
    if (!activeProject || downloadingFormat) return;
    const hero =
      activeProject.heroAssets?.find((asset) => asset.id === activeProject.selectedHeroAssetId) ??
      activeProject.heroAssets?.[0];
    const format = GLAM_FORMATS.find((candidate) => candidate.id === formatId);
    if (!hero?.url || !format) return;
    setDownloadingFormat(formatId);
    setGenerationNote(`Rendering ${format.title} at ${format.width} × ${format.height}…`);
    try {
      const bytes = await renderGlamFormat(format, {
        heroUrl: hero.url,
        headline: activeProject.concept.headline,
        brandName: activeProject.brand.name,
        productName: activeProject.productName,
        palette: activeProject.look.palette,
        layout: activeProject.formatLayouts?.[format.id] ?? DEFAULT_GLAM_LAYOUT,
      });
      downloadBlob(
        new Blob([Uint8Array.from(bytes).buffer], { type: "image/png" }),
        `${slug(activeProject.name)}-${format.id}-${format.width}x${format.height}.png`
      );
      setGenerationNote(`${format.title} PNG downloaded at exact dimensions.`);
    } catch (error) {
      setGenerationNote(error instanceof Error ? error.message : "Format rendering failed.");
    } finally {
      setDownloadingFormat("");
    }
  }

  function selectHero(assetId: string) {
    if (!activeProject) return;
    const nextProject = saveProject({ ...activeProject, selectedHeroAssetId: assetId });
    setProjects(readProjects());
    setActiveProjectId(nextProject.id);
    setGenerationNote("Selected hero will drive every campaign format export.");
  }

  function saveCurrentLook() {
    if (!activeProject) return;
    saveLibraryItem(LS_GLAM_LOOKS, activeProject.look);
    setGenerationNote(`Saved ${activeProject.look.name} to the reusable Glam Look library.`);
  }

  function saveCurrentConcept() {
    if (!activeProject) return;
    saveLibraryItem(LS_GLAM_CONCEPTS, activeProject.concept);
    setGenerationNote(`Saved ${activeProject.concept.territory} to the reusable Concept library.`);
  }

  function updateFormatLayout(formatId: string, layout: GlamFormatLayout) {
    if (!activeProject) return;
    const nextProject = saveProject({
      ...activeProject,
      formatLayouts: { ...(activeProject.formatLayouts ?? {}), [formatId]: layout },
    });
    setProjects(readProjects());
    setActiveProjectId(nextProject.id);
  }

  function approveHero() {
    if (!activeProject) return;
    const nextProject = saveProject({
      ...activeProject,
      heroLoop: approveLoopRun(activeProject.heroLoop),
    });
    const selectedHero =
      activeProject.heroAssets?.find((asset) => asset.id === activeProject.selectedHeroAssetId) ??
      activeProject.heroAssets?.[0];
    deliverables.forEach((deliverable) =>
      saveDeliverable({
        ...deliverable,
        status: "approved",
        assetRefs: selectedHero ? [selectedHero.id] : [`glam-prompt:${activeProject.id}`],
      })
    );
    setProjects(readProjects());
    setActiveProjectId(nextProject.id);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <ModuleHeader
        module="glam-studio"
        icon={<Crown className="h-5 w-5" />}
        title="Glam Studio"
        subtitle={`Luxury product campaign packs · ${routerMode}${campaignSeed ? ` · ${campaignSeed.campaignName}` : ""}`}
        mode={studioMode}
        onModeChange={setStudioMode}
        primaryLabel="New Glam Project"
        primaryIcon={<Wand2 />}
        onPrimary={() => setFlowOpen(true)}
        onHome={activeProject ? () => setActiveProjectId("") : undefined}
      />

      <div className="grid gap-5 p-8 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>{projects.length || 0} local Glam campaigns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {projects.length === 0 ? (
                <p className="text-sm text-muted">Create a campaign to begin.</p>
              ) : (
                projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    module="glam-studio"
                    title={project.name}
                    subtitle={`${project.look.name} · ${project.formats.length} formats`}
                    thumbUrl={
                      project.heroAssets?.find((asset) => asset.id === project.selectedHeroAssetId)
                        ?.url ??
                      project.heroAssets?.[0]?.url ??
                      deliverableThumbnail(allGlamDeliverables, project.id)
                    }
                    progress={project.heroLoop.approved ? 100 : 68}
                    status={project.heroLoop.approved ? "Approved" : "Campaign"}
                    active={activeProject?.id === project.id}
                    icon={<Crown className="h-6 w-6" />}
                    onResume={() => setActiveProjectId(project.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mode</CardTitle>
              <CardDescription>Progressive controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ModeCards mode={studioMode} onModeChange={setStudioMode} />
              <Button variant="ghost" className="w-full justify-start" onClick={openSettings}>
                Settings
              </Button>
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0">
          {flowOpen ? (
            <GuidedFlowShell
              definition={definition}
              onExit={() => setFlowOpen(false)}
              onComplete={() => undefined}
            />
          ) : activeProject ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <ProjectPreview
                project={activeProject}
                deliverables={deliverables}
                onImprove={improveHero}
                onApprove={approveHero}
                onExport={exportPromptPack}
                generationNote={generationNote}
                onExportCampaign={exportCampaignPack}
                exportingCampaign={exportingCampaign}
                onSelectHero={selectHero}
                onSaveLook={saveCurrentLook}
                onSaveConcept={saveCurrentConcept}
                onLayoutChange={updateFormatLayout}
                onDownloadFormat={downloadCampaignFormat}
                downloadingFormat={downloadingFormat}
              />
              <div className="max-h-screen space-y-4 overflow-y-auto">
                <UniversalGenerationPanel
                  title="Generate Hero Image"
                  prompt={activeProject.heroLoop.value}
                  promptComposition={{
                    userPrompt: activeProject.productDescription || "Product-focused luxury imagery",
                    presetDirections: [
                      activeProject.look?.lens,
                      activeProject.look?.lighting,
                      activeProject.look?.palette.join(", "),
                    ].filter(Boolean) as string[],
                    studioContext: `Luxury Look: ${activeProject.look.name}; Brand: ${activeProject.brand.name}; Campaign: ${activeProject.concept.territory}`,
                    finalPrompt: activeProject.heroLoop.value,
                    negativePrompt: "misspelled labels, distorted packaging, fake text, extra logos",
                  }}
                  selectedProvider={selectedProviderPref}
                  onProviderChange={setSelectedProviderPref}
                  generationState={generationState}
                  onGenerationStateChange={(updates) =>
                    setGenerationState((prev) => ({ ...prev, ...updates }))
                  }
                  onGenerate={generateHeroImage}
                  capabilities={{
                    supportsNegativePrompt: true,
                    supportsSeed: true,
                    supportsAspectRatio: true,
                    supportsQuality: true,
                  }}
                  showAdvanced={studioMode === "creator"}
                />
              </div>
            </div>
          ) : projects.length > 0 ? (
            <ProjectHome
              module="glam-studio"
              icon={<Shirt className="h-5 w-5" />}
              flowLabel="Start Glam Magic Flow"
              onStartFlow={() => setFlowOpen(true)}
              onResume={(id) => setActiveProjectId(id)}
              projects={[...projects]
                .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
                .map((project) => ({
                  id: project.id,
                  title: project.name,
                  subtitle: `${project.look.name} · ${project.formats.length} formats`,
                  thumbUrl:
                    project.heroAssets?.find((asset) => asset.id === project.selectedHeroAssetId)
                      ?.url ??
                    project.heroAssets?.[0]?.url ??
                    deliverableThumbnail(allGlamDeliverables, project.id),
                  progress: project.heroLoop.approved ? 100 : 68,
                  status: project.heroLoop.approved ? "Approved" : "Campaign",
                }))}
            />
          ) : (
            <CreativeEmptyState
              icon={<Shirt />}
              title="Build a luxury product campaign"
              description="Art-direct a complete visual world from product truth and Brand DNA, then carry it into hero imagery, social formats, and a product film."
              action="Create campaign"
              onAction={() => setFlowOpen(true)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
