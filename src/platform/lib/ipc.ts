/*
 * Typed bridge to the Rust core.
 *
 * In a Tauri window, calls go through `invoke` to Rust commands.
 * In a plain browser (`npm run dev` without Tauri), they fall back to a
 * localStorage-backed mock so the whole UI is usable before Rust is installed.
 */
import type {
  BrandKit,
  Character,
  ConnectionResult,
  Environment,
  NewProject,
  Project,
  Prop,
  ProviderId,
  ProviderKeyStatus,
  ProviderBalance,
  PromptPack,
  UsageEntry,
} from "@/platform/lib/types";
import { packToMarkdown, normalizePack } from "@/platform/lib/pack";
import { buildBibleMarkdown, buildBibleJson } from "@/platform/lib/bibleExport";
import { generateLocalPack } from "@/platform/lib/localEngine";
import { loadProjectStyle } from "@/platform/lib/styles";
import {
  loadRouterConfig,
  notifyGenerationFallback,
  routeProviderChain,
} from "@/platform/lib/providers";
import { PROVIDERS } from "@/platform/lib/providers";
import { runWithProviderFallback, type GenerationSpec } from "@/platform/lib/generationSpec";
import { resolveReferences } from "@/platform/lib/referenceSystem";
import { generationSupportForProviderKey } from "@/platform/lib/modelRegistry";
import { notifyStorage } from "@/platform/lib/storage";
import { estimateCost } from "@/platform/lib/pricing";

/** Fire-and-forget spend tracking — computed from pricing.ts's estimate table,
 *  never awaited by the caller and never allowed to throw. Centralized here
 *  rather than at every generation call site; see generateImagePro,
 *  generateMvShotVideo, and generateMvAudio below for where it's invoked. */
function trackUsage(
  provider: string,
  model: string | undefined,
  capability: "image" | "video" | "audio" | "text",
  extra?: { moduleId?: string; projectId?: string }
): void {
  const { perUnit } = estimateCost(provider, model ?? "", capability, 1);
  void api.recordUsage({
    provider,
    model: model || "default",
    capability,
    moduleId: extra?.moduleId,
    projectId: extra?.projectId,
    costUsd: perUnit,
  });
}

/** Context the local engine needs; passed by the workspace so it works in Tauri too. */
export interface GenerateContext {
  brief?: string;
  project?: Project | null;
  styleId?: string;
  /** Storyboard template: exact panel count. */
  panels?: number;
  /** Storyboard template: duration override in seconds. */
  durationSeconds?: number;
}

export type ExportFormat = "markdown" | "json" | "pdf" | "docx";

export interface FfmpegStatus {
  available: boolean;
  path: string | null;
  version: string | null;
  /** True when the resolved binary is the app-managed copy. */
  managed: boolean;
}

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/** Turn an absolute local file path into a webview-loadable asset URL. */
/**
 * Generated media is stored as the raw local file path (small — keeps
 * localStorage well under quota). It is converted to a `data:` URL at render
 * time via `read_asset_data_url`, which always loads in the webview — unlike the
 * asset protocol, which is unreliable across installs.
 */
async function toAssetSrc(path: string): Promise<string> {
  return path;
}

// ---------------------------------------------------------------------------
// Browser mock (dev-only). Mirrors the Rust command surface.
// ---------------------------------------------------------------------------
const LS_PROJECTS = "mf.projects";
const LS_KEYS = "mf.providerKeys";
const LS_BRANDKITS = "mf.brandkits";
const LS_CHARACTERS = "mf.characters";
const LS_ENVIRONMENTS = "mf.environments";
const LS_PROPS = "mf.props";

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.warn(`[Director Studio] Could not read local mock storage key "${key}".`, error);
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function browserDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const ALL_PROVIDERS: ProviderId[] = PROVIDERS.map((p) => p.id);

/** Build the args the local engine needs from whatever context we have. */
function localPackFor(projectId: string, input: string, ctx?: GenerateContext): PromptPack {
  const project = ctx?.project ?? mock.listProjects().find((p) => p.id === projectId) ?? null;
  const styleId = ctx?.styleId ?? loadProjectStyle(projectId).preset;
  const brief = (ctx?.brief ?? input).trim();
  return normalizePack(
    generateLocalPack({
      project,
      brief,
      styleId,
      panels: ctx?.panels,
      durationSeconds: ctx?.durationSeconds,
    })
  )!;
}

const mock = {
  listProjects(): Project[] {
    return lsGet<Project[]>(LS_PROJECTS, []);
  },
  createProject(input: NewProject): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      type: input.type,
      status: "draft",
      aspectRatio: "16:9",
      duration: "30s",
      emotionalTone: "",
      createdAt: now,
      updatedAt: now,
    };
    const all = mock.listProjects();
    lsSet(LS_PROJECTS, [project, ...all]);
    return project;
  },
  deleteProject(id: string): void {
    lsSet(
      LS_PROJECTS,
      mock.listProjects().filter((p) => p.id !== id)
    );
  },
  listBrandKits(): BrandKit[] {
    return lsGet<BrandKit[]>(LS_BRANDKITS, []);
  },
  saveBrandKit(kit: BrandKit): void {
    const all = mock.listBrandKits();
    const idx = all.findIndex((k) => k.id === kit.id);
    if (idx >= 0) all[idx] = kit;
    else all.push(kit);
    lsSet(LS_BRANDKITS, all);
  },
  deleteBrandKit(id: string): void {
    lsSet(
      LS_BRANDKITS,
      mock.listBrandKits().filter((k) => k.id !== id)
    );
  },
  listCharacters(): Character[] {
    return lsGet<Character[]>(LS_CHARACTERS, []);
  },
  saveCharacter(character: Character): void {
    const all = mock.listCharacters();
    const idx = all.findIndex((c) => c.id === character.id);
    const next = { ...character, updatedAt: new Date().toISOString() };
    if (idx >= 0) all[idx] = next;
    else all.unshift(next);
    lsSet(LS_CHARACTERS, all);
  },
  deleteCharacter(id: string): void {
    lsSet(
      LS_CHARACTERS,
      mock.listCharacters().filter((c) => c.id !== id)
    );
  },
  generateCharacterPortrait(characterId: string): string {
    // Deterministic placeholder so the Bible shows a portrait in the browser.
    return `https://picsum.photos/seed/char-${characterId}-${Date.now()}/512/640`;
  },
  listEnvironments(): Environment[] {
    return lsGet<Environment[]>(LS_ENVIRONMENTS, []);
  },
  saveEnvironment(environment: Environment): void {
    const all = mock.listEnvironments();
    const idx = all.findIndex((e) => e.id === environment.id);
    const next = { ...environment, updatedAt: new Date().toISOString() };
    if (idx >= 0) all[idx] = next;
    else all.unshift(next);
    lsSet(LS_ENVIRONMENTS, all);
  },
  deleteEnvironment(id: string): void {
    lsSet(
      LS_ENVIRONMENTS,
      mock.listEnvironments().filter((e) => e.id !== id)
    );
  },
  generateEnvironmentImage(environmentId: string): string {
    return `https://picsum.photos/seed/env-${environmentId}-${Date.now()}/768/432`;
  },
  listProps(): Prop[] {
    return lsGet<Prop[]>(LS_PROPS, []);
  },
  saveProp(prop: Prop): void {
    const all = mock.listProps();
    const idx = all.findIndex((p) => p.id === prop.id);
    const next = { ...prop, updatedAt: new Date().toISOString() };
    if (idx >= 0) all[idx] = next;
    else all.unshift(next);
    lsSet(LS_PROPS, all);
  },
  deleteProp(id: string): void {
    lsSet(
      LS_PROPS,
      mock.listProps().filter((p) => p.id !== id)
    );
  },
  generatePropImage(propId: string): string {
    return `https://picsum.photos/seed/prop-${propId}-${Date.now()}/512/512`;
  },
  generateImagePro(provider: string, width: number, height: number): string {
    if (provider === "midjourney")
      throw new Error(
        "Midjourney has no public API. Use “Copy Prompt”, generate in Midjourney, then import the image."
      );
    // Deterministic large placeholder at the requested size so the Image Studio
    // shows a full-size sheet-shaped image in the browser.
    const w = Math.min(1600, Math.round(width));
    const h = Math.min(1600, Math.round(height));
    return `https://picsum.photos/seed/sheet-${provider}-${Date.now()}/${w}/${h}`;
  },
  generateMotionTest(): string {
    // Sample clip so the Animation Lab shows a playable video in the browser.
    return "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  },
  exportBible(format: ExportFormat): string {
    const characters = mock.listCharacters();
    const environments = mock.listEnvironments();
    const props = mock.listProps();
    if (format === "json") {
      browserDownload(
        buildBibleJson(characters, environments, props),
        "visual-bible.json",
        "application/json"
      );
      return "Downloaded";
    }
    if (format === "markdown") {
      browserDownload(
        buildBibleMarkdown(characters, environments, props),
        "visual-bible.md",
        "text/markdown"
      );
      return "Downloaded";
    }
    throw new Error("PDF and DOCX export are available in the desktop app.");
  },
  getProviderKeyStatuses(): ProviderKeyStatus[] {
    const keys = lsGet<Record<string, string>>(LS_KEYS, {});
    return ALL_PROVIDERS.map((provider) => ({
      provider,
      configured: Boolean(keys[provider]),
    }));
  },
  setProviderKey(provider: ProviderId, key: string): void {
    const keys = lsGet<Record<string, string>>(LS_KEYS, {});
    keys[provider] = key;
    lsSet(LS_KEYS, keys);
  },
  testProviderConnection(provider: ProviderId): ConnectionResult {
    const keys = lsGet<Record<string, string>>(LS_KEYS, {});
    if (!keys[provider]) return { status: "not_configured", message: "No key set." };
    // Browser dev can't make authenticated provider calls — report the key as
    // present but unverified, matching the desktop app's "untested" outcome.
    return {
      status: "untested",
      message: "Key stored (mock). Connection tests run in the desktop app.",
    };
  },
  clearProviderKey(provider: ProviderId): void {
    const keys = lsGet<Record<string, string>>(LS_KEYS, {});
    delete keys[provider];
    lsSet(LS_KEYS, keys);
  },
  generateShotImage(projectId: string, shotNumber: number): string {
    // Deterministic-ish placeholder so the storyboard shows a frame in the browser.
    return `https://picsum.photos/seed/${projectId}-${shotNumber}-${Date.now()}/640/360`;
  },
  generateShotVideo(): string {
    // Sample clip so the storyboard shows a playable video in the browser.
    return "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  },
  generateVoiceover(): string {
    // Sample audio so the Audio Director shows a playable clip in the browser.
    return "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";
  },
  exportProject(projectId: string, format: ExportFormat): string {
    const pack = mock.getLatestPack(projectId);
    const project = mock.listProjects().find((p) => p.id === projectId);
    if (!pack || !project) throw new Error("Generate a Prompt Pack first.");
    const slug = project.name.replace(/[^a-z0-9]/gi, "-");

    if (format === "json") {
      browserDownload(
        JSON.stringify({ project, pack }, null, 2),
        `${slug}.json`,
        "application/json"
      );
      return "Downloaded";
    }
    if (format === "markdown") {
      browserDownload(packToMarkdown(project, pack), `${slug}.md`, "text/markdown");
      return "Downloaded";
    }
    throw new Error("PDF and DOCX export are available in the desktop app.");
  },
  getLatestPack(projectId: string): PromptPack | null {
    return lsGet<PromptPack | null>(`mf.pack.${projectId}`, null);
  },
  savePack(projectId: string, pack: PromptPack): void {
    lsSet(`mf.pack.${projectId}`, pack);
  },
  generatePromptPack(projectId: string, input: string, ctx?: GenerateContext): PromptPack {
    // Real offline generation via the local creative engine.
    const pack = localPackFor(projectId, input, ctx);
    lsSet(`mf.pack.${projectId}`, pack);
    return pack;
  },
};

// ---------------------------------------------------------------------------
// Public API — identical shape whether backed by Rust or the mock.
// ---------------------------------------------------------------------------
export const api = {
  listProjects: () =>
    isTauri ? invoke<Project[]>("list_projects") : Promise.resolve(mock.listProjects()),

  createProject: (input: NewProject) =>
    isTauri
      ? invoke<Project>("create_project", { input })
      : Promise.resolve(mock.createProject(input)),

  deleteProject: (id: string) =>
    isTauri ? invoke<void>("delete_project", { id }) : Promise.resolve(mock.deleteProject(id)),

  getProviderKeyStatuses: () =>
    isTauri
      ? invoke<ProviderKeyStatus[]>("get_provider_key_statuses")
      : Promise.resolve(mock.getProviderKeyStatuses()),

  setProviderKey: (provider: ProviderId, key: string) =>
    isTauri
      ? invoke<void>("set_provider_key", { provider, key })
      : Promise.resolve(mock.setProviderKey(provider, key)),

  clearProviderKey: (provider: ProviderId) =>
    isTauri
      ? invoke<void>("clear_provider_key", { provider })
      : Promise.resolve(mock.clearProviderKey(provider)),

  testProviderConnection: (provider: ProviderId) =>
    isTauri
      ? invoke<ConnectionResult>("test_provider_connection", { provider })
      : Promise.resolve(mock.testProviderConnection(provider)),

  generatePromptPack: async (
    projectId: string,
    input: string,
    ctx?: GenerateContext
  ): Promise<PromptPack> => {
    const mode = loadRouterConfig().mode;
    // Local prompt-only mode (or any non-Tauri dev run) → offline engine.
    if (mode === "local" || !isTauri) {
      const pack = localPackFor(projectId, input, ctx);
      // Persist immediately so a cache-invalidate refetch reads fresh data
      // (otherwise it re-hydrates the stale pack before the debounced save).
      if (isTauri) await invoke<void>("save_pack", { projectId, pack });
      else mock.savePack(projectId, pack);
      return pack;
    }
    return invoke<PromptPack>("generate_prompt_pack", { projectId, input });
  },

  generateStructuredText: (
    provider: ProviderId,
    prompt: string,
    schema: string
  ): Promise<string> =>
    isTauri
      ? invoke<string>("generate_structured_text", { provider, prompt, schema })
      : Promise.reject(new Error("Provider-backed structured text runs in the desktop app.")),

  generateStructuredTextFromSpec: async (
    spec: GenerationSpec,
    schema: string
  ): Promise<string | null> => {
    if (spec.capability !== "text") {
      throw new Error(
        `generateStructuredTextFromSpec expected text capability, received ${spec.capability}`
      );
    }
    const router = loadRouterConfig();
    if (router.mode === "local") return null;
    const statuses = await api.getProviderKeyStatuses();
    const configured = new Set(
      statuses.filter((status) => status.configured).map((status) => status.provider as ProviderId)
    );
    const provider =
      routeProviderChain("text", router, configured, {
        providerPref: spec.providerPref,
        modelHint: spec.modelHint,
      })[0] ?? spec.providerPref;
    if (provider !== "gemini") return null;
    return api.generateStructuredText(provider, spec.prompt, schema);
  },

  getLatestPack: (projectId: string) =>
    isTauri
      ? invoke<PromptPack | null>("get_latest_pack", { projectId })
      : Promise.resolve(mock.getLatestPack(projectId)),

  savePack: (projectId: string, pack: PromptPack) =>
    isTauri
      ? invoke<void>("save_pack", { projectId, pack })
      : Promise.resolve(mock.savePack(projectId, pack)),

  generateShotImage: async (
    projectId: string,
    shotNumber: number,
    prompt: string,
    refs?: string[]
  ): Promise<string> =>
    isTauri
      ? toAssetSrc(
          await invoke<string>("generate_shot_image", {
            projectId,
            shotNumber,
            prompt,
            refs,
          })
        )
      : mock.generateShotImage(projectId, shotNumber),

  // Import a user-supplied image as a locked frame reference (Tauri only path).
  importShotImage: async (
    projectId: string,
    shotNumber: number,
    dataBase64: string,
    ext: string
  ): Promise<string> =>
    toAssetSrc(
      await invoke<string>("import_shot_image", {
        projectId,
        shotNumber,
        dataBase64,
        ext,
      })
    ),

  generateShotVideo: async (
    projectId: string,
    shotNumber: number,
    prompt: string
  ): Promise<string> =>
    isTauri
      ? toAssetSrc(
          await invoke<string>("generate_shot_video", {
            projectId,
            shotNumber,
            prompt,
          })
        )
      : mock.generateShotVideo(),

  generateVoiceover: async (
    projectId: string,
    shotNumber: number,
    text: string,
    voice?: string
  ): Promise<string> =>
    isTauri
      ? toAssetSrc(
          await invoke<string>("generate_voiceover", {
            projectId,
            shotNumber,
            text,
            voice,
          })
        )
      : mock.generateVoiceover(),

  exportProject: (projectId: string, format: ExportFormat) =>
    isTauri
      ? invoke<string>("export_project", { projectId, format })
      : Promise.resolve(mock.exportProject(projectId, format)),

  listCharacters: () =>
    isTauri ? invoke<Character[]>("list_characters") : Promise.resolve(mock.listCharacters()),

  saveCharacter: (character: Character) =>
    isTauri
      ? invoke<void>("save_character", { character })
      : Promise.resolve(mock.saveCharacter(character)),

  deleteCharacter: (id: string) =>
    isTauri ? invoke<void>("delete_character", { id }) : Promise.resolve(mock.deleteCharacter(id)),

  generateCharacterPortrait: async (characterId: string, prompt: string): Promise<string> =>
    isTauri
      ? toAssetSrc(
          await invoke<string>("generate_character_portrait", {
            characterId,
            prompt,
          })
        )
      : mock.generateCharacterPortrait(characterId),

  listEnvironments: () =>
    isTauri ? invoke<Environment[]>("list_environments") : Promise.resolve(mock.listEnvironments()),

  saveEnvironment: (environment: Environment) =>
    isTauri
      ? invoke<void>("save_environment", { environment })
      : Promise.resolve(mock.saveEnvironment(environment)),

  deleteEnvironment: (id: string) =>
    isTauri
      ? invoke<void>("delete_environment", { id })
      : Promise.resolve(mock.deleteEnvironment(id)),

  generateEnvironmentImage: async (environmentId: string, prompt: string): Promise<string> =>
    isTauri
      ? toAssetSrc(
          await invoke<string>("generate_environment_image", {
            environmentId,
            prompt,
          })
        )
      : mock.generateEnvironmentImage(environmentId),

  listProps: () => (isTauri ? invoke<Prop[]>("list_props") : Promise.resolve(mock.listProps())),

  saveProp: (prop: Prop) =>
    isTauri ? invoke<void>("save_prop", { prop }) : Promise.resolve(mock.saveProp(prop)),

  deleteProp: (id: string) =>
    isTauri ? invoke<void>("delete_prop", { id }) : Promise.resolve(mock.deleteProp(id)),

  generatePropImage: async (propId: string, prompt: string): Promise<string> =>
    isTauri
      ? toAssetSrc(await invoke<string>("generate_prop_image", { propId, prompt }))
      : mock.generatePropImage(propId),

  generateImagePro: async (
    provider: string,
    prompt: string,
    width: number,
    height: number,
    refs?: string[],
    seed?: number,
    model?: string,
    negativePrompt?: string,
    operation?: GenerationSpec["operation"],
    mask?: string,
    batch?: number
  ): Promise<string> => {
    if (!isTauri) return mock.generateImagePro(provider, width, height);
    const url = await toAssetSrc(
      await invoke<string>("generate_image_pro", {
        provider,
        prompt,
        width,
        height,
        refs,
        seed,
        model,
        negativePrompt,
        operation,
        mask,
        batch,
      })
    );
    trackUsage(provider, model, "image");
    return url;
  },

  generateImageFromSpec: async (spec: GenerationSpec): Promise<string> => {
    if (spec.capability !== "image") {
      throw new Error(
        `generateImageFromSpec expected image capability, received ${spec.capability}`
      );
    }
    const statuses = await api.getProviderKeyStatuses();
    const configured = new Set(
      statuses.filter((status) => status.configured).map((status) => status.provider as ProviderId)
    );
    const chain = routeProviderChain("image", loadRouterConfig(), configured, {
      providerPref: spec.providerPref,
      modelHint: spec.modelHint,
    });
    const providers = chain.length ? chain : spec.providerPref ? [spec.providerPref] : [];
    if (providers.length === 0) {
      if (!isTauri) {
        return mock.generateImagePro(
          "local",
          spec.resolution?.width ?? 1024,
          spec.resolution?.height ?? 1024
        );
      }
      throw new Error("Local router mode is active or no image provider is configured.");
    }
    return runWithProviderFallback(
      providers,
      (provider) => {
        // Each candidate may handle references differently — resolve per provider,
        // and tell the user when one had to be dropped.
        const refs = resolveReferences(
          spec.references,
          generationSupportForProviderKey(provider, "image").references
        );
        if (refs.notice) notifyStorage(refs.notice);
        return api.generateImagePro(
          provider,
          spec.prompt,
          spec.resolution?.width ?? 1024,
          spec.resolution?.height ?? 1024,
          refs.used.map((reference) => reference.url),
          spec.seed,
          spec.modelHint,
          spec.negativePrompt,
          spec.operation,
          spec.mask,
          spec.batch
        );
      },
      { onFallback: notifyGenerationFallback }
    );
  },

  generateMotionTest: async (prompt: string): Promise<string> =>
    isTauri
      ? toAssetSrc(await invoke<string>("generate_motion_test", { prompt }))
      : mock.generateMotionTest(),

  // ----- Music Video (song-keyed) ----------------------------------------

  /** Generate a per-shot clip for the MV flow. `provider` picks the video model
   * (fal / google_veo / replicate); empty/auto = first configured. */
  generateMvShotVideo: async (
    songId: string,
    shotId: string,
    prompt: string,
    provider?: string,
    refs?: string[],
    model?: string,
    extras?: {
      endFrame?: string;
      audioRefs?: string[];
      videoRefs?: string[];
      duration?: number;
      resolution?: string;
      generateAudio?: boolean;
    }
  ): Promise<string> => {
    if (!isTauri) return mock.generateShotVideo();
    const url = await toAssetSrc(
      await invoke<string>("generate_mv_shot_video", {
        songId,
        shotId,
        prompt,
        provider,
        refs,
        model,
        endFrame: extras?.endFrame,
        audioRefs: extras?.audioRefs,
        videoRefs: extras?.videoRefs,
        duration: extras?.duration,
        resolution: extras?.resolution,
        generateAudio: extras?.generateAudio,
      })
    );
    trackUsage(provider ?? "unknown", model, "video", {
      moduleId: "musicvideo",
      projectId: songId,
    });
    return url;
  },

  generateVideoFromSpec: async (
    spec: GenerationSpec,
    songId = spec.projectRef?.projectId ?? "generation-spec",
    shotId = spec.projectRef?.entityId ?? `shot-${Date.now()}`,
    extras?: {
      endFrame?: string;
      audioRefs?: string[];
      videoRefs?: string[];
      duration?: number;
      resolution?: string;
      generateAudio?: boolean;
    }
  ): Promise<string> => {
    if (spec.capability !== "video") {
      throw new Error(
        `generateVideoFromSpec expected video capability, received ${spec.capability}`
      );
    }
    const statuses = await api.getProviderKeyStatuses();
    const configured = new Set(
      statuses.filter((status) => status.configured).map((status) => status.provider as ProviderId)
    );
    const chain = routeProviderChain("video", loadRouterConfig(), configured, {
      providerPref: spec.providerPref,
      modelHint: spec.modelHint,
    });
    const providers = chain.length ? chain : spec.providerPref ? [spec.providerPref] : [];
    if (providers.length === 0) {
      if (!isTauri) return mock.generateShotVideo();
      throw new Error("Local router mode is active or no video provider is configured.");
    }
    return runWithProviderFallback(
      providers,
      (provider) => {
        const refs = resolveReferences(
          spec.references,
          generationSupportForProviderKey(provider, "video").references
        );
        if (refs.notice) notifyStorage(refs.notice);
        return api.generateMvShotVideo(
          songId,
          shotId,
          spec.prompt,
          provider,
          refs.used.map((reference) => reference.url),
          spec.modelHint,
          { ...extras, resolution: extras?.resolution ?? spec.resolution?.label }
        );
      },
      { onFallback: notifyGenerationFallback }
    );
  },

  /** Generate a spoken/vocal audio layer (intro tags, ad-libs, narration). */
  generateMvAudio: async (
    songId: string,
    text: string,
    voice?: string,
    provider?: string
  ): Promise<string> => {
    if (!isTauri) return mock.generateVoiceover();
    const url = await toAssetSrc(
      await invoke<string>("generate_mv_audio", { songId, text, voice, provider })
    );
    trackUsage(provider ?? "elevenlabs", voice, "audio", {
      moduleId: "musicvideo",
      projectId: songId,
    });
    return url;
  },

  /** Persist imported song audio to disk (Tauri only). Returns its file path. */
  importSongAudio: async (songId: string, dataBase64: string, ext: string): Promise<string> =>
    isTauri
      ? invoke<string>("import_song_audio", { songId, dataBase64, ext })
      : Promise.resolve(""),

  /**
   * Cut a slice of the song's own imported audio for one shot's time range,
   * so clip generation can hand the video model real audio to lip-sync
   * against instead of nothing. Returns a file path (Tauri only — no FFmpeg
   * in the browser, so the mock returns null and callers fall back to
   * whatever audioRefs the shot already has, usually none).
   */
  sliceSongAudio: async (
    songId: string,
    startSec: number,
    durationSec: number
  ): Promise<string | null> =>
    isTauri
      ? invoke<string>("slice_song_audio", { songId, startSec, durationSec })
      : Promise.resolve(null),

  /**
   * Render the timeline segments + audio into one MP4 via the Rust/FFmpeg core.
   * Returns a displayable src for the finished video. In the browser there is no
   * FFmpeg, so the mock returns a sample clip so the UI flow is exercisable.
   */
  renderMusicVideo: async (
    songId: string,
    audioPath: string | null,
    segments: { src: string; duration: number }[],
    voiceLayers?: { src: string; atSec: number; volume: number; duck: boolean }[],
    width?: number,
    height?: number,
    fps?: number
  ): Promise<string> =>
    isTauri
      ? toAssetSrc(
          await invoke<string>("render_music_video", {
            songId,
            audioPath,
            segments,
            voiceLayers,
            width,
            height,
            fps,
          })
        )
      : mock.generateShotVideo(),

  /** Detect a usable FFmpeg (env → managed copy → PATH). */
  checkFfmpeg: (): Promise<FfmpegStatus> =>
    isTauri
      ? invoke<FfmpegStatus>("check_ffmpeg")
      : Promise.resolve({ available: false, path: null, version: null, managed: false }),

  /** One-click download + install of a static FFmpeg build (desktop only). */
  installFfmpeg: (): Promise<string> =>
    isTauri
      ? invoke<string>("install_ffmpeg")
      : Promise.reject(
          new Error("Automatic install runs in the desktop app. See the guided steps in Help.")
        ),

  exportBible: (format: ExportFormat) =>
    isTauri
      ? invoke<string>("export_bible", { format })
      : Promise.resolve(mock.exportBible(format)),

  /** Resolve a stored local file path to a displayable data: URL (Tauri only). */
  assetDataUrl: (path: string) =>
    isTauri ? invoke<string>("read_asset_data_url", { path }) : Promise.resolve(path),

  listBrandKits: () =>
    isTauri ? invoke<BrandKit[]>("list_brand_kits") : Promise.resolve(mock.listBrandKits()),

  saveBrandKit: (kit: BrandKit) =>
    isTauri ? invoke<void>("save_brand_kit", { kit }) : Promise.resolve(mock.saveBrandKit(kit)),

  deleteBrandKit: (id: string) =>
    isTauri ? invoke<void>("delete_brand_kit", { id }) : Promise.resolve(mock.deleteBrandKit(id)),

  // ----- Spend tracking ----------------------------------------------------

  /** Append one self-tracked usage entry (see pricing.ts). Fire-and-forget —
   *  never throws, so a tracking hiccup can't break generation. Browser dev
   *  mode has no local DB to log to, so it's a no-op there. */
  recordUsage: async (entry: {
    provider: string;
    model: string;
    capability: string;
    moduleId?: string;
    projectId?: string;
    units?: number;
    costUsd: number;
  }): Promise<void> => {
    if (!isTauri) return;
    try {
      await invoke<void>("record_usage", {
        provider: entry.provider,
        model: entry.model,
        capability: entry.capability,
        moduleId: entry.moduleId,
        projectId: entry.projectId,
        units: entry.units,
        costUsd: entry.costUsd,
      });
    } catch {
      /* tracking must never break generation */
    }
  },

  /** `since`: RFC3339 lower bound (inclusive), e.g. start of the current month. */
  listUsage: (since?: string): Promise<UsageEntry[]> =>
    isTauri ? invoke<UsageEntry[]>("list_usage", { since }) : Promise.resolve([]),

  /** Real account balance for the couple of providers that expose one
   *  (Stability, ElevenLabs today) — null if unavailable or not configured. */
  checkProviderBalance: (provider: string): Promise<ProviderBalance | null> =>
    isTauri
      ? invoke<ProviderBalance | null>("check_provider_balance", { provider })
      : Promise.resolve(null),
};
