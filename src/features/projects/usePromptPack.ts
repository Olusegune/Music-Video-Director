import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import { normalizePack } from "@/lib/pack";
import type { PromptPack } from "@/lib/types";

export type SaveStatus = "idle" | "saving" | "saved";

/**
 * Loads the latest persisted Prompt Pack for a project, holds an editable local
 * copy, and autosaves edits (debounced) back through the IPC layer.
 */
export function usePromptPack(projectId: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["pack", projectId],
    queryFn: () => api.getLatestPack(projectId),
  });

  const [pack, setPackState] = useState<PromptPack | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate local state once the query resolves (or when switching projects).
  useEffect(() => {
    if (data !== undefined) setPackState(normalizePack(data));
  }, [data, projectId]);

  function persist(next: PromptPack) {
    setSaveStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await api.savePack(projectId, next);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }, 600);
  }

  /** Replace the whole pack (e.g. after a fresh generation). */
  function replace(next: PromptPack) {
    const safe = normalizePack(next)!;
    setPackState(safe);
    persist(safe);
  }

  /** Apply an immutable update and schedule an autosave. */
  function update(updater: (prev: PromptPack) => PromptPack) {
    setPackState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      persist(next);
      return next;
    });
  }

  return { pack, isLoading, saveStatus, replace, update };
}
