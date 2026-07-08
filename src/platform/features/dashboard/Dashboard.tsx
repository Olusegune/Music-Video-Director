import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Clapperboard,
  Trash2,
  Music,
  LayoutTemplate,
  Video,
  Gauge,
  Clock,
  Radio,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Boxes,
  Globe,
  Megaphone,
  WandSparkles,
} from "lucide-react";
import { api } from "@/platform/lib/ipc";
import type { NewProject, ProjectType } from "@/platform/lib/types";
import { loadSongs, formatTime } from "@/apps/music-video/lib/songBrain";
import { useAppStore } from "@/platform/store/useAppStore";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { Label } from "@/platform/components/ui/label";
import { Badge } from "@/platform/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";
import { MagicFlowButton } from "@/apps/music-video/components/magic/MagicFlowButton";
import splashArt from "@/assets/director-studio-splash.png";

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
  const setMagicSongId = useAppStore((s) => s.setMagicSongId);
  const openDemoProject = useAppStore((s) => s.openDemoProject);
  const openMotionStudio = useAppStore((s) => s.openMotionStudio);
  const openGlamStudio = useAppStore((s) => s.openGlamStudio);
  const openWebStudio = useAppStore((s) => s.openWebStudio);
  const openCampaignStudio = useAppStore((s) => s.openCampaignStudio);

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

  const directSong = (id: string) => {
    setActiveSong(id);
    setMagicSongId(id);
  };
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
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4" /> New production
        </Button>
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
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Director Studio
            </h2>
            <p className="max-w-md text-sm text-muted">
              Every idea. Every style. One vision.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <MagicFlowButton variant="hero" />
              <Button variant="secondary" size="lg" onClick={openDirectorMode}>
                Open Director Mode
              </Button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Creative studios</h2>
            <p className="mt-1 text-sm text-muted">Choose a focused workflow or orchestrate the whole launch.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StudioCard icon={<Boxes className="h-5 w-5" />} title="Motion Studio" desc="Build motion concepts, shots, and production-ready prompts." onClick={openMotionStudio} />
            <StudioCard icon={<WandSparkles className="h-5 w-5" />} title="Glam Studio" desc="Create luxury campaign looks and exact-format hero assets." onClick={openGlamStudio} />
            <StudioCard icon={<Globe className="h-5 w-5" />} title="Web Studio" desc="Plan, edit, audit, and export a responsive campaign site." onClick={openWebStudio} />
            <StudioCard icon={<Megaphone className="h-5 w-5" />} title="Campaign Studio" desc="Orchestrate every channel from strategy through launch kit." onClick={openCampaignStudio} featured />
          </div>
        </section>

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
                <Card key={s.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 truncate">
                      <span className="grad-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                        <Music className="h-3.5 w-3.5 text-white" />
                      </span>
                      <span className="truncate">{s.name}</span>
                    </CardTitle>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Stat icon={<Gauge className="h-3 w-3" />} label={`${s.bpm} BPM`} />
                      <Stat icon={<Clock className="h-3 w-3" />} label={formatTime(s.durationSec)} />
                      <Stat icon={<Radio className="h-3 w-3" />} label={`${s.sections.length} sections`} />
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => openSongStudio(s.id)}>
                      <Music className="h-3.5 w-3.5" /> Song
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => directSong(s.id)}>
                      <Video className="h-3.5 w-3.5" /> Direct
                    </Button>
                  </CardContent>
                </Card>
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
            {showLegacy ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
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
                    The original ad / explainer pipeline (camera, lighting, prompt
                    pack). Separate from the music-video flow above.
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
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ProjectType }))}
                    >
                      {PROJECT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
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
                      <Card
                        key={p.id}
                        className="group cursor-pointer transition-colors hover:border-primary/50"
                        onClick={() => openProject(p.id)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="truncate">{p.name}</CardTitle>
                            <button
                              className="text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
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
                          <CardDescription className="line-clamp-2">
                            {p.description || "No description"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center gap-2">
                          <Badge variant="primary">{p.type}</Badge>
                          <Badge>{p.aspectRatio}</Badge>
                          <Badge>{p.duration}</Badge>
                        </CardContent>
                      </Card>
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

function StudioCard({ icon, title, desc, onClick, featured = false }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; featured?: boolean }) {
  return (
    <button onClick={onClick} className={`group rounded-[var(--radius-card)] border p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-card ${featured ? "border-[var(--color-gold)]/35 bg-[var(--color-gold)]/5" : "border-border bg-surface"}`}>
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary transition group-hover:bg-primary/18">{icon}</span>
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-muted">{desc}</span>
      <span className="mt-4 block text-xs font-semibold text-primary">Open studio →</span>
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

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted">
      {icon}
      {label}
    </span>
  );
}
