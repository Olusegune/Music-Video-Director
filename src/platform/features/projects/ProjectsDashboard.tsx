/**
 * Projects Dashboard — browse, create, and manage Director projects.
 *
 * Reads and writes through the same `api` (SQLite-backed, or its localStorage
 * mock outside Tauri) that Sidebar's project list and ProjectWorkspace use —
 * so a project created here is guaranteed to actually open.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Copy, Download, Upload, Clock } from "lucide-react";
import { api } from "@/platform/lib/ipc";
import type { Project, ProjectType, PromptPack } from "@/platform/lib/types";
import { useAppStore } from "@/platform/store/useAppStore";
import { Button } from "@/platform/components/ui/button";
import { Badge } from "@/platform/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";
import { cn } from "@/platform/lib/utils";

function toast(message: string) {
  window.dispatchEvent(new CustomEvent("mf-toast", { detail: message }));
}

const TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: "Product Launch", label: "Music Video" },
  { value: "AI Tool", label: "Commercial" },
  { value: "Social Ad", label: "Campaign" },
  { value: "Custom", label: "Other" },
];

const typeLabel = (type: string) => TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;

const STATUS_TONE: Record<string, string> = {
  draft: "bg-border text-foreground",
  in_progress: "bg-primary/15 text-primary",
  review: "bg-warning/15 text-warning",
  done: "bg-success/15 text-success",
};

interface JsonExport {
  project: Pick<Project, "name" | "description" | "type">;
  pack?: PromptPack;
}

export function ProjectsDashboard() {
  const queryClient = useQueryClient();
  const openProjectView = useAppStore((s) => s.openProject);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState<ProjectType>("Product Launch");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["projects"] });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; type: ProjectType }) =>
      api.createProject({ name: input.name, description: "", type: input.type }),
    onSuccess: (project) => {
      setNewProjectName("");
      setShowNewProject(false);
      invalidate();
      openProjectView(project.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: invalidate,
  });

  function handleNewProject() {
    if (!newProjectName.trim()) return;
    createMutation.mutate({ name: newProjectName.trim(), type: newProjectType });
  }

  function handleOpenProject(projectId: string) {
    openProjectView(projectId);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    deleteMutation.mutate(id);
  }

  async function handleDuplicate(project: Project) {
    setBusyId(project.id);
    try {
      const pack = await api.getLatestPack(project.id);
      const copy = await api.createProject({
        name: `${project.name} (copy)`,
        description: project.description,
        type: project.type as ProjectType,
      });
      if (pack) await api.savePack(copy.id, pack);
      await invalidate();
      toast(`Duplicated "${project.name}"`);
    } catch (err) {
      toast(`Duplicate failed: ${(err as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleExport(project: Project) {
    setBusyId(project.id);
    try {
      const path = await api.exportProject(project.id, "json");
      toast(`Exported "${project.name}" → ${path.split(/[\\/]/).pop()}`);
    } catch (err) {
      toast(`Export failed: ${(err as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file path twice in a row
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<JsonExport>;
      if (!data.project?.name) {
        toast("Couldn't import that file — it doesn't look like a project export.");
        return;
      }
      const created = await api.createProject({
        name: `${data.project.name} (imported)`,
        description: data.project.description ?? "",
        type: (data.project.type as ProjectType) ?? "Custom",
      });
      if (data.pack) await api.savePack(created.id, data.pack);
      await invalidate();
      toast(`Imported "${created.name}"`);
    } catch (err) {
      toast(`Import failed: ${(err as Error).message}`);
    }
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <header className="border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="mt-1 text-sm text-muted">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-project"
            />
            <label htmlFor="import-project">
              <Button variant="secondary" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </label>
            <Button size="sm" onClick={() => setShowNewProject(true)} disabled={createMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {showNewProject && (
          <Card className="mb-6 border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Create New Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., Nike Air Max Campaign"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleNewProject()}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Project Type</label>
                <select
                  value={newProjectType}
                  onChange={(e) => setNewProjectType(e.target.value as ProjectType)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleNewProject}
                  disabled={!newProjectName.trim() || createMutation.isPending}
                >
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewProject(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && projects.length === 0 && !showNewProject ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12 text-center">
            <Plus className="mb-2 h-8 w-8 text-muted" />
            <p className="text-sm text-muted">No projects yet</p>
            <Button size="sm" onClick={() => setShowNewProject(true)} className="mt-4">
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const busy = busyId === project.id;
              return (
                <Card
                  key={project.id}
                  className="group cursor-pointer transition hover:border-primary/50 hover:bg-surface/80"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge className="text-xs bg-primary/15 text-primary">
                        {typeLabel(project.type)}
                      </Badge>
                      <Badge className={cn("text-xs", STATUS_TONE[project.status] ?? STATUS_TONE.draft)}>
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>

                    <button
                      onClick={() => handleOpenProject(project.id)}
                      className="text-left w-full"
                    >
                      <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition">
                        {project.name}
                      </h3>
                    </button>

                    {project.description && (
                      <p className="text-xs text-muted line-clamp-2">{project.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Clock className="h-3 w-3" />
                      {new Date(project.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>

                    <div className="flex gap-1 border-t border-border pt-3 opacity-0 group-hover:opacity-100 transition">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDuplicate(project)}
                        disabled={busy}
                        title="Duplicate project"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExport(project)}
                        disabled={busy}
                        title="Export project"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(project.id)}
                        disabled={deleteMutation.isPending}
                        title="Delete project"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
