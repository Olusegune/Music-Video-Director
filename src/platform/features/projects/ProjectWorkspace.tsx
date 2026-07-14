import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PanelRightOpen,
  Sparkles,
  Camera,
  Lightbulb,
  LayoutGrid,
  Wand2,
  FileDown,
  Check,
  Loader2,
  Music,
  Clapperboard,
  Stethoscope,
  Scissors,
  Type,
  MonitorPlay,
  Upload,
  FileText,
  X,
  Images,
  Megaphone,
  Dna,
} from "lucide-react";
import { api, isTauri } from "@/platform/lib/ipc";
import { useAppStore, type WorkspaceMode } from "@/platform/store/useAppStore";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import { Textarea } from "@/platform/components/ui/textarea";
import { Badge } from "@/platform/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";
import {
  STYLE_GROUPS,
  presetsByGroup,
  EMPTY_STYLE,
  styleFragmentFor,
  loadProjectStyle,
  saveProjectStyle,
  type ProjectStyle,
} from "@/platform/lib/styles";
import { loadRouterConfig } from "@/platform/lib/providers";
import {
  makeItCinematic,
  shotDoctor,
  promptSurgeon,
  fixBadAIText,
  splashScreenMode,
  directorMode,
} from "@/platform/lib/promptTools";
import { extractTextFromFile, ACCEPT_ATTR } from "@/platform/lib/docParse";
import {
  loadStyleDnas,
  captureStyleDna,
  applyStyleDna,
  type StyleDna,
} from "@/platform/lib/styleDna";
import { usePromptPack } from "./usePromptPack";
import { CreativeDirectionPanel } from "./CreativeDirectionPanel";
import { StoryboardEditor } from "./StoryboardEditor";
import { CameraDirector } from "./CameraDirector";
import { LightingDirector } from "./LightingDirector";
import { AudioDirector } from "./AudioDirector";
import { PromptBuilder } from "./PromptBuilder";
import { MoodboardPanel } from "./MoodboardPanel";
import { ExportCenter } from "./ExportCenter";
import { UniversalGenerationPanel } from "@/platform/components/generation/UniversalGenerationPanel";
import type { GenerationState } from "@/platform/components/generation/types";
import { routeProvider } from "@/platform/lib/providers";
import type { ProviderId } from "@/platform/lib/types";
import { useAutoSave } from "@/platform/hooks/useAutoSave";
import { openProject, type DirectorProject } from "@/platform/lib/projectPersistence";

const MODES: { id: WorkspaceMode; label: string; icon: React.ReactNode }[] = [
  { id: "storyboard", label: "Storyboard", icon: <LayoutGrid className="h-4 w-4" /> },
  { id: "camera", label: "Camera", icon: <Camera className="h-4 w-4" /> },
  { id: "lighting", label: "Lighting", icon: <Lightbulb className="h-4 w-4" /> },
  { id: "audio", label: "Audio", icon: <Music className="h-4 w-4" /> },
  { id: "moodboard", label: "Moodboard", icon: <Images className="h-4 w-4" /> },
  { id: "prompt", label: "Prompts", icon: <Wand2 className="h-4 w-4" /> },
  { id: "exports", label: "Exports", icon: <FileDown className="h-4 w-4" /> },
];

// Storyboard templates → engine params (panel count or duration override).
const STORYBOARD_TEMPLATES: {
  id: string;
  label: string;
  panels?: number;
  durationSeconds?: number;
}[] = [
  { id: "", label: "Auto (from duration)" },
  { id: "3", label: "3 panels", panels: 3 },
  { id: "6", label: "6 panels", panels: 6 },
  { id: "9", label: "9 panels", panels: 9 },
  { id: "15s", label: "15-second", durationSeconds: 15 },
  { id: "30s", label: "30-second", durationSeconds: 30 },
  { id: "custom", label: "Custom…" },
];

export function ProjectWorkspace() {
  const queryClient = useQueryClient();
  const { activeProjectId, workspaceMode, setWorkspaceMode, toggleInspector } = useAppStore();
  const [brief, setBrief] = useState("");
  const [selectedProviderPref, setSelectedProviderPref] = useState<ProviderId | undefined>();
  const [generationState, setGenerationState] = useState<GenerationState>({
    mode: "auto",
    prompt: "",
    status: "idle",
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });
  const project = projects.find((p) => p.id === activeProjectId);

  const { pack, replace, update } = usePromptPack(activeProjectId ?? "");

  // Load current project from persistence
  const [persistedProject, setPersistedProject] = useState<DirectorProject | null>(null);
  useEffect(() => {
    if (activeProjectId) {
      openProject(activeProjectId).then((proj) => {
        if (proj) {
          setPersistedProject(proj);
          // Update the brief from persisted data
          setBrief(proj.brief);
        }
      });
    }
  }, [activeProjectId]);

  // Auto-save to persistence every 10 seconds
  const directorProject: DirectorProject | null = persistedProject && pack ? {
    ...persistedProject,
    brief,
    pack,
    updatedAt: new Date().toISOString(),
  } : null;

  const { lastSaved, isSaving } = useAutoSave({
    project: directorProject,
    enabled: !!directorProject,
  });

  // Brand kit applied to generation, remembered per project.
  const { data: brandKits = [] } = useQuery({
    queryKey: ["brandkits"],
    queryFn: api.listBrandKits,
  });
  const [brandKitId, setBrandKitId] = useState("");
  const [style, setStyle] = useState<ProjectStyle>(EMPTY_STYLE);
  const [template, setTemplate] = useState("");
  const [customPanels, setCustomPanels] = useState(6);
  const [magicMsg, setMagicMsg] = useState("");

  // Document upload → text extraction into the brief.
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadName, setUploadName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseNote, setParseNote] = useState("");
  const [dragging, setDragging] = useState(false);

  async function ingestFile(file: File) {
    setParsing(true);
    setParseNote("");
    setUploadName(file.name);
    try {
      const { text, warning } = await extractTextFromFile(file);
      if (!text.trim()) {
        setParseNote("No readable text found in that file.");
      } else {
        setBrief((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
        if (warning) setParseNote(warning);
      }
    } catch (e) {
      setParseNote((e as Error).message);
      setUploadName("");
    } finally {
      setParsing(false);
    }
  }

  function templateParams(): { panels?: number; durationSeconds?: number } {
    if (template === "custom") return { panels: customPanels };
    const t = STORYBOARD_TEMPLATES.find((x) => x.id === template);
    return { panels: t?.panels, durationSeconds: t?.durationSeconds };
  }

  function runMagic(fn: typeof makeItCinematic) {
    if (!pack) return;
    const res = fn(pack);
    replace(res.pack);
    setMagicMsg(res.summary);
  }

  // Style DNA — capture/apply reusable style profiles.
  const [dnas, setDnas] = useState<StyleDna[]>([]);
  useEffect(() => setDnas(loadStyleDnas()), [activeProjectId]);

  function saveDna() {
    if (!pack) return;
    const name = window.prompt("Name this Style DNA profile:", project?.name ?? "");
    if (!name) return;
    captureStyleDna(name, pack);
    setDnas(loadStyleDnas());
    setMagicMsg(`Saved Style DNA "${name}".`);
  }

  function applyDna(id: string) {
    if (!pack || !id) return;
    const dna = dnas.find((d) => d.id === id);
    if (!dna) return;
    replace(applyStyleDna(pack, dna));
    setMagicMsg(`Applied Style DNA "${dna.name}".`);
  }
  useEffect(() => {
    setBrandKitId(localStorage.getItem(`mf.project.brandkit.${activeProjectId}`) ?? "");
    setStyle(loadProjectStyle(activeProjectId ?? ""));
  }, [activeProjectId]);
  function chooseBrandKit(id: string) {
    setBrandKitId(id);
    localStorage.setItem(`mf.project.brandkit.${activeProjectId}`, id);
  }
  function updateStyle(next: ProjectStyle) {
    setStyle(next);
    saveProjectStyle(activeProjectId ?? "", next);
  }
  const styleFragment = styleFragmentFor(style);

  const generate = useMutation({
    mutationFn: () => {
      const kit = brandKits.find((k) => k.id === brandKitId);
      const brandPreamble = kit
        ? `Apply this brand consistently — Brand "${kit.name}". Colors: ${kit.colors.join(
            ", "
          )}. Typography: ${kit.fonts}. Voice: ${kit.voice}. Visual rules: ${kit.visualRules}.\n`
        : "";
      const stylePreamble = styleFragment
        ? `Render every shot in this visual style: ${styleFragment}.\n`
        : "";
      return api.generatePromptPack(
        activeProjectId!,
        stylePreamble + brandPreamble + (stylePreamble || brandPreamble ? "\n" : "") + brief,
        { brief, project, styleId: style.preset, ...templateParams() }
      );
    },
    onSuccess: (next) => {
      replace(next);
      queryClient.invalidateQueries({ queryKey: ["pack", activeProjectId] });
    },
  });

  async function generateProjectShots() {
    if (!pack || !activeProjectId) return;
    setGenerationState((s) => ({ ...s, status: "validating" }));
    try {
      const routerConfig = loadRouterConfig();
      const statuses = await api.getProviderKeyStatuses();
      const configured = new Set(
        statuses.filter((status) => status.configured).map((status) => status.provider as ProviderId)
      );
      const provider = routeProvider("image", routerConfig, configured);
      if (!provider) throw new Error("No image provider configured");

      setGenerationState((s) => ({ ...s, status: "queued" }));

      // Generate image for each unlocked shot
      let updated = 0;
      const newShots = await Promise.all(
        pack.shots.map(async (shot) => {
          if (shot.locked) return shot;
          try {
            const prompt = generationState.prompt || `Director shot: ${shot.name}`;
            const imageUrl = await api.generateImageFromSpec({
              capability: "image",
              prompt,
              negativePrompt: generationState.negativePrompt,
              batch: generationState.batch || 1,
              aspect: generationState.aspectRatio,
              resolution: generationState.resolution,
              seed: generationState.seed,
              references: [],
              providerPref: provider,
              modelHint: generationState.selectedModel,
              moduleId: "director",
              projectRef: { moduleId: "director", projectId: activeProjectId },
            });
            updated++;
            return { ...shot, imageUrl };
          } catch {
            return shot;
          }
        })
      );

      if (updated > 0) {
        update((p) => ({ ...p, shots: newShots }));
        setGenerationState((s) => ({ ...s, status: "completed" }));
      } else {
        setGenerationState((s) => ({ ...s, status: "idle" }));
      }
    } catch (e) {
      setGenerationState((s) => ({
        ...s,
        status: "failed",
        error: (e as Error).message,
      }));
    }
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Select a project.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Project header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{project.name}</h1>
            <Badge variant="primary">{project.type}</Badge>
            {isSaving ? (
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </span>
            ) : lastSaved ? (
              <span className="flex items-center gap-1 text-[11px] text-success">
                <Check className="h-3 w-3" /> Saved
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {project.aspectRatio} · {project.duration} · {project.status}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!generate.isPending && brief.trim().length === 0 ? (
            <span className="text-[11px] text-muted">Add a brief below to enable this</span>
          ) : null}
          <Button
            variant="primary"
            onClick={() => generate.mutate()}
            disabled={generate.isPending || brief.trim().length === 0}
            title={brief.trim().length === 0 ? "Add a brief below before generating" : undefined}
          >
            {generate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generate.isPending ? "Generating…" : pack ? "Regenerate" : "Generate Pack"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleInspector}
            title="Toggle inspector"
            aria-label="Toggle inspector"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Mode tabs */}
      <div className="flex items-center gap-1 border-b border-border px-4 py-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setWorkspaceMode(m.id)}
            className={cn(
              "flex items-center gap-2 rounded-[var(--radius-button)] px-3 py-1.5 text-sm font-medium transition-colors",
              workspaceMode === m.id
                ? "bg-primary/12 text-primary"
                : "text-muted hover:bg-elevated/60 hover:text-foreground"
            )}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Workspace body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Brief / generate prompt */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Concept Brief
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) ingestFile(f);
              }}
              className={cn(
                "relative rounded-[var(--radius-card)] transition-colors",
                dragging && "ring-2 ring-primary"
              )}
            >
              <Textarea
                placeholder="Paste an idea, script, product description, dataset, or topic — or drop a TXT/PDF/DOC/DOCX file here…"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="min-h-24"
              />
              {dragging && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[var(--radius-card)] bg-primary/10 text-sm font-medium text-primary">
                  Drop document to extract its text
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) ingestFile(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={parsing}
              >
                {parsing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {parsing ? "Reading…" : "Upload script"}
              </Button>
              <span className="text-[11px] text-muted">TXT · PDF · DOC · DOCX</span>
              {uploadName && !parsing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[11px] text-foreground">
                  <FileText className="h-3 w-3 text-primary" />
                  {uploadName}
                  <button
                    aria-label="Clear uploaded file"
                    onClick={() => {
                      setUploadName("");
                      setParseNote("");
                    }}
                    className="ml-0.5 text-muted hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {parseNote && <span className="text-[11px] text-warning">{parseNote}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="style" className="text-xs text-muted">
                  Style:
                </label>
                <select
                  id="style"
                  value={style.preset}
                  onChange={(e) => updateStyle({ ...style, preset: e.target.value })}
                  className="h-8 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs focus-visible:border-primary focus-visible:outline-none"
                >
                  <option value="">None</option>
                  {STYLE_GROUPS.map((g) => (
                    <optgroup key={g.group} label={g.label}>
                      {presetsByGroup(g.group).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="custom">Custom…</option>
                </select>
                {style.preset === "custom" && (
                  <input
                    aria-label="Custom style description"
                    value={style.custom}
                    onChange={(e) => updateStyle({ ...style, custom: e.target.value })}
                    placeholder="Describe your style…"
                    className="h-8 w-56 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs focus-visible:border-primary focus-visible:outline-none"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="brandkit" className="text-xs text-muted">
                  Brand Kit:
                </label>
                <select
                  id="brandkit"
                  value={brandKitId}
                  onChange={(e) => chooseBrandKit(e.target.value)}
                  className="h-8 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs focus-visible:border-primary focus-visible:outline-none"
                >
                  <option value="">None</option>
                  {brandKits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="template" className="text-xs text-muted">
                  Storyboard:
                </label>
                <select
                  id="template"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="h-8 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs focus-visible:border-primary focus-visible:outline-none"
                >
                  {STORYBOARD_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {template === "custom" && (
                  <input
                    aria-label="Custom panel count"
                    type="number"
                    min={1}
                    max={12}
                    value={customPanels}
                    onChange={(e) =>
                      setCustomPanels(Math.max(1, Math.min(12, Number(e.target.value) || 1)))
                    }
                    className="h-8 w-16 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs focus-visible:border-primary focus-visible:outline-none"
                  />
                )}
              </div>
            </div>
            <p className="text-xs text-muted">
              Generates Creative Direction, Style, a timed Shot Breakdown, camera + lighting, text
              locks, and prompts.{" "}
              {loadRouterConfig().mode === "local" || !isTauri
                ? "Running the local engine — no API key needed."
                : "Using your configured provider (router: Auto)."}{" "}
              Everything below is editable and autosaves.
            </p>
            {generate.isError && (
              <p className="text-xs text-danger">{(generate.error as Error).message}</p>
            )}
          </CardContent>
        </Card>

        {!pack && workspaceMode !== "exports" && <EmptyState />}

        {pack && workspaceMode === "storyboard" && (
          <div className="flex flex-col gap-6">
            {/* Shot Generation Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" /> Generate Shot Directions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UniversalGenerationPanel
                  title="Shot Composition"
                  prompt={generationState.prompt || "Generate cinematic shot composition for storyboard"}
                  selectedProvider={selectedProviderPref}
                  onProviderChange={setSelectedProviderPref}
                  generationState={generationState}
                  onGenerationStateChange={(updates) =>
                    setGenerationState((prev) => ({ ...prev, ...updates }))
                  }
                  onGenerate={generateProjectShots}
                  capabilities={{
                    supportsNegativePrompt: true,
                    supportsSeed: true,
                    supportsAspectRatio: true,
                    supportsQuality: true,
                  }}
                  showAdvanced={workspaceMode === "storyboard"}
                />
              </CardContent>
            </Card>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-muted">
                Creative assist:
              </span>
              <Button variant="secondary" size="sm" onClick={() => runMagic(makeItCinematic)}>
                <Clapperboard className="h-4 w-4" /> Make it Cinematic
              </Button>
              <Button variant="secondary" size="sm" onClick={() => runMagic(shotDoctor)}>
                <Stethoscope className="h-4 w-4" /> Shot Doctor
              </Button>
              <Button variant="secondary" size="sm" onClick={() => runMagic(promptSurgeon)}>
                <Scissors className="h-4 w-4" /> Prompt Surgeon
              </Button>
              <Button variant="secondary" size="sm" onClick={() => runMagic(fixBadAIText)}>
                <Type className="h-4 w-4" /> Fix Bad AI Text
              </Button>
              <Button variant="secondary" size="sm" onClick={() => runMagic(splashScreenMode)}>
                <MonitorPlay className="h-4 w-4" /> Splash Screen
              </Button>
              <Button variant="primary" size="sm" onClick={() => runMagic(directorMode)}>
                <Megaphone className="h-4 w-4" /> Full directing pass
              </Button>
              <span className="mx-1 h-5 w-px bg-border" />
              <Button variant="secondary" size="sm" onClick={saveDna}>
                <Dna className="h-4 w-4" /> Save Style DNA
              </Button>
              {dnas.length > 0 && (
                <select
                  aria-label="Apply Style DNA"
                  defaultValue=""
                  onChange={(e) => {
                    applyDna(e.target.value);
                    e.target.value = "";
                  }}
                  className="h-8 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs focus-visible:border-primary focus-visible:outline-none"
                >
                  <option value="">Apply Style DNA…</option>
                  {dnas.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
              {magicMsg && <span className="text-xs text-success">{magicMsg}</span>}
            </div>
            <CreativeDirectionPanel pack={pack} update={update} />
            <StoryboardEditor
              pack={pack}
              update={update}
              projectId={activeProjectId!}
              styleFragment={styleFragment}
            />
          </div>
        )}
        {pack && workspaceMode === "camera" && <CameraDirector pack={pack} update={update} />}
        {pack && workspaceMode === "lighting" && <LightingDirector pack={pack} update={update} />}
        {pack && workspaceMode === "audio" && (
          <AudioDirector pack={pack} update={update} projectId={activeProjectId!} />
        )}
        {pack && workspaceMode === "moodboard" && <MoodboardPanel pack={pack} />}
        {pack && workspaceMode === "prompt" && <PromptBuilder pack={pack} update={update} />}
        {workspaceMode === "exports" && (
          <ExportCenter projectId={activeProjectId!} hasPack={!!pack} />
        )}
      </div>
    </div>
  );
}


function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border py-16 text-center">
      <Sparkles className="mb-2 h-7 w-7 text-muted" />
      <p className="text-sm text-muted">
        Write a brief above and hit <span className="text-foreground">Generate Pack</span> to
        populate the storyboard.
      </p>
    </div>
  );
}
