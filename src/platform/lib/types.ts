// Shared domain types — mirror the SQLite schema in MOTIONFORGE_PLAN.md §5.
import type { TextLockItem } from "@/platform/lib/textlock";
import type { AudioDirection } from "@/platform/lib/audio";

export type ProjectType =
  | "SaaS Product"
  | "Social Ad"
  | "AI Tool"
  | "Documentary"
  | "Explainer"
  | "Education"
  | "Product Launch"
  | "Finance"
  | "Historical"
  | "Custom";

export type ProjectStatus = "draft" | "in_progress" | "review" | "done";

export interface Project {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  aspectRatio: string;
  duration: string;
  emotionalTone: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewProject {
  name: string;
  description: string;
  type: ProjectType;
}

// The capabilities the provider layer exposes (see plan §4).
export type Capability = "text" | "image" | "video";

export type ProviderId =
  | "gemini"
  | "openai"
  | "fal"
  | "kie"
  | "google_imagen"
  | "google_veo"
  | "nano_banana"
  | "nano_banana_pro"
  | "gpt_image"
  | "stability"
  | "midjourney"
  | "runway"
  | "kling"
  | "luma"
  | "pika"
  | "elevenlabs"
  | "suno"
  | "replicate"
  | "local_endpoint"
  | "grok"
  | "wavespeed"
  | "happyhorse"
  | "minimax"
  | "recraft"
  | "ideogram";

export interface ProviderKeyStatus {
  provider: ProviderId;
  /** Whether a key is stored in the OS keychain. The key itself never leaves Rust. */
  configured: boolean;
}

/** One self-tracked generation-spend entry (mirrors Rust UsageEntry). */
export interface UsageEntry {
  id: string;
  provider: string;
  model: string;
  capability: string;
  moduleId: string;
  projectId: string;
  units: number;
  costUsd: number;
  createdAt: string;
}

/** Real account balance/usage from a provider's own API (mirrors Rust
 *  ProviderBalance) — only available for the couple of providers that
 *  expose one through the same key used for generation. */
export interface ProviderBalance {
  provider: string;
  label: string;
  remaining: number;
  unit: string;
}

/** Outcome of a Test Connection probe (mirrors Rust ConnectionResult). */
export type ConnectionStatus = "connected" | "invalid" | "offline" | "untested" | "not_configured";

export interface ConnectionResult {
  status: ConnectionStatus;
  message: string;
}

// Character DNA — the persistent source of truth for one character. Every
// structured field below feeds the composed Prompt DNA, which is what keeps the
// character consistent across every generated image and video. Mirrors the
// Rust `Character` struct in models.rs.
export interface Character {
  id: string;
  // Identity
  name: string;
  age: string;
  gender: string;
  occupation: string;
  /** Narrative role — Protagonist, Antagonist, Supporting, … */
  role: string;
  // Appearance
  faceShape: string;
  eyeShape: string;
  eyeColor: string;
  hairStyle: string;
  hairColor: string;
  bodyType: string;
  skinTone: string;
  distinguishingFeatures: string;
  // Wardrobe
  primaryOutfit: string;
  secondaryOutfit: string;
  accessories: string;
  // Personality
  traits: string;
  motivations: string;
  fears: string;
  goals: string;
  // Visual binding — links to the Style Engine preset id.
  stylePreset: string;
  // Generation
  /** Composed positive prompt seed — the consistency anchor. */
  promptDna: string;
  /** Lock rules / negatives applied to keep the character on-model. */
  consistencyRules: string;
  /** Approved reference / generated portrait image srcs. */
  referenceImages: string[];
  /** Canonical hero portrait src (the locked face). */
  portraitUrl: string;
  /** Consistency Lock — when true the character is canonical. */
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

// Environment DNA — persistent source of truth for one location. Mirrors the
// Rust `Environment` struct.
export interface Environment {
  id: string;
  name: string;
  description: string;
  architecture: string;
  timeOfDay: string;
  mood: string;
  lightingStyle: string;
  colorPalette: string[];
  materials: string;
  /** Notable props/set dressing present in the environment. */
  keyProps: string;
  environmentRules: string;
  stylePreset: string;
  promptDna: string;
  consistencyRules: string;
  referenceImages: string[];
  /** Canonical establishing-shot src. */
  establishingUrl: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

// Prop DNA — covers props, vehicles, and creatures via `category`. Mirrors the
// Rust `Prop` struct.
export interface Prop {
  id: string;
  name: string;
  /** Prop | Vehicle | Creature | Weapon | Wardrobe | Set Dressing */
  category: string;
  dimensions: string;
  materials: string;
  condition: string;
  colorPalette: string[];
  usage: string;
  storySignificance: string;
  stylePreset: string;
  promptDna: string;
  consistencyRules: string;
  referenceImages: string[];
  /** Canonical hero-render src. */
  heroUrl: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandKit {
  id: string;
  name: string;
  colors: string[];
  fonts: string;
  voice: string;
  visualRules: string;
}

// A MotionForge Prompt Pack, structured for editable rendering rather than prose.
export interface PromptPack {
  creativeDirection: {
    workingTitle: string;
    goal: string;
    audience: string;
    duration: string;
    aspectRatio: string;
    emotionalTone: string;
    recommendedModels: string[];
  };
  style: {
    visualLanguage: string;
    colorPalette: string[];
    typography: string;
    materials: string;
    mood: string;
    atmosphere: string;
  };
  shots: ShotBreakdown[];
  /** Text Lock system — words/elements with their AI-safety lock states. */
  textLocks: TextLockItem[];
  /** Audio Director — voiceover, music, SFX, sound design. */
  audio: AudioDirection;
  /** Reference Hierarchy — ordered reference sources, highest priority first. */
  referenceHierarchy: string[];
  qcChecklist: { label: string; checked: boolean }[];
}

export interface ShotBreakdown {
  number: number;
  name: string;
  purpose: string;
  duration: string;
  visualDescription: string;
  cameraMovement: string;
  transition: string;
  audio: string;
  locked: boolean;
  /** Displayable src for the generated storyboard frame (empty until generated). */
  imageUrl: string;
  /** Displayable src for the generated shot video (empty until generated). */
  videoUrl: string;
  /** Attached production-asset references (Character/Set/Prop) for generation. */
  refImages?: string[];
  camera: CameraPlan;
  lighting: LightingPlan;
}

// Cinematic Director layer (spec §4 / FR-005).
export interface CameraPlan {
  shotType: string;
  lens: string;
  cameraHeight: string;
  cameraAngle: string;
  movement: string;
  composition: string;
  emotionalPurpose: string;
  editorialPurpose: string;
  notes: string;
}

// Lighting Director layer (spec §5 / FR-006).
export interface LightingPlan {
  sceneIntent: string;
  visualStrategy: string;
  keyLight: string;
  fillLight: string;
  rimLight: string;
  colorTemperature: string;
  contrastRatio: string;
  atmosphere: string;
  depthSeparation: string;
  continuityRules: string;
}
