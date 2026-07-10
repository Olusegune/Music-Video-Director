// DirectorProject — the umbrella that makes cross-module containment real.
//
// Until now, "this landing page belongs to that campaign" was implied by a
// stringly-typed entry in a deliverable's assetRefs, which nothing read. A
// DirectorProject records it as data: one umbrella, many member projects, each
// owned by whichever studio produced it. Campaign Studio is the first consumer
// (a campaign IS an umbrella), but nothing here is campaign-specific.

import { createVersionedStorage } from "@/platform/lib/storage";
import type { HubModuleId } from "@/platform/lib/projectHub";

/** A pointer to a project inside a module's own store. */
export interface ProjectRef {
  moduleId: HubModuleId;
  projectId: string;
  /** Why it belongs here, e.g. "orchestrator", "hero", "landing-page". */
  role?: string;
}

export interface DirectorProject {
  id: string;
  name: string;
  /** Shared brand identity applied to every member. */
  brandDnaId?: string;
  members: ProjectRef[];
  createdAt: string;
  updatedAt: string;
}

const umbrellaStorage = createVersionedStorage<DirectorProject[]>({
  namespace: "platform",
  key: "directorProjects",
  version: 1,
  fallback: () => [],
});

function nowIso(): string {
  return new Date().toISOString();
}

export function listDirectorProjects(): DirectorProject[] {
  return umbrellaStorage.read();
}

export function getDirectorProject(id: string): DirectorProject | null {
  return listDirectorProjects().find((project) => project.id === id) ?? null;
}

export function saveDirectorProject(project: DirectorProject): DirectorProject {
  const projects = listDirectorProjects();
  const index = projects.findIndex((item) => item.id === project.id);
  const next = { ...project, updatedAt: nowIso() };
  if (index >= 0) projects[index] = next;
  else projects.unshift(next);
  umbrellaStorage.write(projects);
  return next;
}

/**
 * Create the umbrella if absent, or refresh its name/brand if it exists.
 * Idempotent so a module can call it on every save without duplicating.
 */
export function ensureDirectorProject(input: {
  id: string;
  name: string;
  brandDnaId?: string;
  members?: ProjectRef[];
}): DirectorProject {
  const existing = getDirectorProject(input.id);
  if (existing) {
    return saveDirectorProject({
      ...existing,
      name: input.name,
      brandDnaId: input.brandDnaId ?? existing.brandDnaId,
    });
  }
  return saveDirectorProject({
    id: input.id,
    name: input.name,
    brandDnaId: input.brandDnaId,
    members: input.members ?? [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

export function deleteDirectorProject(id: string): void {
  umbrellaStorage.write(listDirectorProjects().filter((project) => project.id !== id));
}

const sameRef = (a: ProjectRef, b: ProjectRef) =>
  a.moduleId === b.moduleId && a.projectId === b.projectId;

/** Add a member project. Re-adding the same ref updates its role, never duplicates. */
export function addMember(umbrellaId: string, ref: ProjectRef): DirectorProject | null {
  const umbrella = getDirectorProject(umbrellaId);
  if (!umbrella) return null;
  const members = umbrella.members.filter((member) => !sameRef(member, ref));
  return saveDirectorProject({ ...umbrella, members: [...members, ref] });
}

export function removeMember(umbrellaId: string, ref: ProjectRef): DirectorProject | null {
  const umbrella = getDirectorProject(umbrellaId);
  if (!umbrella) return null;
  return saveDirectorProject({
    ...umbrella,
    members: umbrella.members.filter((member) => !sameRef(member, ref)),
  });
}

/** The umbrella a given project belongs to, if any. */
export function umbrellaFor(moduleId: HubModuleId, projectId: string): DirectorProject | null {
  return (
    listDirectorProjects().find((umbrella) =>
      umbrella.members.some(
        (member) => member.moduleId === moduleId && member.projectId === projectId
      )
    ) ?? null
  );
}

/** Detach a project from whatever umbrella holds it (used when it is deleted). */
export function detachProject(moduleId: HubModuleId, projectId: string): void {
  const umbrella = umbrellaFor(moduleId, projectId);
  if (umbrella) removeMember(umbrella.id, { moduleId, projectId });
}
