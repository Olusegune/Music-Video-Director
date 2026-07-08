import { listDeliverables } from "@/platform/lib/deliverables";
import { loadAssets } from "@/platform/lib/generatedAssets";
import { listLoopRuns } from "@/platform/lib/loopEngine";
import { useAppStore } from "@/platform/store/useAppStore";
import { useTheme } from "@/platform/store/useTheme";

export interface StartupReadiness {
  appShellMounted: boolean;
  storesHydrated: boolean;
}

let readiness: StartupReadiness = {
  appShellMounted: false,
  storesHydrated: false,
};
const listeners = new Set<() => void>();

function publish(next: Partial<StartupReadiness>) {
  readiness = { ...readiness, ...next };
  listeners.forEach((listener) => listener());
}

export function getStartupReadiness(): StartupReadiness {
  return readiness;
}

export function subscribeStartupReadiness(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markAppShellMounted() {
  publish({ appShellMounted: true });
}

export function hydrateStartupStores() {
  useAppStore.getState();
  useTheme.getState();
  listDeliverables();
  listLoopRuns();
  loadAssets();
  publish({ storesHydrated: true });
}

export function resetStartupReadinessForTests() {
  readiness = {
    appShellMounted: false,
    storesHydrated: false,
  };
}
