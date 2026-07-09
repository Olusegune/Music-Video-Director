import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Code2,
  Copy,
  Download,
  Globe2,
  Laptop,
  Loader2,
  Monitor,
  Plus,
  Smartphone,
  Sparkles,
  Trash2,
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
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { CreativeEmptyState } from "@/platform/components/ui/creative-empty-state";
import { GuidedFlowShell, PickCardStep, SummaryStep } from "@/platform/components/flow";
import { IntakeFormStep } from "@/platform/components/flow/steps/IntakeFormStep";
import { ModuleHeader, ProjectCard } from "@/platform/components/visual";
import type { GuidedFlowDefinition, GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import { createBrandDna, getBrandDna } from "@/platform/lib/brandDna";
import { consumeSeedContext, type SeedContext } from "@/platform/lib/seedContext";
import {
  createDeliverable,
  deleteDeliverables,
  deliverableThumbnail,
  listDeliverables,
  saveDeliverable,
} from "@/platform/lib/deliverables";
import { loadAssets } from "@/platform/lib/generatedAssets";
import { buildZip, downloadBlob } from "@/platform/lib/archive";
import { loadRouterConfig, ROUTER_MODES } from "@/platform/lib/providers";
import { api } from "@/platform/lib/ipc";
import { STUDIO_MODES } from "@/platform/lib/settings";
import { cn } from "@/platform/lib/utils";
import { useAppStore } from "@/platform/store/useAppStore";
import { SECTION_PATTERNS, patternById } from "@/apps/webstudio/lib/patterns";
import { buildSections, derivePositioning } from "@/apps/webstudio/lib/positioning";
import { compileCss, compilePage } from "@/apps/webstudio/lib/siteCompiler";
import { TOKEN_PRESETS, tokensFromBrand } from "@/apps/webstudio/lib/tokens";
import type { Positioning, SectionInstance, WebPage, WebProject } from "@/apps/webstudio/lib/types";
import { deleteWebProject, listWebProjects, saveWebProject } from "@/apps/webstudio/lib/webStore";
import {
  COPY_SCHEMA,
  parseCopyDrafts,
  parsePositioning,
  POSITIONING_SCHEMA,
} from "@/apps/webstudio/lib/webAi";
import type { SectionCopy } from "@/apps/webstudio/lib/types";
import { auditSite } from "@/apps/webstudio/lib/siteAudit";

interface WebFlowState {
  campaignSeed?: SeedContext;
  projectName: string;
  businessName: string;
  businessDescription: string;
  audience: string;
  proofPoints: string;
  ctaGoal: string;
  brandName: string;
  brandTone: string;
  presetId: string;
  patternIds: string[];
  positioning?: Positioning;
  copyDrafts?: Record<string, SectionCopy>;
}

const DEFAULT_PATTERNS = [
  "hero-split",
  "features-grid",
  "stats-band",
  "testimonials-grid",
  "faq-stack",
  "cta-banner",
];
const INITIAL: WebFlowState = {
  projectName: "New Web Studio Site",
  businessName: "",
  businessDescription: "",
  audience: "",
  proofPoints: "",
  ctaGoal: "Book a consultation",
  brandName: "",
  brandTone: "clear, confident, human",
  presetId: "midnight",
  patternIds: DEFAULT_PATTERNS,
};
const split = (value: string) =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "website";

function positioningFor(state: WebFlowState) {
  return (
    state.positioning ??
    derivePositioning({
      businessName: state.businessName || "Your business",
      businessDescription: state.businessDescription,
      audience: state.audience,
      proofPoints: split(state.proofPoints),
      ctaGoal: state.ctaGoal,
    })
  );
}

async function generateStructured(prompt: string, schema: string): Promise<string | null> {
  return api.generateStructuredTextFromSpec(
    {
      capability: "text",
      prompt,
      modelHint: "web-structured-copy",
      providerPref: "gemini",
      moduleId: "web",
    },
    schema
  );
}

function BusinessStep({ state, patch }: GuidedFlowStepComponentProps<WebFlowState>) {
  return (
    <IntakeFormStep
      value={{
        projectName: state.projectName,
        businessName: state.businessName,
        businessDescription: state.businessDescription,
      }}
      onChange={(next) =>
        patch({
          projectName: next.projectName ?? "",
          businessName: next.businessName ?? "",
          businessDescription: next.businessDescription ?? "",
        })
      }
      fields={[
        { id: "projectName", label: "Project name", placeholder: "Acme launch site" },
        { id: "businessName", label: "Business name", placeholder: "Acme" },
        {
          id: "businessDescription",
          label: "What do you sell?",
          type: "textarea",
          placeholder:
            "Describe the offer, customer problem, and outcome in two or three sentences.",
        },
      ]}
    />
  );
}

function OfferStep({ state, patch }: GuidedFlowStepComponentProps<WebFlowState>) {
  const positioning = positioningFor(state);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const draft = async () => {
    setBusy(true);
    setNote("");
    try {
      const raw = await generateStructured(
        `Act as a senior positioning strategist. Business: ${state.businessName}. Description: ${state.businessDescription}. Audience: ${state.audience || "infer the most valuable primary audience"}. Proof: ${state.proofPoints || "not supplied"}. Desired action: ${state.ctaGoal}. Produce specific, credible positioning with no hype or generic filler.`,
        POSITIONING_SCHEMA
      );
      if (!raw) {
        patch({
          positioning: derivePositioning({
            businessName: state.businessName,
            businessDescription: state.businessDescription,
            audience: state.audience,
            proofPoints: split(state.proofPoints),
            ctaGoal: state.ctaGoal,
          }),
        });
        setNote("Local strategy draft ready.");
      } else {
        patch({ positioning: parsePositioning(raw) });
        setNote("Studio strategy draft ready for approval.");
      }
    } catch (error) {
      setNote(
        error instanceof Error
          ? `${error.message} Using the local draft.`
          : "Using the local strategy draft."
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={draft} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Draft positioning
        </Button>
      </div>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Offer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">{positioning.offer}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Core promise</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted">{positioning.promise}</CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Message hierarchy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-3">
            {positioning.valueProps.map((value) => (
              <div key={value} className="rounded-md bg-elevated p-3 text-sm">
                {value}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AudienceStep({ state, patch }: GuidedFlowStepComponentProps<WebFlowState>) {
  return (
    <IntakeFormStep
      value={{
        audience: state.audience,
        proofPoints: state.proofPoints,
        ctaGoal: state.ctaGoal,
        brandName: state.brandName,
        brandTone: state.brandTone,
      }}
      onChange={(next) =>
        patch({
          audience: next.audience ?? "",
          proofPoints: next.proofPoints ?? "",
          ctaGoal: next.ctaGoal ?? "",
          brandName: next.brandName ?? "",
          brandTone: next.brandTone ?? "",
        })
      }
      fields={[
        { id: "audience", label: "Primary audience", placeholder: "Who is this site speaking to?" },
        {
          id: "proofPoints",
          label: "Proof points",
          type: "textarea",
          placeholder: "Client results, credentials, customer quotes, notable numbers",
        },
        { id: "ctaGoal", label: "Primary action", placeholder: "Book a consultation" },
        { id: "brandName", label: "Brand name", placeholder: state.businessName || "Brand" },
        { id: "brandTone", label: "Voice", placeholder: "clear, confident, human" },
      ]}
    />
  );
}

function PagesStep({ state, patch }: GuidedFlowStepComponentProps<WebFlowState>) {
  return (
    <PickCardStep
      columns={3}
      value=""
      onChange={(id) =>
        patch({
          patternIds: state.patternIds.includes(id)
            ? state.patternIds.filter((item) => item !== id)
            : [...state.patternIds, id],
        })
      }
      options={SECTION_PATTERNS.map((pattern) => ({
        id: pattern.id,
        title: pattern.name,
        description: pattern.description,
        badge: state.patternIds.includes(pattern.id) ? "Included" : pattern.family,
        visual: (
          <span className="flex h-full w-full flex-col gap-2 bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-black/20 p-4">
            <span className="h-2 w-1/2 rounded-full bg-white/35" />
            <span className="h-8 rounded-lg border border-white/15 bg-white/10" />
            <span className="grid flex-1 grid-cols-3 gap-2">
              <i className="rounded bg-white/10" />
              <i className="rounded bg-white/15" />
              <i className="rounded bg-white/10" />
            </span>
          </span>
        ),
      }))}
    />
  );
}

function StyleStep({ state, patch }: GuidedFlowStepComponentProps<WebFlowState>) {
  return (
    <PickCardStep
      value={state.presetId}
      onChange={(presetId) => patch({ presetId })}
      options={TOKEN_PRESETS.map((preset) => ({
        id: preset.id,
        title: preset.name,
        description: `${preset.tokens.fontDisplay} · ${preset.tokens.primary} · radius ${preset.tokens.radius}px`,
      }))}
    />
  );
}

function CopyStep({ state, patch }: GuidedFlowStepComponentProps<WebFlowState>) {
  const positioning = positioningFor(state);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const draft = async () => {
    setBusy(true);
    setNote("");
    try {
      const raw = await generateStructured(
        `Write concise conversion copy for ${state.businessName}. Positioning: ${JSON.stringify(positioning)}. Brand voice: ${state.brandTone}. Return exactly one section for each pattern id: ${state.patternIds.join(", ")}. Keep headings concrete, bodies under 45 words, and never invent statistics or customer quotes.`,
        COPY_SCHEMA
      );
      if (!raw) {
        setNote("Local structured copy is ready.");
        return;
      }
      patch({ copyDrafts: parseCopyDrafts(raw, state.patternIds) });
      setNote("Studio copy draft passed schema validation.");
    } catch (error) {
      setNote(
        error instanceof Error
          ? `${error.message} Keeping the local copy.`
          : "Keeping the local copy."
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={draft} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Draft site copy
        </Button>
      </div>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
      <SummaryStep
        title="Your site copy is structured"
        items={[
          { label: "Headline", value: positioning.promise },
          { label: "Value pillars", value: `${positioning.valueProps.length} written` },
          { label: "Proof", value: `${positioning.proof.length} signals` },
          { label: "Objections", value: `${positioning.objections.length} answered` },
          { label: "CTA", value: positioning.cta },
        ]}
      />
    </div>
  );
}

function BuildStep({ state }: GuidedFlowStepComponentProps<WebFlowState>) {
  return (
    <SummaryStep
      title="Build the responsive site"
      items={[
        { label: "Business", value: state.businessName },
        { label: "Sections", value: `${state.patternIds.length} curated patterns` },
        {
          label: "Theme",
          value:
            TOKEN_PRESETS.find((preset) => preset.id === state.presetId)?.name ?? state.presetId,
        },
        { label: "Export", value: "Standalone HTML/CSS ZIP" },
      ]}
    />
  );
}

function createProject(state: WebFlowState): WebProject {
  const positioning = positioningFor(state);
  const brand =
    getBrandDna(state.campaignSeed?.brandDnaId) ??
    createBrandDna({
      name: state.brandName || state.businessName,
      tone: state.brandTone,
      productLine: state.businessName,
      tagline: positioning.promise,
      palette: TOKEN_PRESETS.find((preset) => preset.id === state.presetId)?.tokens
        ? [
            TOKEN_PRESETS.find((preset) => preset.id === state.presetId)!.tokens.primary,
            TOKEN_PRESETS.find((preset) => preset.id === state.presetId)!.tokens.accent,
          ]
        : [],
    });
  const now = new Date().toISOString();
  const sections = buildSections(state.patternIds, positioning).map((section) =>
    state.copyDrafts?.[section.patternId]
      ? { ...section, copy: state.copyDrafts[section.patternId] }
      : section
  );
  const project = saveWebProject({
    id: crypto.randomUUID(),
    name: state.projectName || `${state.businessName} Website`,
    businessName: state.businessName,
    businessDescription: state.businessDescription,
    audience: state.audience,
    proofPoints: split(state.proofPoints),
    ctaGoal: state.ctaGoal,
    brand,
    positioning,
    sections,
    pages: [
      {
        id: crypto.randomUUID(),
        title: "Home",
        slug: "index",
        description: positioning.promise,
        sections,
      },
    ],
    seo: { titleTemplate: `%s — ${state.businessName}`, siteUrl: "", indexable: true },
    tokens: tokensFromBrand(brand, state.presetId),
    createdAt: now,
    updatedAt: now,
  });
  createDeliverable({
    moduleId: "webstudio",
    projectId: project.id,
    kind: "static-site",
    format: "html-css-zip",
    status: "draft",
    title: `${project.businessName} responsive website`,
    assetRefs: [],
  });
  if (state.campaignSeed) {
    const source = listDeliverables().find(
      (deliverable) => deliverable.id === state.campaignSeed?.sourceDeliverableId
    );
    if (source)
      saveDeliverable({
        ...source,
        status: "draft",
        assetRefs: [...source.assetRefs, `web-project:${project.id}`],
      });
  }
  return project;
}

type Viewport = "desktop" | "tablet" | "mobile";
const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};

function WebWorkbench({
  project,
  onChange,
}: {
  project: WebProject;
  onChange: (project: WebProject) => void;
}) {
  const studioMode = useAppStore((state) => state.studioMode);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const pages: WebPage[] = project.pages?.length
    ? project.pages
    : [
        {
          id: "home",
          title: "Home",
          slug: "index",
          description: project.positioning.promise,
          sections: project.sections,
        },
      ];
  const [activePageId, setActivePageId] = useState(() => pages[0].id);
  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0];
  const workingSections = activePage.sections;
  const html = useMemo(
    () => compilePage({ ...project, pages }, activePage, true),
    [project, activePage, pages]
  );
  const audit = useMemo(() => auditSite(project), [project]);
  const mediaAssets = useMemo(() => loadAssets().filter((asset) => Boolean(asset.url)), []);
  const persist = (next: WebProject) => onChange(saveWebProject(next));
  const persistPage = (nextPage: WebPage) =>
    persist({
      ...project,
      pages: pages.map((page) => (page.id === nextPage.id ? nextPage : page)),
      sections: nextPage.slug === "index" ? nextPage.sections : project.sections,
    });
  const updateSection = (id: string, patch: Partial<SectionInstance>) =>
    persistPage({
      ...activePage,
      sections: workingSections.map((section) =>
        section.id === id ? { ...section, ...patch } : section
      ),
    });
  const moveSection = (id: string, direction: -1 | 1) => {
    const index = workingSections.findIndex((section) => section.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= workingSections.length) return;
    const sections = [...workingSections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    persistPage({ ...activePage, sections });
  };
  const duplicateSection = (section: SectionInstance) => {
    const index = workingSections.findIndex((item) => item.id === section.id);
    const sections = [...workingSections];
    sections.splice(index + 1, 0, {
      ...section,
      id: crypto.randomUUID(),
      copy: { ...section.copy, items: [...section.copy.items] },
    });
    persistPage({ ...activePage, sections });
  };
  const removeSection = (id: string) => {
    if (workingSections.length <= 1) {
      setNote("A page needs at least one section.");
      return;
    }
    persistPage({
      ...activePage,
      sections: workingSections.filter((section) => section.id !== id),
    });
  };
  const addPage = () => {
    const number = pages.length + 1;
    const page: WebPage = {
      id: crypto.randomUUID(),
      title: `Page ${number}`,
      slug: `page-${number}`,
      description: project.positioning.promise,
      sections: project.sections.slice(0, 3).map((section) => ({
        ...section,
        id: crypto.randomUUID(),
        copy: { ...section.copy, items: [...section.copy.items] },
      })),
    };
    persist({ ...project, pages: [...pages, page] });
    setActivePageId(page.id);
  };
  const exportSite = async () => {
    setBusy(true);
    try {
      const encoder = new TextEncoder();
      const exportProject: WebProject = {
        ...project,
        sections: project.sections.map((section) => ({ ...section, copy: { ...section.copy } })),
      };
      const mediaEntries: { name: string; bytes: Uint8Array }[] = [];
      for (const section of exportProject.sections) {
        if (!section.mediaUrl) continue;
        try {
          const response = await fetch(section.mediaUrl);
          if (!response.ok) throw new Error(`Asset fetch failed (${response.status})`);
          const mime = response.headers.get("content-type") ?? "image/png";
          const extension = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
          const path = `assets/${section.id}.${extension}`;
          mediaEntries.push({ name: path, bytes: new Uint8Array(await response.arrayBuffer()) });
          section.mediaUrl = path;
        } catch {
          section.mediaUrl = undefined;
        }
      }
      const manifest = JSON.stringify(
        {
          projectId: exportProject.id,
          positioning: exportProject.positioning,
          designTokens: exportProject.tokens,
          patterns: exportProject.sections.map((section) => section.patternId),
        },
        null,
        2
      );
      const mediaPrompts =
        exportProject.sections
          .filter(
            (section) => patternById(section.patternId).family === "hero" && !section.mediaUrl
          )
          .map(
            (section) =>
              `- ${section.copy.heading}: premium on-brand website hero image, palette ${project.tokens.primary} and ${project.tokens.accent}, no rendered text`
          )
          .join("\n") || "No placeholder imagery remains.";
      downloadBlob(
        buildZip([
          ...pages.map((page) => ({
            name: page.slug === "index" ? "index.html" : `${page.slug}.html`,
            bytes: encoder.encode(compilePage({ ...exportProject, pages }, page, false)),
          })),
          { name: "styles.css", bytes: encoder.encode(compileCss(exportProject.tokens)) },
          { name: "site-spec.json", bytes: encoder.encode(manifest) },
          {
            name: "quality-report.json",
            bytes: encoder.encode(JSON.stringify(auditSite(exportProject), null, 2)),
          },
          { name: "media-prompts.md", bytes: encoder.encode(`# Media prompts\n\n${mediaPrompts}`) },
          {
            name: "assets/README.txt",
            bytes: encoder.encode(
              "Selected Production Library images are bundled here. Add or replace local media freely."
            ),
          },
          {
            name: "README.txt",
            bytes: encoder.encode(
              "Upload this folder to any static host. No framework, build step, account, or runtime dependency is required."
            ),
          },
          ...mediaEntries,
        ]),
        `${slug(project.name)}-static-site.zip`
      );
      listDeliverables({ moduleId: "webstudio", projectId: project.id }).forEach((deliverable) =>
        saveDeliverable({ ...deliverable, status: "approved" })
      );
      setNote("Static HTML/CSS site ZIP exported.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{project.businessName}</h2>
          <p className="text-xs text-muted">{project.positioning.promise}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={audit.score >= 90 ? "success" : "default"}>Quality {audit.score}</Badge>
          <Button
            variant={viewport === "desktop" ? "primary" : "secondary"}
            size="icon"
            onClick={() => setViewport("desktop")}
          >
            <Monitor />
          </Button>
          <Button
            variant={viewport === "tablet" ? "primary" : "secondary"}
            size="icon"
            onClick={() => setViewport("tablet")}
          >
            <Laptop />
          </Button>
          <Button
            variant={viewport === "mobile" ? "primary" : "secondary"}
            size="icon"
            onClick={() => setViewport("mobile")}
          >
            <Smartphone />
          </Button>
          <Button onClick={exportSite} disabled={busy || audit.score < 90}>
            {busy ? <Loader2 className="animate-spin" /> : <Download />} Export Site ZIP
          </Button>
        </div>
      </div>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-2">
        <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Pages
        </span>
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => setActivePageId(page.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              activePage.id === page.id
                ? "bg-primary text-primary-foreground"
                : "bg-elevated text-muted hover:text-foreground"
            )}
          >
            {page.title}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={addPage}>
          <Plus /> Add page
        </Button>
      </div>
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="overflow-auto rounded-xl border border-border bg-elevated p-3">
          <iframe
            title={`${project.businessName} responsive preview`}
            srcDoc={html}
            sandbox="allow-same-origin"
            className="mx-auto h-[720px] rounded-lg border-0 bg-white transition-all"
            style={{ width: VIEWPORT_WIDTH[viewport], maxWidth: "100%" }}
          />
        </div>
        {studioMode !== "director" ? (
          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>Page & SEO</CardTitle>
                <CardDescription>Search and social metadata for this page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  value={activePage.title}
                  onChange={(event) => persistPage({ ...activePage, title: event.target.value })}
                  aria-label="Page title"
                />
                <Input
                  value={activePage.slug}
                  onChange={(event) =>
                    persistPage({ ...activePage, slug: slug(event.target.value) })
                  }
                  aria-label="Page slug"
                  disabled={activePage.slug === "index"}
                />
                <Textarea
                  value={activePage.description}
                  onChange={(event) =>
                    persistPage({ ...activePage, description: event.target.value })
                  }
                  className="min-h-20"
                  aria-label="Meta description"
                />
                <Input
                  value={project.seo?.siteUrl ?? ""}
                  onChange={(event) =>
                    persist({
                      ...project,
                      seo: {
                        titleTemplate: project.seo?.titleTemplate ?? `%s — ${project.businessName}`,
                        indexable: project.seo?.indexable ?? true,
                        ...project.seo,
                        siteUrl: event.target.value,
                      },
                    })
                  }
                  placeholder="https://example.com"
                  aria-label="Canonical site URL"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Positioning</CardTitle>
                <CardDescription>
                  Edit the strategic spine used by metadata and navigation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  value={project.positioning.promise}
                  onChange={(event) =>
                    persist({
                      ...project,
                      positioning: { ...project.positioning, promise: event.target.value },
                    })
                  }
                  aria-label="Core promise"
                />
                <Textarea
                  value={project.positioning.offer}
                  onChange={(event) =>
                    persist({
                      ...project,
                      positioning: { ...project.positioning, offer: event.target.value },
                    })
                  }
                  className="min-h-20"
                  aria-label="Offer positioning"
                />
                <Input
                  value={project.positioning.cta}
                  onChange={(event) =>
                    persist({
                      ...project,
                      positioning: { ...project.positioning, cta: event.target.value },
                    })
                  }
                  aria-label="Primary CTA"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quality Gate</CardTitle>
                <CardDescription>
                  {audit.checks.filter((check) => check.passed).length}/{audit.checks.length} static
                  checks passed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {audit.checks.map((check) => (
                  <div
                    key={check.id}
                    className={cn("text-xs", check.passed ? "text-muted" : "text-danger")}
                  >
                    {check.passed ? "✓" : "×"} {check.label}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Section Stack</CardTitle>
                <CardDescription>
                  Reorder, duplicate, remove, edit, and swap curated patterns.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {workingSections.map((section, index) => (
                  <div key={section.id} className="space-y-2 rounded-md border border-border p-3">
                    <div className="flex items-center gap-1">
                      <span className="mr-auto text-[10px] uppercase tracking-wide text-muted">
                        {index + 1} · {patternById(section.patternId).family}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveSection(section.id, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveSection(section.id, 1)}
                        disabled={index === workingSections.length - 1}
                      >
                        <ArrowDown />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => duplicateSection(section)}>
                        <Copy />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeSection(section.id)}>
                        <Trash2 />
                      </Button>
                    </div>
                    <select
                      value={section.patternId}
                      onChange={(event) =>
                        updateSection(section.id, { patternId: event.target.value })
                      }
                      className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                    >
                      {SECTION_PATTERNS.map((pattern) => (
                        <option key={pattern.id} value={pattern.id}>
                          {pattern.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={section.copy.heading}
                      onChange={(event) =>
                        updateSection(section.id, {
                          copy: { ...section.copy, heading: event.target.value },
                        })
                      }
                      aria-label="Section heading"
                    />
                    <Textarea
                      value={section.copy.body}
                      onChange={(event) =>
                        updateSection(section.id, {
                          copy: { ...section.copy, body: event.target.value },
                        })
                      }
                      className="min-h-20"
                      aria-label="Section body"
                    />
                    {patternById(section.patternId).family === "hero" ? (
                      <select
                        value={section.mediaUrl ?? ""}
                        onChange={(event) =>
                          updateSection(section.id, { mediaUrl: event.target.value || undefined })
                        }
                        className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
                      >
                        <option value="">Generated placeholder + export prompt</option>
                        {mediaAssets.map((asset) => (
                          <option key={asset.id} value={asset.url}>
                            {asset.entityName} · {asset.sheetType}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
            {studioMode === "creator" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Design Tokens</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {(["primary", "accent", "background", "text"] as const).map((key) => (
                    <label key={key} className="text-xs capitalize text-muted">
                      {key}
                      <Input
                        type="color"
                        value={project.tokens[key]}
                        onChange={(event) =>
                          persist({
                            ...project,
                            tokens: { ...project.tokens, [key]: event.target.value },
                          })
                        }
                        className="mt-1 p-1"
                      />
                    </label>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function WebStudio() {
  const { studioMode, setStudioMode } = useAppStore();
  const [router] = useState(() => loadRouterConfig());
  const [projects, setProjects] = useState(() => listWebProjects());
  const [activeId, setActiveId] = useState(() => listWebProjects()[0]?.id ?? "");
  const [campaignSeed] = useState(() => consumeSeedContext("webstudio"));
  const [flowOpen, setFlowOpen] = useState(
    () => Boolean(campaignSeed) || listWebProjects().length === 0
  );
  const active = projects.find((project) => project.id === activeId) ?? projects[0] ?? null;
  const routerLabel = ROUTER_MODES.find((mode) => mode.id === router.mode)?.label ?? "Auto";
  const definition = useMemo<GuidedFlowDefinition<WebFlowState>>(
    () => ({
      id: "webstudio.single-page",
      moduleId: "webstudio",
      version: 1,
      title: "Web Studio Magic Flow",
      description:
        "Turn a business brief into a positioned, written, designed, responsive website.",
      initialState: campaignSeed
        ? {
            ...INITIAL,
            campaignSeed,
            projectName: `${campaignSeed.campaignName} · Landing Page`,
            businessName: getBrandDna(campaignSeed.brandDnaId)?.name ?? campaignSeed.product,
            businessDescription: campaignSeed.messaging.promise,
            audience: campaignSeed.audience,
            ctaGoal: campaignSeed.goal,
            brandName: getBrandDna(campaignSeed.brandDnaId)?.name ?? campaignSeed.product,
            brandTone: getBrandDna(campaignSeed.brandDnaId)?.voice.tone ?? INITIAL.brandTone,
            positioning: {
              audience: campaignSeed.audience,
              offer: campaignSeed.messaging.promise,
              promise: campaignSeed.messaging.promise,
              valueProps: campaignSeed.messaging.pillars,
              objections: ["Why now?", "Why this offer?", "What happens next?"],
              proof: campaignSeed.messaging.pillars,
              cta: campaignSeed.goal,
            },
          }
        : INITIAL,
      steps: [
        {
          id: "business",
          title: "Business",
          subtitle: "Brief the agency team.",
          component: BusinessStep,
          validate: (state) =>
            Boolean(state.businessName.trim() && state.businessDescription.trim()) ||
            "Add the business name and a short description.",
        },
        {
          id: "offer",
          title: "Offer",
          subtitle: "Approve the positioning and core promise.",
          component: OfferStep,
        },
        {
          id: "audience",
          title: "Audience",
          subtitle: "Sharpen the message, proof, and conversion goal.",
          component: AudienceStep,
          validate: (state) => Boolean(state.audience.trim()) || "Describe the primary audience.",
        },
        {
          id: "pages",
          title: "Pages",
          subtitle: "Choose the single-page section stack.",
          component: PagesStep,
          validate: (state) => state.patternIds.length >= 3 || "Choose at least three sections.",
        },
        { id: "style", title: "Style", subtitle: "Choose the token system.", component: StyleStep },
        {
          id: "copy",
          title: "Copy",
          subtitle: "Review the structured message system.",
          component: CopyStep,
        },
        {
          id: "build",
          title: "Build",
          subtitle: "Create the responsive site and export-ready project.",
          component: BuildStep,
        },
      ],
      onComplete: (state) => {
        const project = createProject(state);
        setProjects(listWebProjects());
        setActiveId(project.id);
        setFlowOpen(false);
      },
    }),
    [campaignSeed]
  );
  const saveActive = (project: WebProject) => {
    setProjects(listWebProjects());
    setActiveId(project.id);
  };
  const allDeliverables = listDeliverables({ moduleId: "webstudio" });
  const removeActiveProject = () => {
    if (
      !active ||
      !confirm(
        `Delete web project “${active.name}”? This removes its local site specification and deliverable record.`
      )
    )
      return;
    deleteWebProject(active.id);
    deleteDeliverables({ moduleId: "webstudio", projectId: active.id });
    const remaining = listWebProjects();
    setProjects(remaining);
    setActiveId(remaining[0]?.id ?? "");
    setFlowOpen(remaining.length === 0);
  };
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <ModuleHeader
        module="webstudio"
        icon={<Globe2 className="h-5 w-5" />}
        title="Web Studio"
        subtitle={`Positioning-first responsive websites you own · ${routerLabel}`}
        mode={studioMode}
        onModeChange={setStudioMode}
        primaryLabel="New Website"
        primaryIcon={<Plus />}
        onPrimary={() => setFlowOpen(true)}
      />
      <div className="grid gap-5 p-8 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Web Projects</CardTitle>
              <CardDescription>{projects.length} local sites</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  module="webstudio"
                  title={project.name}
                  subtitle={`${project.sections.length} sections · ${project.positioning.offer}`}
                  thumbUrl={deliverableThumbnail(allDeliverables, project.id)}
                  progress={
                    project.sections.length >= 5 ? 100 : Math.round(project.sections.length * 18)
                  }
                  status="Site"
                  active={active?.id === project.id}
                  onResume={() => {
                    setActiveId(project.id);
                    setFlowOpen(false);
                  }}
                />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mode</CardTitle>
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
            </CardContent>
          </Card>
          {active ? (
            <Card>
              <CardHeader>
                <CardTitle>Deliverables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted">
                <div>
                  {listDeliverables({ moduleId: "webstudio", projectId: active.id }).length} static
                  site package
                </div>
                <Button variant="danger" size="sm" className="w-full" onClick={removeActiveProject}>
                  <Trash2 /> Delete Project
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </aside>
        <main className="min-w-0">
          {flowOpen ? (
            <GuidedFlowShell
              definition={definition}
              onExit={() => setFlowOpen(false)}
              onComplete={() => undefined}
            />
          ) : active ? (
            <WebWorkbench project={active} onChange={saveActive} />
          ) : (
            <CreativeEmptyState
              icon={<Code2 />}
              title="Build a positioned website"
              description="Start with offer clarity, then compose pages, copy, responsive preview, SEO, and static export from one guided flow."
              action="Start Web Studio"
              onAction={() => setFlowOpen(true)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
