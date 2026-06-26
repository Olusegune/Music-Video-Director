// Factory helpers for Prompt Pack sub-objects, shared by the mock generator
// and the editor (e.g. adding a new shot).
import type {
  CameraPlan,
  LightingPlan,
  Project,
  PromptPack,
  ShotBreakdown,
} from "@/lib/types";
import { lockInstructionFor, LOCK_STATE_LABEL } from "@/lib/textlock";
import { buildAudioDirection } from "@/lib/audio";

/** Sensible default reference priority order, highest first. */
export function defaultReferenceHierarchy(): string[] {
  return [
    "Brand logo / wordmark (highest — never alter)",
    "Locked on-screen text",
    "Style reference frame",
    "Color palette",
    "Character / product reference",
    "Layout / composition guide",
  ];
}

/** Compose the reference hierarchy into a prompt fragment. */
export function referenceLine(refs: string[]): string {
  const clean = (refs ?? []).filter((r) => r.trim());
  if (clean.length === 0) return "";
  return `Reference priority (highest first): ${clean
    .map((r, i) => `${i + 1}) ${r}`)
    .join("; ")}.`;
}

export function emptyCameraPlan(): CameraPlan {
  return {
    shotType: "",
    lens: "",
    cameraHeight: "",
    cameraAngle: "",
    movement: "",
    composition: "",
    emotionalPurpose: "",
    editorialPurpose: "",
    notes: "",
  };
}

export function emptyLightingPlan(): LightingPlan {
  return {
    sceneIntent: "",
    visualStrategy: "",
    keyLight: "",
    fillLight: "",
    rimLight: "",
    colorTemperature: "",
    contrastRatio: "",
    atmosphere: "",
    depthSeparation: "",
    continuityRules: "",
  };
}

export function emptyShot(number: number): ShotBreakdown {
  return {
    number,
    name: "New Shot",
    purpose: "",
    duration: "3s",
    visualDescription: "",
    cameraMovement: "",
    transition: "",
    audio: "",
    locked: false,
    imageUrl: "",
    videoUrl: "",
    camera: emptyCameraPlan(),
    lighting: emptyLightingPlan(),
  };
}

/** Compose an image-generation prompt from a shot's creative + technical context. */
export function buildImagePrompt(pack: PromptPack, shot: ShotBreakdown): string {
  const parts = [
    shot.visualDescription || shot.name,
    pack.style.visualLanguage,
    [shot.camera.shotType, shot.camera.lens, shot.camera.cameraAngle]
      .filter(Boolean)
      .join(", "),
    shot.camera.composition,
    [shot.lighting.keyLight, shot.lighting.colorTemperature, shot.lighting.atmosphere]
      .filter(Boolean)
      .join(", "),
    pack.style.materials,
    pack.style.mood && `${pack.style.mood} mood`,
    pack.creativeDirection.aspectRatio &&
      `${pack.creativeDirection.aspectRatio} aspect ratio`,
    referenceLine(pack.referenceHierarchy ?? []),
    lockInstructionFor(pack.textLocks ?? []),
  ];
  return parts.filter(Boolean).join(". ");
}

/** Render the pack to Markdown (browser export path; mirrors the Rust engine). */
export function packToMarkdown(project: Project, pack: PromptPack): string {
  const cd = pack.creativeDirection;
  const st = pack.style;
  const out: string[] = [];
  out.push(`# ${cd.workingTitle || project.name}\n`);
  out.push(`${project.type} · ${cd.aspectRatio} · ${cd.duration} · ${project.status}\n`);

  out.push(`## Creative Direction\n`);
  if (cd.goal) out.push(`${cd.goal}\n`);
  out.push(`- Audience: ${cd.audience}`);
  out.push(`- Emotional Tone: ${cd.emotionalTone}`);
  out.push(`- Duration: ${cd.duration}`);
  out.push(`- Aspect Ratio: ${cd.aspectRatio}`);
  out.push(`- Recommended Models: ${cd.recommendedModels.join(", ")}\n`);

  out.push(`## Style\n`);
  out.push(`- Visual Language: ${st.visualLanguage}`);
  out.push(`- Color Palette: ${st.colorPalette.join(", ")}`);
  out.push(`- Typography: ${st.typography}`);
  out.push(`- Materials: ${st.materials}`);
  out.push(`- Mood: ${st.mood}`);
  out.push(`- Atmosphere: ${st.atmosphere}\n`);

  out.push(`## Shot Breakdown\n`);
  for (const s of pack.shots) {
    out.push(`### Shot ${s.number} — ${s.name}\n`);
    if (s.visualDescription) out.push(`${s.visualDescription}\n`);
    out.push(`- Purpose: ${s.purpose}`);
    out.push(`- Duration: ${s.duration}`);
    out.push(`- Transition: ${s.transition}`);
    out.push(`- Audio: ${s.audio}`);
    out.push(
      `- Camera: ${[s.camera.shotType, s.camera.lens, s.camera.cameraHeight, s.camera.cameraAngle, s.camera.movement].filter(Boolean).join(" | ")}`
    );
    out.push(`- Composition: ${s.camera.composition}`);
    out.push(
      `- Lighting: ${[s.lighting.sceneIntent, `key: ${s.lighting.keyLight}`, `fill: ${s.lighting.fillLight}`, `rim: ${s.lighting.rimLight}`].filter(Boolean).join(" | ")}`
    );
    out.push("");
  }

  if (pack.audio) {
    const a = pack.audio;
    out.push(`## Audio Direction\n`);
    out.push(`### Voiceover`);
    out.push(`- Needed: ${a.voiceover.needed ? "Yes" : "No"}`);
    out.push(`- Voice: ${a.voiceover.voice}`);
    out.push(`- Tone: ${a.voiceover.tone}`);
    out.push(`- Pacing: ${a.voiceover.pacing}\n`);
    for (const l of a.voiceover.lines) {
      if (l.vo) out.push(`- Shot ${l.shot}: "${l.vo}"`);
    }
    out.push(`\n### Music`);
    out.push(`- Direction: ${a.music.direction}`);
    out.push(`- Genre: ${a.music.genre} · BPM: ${a.music.bpm}`);
    out.push(`- Arc: ${a.music.arc}`);
    out.push(`- References: ${a.music.references}\n`);
    out.push(`### SFX`);
    for (const c of a.sfx) out.push(`- Shot ${c.shot}: ${c.cue}`);
    out.push(`\n### Sound Design\n${a.soundDesign}\n`);
    out.push(`### Mix Notes\n${a.mixNotes}\n`);
  }

  if ((pack.referenceHierarchy ?? []).length) {
    out.push(`## Reference Hierarchy\n`);
    pack.referenceHierarchy.forEach((r, i) => out.push(`${i + 1}. ${r}`));
    out.push("");
  }

  if ((pack.textLocks ?? []).length) {
    out.push(`## Text Locks\n`);
    for (const t of pack.textLocks) {
      out.push(`- **"${t.text}"** — ${LOCK_STATE_LABEL[t.state]}${t.role ? ` (${t.role})` : ""}`);
    }
    out.push("");
    const instr = lockInstructionFor(pack.textLocks);
    if (instr) out.push(`> ${instr}\n`);
  }

  out.push(`## QC Checklist\n`);
  for (const q of pack.qcChecklist) {
    out.push(`- ${q.checked ? "[x]" : "[ ]"} ${q.label}`);
  }
  return out.join("\n");
}

/** Compose a video-generation prompt emphasising motion, camera, and timing. */
export function buildVideoPrompt(pack: PromptPack, shot: ShotBreakdown): string {
  const parts = [
    shot.visualDescription || shot.name,
    pack.style.visualLanguage,
    shot.camera.movement || shot.cameraMovement,
    shot.camera.shotType,
    [shot.lighting.keyLight, shot.lighting.atmosphere].filter(Boolean).join(", "),
    shot.duration && `~${shot.duration} duration`,
    "smooth cinematic motion",
    lockInstructionFor(pack.textLocks ?? []),
  ];
  return parts.filter(Boolean).join(". ");
}

/** The "Full combined video prompt" — one master prompt for the whole sequence. */
export function buildCombinedVideoPrompt(pack: PromptPack): string {
  const cd = pack.creativeDirection;
  const header = `A ${cd.duration} ${cd.aspectRatio} motion sequence. Style: ${pack.style.visualLanguage}. Mood: ${pack.style.mood}. Color palette: ${pack.style.colorPalette.join(", ")}.`;
  const beats = pack.shots
    .map((s) => {
      const cam = s.camera.movement || s.cameraMovement;
      return `[${s.duration}] ${s.name} — ${s.visualDescription}${cam ? ` Camera: ${cam}.` : ""}${s.transition ? ` Transition: ${s.transition}.` : ""}`;
    })
    .join(" ");
  const safety = lockInstructionFor(pack.textLocks ?? []);
  return [
    header,
    beats,
    "Maintain consistent style, lighting, color, and character across every shot. Smooth cinematic motion.",
    referenceLine(pack.referenceHierarchy ?? []),
    safety,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Backfill any missing fields so packs created before a schema change (or
 * partial AI output) render safely. Guards the camera/lighting director views.
 */
export function normalizePack(pack: PromptPack | null): PromptPack | null {
  if (!pack) return pack;
  const shots = (pack.shots ?? []).map((s, i) => ({
    ...emptyShot(i + 1),
    ...s,
    camera: { ...emptyCameraPlan(), ...(s.camera ?? {}) },
    lighting: { ...emptyLightingPlan(), ...(s.lighting ?? {}) },
  }));
  const tone = pack.creativeDirection?.emotionalTone ?? "";
  const cta = (pack.textLocks ?? []).find((t) => t.role === "CTA")?.text ?? "";
  return {
    ...pack,
    textLocks: pack.textLocks ?? [],
    audio: pack.audio ?? buildAudioDirection(shots, tone, cta),
    referenceHierarchy:
      pack.referenceHierarchy && pack.referenceHierarchy.length
        ? pack.referenceHierarchy
        : defaultReferenceHierarchy(),
    shots,
  };
}
