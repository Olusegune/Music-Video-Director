import { loadActiveTemplateId } from "@/platform/lib/templates";

export interface BoundProduction {
  id: string;
  templateId?: string | null;
}

export interface AppBindings {
  loadProductions?: () => BoundProduction[];
  saveProductionTemplate?: (id: string, templateId: string | null) => void;
  loadDemoProduction?: () => Promise<string>;
}

const bindings: AppBindings = {};

export function registerAppBindings(next: AppBindings): void {
  Object.assign(bindings, next);
}

export function loadBoundProductions(): BoundProduction[] {
  return bindings.loadProductions?.() ?? [];
}

export function saveBoundProductionTemplate(id: string, templateId: string | null): void {
  bindings.saveProductionTemplate?.(id, templateId);
}

export function loadBoundDemoProduction(): Promise<string> {
  if (!bindings.loadDemoProduction) {
    return Promise.reject(new Error("No demo production is registered."));
  }
  return bindings.loadDemoProduction();
}

export function templateForBoundProduction(productionId: string | null): string | null {
  if (productionId) {
    const production = loadBoundProductions().find((x) => x.id === productionId);
    if (production) return production.templateId ?? null;
  }
  return loadActiveTemplateId();
}
