import type { CampaignProject } from "@/apps/campaign/lib/types";

const LS = "mf.campaign.projects";
export function listCampaigns(): CampaignProject[] { try { return JSON.parse(localStorage.getItem(LS) ?? "[]") as CampaignProject[]; } catch { return []; } }
export function saveCampaign(project: CampaignProject): CampaignProject { const next = { ...project, updatedAt: new Date().toISOString() }; const all = listCampaigns(); const index = all.findIndex((item) => item.id === next.id); if (index >= 0) all[index] = next; else all.unshift(next); localStorage.setItem(LS, JSON.stringify(all)); return next; }
export function deleteCampaign(id: string) { localStorage.setItem(LS, JSON.stringify(listCampaigns().filter((project) => project.id !== id))); }
