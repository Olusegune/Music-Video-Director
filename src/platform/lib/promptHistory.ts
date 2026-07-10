// Prompt history — "what prompt made that image?", answered.
//
// Every generation records the pipeline that produced it, not just the flat
// string, so a replay restores the real thing: which layers were muted, what
// you typed, the model, the seed. A replayed generation is reproducible in the
// way a screenshot of a prompt never is.
//
// Thumbnails are stored by reference. Generated media lives on disk as a path,
// which is cheap; a browser-mock data URL is not, so oversized inline images are
// dropped rather than quietly eating the user's storage quota.

import { createVersionedStorage, notifyStorage } from "@/platform/lib/storage";
import type { PromptPipeline } from "@/platform/lib/promptPipeline";

export interface PromptHistoryEntry {
  id: string;
  createdAt: string;
  /** Which surface produced it, e.g. "Generate portrait". */
  title?: string;
  /** Scope, so a Bible entity can show only its own history. */
  moduleId?: string;
  entityId?: string;
  /** Exactly what the model received. */
  prompt: string;
  negativePrompt?: string;
  /** The full stack, so replay restores mutes and overrides — not just text. */
  pipeline: PromptPipeline;
  modelId?: string;
  seed?: number;
  aspect?: string;
  referenceCount?: number;
  /** Path or url of the first result. Omitted when it would be too large. */
  thumbUrl?: string;
}

const MAX_ENTRIES = 60;
/** A data: URL longer than this is not worth persisting into localStorage. */
const MAX_INLINE_THUMB_CHARS = 40_000;

const historyStorage = createVersionedStorage<PromptHistoryEntry[]>({
  namespace: "platform",
  key: "promptHistory",
  version: 1,
  fallback: () => [],
});

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `ph-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

/** Keep a thumbnail only when storing it is cheap. */
export function thumbForStorage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("data:") && url.length > MAX_INLINE_THUMB_CHARS) return undefined;
  return url;
}

export function listPromptHistory(filter?: {
  moduleId?: string;
  entityId?: string;
  limit?: number;
}): PromptHistoryEntry[] {
  const all = historyStorage.read().filter((entry) => {
    if (filter?.moduleId && entry.moduleId !== filter.moduleId) return false;
    if (filter?.entityId && entry.entityId !== filter.entityId) return false;
    return true;
  });
  return typeof filter?.limit === "number" ? all.slice(0, Math.max(0, filter.limit)) : all;
}

export function recordPromptHistory(
  entry: Omit<PromptHistoryEntry, "id" | "createdAt">,
  now = new Date()
): PromptHistoryEntry {
  const saved: PromptHistoryEntry = {
    ...entry,
    thumbUrl: thumbForStorage(entry.thumbUrl),
    id: newId(),
    createdAt: now.toISOString(),
  };
  const next = [saved, ...historyStorage.read()];
  if (next.length > MAX_ENTRIES) {
    notifyStorage(`Prompt history keeps the last ${MAX_ENTRIES} generations; older ones removed.`);
  }
  historyStorage.write(next.slice(0, MAX_ENTRIES));
  return saved;
}

export function deletePromptHistory(id: string): void {
  historyStorage.write(historyStorage.read().filter((entry) => entry.id !== id));
}

export function clearPromptHistory(filter?: { moduleId?: string; entityId?: string }): void {
  if (!filter) {
    historyStorage.write([]);
    return;
  }
  historyStorage.write(
    historyStorage.read().filter((entry) => {
      const moduleMatches = !filter.moduleId || entry.moduleId === filter.moduleId;
      const entityMatches = !filter.entityId || entry.entityId === filter.entityId;
      return !(moduleMatches && entityMatches);
    })
  );
}

/** A short human label, e.g. "2 layers · FLUX · seed 42". */
export function describeEntry(entry: PromptHistoryEntry): string {
  const active = entry.pipeline.layers.filter((layer) => !layer.muted).length;
  const parts = [`${active} layer${active === 1 ? "" : "s"}`];
  if (entry.modelId) parts.push(entry.modelId);
  if (typeof entry.seed === "number") parts.push(`seed ${entry.seed}`);
  if (entry.referenceCount) parts.push(`${entry.referenceCount} ref`);
  return parts.join(" · ");
}
