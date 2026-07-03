// Magic Mode — "Video Type" step. A video type is a lightweight, orthogonal
// axis on top of Style (MvTemplate): it biases WHICH templates are offered in
// the Style step, and (where a video type maps cleanly onto one) overrides the
// chosen template's `lean` so the shot-approach engine (`approachFor` in
// mvDirector.ts) actually reflects the choice — not just cosmetic.

import type { MvTemplate, PerformanceLean } from "@/lib/templates";

export type VideoTypeKey =
  | "performance"
  | "narrative"
  | "dance"
  | "animated"
  | "visual-album";

export interface VideoTypeDef {
  key: VideoTypeKey;
  label: string;
  tagline: string;
  /** Overrides the chosen template's `lean` when set — drives approachFor(). */
  leanOverride?: PerformanceLean;
  /** Candidate filter for the Style step; not exclusive — see stylePicksFor. */
  match: (t: MvTemplate) => boolean;
}

export const VIDEO_TYPES: VideoTypeDef[] = [
  {
    key: "performance",
    label: "Performance",
    tagline: "Pure artist energy — the stage is the story.",
    leanOverride: "performance",
    match: (t) => t.lean === "performance" || t.id === "performance",
  },
  {
    key: "narrative",
    label: "Narrative",
    tagline: "Story-driven, acting-led — a scene to follow.",
    leanOverride: "narrative",
    match: (t) => t.lean === "narrative",
  },
  {
    key: "dance",
    label: "Dance",
    tagline: "Choreography is the star, crew front and center.",
    match: (t) => t.id === "dance" || !!t.danceStyle,
  },
  {
    key: "animated",
    label: "Animated",
    tagline: "2D or 3D animated, stylized frame by frame.",
    match: (t) =>
      t.category === "Style" &&
      (t.id === "anime-amv" || t.id === "2d-animated" || t.id === "3d-animated"),
  },
  {
    key: "visual-album",
    label: "Visual Album",
    tagline: "Abstract, mood-driven — a string of movements.",
    leanOverride: "balanced",
    match: (t) => t.lean === "balanced" || t.id === "blank-studio" || t.id === "afrofuturist",
  },
];

export function findVideoType(key?: string | null): VideoTypeDef | undefined {
  return VIDEO_TYPES.find((v) => v.key === key);
}

/**
 * Candidate templates for the Style step, given a chosen video type: matches
 * first, then top up with the rest (deduped) so the picker is never sparse.
 */
export function stylePicksFor(
  videoType: VideoTypeKey | null,
  all: MvTemplate[],
  max = 8
): MvTemplate[] {
  const type = findVideoType(videoType);
  if (!type) return all.slice(0, max);
  const matched = all.filter(type.match);
  const rest = all.filter((t) => !matched.includes(t));
  return [...matched, ...rest].slice(0, max);
}

/** Apply a video type's lean override onto a resolved template (if any). */
export function applyVideoTypeBias(
  template: MvTemplate | null | undefined,
  videoType?: string | null
): MvTemplate | null | undefined {
  const type = findVideoType(videoType);
  if (!template || !type?.leanOverride) return template;
  return { ...template, lean: type.leanOverride };
}
