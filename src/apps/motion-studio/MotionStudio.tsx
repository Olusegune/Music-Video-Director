import { useEffect, useMemo, useState } from "react";
import {
  AudioLines,
  Boxes,
  CheckCircle2,
  Clapperboard,
  Download,
  FilePlus2,
  Film,
  Image,
  Layers3,
  Palette,
  Play,
  RefreshCw,
  Route,
  Save,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  Users,
  Map,
  Package,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { api } from "@/platform/lib/ipc";
import { loadRouterConfig, ROUTER_MODES } from "@/platform/lib/providers";
import { STUDIO_MODES } from "@/platform/lib/settings";
import { STYLE_PRESETS } from "@/platform/lib/styles";
import { cn } from "@/platform/lib/utils";
import { useAppStore } from "@/platform/store/useAppStore";
import { critiqueScene, directStoryboard, improveScene } from "./lib/brain";
import { establishDirection } from "./lib/direction";
import {
  addMotionLoopEvent,
  createMotionProject,
  listMotionProjects,
  saveMotionProject,
  snapshotMotionProject,
  updateMotionScenes,
} from "./lib/projects";
import {
  PRODUCTION_TYPES,
  VISUAL_STYLES,
  directionSummary,
  productionType,
  type ProductionType,
  visualStyle,
} from "./lib/templates";
import type { MotionProject, MotionProjectDraft, MotionScene } from "./lib/types";
import { CreativeEmptyState } from "@/platform/components/ui/creative-empty-state";

const emptyDraft: MotionProjectDraft = {
  name: "New Product Motion Film",
  typeId: "saas-explainer",
  styleId: "flat-illustration",
  businessInput: "",
  marketingBrief: "",
  script: "",
  brief: "",
  aspect: "16:9",
  durationSec: 45,
  feeling: "clear",
};

function sceneAccent(scene: MotionScene, project: MotionProject): string {
  return scene.accent || project.direction.colorPalette[2] || "#4F46E5";
}

function ScenePreview({
  project,
  scene,
  active,
}: {
  project: MotionProject;
  scene: MotionScene;
  active?: boolean;
}) {
  const style = visualStyle(project.styleId);
  const accent = sceneAccent(scene, project);
  return (
    <button
      type="button"
      className={cn(
        "group relative flex aspect-video w-full overflow-hidden rounded-lg border border-border bg-elevated text-left transition",
        active && "border-primary shadow-[0_0_0_1px_rgba(96,165,250,0.35)]"
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${project.direction.colorPalette[0]}, ${project.direction.colorPalette[1]} 46%, ${accent})`,
        }}
      />
      <div className="absolute left-[8%] top-[18%] h-[52%] w-[32%] rounded-lg bg-white/18 ring-1 ring-white/25 backdrop-blur-sm" />
      <div className="absolute right-[8%] top-[22%] h-[16%] w-[38%] rounded-full bg-white/75" />
      <div className="absolute right-[14%] top-[46%] h-[10%] w-[30%] rounded-full bg-white/35" />
      <div
        className="absolute bottom-[16%] right-[10%] h-[12%] w-[44%] rounded-full"
        style={{ background: accent }}
      />
      {style.family === "3d" && (
        <div className="absolute left-[18%] top-[28%] h-[28%] w-[28%] rounded-full bg-white/45 shadow-2xl" />
      )}
      {style.family === "typography" && (
        <div className="absolute left-[10%] top-[18%] text-3xl font-black text-white/85">Aa</div>
      )}
      <div className="absolute bottom-2 left-2 right-2 rounded-md bg-black/45 px-2 py-1 text-[11px] font-semibold text-white">
        {scene.role} / {scene.start}-{scene.end}s
      </div>
    </button>
  );
}

function MotionTemplateCard({
  template,
  active,
  onSelect,
}: {
  template: ProductionType;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative min-h-[330px] overflow-hidden rounded-2xl border bg-[#0b0f1c]/80 p-2 text-left shadow-card transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_24px_70px_rgba(124,58,237,0.22)]",
        active
          ? "border-primary/70 shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_24px_80px_rgba(124,58,237,0.2)]"
          : "border-white/10"
      )}
      style={{
        background: `linear-gradient(145deg, rgba(15,23,42,0.92), rgba(9,12,22,0.92)), radial-gradient(circle at 22% 10%, ${template.accent}33, transparent 34%)`,
      }}
      aria-pressed={active}
    >
      <div
        className="pointer-events-none absolute -inset-16 opacity-0 blur-3xl transition-opacity duration-200 group-hover:opacity-70"
        style={{
          background: `radial-gradient(circle at 50% 8%, ${template.accent}55, transparent 48%)`,
        }}
      />
      <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black/30">
        <div className="flex min-h-[230px] flex-[3] items-center justify-center overflow-hidden bg-black/35 p-2">
          <img
            src={template.imageUrl}
            alt={`${template.name} template artwork`}
            className="h-full max-h-[250px] w-full object-contain transition-transform duration-200 ease-out group-hover:scale-[1.025]"
            draggable={false}
          />
        </div>
        <div className="relative flex flex-1 flex-col gap-2 border-t border-white/10 bg-slate-950/78 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
              {template.eyebrow}
            </span>
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full shadow-[0_0_18px_currentColor]",
                active ? "opacity-100" : "opacity-60"
              )}
              style={{ color: template.accent, background: template.accent }}
            />
          </div>
          <div>
            <h3 className="text-lg font-bold leading-tight text-foreground">{template.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{template.description}</p>
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 text-[11px] text-muted">
            <span>{template.defaultDuration}s</span>
            <span>{template.sceneRoles.length} scenes</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function MotionStudio() {
  const {
    studioMode,
    setStudioMode,
    openAssets,
    openTemplates,
    openSettings,
    openDashboard,
    openCharacters,
    openWorld,
    openProps,
    openBrandKits,
  } = useAppStore();
  const [routerConfig] = useState(() => loadRouterConfig());
  const [draft, setDraft] = useState<MotionProjectDraft>(emptyDraft);
  const [projects, setProjects] = useState<MotionProject[]>(() => listMotionProjects());
  const [activeProjectId, setActiveProjectId] = useState<string>(
    () => listMotionProjects()[0]?.id ?? ""
  );
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const platformProjects = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;
  const selectedScene =
    activeProject?.scenes.find((scene) => scene.id === selectedSceneId) ??
    activeProject?.scenes[0] ??
    null;
  const routerMode =
    ROUTER_MODES.find((mode) => mode.id === routerConfig.mode)?.label ?? "Balanced";
  const styleSystemCount = STYLE_PRESETS.length;
  const averageScore = activeProject?.scenes.length
    ? Math.round(
        activeProject.scenes.reduce((sum, scene) => sum + (scene.score ?? 80), 0) /
          activeProject.scenes.length
      )
    : 0;

  useEffect(() => {
    if (activeProject && !selectedSceneId) {
      setSelectedSceneId(activeProject.scenes[0]?.id ?? "");
    }
  }, [activeProject, selectedSceneId]);

  const updateDraft = <K extends keyof MotionProjectDraft>(
    key: K,
    value: MotionProjectDraft[K]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const refreshProjects = (nextActiveId?: string) => {
    const next = listMotionProjects();
    setProjects(next);
    if (nextActiveId) setActiveProjectId(nextActiveId);
  };

  const handleCreateProject = () => {
    const type = productionType(draft.typeId);
    const project = createMotionProject({
      ...draft,
      durationSec: draft.durationSec || type.defaultDuration,
      brief: [draft.businessInput, draft.marketingBrief, draft.script, draft.brief]
        .filter(Boolean)
        .join("\n\n"),
    });
    refreshProjects(project.id);
    setSelectedSceneId(project.scenes[0]?.id ?? "");
  };

  const regenerateStoryboard = () => {
    if (!activeProject) return;
    const nextDraft: MotionProjectDraft = {
      name: activeProject.name,
      typeId: activeProject.typeId,
      styleId: activeProject.styleId,
      businessInput: activeProject.businessInput,
      marketingBrief: activeProject.marketingBrief,
      script: activeProject.script,
      brief: activeProject.brief,
      aspect: activeProject.aspect,
      durationSec: activeProject.durationSec,
      feeling: activeProject.feeling,
    };
    const direction = establishDirection(nextDraft);
    const scenes = directStoryboard(nextDraft, direction);
    snapshotMotionProject(activeProject.id, "before storyboard regeneration");
    saveMotionProject({ ...activeProject, direction, scenes, status: "storyboard" });
    addMotionLoopEvent(activeProject.id, {
      stage: "generate",
      target: "storyboard",
      summary: "Regenerated storyboard from the current brief, script, style, and project type.",
      score: Math.round(
        scenes.reduce((sum, scene) => sum + (scene.score ?? 80), 0) / scenes.length
      ),
    });
    refreshProjects(activeProject.id);
    setSelectedSceneId(scenes[0]?.id ?? "");
  };

  const improveSelectedScene = () => {
    if (!activeProject || !selectedScene) return;
    const scenes = activeProject.scenes.map((scene) =>
      scene.id === selectedScene.id ? improveScene(scene) : scene
    );
    snapshotMotionProject(activeProject.id, `before improve ${selectedScene.role}`);
    updateMotionScenes(activeProject.id, scenes);
    addMotionLoopEvent(activeProject.id, {
      stage: "improve",
      target: "scene-plan",
      summary: `Improved ${selectedScene.role}: stronger silhouette, cleaner motion, and higher readability score.`,
      score: scenes.find((scene) => scene.id === selectedScene.id)?.score,
    });
    refreshProjects(activeProject.id);
  };

  const approveSelectedScene = () => {
    if (!activeProject || !selectedScene) return;
    const scenes = activeProject.scenes.map((scene) =>
      scene.id === selectedScene.id
        ? { ...scene, approved: true, score: Math.max(scene.score ?? 82, 90) }
        : scene
    );
    const approvedCount = scenes.filter((scene) => scene.approved).length;
    saveMotionProject({
      ...activeProject,
      scenes,
      status: approvedCount === scenes.length ? "approved" : activeProject.status,
    });
    addMotionLoopEvent(activeProject.id, {
      stage: "approve",
      target: "scene-plan",
      summary: `Approved ${selectedScene.role} for the Motion Studio storyboard.`,
      score: scenes.find((scene) => scene.id === selectedScene.id)?.score,
    });
    refreshProjects(activeProject.id);
  };

  const saveVersion = () => {
    if (!activeProject) return;
    snapshotMotionProject(activeProject.id, "manual Motion Studio version");
    addMotionLoopEvent(activeProject.id, {
      stage: "save-version",
      target: "storyboard",
      summary: "Saved a Motion Studio project version for rollback and comparison.",
      score: averageScore,
    });
    refreshProjects(activeProject.id);
  };

  const updateActiveProject = (patch: Partial<MotionProject>) => {
    if (!activeProject) return;
    saveMotionProject({ ...activeProject, ...patch });
    refreshProjects(activeProject.id);
  };

  const timeline = useMemo(() => activeProject?.scenes ?? [], [activeProject]);
  const selectedTemplate = productionType(draft.typeId);

  return (
    <div className="relative flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-96 rounded-full bg-[radial-gradient(circle_at_35%_0%,rgba(124,58,237,0.18),transparent_42%),radial-gradient(circle_at_75%_8%,rgba(14,165,233,0.13),transparent_38%)] blur-2xl" />
      <section className="module-hero relative flex flex-wrap items-start justify-between gap-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(124,58,237,0.16),transparent_38%),radial-gradient(circle_at_82%_16%,rgba(6,182,212,0.16),transparent_30%)]" />
        <div className="relative max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="accent">Director Studio module</Badge>
            <Badge variant="primary">Motion Studio</Badge>
            <Badge>
              {STUDIO_MODES.find((mode) => mode.id === studioMode)?.label ?? "Director Mode"}
            </Badge>
          </div>
          <h1 className="text-4xl font-black tracking-[-0.04em] text-foreground md:text-5xl">
            Motion Studio
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Design animation systems, storyboards, product films, and social motion with a more
            visual template-first workspace.
          </p>
        </div>
        <div className="relative flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openTemplates}>
            <Palette /> Shared templates
          </Button>
          <Button variant="secondary" onClick={openAssets}>
            <Image /> Asset library
          </Button>
          <Button variant="secondary" onClick={openSettings}>
            <Settings2 /> Settings
          </Button>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="mr-2">
          <p className="text-xs font-semibold">Director Engine resources</p>
          <p className="text-[10px] text-muted">Shared across every studio</p>
        </div>
        <Button size="sm" variant="ghost" onClick={openCharacters}>
          <Users /> Characters
        </Button>
        <Button size="sm" variant="ghost" onClick={openWorld}>
          <Map /> Locations
        </Button>
        <Button size="sm" variant="ghost" onClick={openProps}>
          <Package /> Props
        </Button>
        <Button size="sm" variant="ghost" onClick={openAssets}>
          <Image /> Assets
        </Button>
        <Button size="sm" variant="ghost" onClick={openBrandKits}>
          <Palette /> Brand DNA
        </Button>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="size-4 text-primary" /> Provider Router
            </CardTitle>
            <CardDescription>{routerMode} routing from Director Studio settings.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-4 text-accent" /> Creative DNA
            </CardTitle>
            <CardDescription>{styleSystemCount} shared style presets available.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4 text-success" /> Project Memory
            </CardTitle>
            <CardDescription>
              {platformProjects.data?.length ?? 0} platform projects, {projects.length} motion
              projects.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-warning" /> Studio Mode
            </CardTitle>
            <CardDescription>Controls are progressively revealed per global mode.</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <Card className="relative overflow-hidden border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(14,165,233,0.12),transparent_32%)]" />
        <CardHeader className="relative">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <CardTitle className="text-2xl tracking-[-0.03em]">
                Choose a motion template
              </CardTitle>
              <CardDescription>
                Big visual cards replace the old text list. Artwork is shown uncropped so embedded
                typography and composition stay intact.
              </CardDescription>
            </div>
            <Badge variant="accent">{selectedTemplate.name}</Badge>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {PRODUCTION_TYPES.map((type) => (
              <MotionTemplateCard
                key={type.id}
                template={type}
                active={draft.typeId === type.id}
                onSelect={() =>
                  setDraft((current) => ({
                    ...current,
                    typeId: type.id,
                    durationSec: type.defaultDuration,
                  }))
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FilePlus2 className="size-4 text-primary" /> New Motion Project
              </CardTitle>
              <CardDescription>
                Select a project type, style, and brief to generate a real storyboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={draft.name}
                onChange={(event) => updateDraft("name", event.target.value)}
                placeholder="Project name"
              />
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                  Selected template
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{selectedTemplate.name}</div>
                    <div className="mt-1 text-xs leading-5 text-muted">
                      {selectedTemplate.description}
                    </div>
                  </div>
                  <Badge>{selectedTemplate.defaultDuration}s</Badge>
                </div>
              </div>
              <Textarea
                value={draft.businessInput}
                onChange={(event) => updateDraft("businessInput", event.target.value)}
                placeholder="Business or product input"
                rows={3}
              />
              <Textarea
                value={draft.marketingBrief}
                onChange={(event) => updateDraft("marketingBrief", event.target.value)}
                placeholder="Marketing brief, audience, offer, proof, CTA"
                rows={4}
              />
              <Textarea
                value={draft.script}
                onChange={(event) => updateDraft("script", event.target.value)}
                placeholder="Script or voiceover draft"
                rows={4}
              />
              <div className="grid grid-cols-3 gap-2">
                {(["16:9", "9:16", "1:1"] as const).map((aspect) => (
                  <Button
                    key={aspect}
                    variant={draft.aspect === aspect ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => updateDraft("aspect", aspect)}
                  >
                    {aspect}
                  </Button>
                ))}
              </div>
              <Button variant="gold" className="w-full" onClick={handleCreateProject}>
                <Sparkles /> Generate storyboard
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visual Style</CardTitle>
              <CardDescription>
                Styles are Motion Studio specific, while Creative DNA stays shared.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              {VISUAL_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateDraft("styleId", style.id)}
                  className={cn(
                    "rounded-lg border border-border bg-elevated p-3 text-left transition hover:border-primary/50",
                    draft.styleId === style.id && "border-accent bg-accent/10"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{style.name}</span>
                    <Badge>{style.family}</Badge>
                  </div>
                  <div className="mb-2 flex gap-1">
                    {style.palette.slice(0, 5).map((color) => (
                      <span
                        key={color}
                        className="h-4 flex-1 rounded-sm border border-white/10"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <div className="text-xs leading-5 text-muted">{style.description}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {!activeProject ? (
            <CreativeEmptyState
              icon={<Clapperboard />}
              title="Direct motion before the first keyframe"
              description="Choose a format and visual language; Motion Studio will assemble a timed storyboard, camera plan, audio direction, and production prompts."
              ideas={["SaaS explainer", "Product reveal", "UI motion", "Social spot"]}
              action="Create storyboard"
              onAction={handleCreateProject}
            />
          ) : (
            <>
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Film className="size-4 text-primary" /> {activeProject.name}
                    </CardTitle>
                    <CardDescription>
                      {productionType(activeProject.typeId).name} /{" "}
                      {visualStyle(activeProject.styleId).name} / {activeProject.aspect} /{" "}
                      {activeProject.durationSec}s
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={regenerateStoryboard}>
                      <RefreshCw /> Regenerate
                    </Button>
                    <Button variant="secondary" size="sm" onClick={saveVersion}>
                      <Save /> Save version
                    </Button>
                    <Button variant="secondary" size="sm" onClick={openDashboard}>
                      <Boxes /> Projects
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-elevated p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold">Creative Direction</div>
                          <Badge variant="accent">Score {averageScore}</Badge>
                        </div>
                        <p className="text-sm leading-6 text-muted">
                          {directionSummary(activeProject.direction)}
                        </p>
                      </div>

                      {studioMode !== "director" && (
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <Textarea
                            value={activeProject.marketingBrief}
                            onChange={(event) =>
                              updateActiveProject({ marketingBrief: event.target.value })
                            }
                            placeholder="Marketing brief"
                            rows={5}
                          />
                          <Textarea
                            value={activeProject.script}
                            onChange={(event) =>
                              updateActiveProject({ script: event.target.value })
                            }
                            placeholder="Script"
                            rows={5}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                        {activeProject.scenes.map((scene) => (
                          <div
                            key={scene.id}
                            onClick={() => setSelectedSceneId(scene.id)}
                            className="cursor-pointer"
                          >
                            <ScenePreview
                              project={activeProject}
                              scene={scene}
                              active={scene.id === selectedScene?.id}
                            />
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold">{scene.role}</span>
                              <span className="text-muted">{scene.score ?? 80}/100</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-lg border border-border bg-elevated p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                          <Play className="size-4 text-primary" /> Timeline / Export
                        </div>
                        <div className="flex h-12 overflow-hidden rounded-md border border-border">
                          {timeline.map((scene) => (
                            <button
                              key={scene.id}
                              type="button"
                              onClick={() => setSelectedSceneId(scene.id)}
                              className={cn(
                                "min-w-16 border-r border-black/10 px-2 text-left text-[10px] font-semibold text-white",
                                scene.approved && "ring-2 ring-success"
                              )}
                              style={{
                                width: `${Math.max(12, ((scene.end - scene.start) / activeProject.durationSec) * 100)}%`,
                                background: sceneAccent(scene, activeProject),
                              }}
                            >
                              {scene.role}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge>{activeProject.status}</Badge>
                          <Badge variant="success">
                            {activeProject.scenes.filter((scene) => scene.approved).length} approved
                          </Badge>
                          <Button variant="secondary" size="sm">
                            <Download /> Export placeholder
                          </Button>
                        </div>
                      </div>
                    </div>

                    {selectedScene && (
                      <aside className="space-y-4">
                        <Card className="border-border bg-elevated">
                          <CardHeader>
                            <CardTitle>{selectedScene.role}</CardTitle>
                            <CardDescription>
                              {selectedScene.start}-{selectedScene.end}s / energy{" "}
                              {selectedScene.energy}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div>
                              <div className="text-xs font-semibold uppercase text-muted">
                                Headline
                              </div>
                              <p className="mt-1 leading-6">{selectedScene.headline}</p>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase text-muted">
                                Motion
                              </div>
                              <p className="mt-1 leading-6 text-muted">{selectedScene.motion}</p>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase text-muted">
                                Critique
                              </div>
                              <p className="mt-1 leading-6 text-muted">
                                {critiqueScene(selectedScene)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="secondary" size="sm" onClick={improveSelectedScene}>
                                <Wand2 /> Improve
                              </Button>
                              <Button variant="success" size="sm" onClick={approveSelectedScene}>
                                <CheckCircle2 /> Approve
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {studioMode !== "director" && (
                          <Card className="border-border bg-elevated">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <AudioLines className="size-4 text-accent" /> Voice / Audio Plan
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-muted">
                              <p>{selectedScene.voiceover}</p>
                              <p>{selectedScene.audioCue}</p>
                            </CardContent>
                          </Card>
                        )}

                        {studioMode === "creator" && (
                          <Card className="border-border bg-elevated">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Settings2 className="size-4 text-warning" /> Creator Controls
                              </CardTitle>
                              <CardDescription>
                                Uses shared provider router preferences, without Motion Studio
                                hardcoding providers.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="rounded-md border border-border bg-surface p-3 text-xs leading-5 text-muted">
                                Router mode: {routerMode}. Configure image, video, text, and audio
                                preferences in Director Studio settings.
                              </div>
                              <Textarea
                                value={selectedScene.promptOverride ?? ""}
                                onChange={(event) => {
                                  const scenes = activeProject.scenes.map((scene) =>
                                    scene.id === selectedScene.id
                                      ? { ...scene, promptOverride: event.target.value }
                                      : scene
                                  );
                                  updateMotionScenes(activeProject.id, scenes);
                                  refreshProjects(activeProject.id);
                                }}
                                placeholder="Optional prompt override for this scene"
                                rows={5}
                              />
                            </CardContent>
                          </Card>
                        )}
                      </aside>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers3 className="size-4 text-primary" /> Loop Engine
                  </CardTitle>
                  <CardDescription>
                    Generate, critique, score, improve, save version, and approve across Motion
                    Studio stages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
                  {["Generate", "Critique", "Score", "Improve", "Save Version", "Approve"].map(
                    (stage, index) => (
                      <div key={stage} className="rounded-lg border border-border bg-elevated p-3">
                        <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="text-sm font-semibold">{stage}</div>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          {activeProject.loopLog[index]?.summary ??
                            "Ready for the next Motion Studio pass."}
                        </p>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-4">
        <span className="text-xs font-semibold uppercase text-muted">Mode depth</span>
        {STUDIO_MODES.map((mode) => (
          <Button
            key={mode.id}
            variant={studioMode === mode.id ? "primary" : "secondary"}
            size="sm"
            onClick={() => setStudioMode(mode.id)}
          >
            {mode.label}
          </Button>
        ))}
      </section>
    </div>
  );
}
