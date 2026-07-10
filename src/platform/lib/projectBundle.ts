// .dsproj — a portable Director Studio project bundle.
//
// A bundle is an umbrella (optional) plus the raw records of the projects it
// contains, plus their deliverables. It is a plain JSON document so it stays
// diffable, inspectable, and trivially repairable by hand.
//
// Ids are preserved on import, never remapped. Records reference each other by
// id internally (a campaign plan item points at a deliverable id), and the hub
// cannot see inside a module's shape to rewrite those. Preserving ids keeps
// every internal reference intact; the cost is that importing a bundle into the
// workspace it came from finds the projects already present, and skips them.
// That is the honest trade: bundles move work between workspaces.

import {
  projectExists,
  readProjectRecord,
  writeProjectRecord,
  type HubModuleId,
} from "@/platform/lib/projectHub";
import {
  getDirectorProject,
  saveDirectorProject,
  umbrellaFor,
  type DirectorProject,
  type ProjectRef,
} from "@/platform/lib/directorProject";
import {
  listDeliverables,
  upsertDeliverables,
  type Deliverable,
} from "@/platform/lib/deliverables";

export const BUNDLE_FORMAT = "director-studio-project";
export const BUNDLE_FORMAT_VERSION = 1;

// --- embedded assets -------------------------------------------------------
//
// Generated media lives on disk as an absolute local path, which resolves on
// exactly one machine. A bundle that carried only the paths would arrive at the
// far end full of broken images. So we walk every record, find the paths, and
// inline the bytes as data URLs — within a budget, because these end up back in
// localStorage on import.

export const ASSET_TOKEN_PREFIX = "dsproj:asset:";

/** Per-asset and whole-bundle ceilings for embedded bytes. */
export const PER_ASSET_MAX_BYTES = 2 * 1024 * 1024;
export const TOTAL_ASSET_MAX_BYTES = 6 * 1024 * 1024;

const PASSTHROUGH = /^(https?:|data:|blob:)/i;
const MEDIA_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|svg|mp4|mov|webm|mkv|mp3|wav|m4a|ogg)$/i;

/** A string that names a local media file we could embed. */
export function looksLikeAssetPath(value: string): boolean {
  if (!value || PASSTHROUGH.test(value)) return false;
  if (value.startsWith(ASSET_TOKEN_PREFIX)) return false;
  if (!/[\\/]/.test(value)) return false;
  return MEDIA_EXT.test(value.split("?")[0]);
}

export type AssetOmission = "too-large" | "unreadable" | "budget-exceeded";

export interface BundleAsset {
  id: string;
  /** The original on-disk path, kept so a same-machine import still resolves. */
  originalRef: string;
  dataUrl?: string;
  bytes?: number;
  omitted?: AssetOmission;
}

/** Every distinct local media path reachable inside a JSON value. */
export function collectAssetRefs(value: unknown, found = new Set<string>()): string[] {
  if (typeof value === "string") {
    if (looksLikeAssetPath(value)) found.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectAssetRefs(item, found);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectAssetRefs(item, found);
  }
  return [...found];
}

/** Deep-clone a JSON value, swapping every string found in `map`. */
export function mapStrings(value: unknown, map: Map<string, string>): unknown {
  if (typeof value === "string") return map.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, map));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = mapStrings(item, map);
    return out;
  }
  return value;
}

function approxBytesOfDataUrl(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

export interface BundledProject {
  moduleId: HubModuleId;
  projectId: string;
  role?: string;
  record: unknown;
}

export interface ProjectBundle {
  format: typeof BUNDLE_FORMAT;
  formatVersion: number;
  exportedAt: string;
  appVersion?: string;
  /** Present when the bundle came from a DirectorProject umbrella. */
  umbrella?: DirectorProject;
  projects: BundledProject[];
  deliverables: Deliverable[];
  /** Media inlined from local paths. Absent on a records-only bundle. */
  assets?: BundleAsset[];
}

export interface ImportResult {
  imported: ProjectRef[];
  /** Already present in this workspace, left untouched. */
  skipped: ProjectRef[];
  /** In the bundle but the module could not accept them. */
  failed: ProjectRef[];
  umbrellaName?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Collect the deliverables belonging to any of these projects. */
function deliverablesFor(refs: ProjectRef[]): Deliverable[] {
  const wanted = new Set(refs.map((ref) => `${ref.moduleId}:${ref.projectId}`));
  return listDeliverables().filter((item) => wanted.has(`${item.moduleId}:${item.projectId}`));
}

/**
 * Bundle a project. When the project belongs to an umbrella the whole umbrella
 * travels — a campaign exports with its hero imagery and landing page.
 */
export function exportBundle(
  moduleId: HubModuleId,
  projectId: string,
  appVersion?: string
): ProjectBundle | null {
  const umbrella = getDirectorProject(projectId) ?? umbrellaFor(moduleId, projectId);
  const refs: ProjectRef[] = umbrella ? umbrella.members : [{ moduleId, projectId }];

  const projects: BundledProject[] = [];
  for (const ref of refs) {
    const record = readProjectRecord(ref.moduleId, ref.projectId);
    if (record == null) continue; // module cannot serialize; omit rather than lie
    projects.push({
      moduleId: ref.moduleId,
      projectId: ref.projectId,
      role: ref.role,
      record,
    });
  }
  if (projects.length === 0) return null;

  return {
    format: BUNDLE_FORMAT,
    formatVersion: BUNDLE_FORMAT_VERSION,
    exportedAt: nowIso(),
    appVersion,
    umbrella: umbrella ?? undefined,
    projects,
    deliverables: deliverablesFor(
      projects.map((p) => ({ moduleId: p.moduleId, projectId: p.projectId }))
    ),
  };
}

/** Resolves a local media path to a data URL. Injected so this stays testable. */
export type AssetResolver = (ref: string) => Promise<string>;

export interface AttachAssetsOptions {
  resolve: AssetResolver;
  perAssetMaxBytes?: number;
  totalMaxBytes?: number;
}

/**
 * Inline every local media file the bundle references, replacing each path with
 * a token. Assets that are too large, unreadable, or past the budget are listed
 * with a reason and keep their original path — the bundle never silently lies
 * about what it contains.
 */
export async function attachAssets(
  bundle: ProjectBundle,
  options: AttachAssetsOptions
): Promise<ProjectBundle> {
  const perAssetMax = options.perAssetMaxBytes ?? PER_ASSET_MAX_BYTES;
  const totalMax = options.totalMaxBytes ?? TOTAL_ASSET_MAX_BYTES;

  const refs = collectAssetRefs({
    projects: bundle.projects.map((p) => p.record),
    deliverables: bundle.deliverables,
  });
  if (refs.length === 0) return { ...bundle, assets: [] };

  const assets: BundleAsset[] = [];
  const tokens = new Map<string, string>();
  let spent = 0;

  for (const [index, ref] of refs.entries()) {
    const id = `a${index}`;
    tokens.set(ref, `${ASSET_TOKEN_PREFIX}${id}`);
    const asset: BundleAsset = { id, originalRef: ref };
    try {
      const dataUrl = await options.resolve(ref);
      if (!dataUrl || !dataUrl.startsWith("data:")) {
        asset.omitted = "unreadable";
      } else {
        const bytes = approxBytesOfDataUrl(dataUrl);
        if (bytes > perAssetMax) asset.omitted = "too-large";
        else if (spent + bytes > totalMax) asset.omitted = "budget-exceeded";
        else {
          asset.dataUrl = dataUrl;
          asset.bytes = bytes;
          spent += bytes;
        }
      }
    } catch {
      asset.omitted = "unreadable";
    }
    assets.push(asset);
  }

  return {
    ...bundle,
    projects: bundle.projects.map((project) => ({
      ...project,
      record: mapStrings(project.record, tokens),
    })),
    deliverables: mapStrings(bundle.deliverables, tokens) as Deliverable[],
    assets,
  };
}

/** Export with media embedded. The whole-umbrella rule still applies. */
export async function exportBundleWithAssets(
  moduleId: HubModuleId,
  projectId: string,
  options: AttachAssetsOptions & { appVersion?: string }
): Promise<ProjectBundle | null> {
  const bundle = exportBundle(moduleId, projectId, options.appVersion);
  return bundle ? attachAssets(bundle, options) : null;
}

/** How many assets travelled, and what didn't. For an honest export toast. */
export function summarizeAssets(bundle: ProjectBundle): {
  embedded: number;
  omitted: number;
  bytes: number;
} {
  const assets = bundle.assets ?? [];
  return {
    embedded: assets.filter((asset) => asset.dataUrl).length,
    omitted: assets.filter((asset) => asset.omitted).length,
    bytes: assets.reduce((sum, asset) => sum + (asset.bytes ?? 0), 0),
  };
}

/** Turn tokens back into data URLs (or the original path when not embedded). */
function assetRestoreMap(bundle: ProjectBundle): Map<string, string> {
  const map = new Map<string, string>();
  for (const asset of bundle.assets ?? []) {
    map.set(`${ASSET_TOKEN_PREFIX}${asset.id}`, asset.dataUrl ?? asset.originalRef);
  }
  return map;
}

export function bundleFilename(bundle: ProjectBundle): string {
  const base =
    bundle.umbrella?.name ??
    (bundle.projects[0]?.record as { name?: string } | undefined)?.name ??
    "project";
  const slug = base.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "project";
  return `${slug.toLowerCase()}.dsproj`;
}

/** Parse and validate untrusted bundle text. Throws with a readable reason. */
export function parseBundle(text: string): ProjectBundle {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const bundle = raw as Partial<ProjectBundle>;
  if (bundle?.format !== BUNDLE_FORMAT) {
    throw new Error("That file is not a Director Studio project bundle.");
  }
  if (typeof bundle.formatVersion !== "number" || bundle.formatVersion > BUNDLE_FORMAT_VERSION) {
    throw new Error(
      `This bundle was made by a newer Director Studio (format ${bundle.formatVersion}). Update to open it.`
    );
  }
  if (!Array.isArray(bundle.projects) || bundle.projects.length === 0) {
    throw new Error("That bundle contains no projects.");
  }
  for (const project of bundle.projects) {
    if (!project?.moduleId || !project?.projectId || project.record == null) {
      throw new Error("That bundle is missing project data.");
    }
  }
  return {
    ...bundle,
    deliverables: Array.isArray(bundle.deliverables) ? bundle.deliverables : [],
    assets: Array.isArray(bundle.assets) ? bundle.assets : [],
  } as ProjectBundle;
}

/**
 * Write a bundle into this workspace. Existing ids are never overwritten — a
 * project already here is reported as skipped, so importing twice is safe.
 */
export function importBundle(bundle: ProjectBundle): ImportResult {
  const imported: ProjectRef[] = [];
  const skipped: ProjectRef[] = [];
  const failed: ProjectRef[] = [];

  // Rehydrate embedded media before anything reaches a module's store, so a
  // record never lands holding a token it cannot render.
  const restore = assetRestoreMap(bundle);

  for (const project of bundle.projects) {
    const ref: ProjectRef = {
      moduleId: project.moduleId,
      projectId: project.projectId,
      role: project.role,
    };
    if (projectExists(project.moduleId, project.projectId)) {
      skipped.push(ref);
      continue;
    }
    const record = restore.size ? mapStrings(project.record, restore) : project.record;
    if (writeProjectRecord(project.moduleId, record)) imported.push(ref);
    else failed.push(ref);
  }

  // Deliverables only for projects that actually landed.
  const landed = new Set(imported.map((ref) => `${ref.moduleId}:${ref.projectId}`));
  const deliverables = (
    restore.size ? (mapStrings(bundle.deliverables, restore) as Deliverable[]) : bundle.deliverables
  ).filter((item) => landed.has(`${item.moduleId}:${item.projectId}`));
  if (deliverables.length) upsertDeliverables(deliverables);

  // Recreate the umbrella, keeping only members that exist here now.
  if (bundle.umbrella && imported.length) {
    const existing = getDirectorProject(bundle.umbrella.id);
    const members = bundle.umbrella.members.filter(
      (member) =>
        landed.has(`${member.moduleId}:${member.projectId}`) ||
        projectExists(member.moduleId, member.projectId)
    );
    saveDirectorProject({
      ...bundle.umbrella,
      members: existing
        ? [
            ...existing.members.filter(
              (member) =>
                !members.some(
                  (m) => m.moduleId === member.moduleId && m.projectId === member.projectId
                )
            ),
            ...members,
          ]
        : members,
      createdAt: existing?.createdAt ?? bundle.umbrella.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });
  }

  return { imported, skipped, failed, umbrellaName: bundle.umbrella?.name };
}
