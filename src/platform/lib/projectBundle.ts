// .dsproj — a portable Director Studio project bundle.
//
// A bundle is an umbrella (optional) plus the raw records of the projects it
// contains, plus their deliverables. It is a plain JSON document so it stays
// diffable, inspectable, and trivially repairable by hand.
//
// Ids are preserved on import, never remapped. Records reference each other by
// id internally (a campaign plan item points at a deliverable id), and the hub
// cannot see inside a module's shape to rewrite those. Preserving ids keeps
// every internal reference intact; the cost is that importing a bundle into the
// workspace it came from finds the projects already present, and skips them.
// That is the honest trade: bundles move work between workspaces.

import {
  projectExists,
  readProjectRecord,
  writeProjectRecord,
  type HubModuleId,
} from "@/platform/lib/projectHub";
import {
  getDirectorProject,
  saveDirectorProject,
  umbrellaFor,
  type DirectorProject,
  type ProjectRef,
} from "@/platform/lib/directorProject";
import {
  listDeliverables,
  upsertDeliverables,
  type Deliverable,
} from "@/platform/lib/deliverables";

export const BUNDLE_FORMAT = "director-studio-project";
export const BUNDLE_FORMAT_VERSION = 1;

export interface BundledProject {
  moduleId: HubModuleId;
  projectId: string;
  role?: string;
  record: unknown;
}

export interface ProjectBundle {
  format: typeof BUNDLE_FORMAT;
  formatVersion: number;
  exportedAt: string;
  appVersion?: string;
  /** Present when the bundle came from a DirectorProject umbrella. */
  umbrella?: DirectorProject;
  projects: BundledProject[];
  deliverables: Deliverable[];
}

export interface ImportResult {
  imported: ProjectRef[];
  /** Already present in this workspace, left untouched. */
  skipped: ProjectRef[];
  /** In the bundle but the module could not accept them. */
  failed: ProjectRef[];
  umbrellaName?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Collect the deliverables belonging to any of these projects. */
function deliverablesFor(refs: ProjectRef[]): Deliverable[] {
  const wanted = new Set(refs.map((ref) => `${ref.moduleId}:${ref.projectId}`));
  return listDeliverables().filter((item) => wanted.has(`${item.moduleId}:${item.projectId}`));
}

/**
 * Bundle a project. When the project belongs to an umbrella the whole umbrella
 * travels — a campaign exports with its hero imagery and landing page.
 */
export function exportBundle(
  moduleId: HubModuleId,
  projectId: string,
  appVersion?: string
): ProjectBundle | null {
  const umbrella = getDirectorProject(projectId) ?? umbrellaFor(moduleId, projectId);
  const refs: ProjectRef[] = umbrella ? umbrella.members : [{ moduleId, projectId }];

  const projects: BundledProject[] = [];
  for (const ref of refs) {
    const record = readProjectRecord(ref.moduleId, ref.projectId);
    if (record == null) continue; // module cannot serialize; omit rather than lie
    projects.push({
      moduleId: ref.moduleId,
      projectId: ref.projectId,
      role: ref.role,
      record,
    });
  }
  if (projects.length === 0) return null;

  return {
    format: BUNDLE_FORMAT,
    formatVersion: BUNDLE_FORMAT_VERSION,
    exportedAt: nowIso(),
    appVersion,
    umbrella: umbrella ?? undefined,
    projects,
    deliverables: deliverablesFor(
      projects.map((p) => ({ moduleId: p.moduleId, projectId: p.projectId }))
    ),
  };
}

export function bundleFilename(bundle: ProjectBundle): string {
  const base =
    bundle.umbrella?.name ??
    (bundle.projects[0]?.record as { name?: string } | undefined)?.name ??
    "project";
  const slug = base.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "project";
  return `${slug.toLowerCase()}.dsproj`;
}

/** Parse and validate untrusted bundle text. Throws with a readable reason. */
export function parseBundle(text: string): ProjectBundle {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const bundle = raw as Partial<ProjectBundle>;
  if (bundle?.format !== BUNDLE_FORMAT) {
    throw new Error("That file is not a Director Studio project bundle.");
  }
  if (typeof bundle.formatVersion !== "number" || bundle.formatVersion > BUNDLE_FORMAT_VERSION) {
    throw new Error(
      `This bundle was made by a newer Director Studio (format ${bundle.formatVersion}). Update to open it.`
    );
  }
  if (!Array.isArray(bundle.projects) || bundle.projects.length === 0) {
    throw new Error("That bundle contains no projects.");
  }
  for (const project of bundle.projects) {
    if (!project?.moduleId || !project?.projectId || project.record == null) {
      throw new Error("That bundle is missing project data.");
    }
  }
  return {
    ...bundle,
    deliverables: Array.isArray(bundle.deliverables) ? bundle.deliverables : [],
  } as ProjectBundle;
}

/**
 * Write a bundle into this workspace. Existing ids are never overwritten — a
 * project already here is reported as skipped, so importing twice is safe.
 */
export function importBundle(bundle: ProjectBundle): ImportResult {
  const imported: ProjectRef[] = [];
  const skipped: ProjectRef[] = [];
  const failed: ProjectRef[] = [];

  for (const project of bundle.projects) {
    const ref: ProjectRef = {
      moduleId: project.moduleId,
      projectId: project.projectId,
      role: project.role,
    };
    if (projectExists(project.moduleId, project.projectId)) {
      skipped.push(ref);
      continue;
    }
    if (writeProjectRecord(project.moduleId, project.record)) imported.push(ref);
    else failed.push(ref);
  }

  // Deliverables only for projects that actually landed.
  const landed = new Set(imported.map((ref) => `${ref.moduleId}:${ref.projectId}`));
  const deliverables = bundle.deliverables.filter((item) =>
    landed.has(`${item.moduleId}:${item.projectId}`)
  );
  if (deliverables.length) upsertDeliverables(deliverables);

  // Recreate the umbrella, keeping only members that exist here now.
  if (bundle.umbrella && imported.length) {
    const existing = getDirectorProject(bundle.umbrella.id);
    const members = bundle.umbrella.members.filter(
      (member) =>
        landed.has(`${member.moduleId}:${member.projectId}`) ||
        projectExists(member.moduleId, member.projectId)
    );
    saveDirectorProject({
      ...bundle.umbrella,
      members: existing
        ? [
            ...existing.members.filter(
              (member) =>
                !members.some(
                  (m) => m.moduleId === member.moduleId && m.projectId === member.projectId
                )
            ),
            ...members,
          ]
        : members,
      createdAt: existing?.createdAt ?? bundle.umbrella.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
  }

  return { imported, skipped, failed, umbrellaName: bundle.umbrella?.name };
}
