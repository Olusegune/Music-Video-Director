import { useEffect } from "react";
import { useAppStore, type OpenableModuleId } from "@/platform/store/useAppStore";

/**
 * On mount (and whenever a new deep-open is requested), apply the pending
 * project-open for this module: the module supplies how to select a project id
 * in its own state. Consuming clears the signal so it fires once.
 */
export function usePendingProjectOpen(
  moduleId: OpenableModuleId,
  apply: (projectId: string) => void
): void {
  const pending = useAppStore((s) => s.pendingProjectOpen);
  const consume = useAppStore((s) => s.consumePendingProjectOpen);
  useEffect(() => {
    if (pending && pending.moduleId === moduleId) {
      const id = consume(moduleId);
      if (id) apply(id);
    }
    // `apply` is intentionally excluded — modules pass a fresh closure each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, moduleId, consume]);
}
