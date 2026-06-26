// Generated-asset registry + Save-to-Bible. Every Image Studio result is stored
// with full metadata (req #7) in localStorage, and can be attached to a bible
// entity's reference images via the Rust-backed save commands.

import type { Character, Environment, Prop } from "@/lib/types";
import { api } from "@/lib/ipc";

export type BibleKind = "character" | "prop" | "world" | "costume" | "style";

export interface GeneratedAsset {
  id: string;
  /** Owning entity (character/environment/prop) id this was generated for. */
  entityId: string;
  entityKind: string;
  entityName: string;
  url: string;
  /** Absolute local path (Tauri) — same as url in browser. */
  filePath: string;
  provider: string;
  model: string;
  prompt: string;
  aspectRatio: string;
  width: number;
  height: number;
  sheetType: string;
  createdAt: string;
  /** Which bibles this asset has been saved into. */
  savedTo: BibleKind[];
}

const LS = "mf.genassets";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `asset-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export function loadAssets(): GeneratedAsset[] {
  try {
    const raw = localStorage.getItem(LS);
    return raw ? (JSON.parse(raw) as GeneratedAsset[]) : [];
  } catch {
    return [];
  }
}

function persist(list: GeneratedAsset[]) {
  localStorage.setItem(LS, JSON.stringify(list.slice(0, 200)));
}

export function loadAssetsFor(entityId: string): GeneratedAsset[] {
  return loadAssets().filter((a) => a.entityId === entityId);
}

export function addAsset(a: Omit<GeneratedAsset, "id" | "createdAt" | "savedTo">): GeneratedAsset {
  const asset: GeneratedAsset = {
    ...a,
    id: newId(),
    createdAt: new Date().toISOString(),
    savedTo: [],
  };
  persist([asset, ...loadAssets()]);
  return asset;
}

export function deleteAsset(id: string) {
  persist(loadAssets().filter((a) => a.id !== id));
}

function markSaved(id: string, bible: BibleKind) {
  const all = loadAssets();
  const a = all.find((x) => x.id === id);
  if (a && !a.savedTo.includes(bible)) {
    a.savedTo.push(bible);
    persist(all);
  }
}

/**
 * Attach a generated asset to a bible entity's reference images (and set it as
 * the hero/portrait/establishing image if none exists yet). Persists through the
 * Rust core so it survives restarts.
 */
export async function saveToBible(
  asset: GeneratedAsset,
  bible: BibleKind,
  entity: Character | Environment | Prop
): Promise<void> {
  const url = asset.url;
  if (bible === "character") {
    const c = entity as Character;
    const referenceImages = c.referenceImages.includes(url)
      ? c.referenceImages
      : [url, ...c.referenceImages].slice(0, 12);
    await api.saveCharacter({
      ...c,
      referenceImages,
      portraitUrl: c.portraitUrl || url,
    });
  } else if (bible === "world") {
    const e = entity as Environment;
    const referenceImages = e.referenceImages.includes(url)
      ? e.referenceImages
      : [url, ...e.referenceImages].slice(0, 12);
    await api.saveEnvironment({
      ...e,
      referenceImages,
      establishingUrl: e.establishingUrl || url,
    });
  } else {
    // prop / costume / style → all live on a Prop record (category set elsewhere)
    const p = entity as Prop;
    const referenceImages = p.referenceImages.includes(url)
      ? p.referenceImages
      : [url, ...p.referenceImages].slice(0, 12);
    await api.saveProp({
      ...p,
      referenceImages,
      heroUrl: p.heroUrl || url,
    });
  }
  markSaved(asset.id, bible);
}

/** Bibles a given entity kind can save into. */
export function bibleTargetsFor(kind: string): { id: BibleKind; label: string }[] {
  if (kind === "character")
    return [
      { id: "character", label: "Character Bible" },
      { id: "costume", label: "Costume Bible" },
      { id: "style", label: "Style Bible" },
    ];
  if (kind === "environment") return [{ id: "world", label: "World Bible" }];
  return [
    { id: "prop", label: "Prop Bible" },
    { id: "style", label: "Style Bible" },
  ];
}
