export type SeedTarget = "glamstudio" | "webstudio" | "motionstudio";

export interface SeedContext {
  campaignId: string;
  campaignName: string;
  sourceDeliverableId: string;
  brandDnaId: string;
  product: string;
  goal: string;
  audience: string;
  messaging: { promise: string; pillars: string[]; tagline: string };
  lookId?: string;
}

const key = (target: SeedTarget) => `mf.seedContext.${target}`;

export function setSeedContext(target: SeedTarget, context: SeedContext) {
  localStorage.setItem(key(target), JSON.stringify(context));
}

export function consumeSeedContext(target: SeedTarget): SeedContext | null {
  try {
    const raw = localStorage.getItem(key(target));
    if (!raw) return null;
    localStorage.removeItem(key(target));
    return JSON.parse(raw) as SeedContext;
  } catch {
    localStorage.removeItem(key(target));
    return null;
  }
}
