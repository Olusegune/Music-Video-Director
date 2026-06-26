// Asset usage tracking + safe delete.
//
// Before deleting a production asset we find everywhere it's used — cast links
// and shot references across every treatment — so the user can choose to detach
// it (keep the asset, remove references) or delete it everywhere.

import { api } from "@/lib/ipc";
import { loadCast, savePerformer } from "@/lib/cast";
import { loadAllTreatments, saveTreatment } from "@/lib/mvDirector";
import { loadSongs } from "@/lib/songBrain";
import type { AssetKind } from "@/lib/assets";

export interface AssetUsage {
  area: string;
  label: string;
}

/** Find every place an asset (by entity id + its image srcs) is referenced. */
export function findAssetUsage(kind: AssetKind, entityId: string, srcs: string[]): AssetUsage[] {
  const set = new Set(srcs.filter(Boolean));
  const usages: AssetUsage[] = [];

  if (kind === "Character") {
    for (const p of loadCast()) {
      if (p.characterId === entityId) usages.push({ area: "Cast", label: p.name || p.role });
    }
  }

  const songs = loadSongs();
  for (const t of loadAllTreatments()) {
    const songName = songs.find((s) => s.id === t.songId)?.name ?? "Treatment";
    for (const sec of t.sections) {
      for (const sh of sec.shots) {
        const inRefs = (sh.refImages ?? []).some((r) => set.has(r));
        const inFrame = !!sh.imageUrl && set.has(sh.imageUrl);
        if (inRefs || inFrame) {
          usages.push({ area: "Shot", label: `${songName} · ${sec.label}` });
        }
      }
    }
  }
  return usages;
}

/** Detach the asset everywhere (keep the asset itself): unlink cast + strip shot refs. */
export function removeAssetReferences(kind: AssetKind, entityId: string, srcs: string[]): void {
  const set = new Set(srcs.filter(Boolean));

  if (kind === "Character") {
    for (const p of loadCast()) {
      if (p.characterId === entityId) savePerformer({ ...p, characterId: undefined });
    }
  }

  for (const t of loadAllTreatments()) {
    let changed = false;
    const next = {
      ...t,
      sections: t.sections.map((sec) => ({
        ...sec,
        shots: sec.shots.map((sh) => {
          const refs = (sh.refImages ?? []).filter((r) => !set.has(r));
          const imageUrl = sh.imageUrl && set.has(sh.imageUrl) ? undefined : sh.imageUrl;
          if (refs.length !== (sh.refImages?.length ?? 0) || imageUrl !== sh.imageUrl) {
            changed = true;
            return { ...sh, refImages: refs, imageUrl };
          }
          return sh;
        }),
      })),
    };
    if (changed) saveTreatment(next);
  }
}

/** Delete the asset entity from its Bible. */
export async function deleteAssetEntity(kind: AssetKind, entityId: string): Promise<void> {
  if (kind === "Character") await api.deleteCharacter(entityId);
  else if (kind === "Environment") await api.deleteEnvironment(entityId);
  else await api.deleteProp(entityId);
}
