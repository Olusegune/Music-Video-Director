import type { WebProject } from "@/apps/webstudio/lib/types";

const LS = "mf.webstudio.projects";

export function listWebProjects(): WebProject[] {
  try { return JSON.parse(localStorage.getItem(LS) ?? "[]") as WebProject[]; } catch { return []; }
}

export function saveWebProject(project: WebProject): WebProject {
  const next = { ...project, updatedAt: new Date().toISOString() };
  const all = listWebProjects();
  const index = all.findIndex((item) => item.id === next.id);
  if (index >= 0) all[index] = next; else all.unshift(next);
  localStorage.setItem(LS, JSON.stringify(all));
  return next;
}

export function deleteWebProject(projectId: string) {
  localStorage.setItem(LS, JSON.stringify(listWebProjects().filter((project) => project.id !== projectId)));
}
