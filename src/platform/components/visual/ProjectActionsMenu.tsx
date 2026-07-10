import { useEffect, useRef, useState } from "react";
import { Copy, History, MoreVertical, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "@/platform/lib/utils";
import {
  deleteProject,
  duplicateProject,
  listProjectVersions,
  projectCapabilities,
  renameProject,
  restoreProjectVersion,
  snapshotProject,
  type HubModuleId,
  type ProjectVersion,
} from "@/platform/lib/projectHub";

// Save As / Rename / Delete / Version history for any studio's project, driven
// entirely by the Project Hub adapters. Rename, delete, and restore confirm in
// place — no window.prompt, no browser confirm() — so the card keeps the app's
// own visual language.

type Panel = "menu" | "rename" | "confirmDelete" | "versions";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function ProjectActionsMenu({
  moduleId,
  projectId,
  projectName,
  onChanged,
}: {
  moduleId: HubModuleId;
  projectId: string;
  projectName: string;
  /** Called after any mutation so the caller can refresh its list. */
  onChanged: (result: { duplicatedId?: string; deleted?: boolean; restored?: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("menu");
  const [draftName, setDraftName] = useState(projectName);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const caps = projectCapabilities(moduleId);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!caps.duplicate && !caps.rename && !caps.remove && !caps.versioning) return null;

  function close() {
    setOpen(false);
    setPanel("menu");
  }

  const openVersions = () => {
    setVersions(listProjectVersions(moduleId, projectId));
    setPanel("versions");
  };

  const snapshotNow = () => {
    snapshotProject(moduleId, projectId, `Snapshot ${new Date().toLocaleString()}`);
    setVersions(listProjectVersions(moduleId, projectId));
    onChanged({});
  };

  const restore = (versionId: string) => {
    const ok = restoreProjectVersion(moduleId, projectId, versionId);
    close();
    if (ok) onChanged({ restored: true });
  };

  const saveAs = () => {
    const newId = duplicateProject(moduleId, projectId);
    close();
    if (newId) onChanged({ duplicatedId: newId });
  };

  const commitRename = () => {
    const ok = renameProject(moduleId, projectId, draftName);
    close();
    if (ok) onChanged({});
  };

  const confirmDelete = () => {
    const ok = deleteProject(moduleId, projectId);
    close();
    if (ok) onChanged({ deleted: true });
  };

  const item =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-foreground transition hover:bg-elevated";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Actions for ${projectName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setDraftName(projectName);
          setOpen((v) => !v);
          setPanel("menu");
        }}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-black/45 text-white/90 backdrop-blur transition",
          "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
          open && "opacity-100"
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-9 rounded-lg border border-border bg-surface p-1 shadow-xl",
            panel === "versions" ? "w-72" : "w-52"
          )}
        >
          {panel === "menu" ? (
            <>
              {caps.duplicate ? (
                <button type="button" role="menuitem" className={item} onClick={saveAs}>
                  <Copy className="h-3.5 w-3.5" /> Save as a copy
                </button>
              ) : null}
              {caps.rename ? (
                <button
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => setPanel("rename")}
                >
                  <Pencil className="h-3.5 w-3.5" /> Rename
                </button>
              ) : null}
              {caps.versioning ? (
                <button type="button" role="menuitem" className={item} onClick={openVersions}>
                  <History className="h-3.5 w-3.5" /> Version history
                </button>
              ) : null}
              {caps.remove ? (
                <button
                  type="button"
                  role="menuitem"
                  className={cn(item, "text-danger hover:bg-danger/10")}
                  onClick={() => setPanel("confirmDelete")}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              ) : null}
            </>
          ) : null}

          {panel === "versions" ? (
            <div className="p-1.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="whitespace-nowrap text-[10px] uppercase tracking-wide text-muted">
                  Version history
                </span>
                <button
                  type="button"
                  onClick={snapshotNow}
                  className="shrink-0 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground"
                >
                  Snapshot now
                </button>
              </div>
              {versions.length === 0 ? (
                <p className="px-1 py-2 text-[11px] text-muted">
                  No versions yet. Snapshot before a big change so you can roll back.
                </p>
              ) : (
                <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                  {versions.map((version) => (
                    <li key={version.id}>
                      <button
                        type="button"
                        onClick={() => restore(version.id)}
                        className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-elevated"
                      >
                        <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs text-foreground">
                            {version.label}
                          </span>
                          <span className="block text-[10px] text-muted">
                            {formatWhen(version.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs text-muted hover:text-foreground"
                  onClick={close}
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}

          {panel === "rename" ? (
            <form
              className="p-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                commitRename();
              }}
            >
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">
                Project name
              </label>
              <input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
              />
              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs text-muted hover:text-foreground"
                  onClick={close}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!draftName.trim()}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          ) : null}

          {panel === "confirmDelete" ? (
            <div className="p-2">
              <p className="text-xs text-foreground">Delete “{projectName}”?</p>
              <p className="mt-1 text-[11px] text-muted">This cannot be undone.</p>
              <div className="mt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs text-muted hover:text-foreground"
                  onClick={close}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
