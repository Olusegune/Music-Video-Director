import { loadDemoProject } from "@/platform/lib/demoProject";
import { registerAppBindings } from "@/platform/lib/appBindings";
import { loadSongs, saveSong } from "@/apps/music-video/lib/songBrain";

let installed = false;

export function installMusicVideoBindings(): void {
  if (installed) return;
  installed = true;

  registerAppBindings({
    loadProductions: () =>
      loadSongs().map((song) => ({
        id: song.id,
        templateId: song.templateId ?? null,
      })),
    saveProductionTemplate: (id, templateId) => {
      const song = loadSongs().find((x) => x.id === id);
      if (song) saveSong({ ...song, templateId: templateId ?? undefined });
    },
    loadDemoProduction: loadDemoProject,
  });
}
