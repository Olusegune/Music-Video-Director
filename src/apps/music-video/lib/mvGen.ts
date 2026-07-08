// MV generation prompt composer.
//
// Bridges the local plan (MV Director treatment + Cast) to the cloud provider
// layer: for a given shot it composes a full image/video prompt that inherits
// the featured performers' Character DNA and consistency rules, the section's
// visual approach, and the treatment's visual world. This is where "local
// planning" hands off to "cloud pixels" — the hybrid seam.

import type { MvShot, MvSectionPlan, MvTreatment } from "@/apps/music-video/lib/mvDirector";
import type { Performer } from "@/apps/music-video/lib/cast";
import type { Character } from "@/platform/lib/types";
import { composeCharacterDna, identityAnchor } from "@/platform/lib/characterDna";

const VOCAL_FRONT = ["Lead Singer", "Featured Artist", "Rapper"];

/** Who should appear in a shot, given the section's directorial approach. */
function performersForSection(approach: MvSectionPlan["approach"], cast: Performer[]): Performer[] {
  if (approach === "Abstract") return [];
  const vocal = cast.filter((p) => p.lipSync || VOCAL_FRONT.includes(p.role));
  const dancers = cast.filter((p) => p.role === "Dancer");
  if (approach === "Performance") return [...vocal.slice(0, 1), ...dancers.slice(0, 1)];
  // Narrative / Hybrid → the lead carries the frame.
  return vocal.slice(0, 1);
}

interface PerformerPrompt {
  desc: string;
  rule: string;
}

function performerPrompt(p: Performer, characters: Character[]): PerformerPrompt {
  const c = p.characterId ? characters.find((x) => x.id === p.characterId) : null;
  if (c) {
    const composed = composeCharacterDna(c);
    const dna = (c.promptDna && c.promptDna.trim()) || composed.promptDna;
    const rule = (c.consistencyRules && c.consistencyRules.trim()) || composed.consistencyRules;
    const wardrobe = p.wardrobe ? `, wearing ${p.wardrobe}` : "";
    return {
      desc: `${identityAnchor(c)} (${p.role.toLowerCase()}) — ${dna}${wardrobe}`,
      rule,
    };
  }
  const who = p.name || p.role;
  const wardrobe = p.wardrobe ? `, wearing ${p.wardrobe}` : "";
  const notes = p.performanceNotes ? `; ${p.performanceNotes}` : "";
  return { desc: `${who} (${p.role.toLowerCase()})${wardrobe}${notes}`, rule: "" };
}

/** The per-section creative brief authored in Song Studio (section-based). */
export interface SectionBrief {
  lead?: string;
  backup?: string;
  mood?: string;
  cameraNote?: string;
  choreoNote?: string;
  storyNote?: string;
  visualStyle?: string;
  performerRole?: string;
}

export interface GenContext {
  shot: MvShot;
  section: MvSectionPlan;
  treatment: MvTreatment;
  cast: Performer[];
  characters: Character[];
  aspect: string;
  /** Choreography pose/move covering this shot, injected automatically. */
  choreoHint?: string;
  /** The song section's authored brief (lead, camera, mood, …). */
  brief?: SectionBrief;
}

/** Turn per-shot choreography assignments into a prompt sentence. Each becomes
 *  "<Performer> (<role>) performs <move>, <energy> energy, <expression>, in <formation>." */
function choreoAssignmentFragment(shot: MvShot): string {
  const list = shot.choreo ?? [];
  if (list.length === 0) return "";
  const parts = list
    .filter((a) => a.performer || a.move)
    .map((a) => {
      const who = a.role
        ? `${a.performer || "Performer"} (${a.role.toLowerCase()})`
        : a.performer || "Performer";
      const bits = [
        a.move ? `performs ${a.move}` : "moves",
        a.energy ? `${a.energy.toLowerCase()} energy` : "",
        a.expression ? a.expression : "",
        a.formation ? `in ${a.formation}` : "",
      ].filter(Boolean);
      return `${who} ${bits.join(", ")}`;
    });
  return parts.length ? `Choreography — ${parts.join("; ")}.` : "";
}

/** Turn the section brief into prompt fragments (skips empty fields). */
function briefFragments(brief?: SectionBrief): string[] {
  if (!brief) return [];
  return [
    brief.mood ? `Mood: ${brief.mood}.` : "",
    brief.visualStyle ? `Visual style: ${brief.visualStyle}.` : "",
    brief.performerRole ? `Performed by: ${brief.performerRole}.` : "",
    brief.lead ? `Lead performer: ${brief.lead}.` : "",
    brief.cameraNote ? `Camera direction: ${brief.cameraNote}.` : "",
    brief.choreoNote ? `Choreography: ${brief.choreoNote}.` : "",
    brief.storyNote ? `Story beat: ${brief.storyNote}.` : "",
  ].filter(Boolean);
}

/** Compose the still-frame prompt for a shot. */
export function buildShotImagePrompt(ctx: GenContext): string {
  const { shot, section, treatment, cast, characters, aspect, choreoHint, brief } = ctx;
  const performers = performersForSection(section.approach, cast);
  const dnas = performers.map((p) => performerPrompt(p, characters));
  const featuring =
    dnas.length > 0
      ? `Featuring: ${dnas.map((d) => d.desc).join("; ")}.`
      : "No people in frame — abstract, atmospheric visual.";
  const rules = dnas
    .map((d) => d.rule)
    .filter(Boolean)
    .join(" ");

  return [
    `${shot.idea}.`,
    `Shot: ${shot.shotType}. Camera: ${shot.movement}. Lighting: ${shot.lighting}.`,
    // Explicit per-shot assignments take precedence over the auto time-based hint.
    shot.choreo?.length
      ? choreoAssignmentFragment(shot)
      : choreoHint
        ? `Choreography: ${choreoHint}.`
        : "",
    shot.storyIntent ? `Story intent: ${shot.storyIntent}.` : "",
    ...briefFragments(brief),
    `Visual world: ${treatment.visualWorld}`,
    featuring,
    rules,
    `Single music-video still frame, cinematic, ${aspect} aspect ratio, professional color grade, high detail.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Compose the text-to-video prompt for a shot (motion-forward). */
export function buildShotVideoPrompt(ctx: GenContext): string {
  const { shot, section, treatment, cast, characters, choreoHint, brief } = ctx;
  const performers = performersForSection(section.approach, cast);
  const dnas = performers.map((p) => performerPrompt(p, characters));
  const featuring =
    dnas.length > 0
      ? `Featuring: ${dnas.map((d) => d.desc).join("; ")}.`
      : "No people — abstract motion and texture.";
  const dur = Math.max(1, Math.round(shot.end - shot.start));

  return [
    `${shot.idea}.`,
    `Camera move: ${shot.movement}. Lighting: ${shot.lighting}.`,
    `Performance: ${shot.performanceNote}`,
    shot.choreo?.length
      ? choreoAssignmentFragment(shot)
      : choreoHint
        ? `Choreography: ${choreoHint}.`
        : "",
    shot.storyIntent ? `Story intent: ${shot.storyIntent}.` : "",
    ...briefFragments(brief),
    featuring,
    `Visual world: ${treatment.visualWorld}`,
    `${dur}s music-video clip, cinematic motion, smooth, high detail.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Find the choreography move/pose covering a given time, as a prompt hint. */
export function choreoHintForTime(
  plan:
    | {
        sections: {
          start: number;
          end: number;
          eightCounts: { startSec: number; phraseA: string }[];
          keyPoses: string[];
        }[];
      }
    | null
    | undefined,
  t: number
): string | undefined {
  if (!plan) return undefined;
  const sec = plan.sections.find((s) => t >= s.start && t < s.end);
  if (!sec) return undefined;
  // Prefer the 8-count move active at this moment; else the first key pose.
  const ec = [...sec.eightCounts].reverse().find((e) => e.startSec <= t);
  return ec?.phraseA || sec.keyPoses[0];
}
