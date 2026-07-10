import { establishDirection } from "./direction";
import { directStoryboard } from "./brain";
import { DEFAULT_TYPOGRAPHY } from "./templates";
import type { MotionLoopEvent, MotionProject, MotionProjectDraft, MotionScene } from "./types";
import {
  motionUid,
  nowIso,
  readMotionStorage,
  writeMotionStorage,
  migrateMotionStorage,
} from "./storage";

const PROJECTS_KEY = "projects";
const VERSIONS_KEY = "versions";

export interface MotionProjectVersion {
  id: string;
  projectId: string;
  label: string;
  project: MotionProject;
  createdAt: string;
}

function allProjects(): MotionProject[] {
  migrateMotionStorage();
  return readMotionStorage<MotionProject[]>(PROJECTS_KEY, []);
}

function persist(projects: MotionProject[]): void {
  writeMotionStorage(PROJECTS_KEY, projects);
}

export function listMotionProjects(): MotionProject[] {
  return allProjects().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getMotionProject(id: string): MotionProject | null {
  return allProjects().find((project) => project.id === id) ?? null;
}

export function createMotionProject(draft: MotionProjectDraft): MotionProject {
  const now = nowIso();
  const direction = establishDirection(draft);
  const scenes = directStoryboard(draft, direction);
  const project: MotionProject = {
    id: motionUid(),
    name: draft.name.trim() || "Untitled Motion Project",
    typeId: draft.typeId,
    styleId: draft.styleId,
    brief: draft.brief,
    businessInput: draft.businessInput,
    marketingBrief: draft.marketingBrief,
    script: draft.script,
    aspect: draft.aspect,
    durationSec: draft.durationSec,
    feeling: draft.feeling,
    status: "storyboard",
    direction,
    typography: DEFAULT_TYPOGRAPHY,
    scenes,
    loopLog: [
      {
        id: motionUid(),
        stage: "generate",
        target: "storyboard",
        summary:
          "Generated initial Motion Studio storyboard from project type, style, brief, and script.",
        score: Math.round(
          scenes.reduce((sum, scene) => sum + (scene.score ?? 80), 0) / scenes.length
        ),
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  persist([project, ...allProjects()]);
  snapshotMotionProject(project.id, "initial storyboard");
  return project;
}

export function saveMotionProject(project: MotionProject): MotionProject {
  const next = { ...project, updatedAt: nowIso() };
  const projects = allProjects();
  const index = projects.findIndex((item) => item.id === project.id);
  if (index >= 0) projects[index] = next;
  else projects.unshift(next);
  persist(projects);
  return next;
}

export function deleteMotionProject(id: string): void {
  persist(allProjects().filter((project) => project.id !== id));
}

export function updateMotionScenes(projectId: string, scenes: MotionScene[]): MotionProject | null {
  const project = getMotionProject(projectId);
  if (!project) return null;
  return saveMotionProject({ ...project, scenes });
}

export function addMotionLoopEvent(
  projectId: string,
  event: Omit<MotionLoopEvent, "id" | "createdAt">
): MotionProject | null {
  const project = getMotionProject(projectId);
  if (!project) return null;
  return saveMotionProject({
    ...project,
    loopLog: [
      {
        id: motionUid(),
        createdAt: nowIso(),
        ...event,
      },
      ...project.loopLog,
    ],
  });
}

export function snapshotMotionProject(projectId: string, label: string): void {
  const project = getMotionProject(projectId);
  if (!project) return;
  const versions = readMotionStorage<MotionProjectVersion[]>(VERSIONS_KEY, []);
  const version: MotionProjectVersion = {
    id: motionUid(),
    projectId,
    label,
    project,
    createdAt: nowIso(),
  };
  writeMotionStorage(VERSIONS_KEY, [version, ...versions].slice(0, 40));
}

export function listMotionVersions(projectId: string): MotionProjectVersion[] {
  return readMotionStorage<MotionProjectVersion[]>(VERSIONS_KEY, []).filter(
    (version) => version.projectId === projectId
  );
}
