// Non-secret provider metadata for the API Key Dashboard: whether a provider is
// enabled, and the result + timestamp of the last connection test. Secrets live
// in the OS keychain (Rust); this is just UI state, so localStorage is the right
// home (it persists in both the Tauri webview and browser dev).

import type { ConnectionStatus, ProviderId } from "@/lib/types";

export interface ProviderMeta {
  /** Disabled providers are skipped by the router and dimmed in the UI. */
  enabled: boolean;
  /** Status from the most recent Test Connection, if any. */
  lastStatus?: ConnectionStatus;
  /** ISO timestamp of the last successful connection (status === connected). */
  lastConnectedAt?: string;
  /** ISO timestamp of the last test of any outcome. */
  lastCheckedAt?: string;
}

/** What each provider can do — drives the health dashboard's Capabilities column
 *  and lets the UI hide options a provider can't perform. */
export const PROVIDER_CAPABILITIES: Record<string, string[]> = {
  openai: ["Image", "Image edit", "Text"],
  google_imagen: ["Image", "Text", "Analysis"],
  gemini: ["Image", "Text", "Analysis"],
  fal: ["Image", "Video", "Motion"],
  kie: ["Image", "Video"],
  stability: ["Image"],
  replicate: ["Image", "Video"],
  midjourney: ["Image (manual)"],
  google_veo: ["Video"],
  elevenlabs: ["Voice"],
};

export function capabilitiesFor(id: string): string[] {
  return PROVIDER_CAPABILITIES[id] ?? [];
}

const LS = "mf.providerMeta";

type MetaMap = Partial<Record<ProviderId, ProviderMeta>>;

function load(): MetaMap {
  try {
    const raw = localStorage.getItem(LS);
    return raw ? (JSON.parse(raw) as MetaMap) : {};
  } catch {
    return {};
  }
}

function persist(map: MetaMap) {
  localStorage.setItem(LS, JSON.stringify(map));
}

/** Providers are enabled by default; only an explicit `false` disables them. */
export function getMeta(id: ProviderId): ProviderMeta {
  const m = load()[id];
  return { enabled: m?.enabled !== false, ...m };
}

export function getAllMeta(): MetaMap {
  return load();
}

export function setMeta(id: ProviderId, patch: Partial<ProviderMeta>) {
  const map = load();
  map[id] = { enabled: true, ...map[id], ...patch };
  persist(map);
}

export function recordTest(id: ProviderId, status: ConnectionStatus) {
  const now = new Date().toISOString();
  const patch: Partial<ProviderMeta> = { lastStatus: status, lastCheckedAt: now };
  if (status === "connected") patch.lastConnectedAt = now;
  setMeta(id, patch);
}
