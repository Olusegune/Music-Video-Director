import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Clapperboard,
  Trash2,
  Music,
  LayoutTemplate,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Boxes,
  Globe,
  Megaphone,
  WandSparkles,
  Upload,
} from "lucide-react";
import { api } from "@/platform/lib/ipc";
import type { NewProject, ProjectType } from "@/platform/lib/types";
import { loadSongs, formatTime } from "@/apps/music-video/lib/songBrain";
import { useAppStore } from "@/platform/store/useAppStore";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { Label } from "@/platform/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";
import { ProjectCard } from "@/platform/components/visual";
import { ProjectActionsMenu } from "@/platform/components/visual/ProjectActionsMenu";
import type { VisualModule } from "@/platform/components/visual/visualTheme";
import { recentProjects, type HubModuleId, type HubProject } from "@/platform/lib/projectHub";
import { umbrellaFor } from "@/platform/lib/directorProject";
import { importBundle, parseBundle } from "@/platform/lib/projectBundle";
import { notifyStorage } from "@/platform/lib/storage";
import { isModuleEnabled } from "@/platform/lib/productConfig";
import splashArt from "@/assets/director-studio-splash-afrofuturist-v1.jpg";

const PROJECT_TYPES: ProjectType[] = [
  "SaaS Product",
  "Social Ad",
  "AI Tool",
  "Documentary",
  "Explainer",
  "Education",
  "Product Launch",
  "Finance",
  "Historical",
  "Custom",
];

export function Dashboard() {
  const queryClient = useQueryClient();
  const openProject = useAppStore((s) => s.openProject);
  const openSong = useAppStore((s) => s.openSong);
  const openTemplates = useAppStore((s) => s.openTemplates);
  const setActiveSong = useAppStore((s) => s.setActiveSong);
  const setActiveTemplate = useAppStore((s) => s.setActiveTemplate);
  const setWizardOpen = useAppStore((s) => s.setWizardOpen);
  const openDemoProject = useAppStore((s) => s.openDemoProject);
  const openMotionStudio = useAppStore((s) => s.openMotionStudio);
  const openGlamStudio = useAppStore((s) => s.openGlamStudio);
  const openWebStudio = useAppStore((s) => s.openWebStudio);
  const openCampaignStudio = useAppStore((s) => s.openCampaignStudio);

  // Bumped after a hub mutation (Save as a copy / Rename / Delete) so Recent re-reads.
  const [hubVersion, setHubVersion] = useState(0);
  const recent = useMemo(() => recentProjects(6), [hubVersion]);

  const importInputRef = useRef<HTMLInputElement>(null);

  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-picking the same file
    if (!file) return;
    try {
      const result = importBundle(parseBundle(await file.text()));
      const parts = [`Imported ${result.imported.length}`];
      if (result.skipped.length) parts.push(`${result.skipped.length} already here`);
      if (result.failed.length) parts.push(`${result.failed.length} could not be opened`);
      notifyStorage(
        `${result.umbrellaName ? `${result.umbrellaName}: ` : ""}${parts.join(" · ")}.`
      );
      setHubVersion((v) => v + 1);
    } catch (error) {
      notifyStorage(error instanceof Error ? error.message : "That bundle could not be read.");
    }
  };

  // A project inside a campaign says so, rather than just naming its studio.
  const subtitleFor = (project: HubProject) => {
    const umbrella = umbrellaFor(project.moduleId, project.id);
    const studio = HUB_LABEL[project.moduleId];
    return umbrella && umbrella.id !== project.id ? `${studio} · part of ${umbrella.name}` : studio;
  };
  const HUB_TO_VISUAL: Record<HubModuleId, VisualModule> = {
    musicvideo: "music-video",
    motion: "motionstudio",
    glam: "glam-studio",
    web: "webstudio",
    campaign: "campaignstudio",
  };
  const HUB_LABEL: Record<HubModuleId, string> = {
    musicvideo: "Music Video Director",
    motion: "Motion Studio",
    glam: "Glam Studio",
    web: "Web Studio",
    campaign: "Campaign Studio",
  };
  const openModuleProject = useAppStore((s) => s.openModuleProject);

  const openDirectorMode = () => {
    setActiveTemplate(null);
    setActiveSong(null);
    openSong();
  };

  const [songs] = useState(() => loadSongs());
  const [showLegacy, setShowLegacy] = useState(false);
  const [form, setForm] = useState<NewProject>({
    name: "",
    description: "",
    type: "SaaS Product",
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });

  const createMutation = useMutation({
    mutationFn: (input: NewProject) => api.createProject(input),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setForm({ name: "", description: "", type: "SaaS Product" });
      openProject(project.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const canCreate = form.name.trim().length > 0;

  const openSongStudio = (id: string) => {
    setActiveSong(id);
    openSong();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between gap-4 border-b border-border px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold">Director's Home</h1>
          <p className="text-xs text-muted">
            Start a creative production, then direct, generate, refine, and export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".dsproj,application/json"
            className="hidden"
            onChange={onImportFile}
          />
          <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import project
          </Button>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4" /> New production
          </Button>
        </div>
      </header>

      <div className="space-y-8 p-8">
        {/* Director Studio hero - broad app identity, with Music Video as one module. */}
        <section className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-gold)]/30">
          <img
            src={splashArt}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-[var(--color-gold)]/10" />
          <div className="relative flex flex-col items-center gap-4 px-8 py-12 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Director Studio</h2>
            <p className="max-w-md text-sm text-muted">Every idea. Every style. One vision.</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => setWizardOpen(true)}>
                <Clapperboard className="h-4 w-4" /> Start with Director
              </Button>
              <Button variant="secondary" size="lg" onClick={openDirectorMode}>
                Open Director Studio
              </Button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Creative studios
            </h2>
            <p className="mt-1 text-sm text-muted">
              Choose a focused workflow or orchestrate the whole launch.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StudioCard
              icon={<Music className="h-5 w-5" />}
              title="Music Video"
              desc="Turn songs into cinematic, beat-aware stories."
              capability="Song · Cast · Timeline"
              tone="violet"
              onClick={openSong}
            />
            {isModuleEnabled("motion") && (
              <StudioCard
                icon={<Boxes className="h-5 w-5" />}
                title="Motion Studio"
                desc="Build motion concepts, shots, and production prompts."
                capability="Boards · Motion · Audio"
                tone="cyan"
                onClick={openMotionStudio}
              />
            )}
            {isModuleEnabled("glam") && (
              <StudioCard
                icon={<WandSparkles className="h-5 w-5" />}
                title="Glam Studio"
                desc="Create luxury campaign looks and product films."
                capability="Looks · Heroes · Formats"
                tone="gold"
                onClick={openGlamStudio}
              />
            )}
            {isModuleEnabled("web") && (
              <StudioCard
                icon={<Globe className="h-5 w-5" />}
                title="Web Studio"
                desc="Design and export a responsive campaign site."
                capability="Pages · Preview · SEO"
                tone="green"
                onClick={openWebStudio}
              />
            )}
            {isModuleEnabled("campaign") && (
              <StudioCard
                icon={<Megaphone className="h-5 w-5" />}
                title="Campaign Studio"
                desc="Orchestrate every channel through launch."
                capability="Strategy · Plan · Calendar"
                tone="pink"
                onClick={openCampaignStudio}
                featured
              />
            )}
          </div>
        </section>

        {/* Recent across every studio — the cross-module Project Hub surface. */}
        {recent.length > 0 && (
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Recent across studios
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((project) => (
                <ProjectCard
                  key={`${project.moduleId}:${project.id}`}
                  module={HUB_TO_VISUAL[project.moduleId]}
                  title={project.name}
                  subtitle={subtitleFor(project)}
                  thumbUrl={project.thumbUrl}
                  onResume={() => openModuleProject(project.moduleId, project.id)}
                  actions={
                    <ProjectActionsMenu
                      moduleId={project.moduleId}
                      projectId={project.id}
                      projectName={project.name}
                      onChanged={() => setHubVersion((v) => v + 1)}
                    />
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Quick start */}
        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Start a production
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <QuickStart
              icon={<Music className="h-6 w-6" />}
              title="Import a song"
              desc="Map tempo, sections & lyrics — the spine of everything."
              onClick={openSong}
              primary
            />
            <QuickStart
              icon={<LayoutTemplate className="h-6 w-6" />}
              title="Start from a template"
              desc="Pick a genre/style blueprint and adapt it to your track."
              onClick={openTemplates}
            />
            <QuickStart
              icon={<Sparkles className="h-6 w-6" />}
              title="Explore the demo"
              desc="Open a fully planned example production — no setup needed."
              onClick={openDemoProject}
            />
          </div>
        </section>

        {/* Recent songs / productions */}
        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Your productions
          </h2>
          {songs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <Music className="h-8 w-8 text-muted" />
                <p className="text-sm text-muted">
                  No songs yet — import a track to begin your first music video.
                </p>
                <Button className="mt-1" onClick={openSong}>
                  <Music className="h-4 w-4" /> Import a song
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {songs.map((s) => (
                <ProjectCard
                  key={s.id}
                  module="music-video"
                  title={s.name}
                  subtitle={`${s.bpm} BPM · ${formatTime(s.durationSec)} · ${s.sections.length} sections`}
                  progress={Math.min(100, Math.round((s.sections.length / 8) * 100))}
                  status="Song"
                  icon={<Music className="h-6 w-6" />}
                  onResume={() => openSongStudio(s.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Legacy motion-graphics projects (collapsed) */}
        <section>
          <button
            onClick={() => setShowLegacy((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted hover:text-foreground"
          >
            {showLegacy ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Motion-graphics projects {projects.length > 0 ? `(${projects.length})` : ""}
          </button>
          {showLegacy && (
            <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" /> New project
                  </CardTitle>
                  <CardDescription>
                    The original ad / explainer pipeline (camera, lighting, prompt pack). Separate
                    from the music-video flow above.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">Project name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Acme Launch Film"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="type">Type</Label>
                    <select
                      id="type"
                      className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, type: e.target.value as ProjectType }))
                      }
                    >
                      {PROJECT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="desc">Concept / brief</Label>
                    <Textarea
                      id="desc"
                      placeholder="Describe the idea, script, product, or topic…"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <Button
                    disabled={!canCreate || createMutation.isPending}
                    onClick={() => createMutation.mutate(form)}
                  >
                    {createMutation.isPending ? "Creating…" : "Create project"}
                  </Button>
                </CardContent>
              </Card>

              <div>
                {projects.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                      <Clapperboard className="h-8 w-8 text-muted" />
                      <p className="text-sm text-muted">No motion-graphics projects yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {projects.map((p) => (
                      <div key={p.id} className="group relative">
                        <ProjectCard
                          module="platform"
                          title={p.name}
                          subtitle={p.description || "No description"}
                          progress={35}
                          status={p.type}
                          icon={<Clapperboard className="h-6 w-6" />}
                          onResume={() => openProject(p.id)}
                        />
                        <button
                          className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 p-2 text-white/65 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(p.id);
                          }}
                          title="Delete project"
                          aria-label="Delete project"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StudioCard({
  icon,
  title,
  desc,
  capability,
  tone,
  onClick,
  featured = false,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  capability: string;
  tone: "violet" | "cyan" | "gold" | "green" | "pink";
  onClick: () => void;
  featured?: boolean;
}) {
  const tones = {
    violet: "from-violet-500/30 via-indigo-500/10",
    cyan: "from-cyan-400/30 via-blue-500/10",
    gold: "from-amber-400/30 via-orange-500/10",
    green: "from-emerald-400/30 via-teal-500/10",
    pink: "from-fuchsia-400/30 via-rose-500/10",
  };
  return (
    <button
      onClick={onClick}
      className={`group overflow-hidden rounded-xl border text-left transition duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-card ${featured ? "border-[var(--color-gold)]/35" : "border-border"}`}
    >
      <span
        className={`creative-preview block h-24 bg-gradient-to-br ${tones[tone]} to-background p-3`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white">
          {icon}
        </span>
        <span className="absolute bottom-3 left-3 right-3 flex gap-1.5">
          <i className="h-1 flex-[1.4] rounded-full bg-white/35" />
          <i className="h-1 flex-1 rounded-full bg-white/15" />
          <i className="h-1 w-5 rounded-full bg-white/25" />
        </span>
      </span>
      <span className="block bg-surface p-3.5">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block min-h-9 text-xs leading-relaxed text-muted">{desc}</span>
        <span className="mt-3 block text-[10px] font-medium uppercase tracking-wide text-muted">
          {capability}
        </span>
      </span>
    </button>
  );
}

function QuickStart({
  icon,
  title,
  desc,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-5 text-left shadow-card transition-colors hover:border-primary/50 hover:bg-elevated/40"
    >
      <span
        className={
          "flex h-11 w-11 items-center justify-center rounded-xl " +
          (primary ? "grad-primary text-white" : "bg-elevated text-primary")
        }
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{desc}</span>
      </span>
    </button>
  );
}
