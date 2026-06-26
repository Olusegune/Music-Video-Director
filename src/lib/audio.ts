// Audio Director — voiceover, music direction, SFX map, and sound design.
//
// A required output in the spec. Derived locally from the shot breakdown so a
// full audio plan exists with no API call; ElevenLabs / Suno can later render
// the actual voice / music / SFX from these directions.

import type { ShotBreakdown } from "@/lib/types";

export interface VoiceoverLine {
  shot: number;
  /** The spoken line for this shot (empty = no VO on this shot). */
  vo: string;
}

export interface SfxCue {
  shot: number;
  cue: string;
}

export interface AudioDirection {
  voiceover: {
    needed: boolean;
    voice: string; // casting direction
    tone: string;
    pacing: string;
    lines: VoiceoverLine[];
  };
  music: {
    direction: string;
    genre: string;
    bpm: string;
    arc: string;
    references: string;
  };
  sfx: SfxCue[];
  soundDesign: string;
  mixNotes: string;
}

function musicFor(tone: string, styleGroup?: string): AudioDirection["music"] {
  const t = tone.toLowerCase();
  if (styleGroup === "Rubberhose")
    return {
      direction: "Playful cartoon score that hits the action (mickey-mousing)",
      genre: "Ragtime / vintage jazz / cartoon orchestra",
      bpm: "120–140",
      arc: "Bouncy intro → comedic build → triumphant button",
      references: "1930s cartoon shorts, upbeat swing",
    };
  if (/luxury|premium|elegant/.test(t))
    return {
      direction: "Cinematic orchestral with restrained, elegant motifs",
      genre: "Modern orchestral / ambient hybrid",
      bpm: "70–90",
      arc: "Sparse intro → swelling strings on reveal → resolved final chord",
      references: "Luxury brand films, slow cinematic trailers",
    };
  if (/fast|energetic|fun|playful/.test(t))
    return {
      direction: "Driving electronic underscore with momentum",
      genre: "Upbeat electronic / future-pop",
      bpm: "120–128",
      arc: "Pulse intro → drop on reveal → confident outro",
      references: "Tech product launch films, upbeat ad spots",
    };
  return {
    direction: "Modern, clean underscore that supports without distracting",
    genre: "Cinematic electronic / minimal underscore",
    bpm: "90–110",
    arc: "Calm intro → building pads through proof → resolved CTA",
    references: "SaaS explainer films, modern brand spots",
  };
}

function voLineFor(shot: ShotBreakdown, cta: string): string {
  const name = shot.name.toLowerCase();
  if (name.includes("call") && cta) return cta;
  if (name.includes("hold")) return ""; // let the final frame breathe
  if (shot.purpose) return shot.purpose.replace(/^./, (c) => c.toUpperCase()) + ".";
  return shot.visualDescription.split(/[.,]/)[0]?.trim() ?? "";
}

function sfxFor(shot: ShotBreakdown): string {
  const move = `${shot.cameraMovement} ${shot.transition}`.toLowerCase();
  if (move.includes("whip")) return "Whoosh on the whip pan";
  if (move.includes("match cut")) return "Sub-drop accent on the match cut";
  if (move.includes("push") || move.includes("title"))
    return "Rising tone into a soft impact";
  if (move.includes("hold")) return "Final brand chime / resolve";
  return "Motivated transition whoosh; subtle UI ticks";
}

export function buildAudioDirection(
  shots: ShotBreakdown[],
  tone = "",
  cta = "",
  styleGroup?: string
): AudioDirection {
  const lines = shots.map((s) => ({ shot: s.number, vo: voLineFor(s, cta) }));
  const hasVO = lines.some((l) => l.vo.trim().length > 0);
  return {
    voiceover: {
      needed: hasVO,
      voice: /luxury|premium/.test(tone.toLowerCase())
        ? "Warm, low, unhurried — premium and trustworthy"
        : "Clear, confident, conversational — mid-range",
      tone: tone || "Confident, clear",
      pacing: `~${shots.length} beats; leave the final frame VO-free for the brand hold`,
      lines,
    },
    music: musicFor(tone, styleGroup),
    sfx: shots.map((s) => ({ shot: s.number, cue: sfxFor(s) })),
    soundDesign:
      "Build a sparse-to-full sound bed: quiet cold open, layer textures through the proof beats, " +
      "then strip back for a clean CTA so the call-to-action reads. Use motivated SFX only.",
    mixNotes:
      "VO sits on top (-3 dB over music); duck music -6 dB under VO; SFX accents peak below VO. " +
      "Master to -14 LUFS for social, -16 LUFS for web.",
  };
}
