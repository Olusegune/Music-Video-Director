/**
 * Auto-save hook — periodically saves project to persistence layer
 */

import { useEffect, useRef, useState } from "react";
import { saveProject, type DirectorProject } from "@/platform/lib/projectPersistence";

interface UseAutoSaveOptions {
  project: DirectorProject | null;
  interval?: number; // ms between saves
  enabled?: boolean;
}

export function useAutoSave({
  project,
  interval = 10000, // 10 seconds default
  enabled = true,
}: UseAutoSaveOptions) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !project) return;

    // Schedule auto-save
    timeoutRef.current = setInterval(() => {
      setIsSaving(true);
      setSaveError(null);
      (async () => {
        try {
          await saveProject(project);
          setLastSaved(new Date());
        } catch (err) {
          setSaveError((err as Error).message);
        } finally {
          setIsSaving(false);
        }
      })();
    }, interval);

    return () => {
      if (timeoutRef.current !== undefined) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [project, interval, enabled]);

  // Manual save function
  async function save() {
    if (!project) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveProject(project);
      setLastSaved(new Date());
      return true;
    } catch (err) {
      setSaveError((err as Error).message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    lastSaved,
    isSaving,
    saveError,
    save,
  };
}
