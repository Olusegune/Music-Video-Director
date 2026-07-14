import { ReferenceAsset, MoodBoard, ReferenceTag, ReferenceLabData, ReferenceTagCategory } from "./referenceLabTypes";

const STORAGE_KEY = "PLATFORM_REFERENCE_LAB";

function getDefaultData(): ReferenceLabData {
  return {
    assets: [],
    moodBoards: [],
    tags: [],
    version: 1,
  };
}

function loadData(): ReferenceLabData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultData();
    return JSON.parse(stored);
  } catch {
    return getDefaultData();
  }
}

function saveData(data: ReferenceLabData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Asset operations

export function listReferenceAssets(): ReferenceAsset[] {
  return loadData().assets;
}

export function getReferenceAsset(id: string): ReferenceAsset | undefined {
  return loadData().assets.find((a) => a.id === id);
}

export function createReferenceAsset(asset: Omit<ReferenceAsset, "id" | "createdAt">): ReferenceAsset {
  const data = loadData();
  const newAsset: ReferenceAsset = {
    ...asset,
    id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  data.assets.push(newAsset);
  saveData(data);
  return newAsset;
}

export function updateReferenceAsset(id: string, updates: Partial<Omit<ReferenceAsset, "id" | "createdAt">>): ReferenceAsset | undefined {
  const data = loadData();
  const asset = data.assets.find((a) => a.id === id);
  if (!asset) return undefined;

  const updated = {
    ...asset,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  data.assets = data.assets.map((a) => (a.id === id ? updated : a));
  saveData(data);
  return updated;
}

export function deleteReferenceAsset(id: string): boolean {
  const data = loadData();
  const before = data.assets.length;
  data.assets = data.assets.filter((a) => a.id !== id);

  // Remove from mood boards
  data.moodBoards = data.moodBoards.map((b) => ({
    ...b,
    assetIds: b.assetIds.filter((aid) => aid !== id),
  }));

  const deleted = data.assets.length < before;
  if (deleted) saveData(data);
  return deleted;
}

// Mood Board operations

export function listMoodBoards(): MoodBoard[] {
  return loadData().moodBoards;
}

export function getMoodBoard(id: string): MoodBoard | undefined {
  return loadData().moodBoards.find((b) => b.id === id);
}

export function createMoodBoard(board: Omit<MoodBoard, "id" | "createdAt" | "updatedAt">): MoodBoard {
  const data = loadData();
  const now = new Date().toISOString();
  const newBoard: MoodBoard = {
    ...board,
    id: `board_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };
  data.moodBoards.push(newBoard);
  saveData(data);
  return newBoard;
}

export function updateMoodBoard(id: string, updates: Partial<Omit<MoodBoard, "id" | "createdAt">>): MoodBoard | undefined {
  const data = loadData();
  const board = data.moodBoards.find((b) => b.id === id);
  if (!board) return undefined;

  const updated = {
    ...board,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  data.moodBoards = data.moodBoards.map((b) => (b.id === id ? updated : b));
  saveData(data);
  return updated;
}

export function deleteMoodBoard(id: string): boolean {
  const data = loadData();
  const before = data.moodBoards.length;
  data.moodBoards = data.moodBoards.filter((b) => b.id !== id);
  const deleted = data.moodBoards.length < before;
  if (deleted) saveData(data);
  return deleted;
}

// Tag operations

export function listTags(): ReferenceTag[] {
  return loadData().tags;
}

export function getOrCreateTag(label: string, category: ReferenceTagCategory): ReferenceTag {
  const data = loadData();
  let tag = data.tags.find((t) => t.label === label && t.category === category);

  if (!tag) {
    tag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      label,
      category,
      usageCount: 0,
    };
    data.tags.push(tag);
  }

  saveData(data);
  return tag;
}

export function incrementTagUsage(tagId: string): void {
  const data = loadData();
  const tag = data.tags.find((t) => t.id === tagId);
  if (tag) {
    tag.usageCount += 1;
    saveData(data);
  }
}

export function searchAssetsByTag(tagId: string): ReferenceAsset[] {
  const assets = loadData().assets;
  return assets.filter((a) => a.tags.includes(tagId));
}

export function searchAssetsByTagLabel(label: string): ReferenceAsset[] {
  const data = loadData();
  const tagIds = data.tags.filter((t) => t.label.toLowerCase().includes(label.toLowerCase())).map((t) => t.id);
  return data.assets.filter((a) => a.tags.some((tag) => tagIds.includes(tag)));
}

// Batch operations

export function exportReferenceLabData(): ReferenceLabData {
  return loadData();
}

export function importReferenceLabData(data: ReferenceLabData): void {
  if (!data.version || data.version < 1) {
    throw new Error("Invalid Reference Lab data version");
  }
  saveData(data);
}

export function clearReferenceLabData(): void {
  saveData(getDefaultData());
}
