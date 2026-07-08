import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Crown,
  Image,
  Layers3,
  PackageCheck,
  Palette,
  RefreshCw,
  Shirt,
  Sparkles,
  Wand2,
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
import { GuidedFlowShell, PickCardStep, SummaryStep } from "@/platform/components/flow";
import { IntakeFormStep } from "@/platform/components/flow/steps/IntakeFormStep";
import { createBrandDna, type BrandDna } from "@/platform/lib/brandDna";
import {
  createDeliverable,
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
import { loadRouterConfig, ROUTER_MODES } from "@/platform/lib/providers";
import type {
  GuidedFlowDefinition,
  GuidedFlowStepComponentProps,
} from "@/platform/lib/guidedFlow";
import { STUDIO_MODES } from "@/platform/lib/settings";
import { cn } from "@/platform/lib/utils";
import { useAppStore } from "@/platform/store/useAppStore";

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
  audience: string;
  brand: BrandDna;
  look: LuxuryLook;
  concept: CampaignConcept;
  heroLoop: LoopRun<string>;
  formats: string[];
  createdAt: string;
  updatedAt: string;
}

interface GlamFlowState {
  projectName: string;
  productName: string;
  category: ProductCategory | "";
  productDescription: string;
  productPhotoNames: string[];
  audience: string;
  brandName: string;
  brandTone: string;
  tagline: string;
  lookId: string;
  conceptId: string;
  formats: string[];
}

const LS_GLAM_PROJECTS = "mf.glam.projects";

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
];

const CATEGORIES: { id: ProductCategory; title: string; description: string }[] = [
  { id: "beauty", title: "Beauty", description: "Skincare, makeup, haircare, and cosmetic launches." },
  { id: "fashion", title: "Fashion", description: "Apparel drops, accessories, lookbook assets, and capsule collections." },
  { id: "jewelry", title: "Jewelry", description: "Precious details, macro shine, heirloom positioning." },
  { id: "fragrance", title: "Fragrance", description: "Bottle hero shots, mood worlds, and sensual storytelling." },
  { id: "wellness", title: "Wellness", description: "Clean, credible, sensory product campaigns." },
  { id: "tech-luxury", title: "Luxury Tech", description: "Premium hardware, devices, and high-spec products." },
];

const FORMAT_OPTIONS = [
  { id: "ig-square", title: "IG Square", description: "1080 x 1080 campaign post" },
  { id: "ig-portrait", title: "IG Portrait", description: "1080 x 1350 product/ad feed" },
  { id: "story", title: "Story", description: "1080 x 1920 vertical story/reel cover" },
  { id: "hero", title: "Hero Banner", description: "1920 x 1080 site or campaign hero" },
];

const INITIAL_FLOW: GlamFlowState = {
  projectName: "New Glam Campaign",
  productName: "",
  category: "",
  productDescription: "",
  productPhotoNames: [],
  audience: "",
  brandName: "",
  brandTone: "premium, direct, sensory",
  tagline: "",
  lookId: "noir-editorial",
  conceptId: "concept-1",
  formats: ["ig-square", "ig-portrait", "story", "hero"],
};

function readProjects(): GlamProject[] {
  try {
    const raw = localStorage.getItem(LS_GLAM_PROJECTS);
    return raw ? (JSON.parse(raw) as GlamProject[]) : [];
  } catch {
    return [];
  }
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
  return LOOKS.find((look) => look.id === id) ?? LOOKS[0];
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
      shotList: ["Macro texture reveal", "Hero packshot on set", "Lifestyle crop with negative space", "Format-safe headline crop"],
      score: 91,
    },
    {
      id: "concept-2",
      territory: "Ritual Of Arrival",
      headline: `Made for the moment ${audience} step into`,
      visualDirection: `Build a polished ritual sequence around touch, reveal, and brand color accents.`,
      shotList: ["Hands entering frame", "Product opening / reveal", "Texture or material moment", "Approved hero crop"],
      score: 86,
    },
    {
      id: "concept-3",
      territory: "Future Classic",
      headline: `${product}, designed to feel inevitable`,
      visualDirection: `Pair minimal set geometry with premium light control and confident type overlays.`,
      shotList: ["Symmetric packshot", "Shadow detail", "Color-world variant", "Campaign hero layout"],
      score: 84,
    },
  ];
}

function buildHeroPrompt(state: GlamFlowState, concept: CampaignConcept, look: LuxuryLook) {
  return [
    `Luxury advertising hero image for ${state.productName || "a premium product"}.`,
    `Product details: ${state.productDescription || "premium materials, refined silhouette, hero product fidelity."}`,
    `Brand tone: ${state.brandTone}.`,
    `Look: ${look.name}; palette ${look.palette.join(", ")}; ${look.lighting}; ${look.lens}.`,
    `Campaign territory: ${concept.territory}.`,
    `Visual direction: ${concept.visualDirection}`,
    "Leave clean negative space for real typography overlays. Do not render text in the image.",
  ].join(" ");
}

function ProductStep({
  state,
  patch,
}: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <div className="space-y-4">
      <IntakeFormStep
        value={{
          projectName: state.projectName,
          productName: state.productName,
          productDescription: state.productDescription,
          audience: state.audience,
        }}
        onChange={(next) =>
          patch({
            projectName: next.projectName ?? "",
            productName: next.productName ?? "",
            productDescription: next.productDescription ?? "",
            audience: next.audience ?? "",
          })
        }
        fields={[
          { id: "projectName", label: "Project name", placeholder: "Summer lip oil launch" },
          { id: "productName", label: "Product name", placeholder: "Aura Lip Oil" },
          {
            id: "productDescription",
            label: "Product description",
            type: "textarea",
            placeholder: "Describe shape, material, color, ingredients, packaging, price point, and must-preserve details.",
          },
          { id: "audience", label: "Audience", placeholder: "Gen Z beauty buyers, boutique shoppers, founders..." },
        ]}
      />
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border bg-elevated/40 py-6 text-center hover:border-primary/50">
        <Image className="h-6 w-6 text-muted" />
        <span className="text-sm font-medium">Add product references</span>
        <span className="text-xs text-muted">Stored as project context for this skeleton</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const names = Array.from(event.target.files ?? []).map((file) => file.name);
            event.target.value = "";
            if (names.length) patch({ productPhotoNames: [...state.productPhotoNames, ...names] });
          }}
        />
      </label>
      {state.productPhotoNames.length ? (
        <div className="flex flex-wrap gap-2">
          {state.productPhotoNames.map((name) => (
            <Badge key={name}>{name}</Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategoryStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <PickCardStep
      value={state.category || undefined}
      onChange={(id) => patch({ category: id as ProductCategory })}
      options={CATEGORIES.map((category) => ({
        id: category.id,
        title: category.title,
        description: category.description,
      }))}
    />
  );
}

function BrandStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <IntakeFormStep
      value={{
        brandName: state.brandName,
        brandTone: state.brandTone,
        tagline: state.tagline,
      }}
      onChange={(next) =>
        patch({
          brandName: next.brandName ?? "",
          brandTone: next.brandTone ?? "",
          tagline: next.tagline ?? "",
        })
      }
      fields={[
        { id: "brandName", label: "Brand name", placeholder: "Maison Vale" },
        { id: "brandTone", label: "Brand voice", placeholder: "quiet luxury, sensual, clinical..." },
        { id: "tagline", label: "Tagline / headline direction", placeholder: "Optional" },
      ]}
    />
  );
}

function LookStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {LOOKS.map((look) => (
        <button
          key={look.id}
          type="button"
          onClick={() => patch({ lookId: look.id })}
          className={cn(
            "overflow-hidden rounded-[var(--radius-card)] border bg-surface text-left transition hover:border-primary/50",
            state.lookId === look.id ? "border-primary" : "border-border"
          )}
        >
          <div
            className="h-28"
            style={{
              background: `linear-gradient(135deg, ${look.palette[0]}, ${look.palette[1]} 42%, ${look.palette[2]} 70%, ${look.palette[3]})`,
            }}
          />
          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">{look.name}</div>
              {state.lookId === look.id ? <Badge variant="primary">Selected</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-muted">{look.family}</p>
            <p className="mt-3 text-xs text-muted">{look.set}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function ConceptStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  const concepts = conceptsFor(state);
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {concepts.map((concept) => (
        <button
          key={concept.id}
          type="button"
          onClick={() => patch({ conceptId: concept.id })}
          className={cn(
            "rounded-[var(--radius-card)] border bg-surface p-4 text-left transition hover:border-primary/50",
            state.conceptId === concept.id ? "border-primary bg-primary/10" : "border-border"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{concept.territory}</span>
            <Badge variant={concept.score >= 90 ? "success" : "default"}>{concept.score}</Badge>
          </div>
          <p className="mt-3 text-lg font-semibold leading-snug">{concept.headline}</p>
          <p className="mt-3 text-xs leading-5 text-muted">{concept.visualDirection}</p>
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {concept.shotList.map((shot) => (
              <li key={shot}>- {shot}</li>
            ))}
          </ul>
        </button>
      ))}
    </div>
  );
}

function FormatsStep({ state, patch }: GuidedFlowStepComponentProps<GlamFlowState>) {
  return (
    <PickCardStep
      columns={4}
      value=""
      onChange={(id) => {
        const formats = state.formats.includes(id)
          ? state.formats.filter((format) => format !== id)
          : [...state.formats, id];
        patch({ formats });
      }}
      options={FORMAT_OPTIONS.map((format) => ({
        id: format.id,
        title: format.title,
        description: format.description,
        badge: state.formats.includes(format.id) ? "Included" : "Add",
      }))}
    />
  );
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
  const concept = conceptsFor(state).find((item) => item.id === state.conceptId) ?? conceptsFor(state)[0];
  return (
    <pre className="max-h-52 overflow-auto rounded-md border border-border bg-background/70 p-3 text-xs text-muted">
      {buildHeroPrompt(state, concept, look)}
    </pre>
  );
}

function ExportStep({ state }: GuidedFlowStepComponentProps<GlamFlowState>) {
  const look = lookById(state.lookId);
  const concept = conceptsFor(state).find((item) => item.id === state.conceptId) ?? conceptsFor(state)[0];
  return (
    <SummaryStep
      title="Approve the campaign pack"
      items={[
        { label: "Product", value: state.productName || "Untitled product" },
        { label: "Category", value: state.category || "Uncategorized" },
        { label: "Brand", value: state.brandName || "Untitled brand" },
        { label: "Look", value: look.name },
        { label: "Concept", value: concept.territory },
        { label: "Formats", value: `${state.formats.length} deliverables` },
      ]}
    />
  );
}

function createProjectFromState(state: GlamFlowState): GlamProject {
  const look = lookById(state.lookId);
  const concept = conceptsFor(state).find((item) => item.id === state.conceptId) ?? conceptsFor(state)[0];
  const brand = createBrandDna({
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
    audience: state.audience,
    brand,
    look,
    concept,
    heroLoop: createLoopRun("hero image prompt", prompt, concept.score),
    formats: state.formats,
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
  return project;
}

function ProjectPreview({
  project,
  deliverables,
  onImprove,
  onApprove,
}: {
  project: GlamProject;
  deliverables: Deliverable[];
  onImprove: () => void;
  onApprove: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" /> Hero Direction
          </CardTitle>
          <CardDescription>{project.concept.territory}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-elevated">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${project.look.palette[0]}, ${project.look.palette[1]} 38%, ${project.look.palette[2]} 68%, ${project.look.palette[3]})`,
              }}
            />
            <div className="absolute left-[10%] top-[18%] h-[54%] w-[30%] rounded-2xl bg-white/20 shadow-2xl ring-1 ring-white/30 backdrop-blur" />
            <div className="absolute bottom-[14%] right-[9%] max-w-[48%] text-right">
              <div className="text-3xl font-black leading-tight text-white drop-shadow">
                {project.concept.headline}
              </div>
              <div className="mt-3 text-xs font-semibold uppercase text-white/75">{project.brand.name}</div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-background/60 p-3 text-xs leading-5 text-muted">
            {project.heroLoop.value}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onImprove}>
              <RefreshCw /> Improve
            </Button>
            <Button onClick={onApprove}>
              <BadgeCheck /> Approve hero
            </Button>
          </div>
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
            {deliverables.map((deliverable) => (
              <div key={deliverable.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{deliverable.title}</span>
                <Badge variant={deliverable.status === "approved" ? "success" : "default"}>
                  {deliverable.status}
                </Badge>
              </div>
            ))}
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

export function GlamStudio() {
  const { studioMode, setStudioMode, openAssets, openBrandKits, openSettings } = useAppStore();
  const [routerConfig] = useState(() => loadRouterConfig());
  const [projects, setProjects] = useState<GlamProject[]>(() => readProjects());
  const [activeProjectId, setActiveProjectId] = useState(() => readProjects()[0]?.id ?? "");
  const [flowOpen, setFlowOpen] = useState(() => readProjects().length === 0);
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
  const deliverables = activeProject ? listDeliverables({ moduleId: "glam-studio", projectId: activeProject.id }) : [];
  const routerMode = ROUTER_MODES.find((mode) => mode.id === routerConfig.mode)?.label ?? "Auto";

  const definition = useMemo<GuidedFlowDefinition<GlamFlowState>>(
    () => ({
      id: "glam-studio.campaign-pack",
      moduleId: "glam-studio",
      version: 1,
      title: "New Glam Campaign",
      description: "Create a luxury product campaign pack with Brand DNA, Look DNA, concepts, hero prompt, and format deliverables.",
      initialState: INITIAL_FLOW,
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
    []
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

  function approveHero() {
    if (!activeProject) return;
    const nextProject = saveProject({ ...activeProject, heroLoop: approveLoopRun(activeProject.heroLoop) });
    deliverables.forEach((deliverable) =>
      saveDeliverable({
        ...deliverable,
        status: "approved",
        assetRefs: [`glam-hero:${activeProject.id}`],
      })
    );
    setProjects(readProjects());
    setActiveProjectId(nextProject.id);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-border px-8 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grad-primary flex h-9 w-9 items-center justify-center rounded-xl text-white">
                <Crown className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-lg font-semibold">Glam Studio</h1>
                <p className="text-xs text-muted">Luxury product campaign packs powered by platform Guided Flow.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">{STUDIO_MODES.find((mode) => mode.id === studioMode)?.label}</Badge>
            <Badge>{routerMode}</Badge>
            <Button variant="secondary" onClick={openBrandKits}>
              <Palette /> Brand Kits
            </Button>
            <Button variant="secondary" onClick={openAssets}>
              <Layers3 /> Assets
            </Button>
            <Button onClick={() => setFlowOpen(true)}>
              <Wand2 /> New Glam Project
            </Button>
          </div>
        </div>
      </header>

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
                  <button
                    key={project.id}
                    onClick={() => setActiveProjectId(project.id)}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left text-sm transition",
                      activeProject?.id === project.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-elevated"
                    )}
                  >
                    <span className="block font-medium">{project.name}</span>
                    <span className="block text-xs text-muted">{project.look.name}</span>
                  </button>
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
              {STUDIO_MODES.map((mode) => (
                <Button
                  key={mode.id}
                  variant={studioMode === mode.id ? "primary" : "secondary"}
                  className="w-full justify-start"
                  onClick={() => setStudioMode(mode.id)}
                >
                  {mode.label}
                </Button>
              ))}
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
            <ProjectPreview
              project={activeProject}
              deliverables={deliverables}
              onImprove={improveHero}
              onApprove={approveHero}
            />
          ) : (
            <Card>
              <CardContent className="flex min-h-96 flex-col items-center justify-center gap-3 text-center">
                <Shirt className="h-10 w-10 text-primary" />
                <div className="text-lg font-semibold">Build a luxury product campaign</div>
                <p className="max-w-md text-sm text-muted">
                  Product intake, Brand DNA, luxury look, campaign concept, hero prompt loop, and format pack deliverables.
                </p>
                <Button onClick={() => setFlowOpen(true)}>
                  <Sparkles /> Start Glam Studio
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
