// Local creative engine — the "Local prompt-only mode".
//
// Turns a raw brief/script + project + chosen style into a complete, varied
// Prompt Pack *with no API call*. It performs lightweight script analysis
// (CTA, stats, on-screen text, tone), lays the beats onto a narrative arc, and
// derives camera, lighting, motion, transitions and text locks per shot from
// the selected style's hints. The same pack shape is used by the Gemini path,
// so everything downstream (editing, storyboard, export) just works.

import type {
  CameraPlan,
  LightingPlan,
  Project,
  PromptPack,
  ShotBreakdown,
} from "@/lib/types";
import { findPreset, type StylePreset } from "@/lib/styles";
import { newLockItem, type TextLockItem } from "@/lib/textlock";
import { buildAudioDirection } from "@/lib/audio";

export interface LocalPackInput {
  project?: Pick<Project, "name" | "type" | "aspectRatio" | "duration" | "emotionalTone"> | null;
  brief: string;
  styleId: string;
  /** Storyboard template: force an exact panel count (3/6/9/custom). */
  panels?: number;
  /** Storyboard template: override the target duration (15s/30s). */
  durationSeconds?: number;
}

type Role =
  | "hook"
  | "context"
  | "problem"
  | "reveal"
  | "proof"
  | "cta"
  | "hold";

// --- script analysis -------------------------------------------------------

const CTA_HINTS = [
  "sign up", "get started", "download", "learn more", "buy", "subscribe",
  "join", "try", "visit", "book", "start free", "shop", "register", "claim",
];

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function detectStats(text: string): string[] {
  const found = text.match(/\b\d[\d,.]*\s?(%|x|×|k|m|bn|billion|million|hours?|days?|x faster|users?)?/gi);
  return Array.from(new Set((found ?? []).map((s) => s.trim()))).slice(0, 6);
}

function detectQuoted(text: string): string[] {
  const out: string[] = [];
  const re = /["“]([^"”]{2,60})["”]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1].trim());
  return out;
}

function detectCTA(sents: string[]): string | null {
  // Word-boundary match (so "book" doesn't fire inside "notebook"), and prefer
  // the LAST matching sentence — CTAs almost always land at the end.
  const res = CTA_HINTS.map(
    (h) => new RegExp(`\\b${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
  );
  for (let i = sents.length - 1; i >= 0; i--) {
    if (res.some((re) => re.test(sents[i]))) return sents[i];
  }
  return null;
}

function detectTone(text: string, fallback: string): string {
  const low = text.toLowerCase();
  const map: [RegExp, string][] = [
    [/fun|playful|joy|delight|whimsical/, "Playful, upbeat"],
    [/serious|trust|secure|enterprise|reliable/, "Confident, trustworthy"],
    [/luxury|premium|elegant|exclusive/, "Premium, elegant"],
    [/fast|speed|instant|quick|efficient/, "Energetic, fast-paced"],
    [/calm|simple|clear|clean|minimal/, "Calm, clear"],
    [/bold|disrupt|revolution|game.?chang/, "Bold, ambitious"],
  ];
  for (const [re, tone] of map) if (re.test(low)) return tone;
  return fallback || "Confident, cinematic";
}

function parseSeconds(duration: string): number {
  const m = duration.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 30;
}

// --- arc & timing ----------------------------------------------------------

function arcFor(beats: number): Role[] {
  // Always open with a hook and close on a CTA/hold; fill the middle by length.
  const middle: Role[] = ["context", "problem", "reveal", "proof"];
  const roles: Role[] = ["hook"];
  for (let i = 0; i < beats - 2; i++) roles.push(middle[i % middle.length]);
  roles.push(beats > 2 ? "cta" : "hold");
  return roles;
}

const ROLE_NAME: Record<Role, string> = {
  hook: "The Spark",
  context: "The Context",
  problem: "The Tension",
  reveal: "The Reveal",
  proof: "The Proof",
  cta: "The Call",
  hold: "Final Hold",
};

const ROLE_PURPOSE: Record<Role, string> = {
  hook: "Grab attention in the first beat",
  context: "Set the scene and stakes",
  problem: "Name the pain the viewer feels",
  reveal: "Reveal the product / idea as the answer",
  proof: "Make the claim believable with proof",
  cta: "Drive the single desired action",
  hold: "Lock the brand and message on the final frame",
};

// --- camera / lighting per role -------------------------------------------

function cameraForRole(role: Role, style?: StylePreset): CameraPlan {
  const base: Record<Role, Partial<CameraPlan>> = {
    hook: { shotType: "Macro / cold open", movement: "Slow push-in (dolly)", emotionalPurpose: "Intrigue", editorialPurpose: "Establish the hero subject" },
    context: { shotType: "Wide establishing", movement: "Slow pull-back", emotionalPurpose: "Orient the viewer", editorialPurpose: "Show the world" },
    problem: { shotType: "Medium, slightly low angle", movement: "Handheld drift", emotionalPurpose: "Unease / friction", editorialPurpose: "Dramatize the problem" },
    reveal: { shotType: "Medium close-up, hero lock", movement: "Push-in to hero", emotionalPurpose: "Confidence / relief", editorialPurpose: "Reveal the solution" },
    proof: { shotType: "Tracking across detail", movement: "Tracking shot / orbit", emotionalPurpose: "Credibility", editorialPurpose: "Deliver proof" },
    cta: { shotType: "Locked hero with title space", movement: "Settle to final hold", emotionalPurpose: "Decisiveness", editorialPurpose: "Drive the action" },
    hold: { shotType: "Hero lock, centered", movement: "Final hold", emotionalPurpose: "Memorability", editorialPurpose: "Brand lock" },
  };
  const flat = style && (style.group === "2D" || style.group === "Rubberhose");
  const b = base[role];
  return {
    shotType: b.shotType ?? "",
    lens: flat ? "Flat 2D frame" : role === "hook" ? "85mm" : role === "context" ? "24mm" : "50mm",
    cameraHeight: role === "problem" ? "Low" : "Eye level",
    cameraAngle: role === "problem" ? "Slight low angle" : "Straight-on",
    movement: [b.movement, style?.cameraHint].filter(Boolean).join(" · "),
    composition: flat
      ? "Centered with generous negative space for type"
      : "Rule-of-thirds hero, shallow depth of field",
    emotionalPurpose: b.emotionalPurpose ?? "",
    editorialPurpose: b.editorialPurpose ?? "",
    notes: style ? `Style bias: ${style.label}.` : "",
  };
}

function lightingForRole(role: Role, style?: StylePreset): LightingPlan {
  const intent: Record<Role, string> = {
    hook: "Premium, focused reveal",
    context: "Open, readable establishing light",
    problem: "Tense, higher-contrast mood",
    reveal: "Bright, confident hero light",
    proof: "Clean, even, trustworthy",
    cta: "Bright brand-forward finish",
    hold: "Iconic, controlled brand light",
  };
  const flat = style && (style.group === "2D" || style.group === "Rubberhose");
  return {
    sceneIntent: intent[role],
    visualStrategy: flat ? "Flat art-directed color blocking" : "Motivated cinematic key with separation",
    keyLight: flat ? "Flat even fill" : role === "problem" ? "Hard key, 45° camera-left" : "Soft key, 35° camera-left",
    fillLight: flat ? "—" : role === "problem" ? "Low fill (1:8)" : "Soft fill (1:3)",
    rimLight: flat ? "Accent edge if needed" : "Cool rim for subject separation",
    colorTemperature: flat ? "Art-directed palette" : "5600K key / 7000K rim",
    contrastRatio: role === "problem" ? "High (1:8)" : "Medium (1:3)",
    atmosphere: [style?.lightingHint, "subtle volumetric haze"].filter(Boolean).join(", "),
    depthSeparation: flat ? "Layer offset + drop shadow" : "Rim light + background falloff",
    continuityRules: "Keep key direction consistent across the sequence",
  };
}

const TRANSITIONS: Record<Role, string> = {
  hook: "Match cut",
  context: "Cross dissolve",
  problem: "Hard cut",
  reveal: "Whip pan",
  proof: "Cut on action",
  cta: "Push to title",
  hold: "Final hold",
};

const MOTION: Record<Role, string> = {
  hook: "Elements resolve from particles / negative space",
  context: "Parallax layers settle into place",
  problem: "Jittered, unsettled motion",
  reveal: "Hero element snaps into focus with overshoot",
  proof: "Numbers count up; bars and lines draw on",
  cta: "Button / wordmark pops in and settles",
  hold: "Everything holds; brand locks",
};

// --- palette per style group ----------------------------------------------

function paletteFor(style?: StylePreset): string[] {
  if (!style) return ["#0B1B2B", "#D4AF37", "#00D9FF"]; // app identity: navy/gold/electric
  const byId: Record<string, string[]> = {
    "y2k-cyberpop": ["#FF4FD8", "#00E5FF", "#C0C0C0", "#FFFFFF"],
    "dark-neon-system": ["#070B16", "#00D9FF", "#FF3CAC", "#7A5CFF"],
    "luxury-brand-film": ["#0A0A0A", "#D4AF37", "#1C1C1C", "#F4ECD2"],
    "retro-crt": ["#0A0F0A", "#39FF14", "#FFB000", "#FF005C"],
    "rubberhose-2d": ["#1B1B3A", "#FF6B6B", "#FFD93D", "#6BCB77"],
    "rubberhose-3d": ["#2A2A4A", "#FF8FB1", "#FFD66B", "#8AD3FF"],
    "documentary-timeline": ["#23201A", "#C9A66B", "#E8DEC8", "#7A6A4F"],
  };
  return byId[style.id] ?? ["#0B1B2B", "#D4AF37", "#00D9FF"];
}

function recommendedModels(style?: StylePreset): string[] {
  if (!style) return ["Local engine", "fal.ai", "Gemini"];
  if (style.group === "3D")
    return ["Google Veo / Runway (video)", "Imagen / GPT Image (frames)", "Gemini (reasoning)"];
  if (style.group === "Rubberhose")
    return ["Pika / Kling (bouncy motion)", "FLUX / Imagen (frames)", "Gemini (reasoning)"];
  return ["fal.ai LTX / Kling (video)", "FLUX / Imagen (vector frames)", "Gemini (reasoning)"];
}

// --- main ------------------------------------------------------------------

export function generateLocalPack(input: LocalPackInput): PromptPack {
  const { project, styleId } = input;
  const brief = input.brief.trim();
  const style = findPreset(styleId);

  const sents = sentences(brief);
  const totalSeconds =
    input.durationSeconds ?? parseSeconds(project?.duration ?? "30s");
  const aspect = project?.aspectRatio ?? "16:9";
  const tone = detectTone(brief, project?.emotionalTone ?? "");
  const stats = detectStats(brief);
  const quoted = detectQuoted(brief);
  const cta = detectCTA(sents);
  const brand = project?.name?.trim() || "";

  // Shot count: explicit storyboard template wins, else derive from duration.
  const beats = input.panels
    ? Math.max(1, Math.min(12, Math.round(input.panels)))
    : Math.max(3, Math.min(9, Math.round(totalSeconds / 4)));
  const roles = arcFor(beats);
  const perShot = totalSeconds / beats;

  // Assign source text to each shot (cycle through sentences if short).
  const shots: ShotBreakdown[] = roles.map((role, i) => {
    const src = sents[i] ?? sents[i % Math.max(1, sents.length)] ?? "";
    const start = (i * perShot).toFixed(1);
    const end = ((i + 1) * perShot).toFixed(1);
    const styleFrag = style ? `, ${style.fragment}` : "";
    const visual =
      role === "hook"
        ? `Cold open: ${src || brand || "the core idea"} introduced with intrigue${styleFrag}`
        : role === "cta"
          ? `Call to action${cta ? `: "${cta}"` : ""}, brand-forward${styleFrag}`
          : role === "hold"
            ? `Final brand lock${brand ? ` for ${brand}` : ""}${styleFrag}`
            : `${src || ROLE_PURPOSE[role]}${styleFrag}`;

    return {
      number: i + 1,
      name: `${ROLE_NAME[role]}`,
      purpose: ROLE_PURPOSE[role],
      duration: `${perShot.toFixed(1)}s (${start}–${end}s)`,
      visualDescription: visual,
      cameraMovement: cameraForRole(role, style).movement,
      transition: TRANSITIONS[role],
      audio:
        role === "hook"
          ? "Riser into a downbeat; sparse sound design"
          : role === "cta"
            ? "Confident music button; UI confirm SFX"
            : "Underscore continues; motivated SFX on key moves",
      locked: false,
      imageUrl: "",
      videoUrl: "",
      camera: cameraForRole(role, style),
      lighting: lightingForRole(role, style),
    };
  });

  // Bake motion notes into each shot's lighting continuity-free slot? Keep in notes.
  shots.forEach((s, i) => {
    s.camera.notes = `${s.camera.notes} Motion: ${MOTION[roles[i]]}.`.trim();
  });

  // Text locks: brand (locked), CTA (final-frame), stats (animated), quotes (locked).
  const textLocks: TextLockItem[] = [];
  if (brand) textLocks.push(newLockItem(brand, "locked", "brand wordmark"));
  if (cta) textLocks.push(newLockItem(cta, "final-frame", "CTA"));
  for (const q of quoted.slice(0, 4)) textLocks.push(newLockItem(q, "locked", "on-screen text"));
  for (const n of stats.slice(0, 4)) textLocks.push(newLockItem(n, "animated", "key number"));

  const title =
    sents[0]?.slice(0, 60).replace(/[.!?]$/, "") ||
    brand ||
    "Untitled Concept";

  return {
    creativeDirection: {
      workingTitle: title,
      goal:
        brief.length > 0
          ? `Turn this brief into a ${totalSeconds}s ${project?.type ?? "motion"} piece that lands one clear message and a single CTA.`
          : "Define the concept by pasting a brief above.",
      audience: project?.type ? `${project.type} viewers` : "General audience",
      duration: `${totalSeconds}s`,
      aspectRatio: aspect,
      emotionalTone: tone,
      recommendedModels: recommendedModels(style),
    },
    style: {
      visualLanguage: style?.fragment ?? "Premium, dark-first motion graphics with clean type",
      colorPalette: paletteFor(style),
      typography: style?.group === "2D" ? "Bold geometric sans + mono accents" : "Refined sans (Inter / Söhne)",
      materials: style?.group === "3D" ? "PBR surfaces, soft GI, subtle grain" : "Flat fills, soft shadows, subtle grain",
      mood: tone,
      atmosphere: style?.lightingHint ?? "Clean studio with volumetric light",
    },
    shots,
    textLocks,
    audio: buildAudioDirection(shots, tone, cta ?? "", style?.group),
    referenceHierarchy: [
      brand ? `${brand} brand logo / wordmark (highest — never alter)` : "Brand logo / wordmark (highest — never alter)",
      "Locked on-screen text",
      style ? `Style reference: ${style.label}` : "Style reference frame",
      "Color palette",
      "Character / product reference",
      "Layout / composition guide",
    ],
    qcChecklist: [
      { label: "Text safety — locked words sharp & correctly spelled", checked: false },
      { label: "Style consistency across all shots", checked: false },
      { label: "Camera continuity (key direction, eyelines)", checked: false },
      { label: "Lighting continuity", checked: false },
      { label: `Correct aspect ratio (${aspect})`, checked: false },
      { label: "Single clear CTA present", checked: false },
      { label: "Strong, brand-locked final frame", checked: false },
    ],
  };
}
