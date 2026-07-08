import { useQuery } from "@tanstack/react-query";
import { api } from "@/platform/lib/ipc";
import { useAppStore } from "@/platform/store/useAppStore";
import { Badge } from "@/platform/components/ui/badge";

export function Inspector() {
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });
  const project = projects.find((p) => p.id === activeProjectId);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Inspector</h2>
        <p className="text-[11px] text-muted">Context-sensitive properties</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!project ? (
          <p className="text-xs text-muted">Nothing selected.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="Project" value={project.name} />
            <Field label="Type" value={<Badge variant="primary">{project.type}</Badge>} />
            <Field label="Aspect Ratio" value={project.aspectRatio} />
            <Field label="Duration" value={project.duration} />
            <Field label="Status" value={project.status} />
            <Field label="Created" value={new Date(project.createdAt).toLocaleDateString()} />
          </div>
        )}
      </div>
    </aside>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
