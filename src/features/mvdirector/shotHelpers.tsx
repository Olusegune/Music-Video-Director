// Shared MV Director constants + pure helpers (extracted from MvDirector.tsx, Phase 2).
import { type MvShot } from "@/lib/mvDirector";
import { IMAGE_MODELS } from "@/lib/imageGen";
import { resolveAssetSrc } from "@/components/ui/asset-image";

export const GEN_MODELS = IMAGE_MODELS.filter((m) => !m.manual);

/** Fetch with a hard timeout so a slow/unreachable ref never stalls generation. */
async function fetchWithTimeout(url: string, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Download a displayable asset src to disk (works for http, data:, Tauri path). */
export async function downloadAsset(src: string, filename: string) {
  const resolved = await resolveAssetSrc(src);
  let href = resolved;
  if (!resolved.startsWith("data:") && !resolved.startsWith("blob:")) {
    try {
      const blob = await (await fetchWithTimeout(resolved)).blob();
      href = URL.createObjectURL(blob);
    } catch {
      href = resolved;
    }
  }
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  if (href.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export const CHOREO_ROLES = [
  "Lead Artist",
  "Featured Artist",
  "Backup Singer",
  "Dancer",
  "Dance Crew",
  "Choir",
  "Band Member",
  "Character",
];

/** Energy levels for a choreography assignment. */
export const CHOREO_ENERGY = ["", "Low", "Medium", "Medium-high", "High", "Explosive"];

/** Map a cast PerformerRole to the nearest choreography-assignment role label. */
export function mapCastRole(role: string): string {
  switch (role) {
    case "Lead Singer":
      return "Lead Artist";
    case "Backing Singer":
      return "Backup Singer";
    case "Featured Artist":
      return "Featured Artist";
    case "Dancer":
      return "Dancer";
    case "Band Member":
      return "Band Member";
    default:
      return CHOREO_ROLES.includes(role) ? role : "Lead Artist";
  }
}

/** Camera direction presets — label (chip) → prompt value (technical + intent). */
export const CAMERA_PRESETS: { label: string; value: string }[] = [
  { label: "Push In", value: "Slow push-in to increase emotional intensity" },
  { label: "Orbit", value: "Orbit around the subject to create wonder" },
  { label: "Crane Up", value: "Crane up to reveal scale" },
  { label: "Wide", value: "Wide establishing shot" },
  { label: "Close Up", value: "Intimate close-up on the subject" },
  { label: "Low Angle", value: "Low-angle hero shot — make the performer feel heroic" },
  { label: "Handheld", value: "Handheld motion to create urgency" },
  { label: "Dolly Back", value: "Slow dolly back to show isolation" },
];

/** Lighting direction presets — label (chip) → prompt value (look + intent). */
export const LIGHTING_PRESETS: { label: string; value: string }[] = [
  { label: "Gold Rim", value: "Gold rim light for triumph" },
  { label: "Blue Ambient", value: "Soft blue ambient light for reflection" },
  { label: "Sunset Glow", value: "Warm sunset glow for hope" },
  { label: "Top Light", value: "Harsh top light for tension" },
  { label: "Strobe", value: "Strobe lighting for high-energy dance" },
  { label: "Spotlights", value: "Stage spotlight pools" },
  { label: "Concert", value: "Concert lighting — haze and beams" },
  { label: "Heavenly", value: "Soft heavenly glow for awe and worship" },
];

/** First-class story-intent emotions, selectable as tags. */
export const STORY_EMOTIONS = [
  "Wonder", "Triumph", "Mystery", "Discovery", "Joy",
  "Isolation", "Celebration", "Tension", "Hope", "Awe",
];

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Beat range a shot spans, from the song tempo. */
export function beatRangeLabel(start: number, end: number, bpm: number): string {
  if (!bpm) return "";
  const a = Math.floor((start * bpm) / 60) + 1;
  const b = Math.max(a, Math.ceil((end * bpm) / 60));
  return `Beat ${a}–${b}`;
}

/** Human energy band from a 0..1 section energy. */
export function energyLabel(e: number): string {
  if (e >= 0.66) return "Peak";
  if (e >= 0.4) return "Build";
  return "Low";
}

/** A plain-English "Director's Intent" summary assembled from the shot's pieces. */
export function directorSummary(shot: MvShot, approach: string): string {
  const emotions = shot.storyIntent?.trim();
  const cam = shot.movement?.toLowerCase();
  const light = shot.lighting?.toLowerCase();
  const perfLine = shot.choreo?.length
    ? shot.choreo
        .filter((a) => a.performer || a.move)
        .map((a) => `${a.performer || "a performer"}${a.move ? ` (${a.move})` : ""}`)
        .join("; ")
    : shot.performanceNote?.trim();
  const parts = [
    `This ${approach.toLowerCase()} shot ${emotions ? `leans into ${emotions.toLowerCase()}` : "carries the section's energy"}.`,
    cam ? `The camera ${cam}.` : "",
    light ? `Lighting: ${light}.` : "",
    perfLine ? `Performance: ${perfLine}.` : "No performer in frame — the world itself becomes the subject.",
  ];
  return parts.filter(Boolean).join(" ");
}

/** Local "Director Brain" — context-aware tips + one-click actions for a shot. */
export function directorBrain(
  shot: MvShot,
  sectionKind: string,
  energy: number,
  approach: string
): { tips: string[]; actions: { label: string; patch: Partial<MvShot> }[] } {
  const tips: string[] = [];
  const actions: { label: string; patch: Partial<MvShot> }[] = [];
  const isChorus = /chorus|drop|hook/i.test(sectionKind);
  const isIntro = /intro|outro/i.test(sectionKind);

  if (!shot.storyIntent?.trim()) {
    const intent = isChorus ? "Triumph, Celebration" : isIntro ? "Wonder, Mystery" : "Discovery";
    tips.push(`No story intent yet — ${isChorus ? "choruses hit hardest with triumph/celebration" : isIntro ? "intros set wonder + mystery" : "give the shot a reason to exist"}.`);
    actions.push({ label: `Set intent: ${intent}`, patch: { storyIntent: intent } });
  }
  if (isChorus && approach !== "Abstract" && !shot.choreo?.length) {
    tips.push("Chorus = performance payoff. Assign your lead + a move in Choreography & Direction.");
  }
  // Camera suggestion by section.
  const camSuggest = isChorus
    ? CAMERA_PRESETS.find((c) => c.label === "Low Angle")!
    : isIntro
      ? CAMERA_PRESETS.find((c) => c.label === "Push In")!
      : CAMERA_PRESETS.find((c) => c.label === "Close Up")!;
  if (shot.movement !== camSuggest.value) {
    actions.push({ label: `Camera: ${camSuggest.label}`, patch: { movement: camSuggest.value } });
  }
  // Lighting suggestion by energy.
  const lightSuggest = energy >= 0.66
    ? LIGHTING_PRESETS.find((l) => l.label === "Concert")!
    : energy >= 0.4
      ? LIGHTING_PRESETS.find((l) => l.label === "Gold Rim")!
      : LIGHTING_PRESETS.find((l) => l.label === "Blue Ambient")!;
  if (shot.lighting !== lightSuggest.value) {
    actions.push({ label: `Lighting: ${lightSuggest.label}`, patch: { lighting: lightSuggest.value } });
  }
  return { tips, actions };
}

/** Compact a model label for an on-preview badge: drop the ★ and the trailing
 *  provider parenthetical, and truncate. "★ Seedance 2.0 (Fal · audio)" → "Seedance 2.0". */
export function badgeLabel(label: string): string {
  const cleaned = label.replace(/^★\s*/, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  return cleaned.length > 22 ? `${cleaned.slice(0, 21)}…` : cleaned;
}

