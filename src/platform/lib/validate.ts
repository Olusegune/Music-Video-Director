// Production readiness checks — surfaced in the Export Center before handoff so
// nothing ships with missing references, unassigned performers, or empty shots.

import type { Character, Environment, Prop } from "@/platform/lib/types";
import { loadSongs } from "@/apps/music-video/lib/songBrain";
import { getActiveSongId } from "@/platform/lib/settings";
import { getTreatment } from "@/apps/music-video/lib/mvDirector";
import { loadCast } from "@/apps/music-video/lib/cast";
import { getChoreo } from "@/apps/music-video/lib/choreography";
import { detectSectionPerformer } from "@/apps/music-video/lib/performerDetect";

export type IssueLevel = "error" | "warning" | "ok";

export interface Issue {
  level: Exclude<IssueLevel, "ok">;
  message: string;
}

export function validateProduction(
  characters: Character[],
  environments: Environment[],
  props: Prop[]
): Issue[] {
  const issues: Issue[] = [];
  const songs = loadSongs();
  const activeId = getActiveSongId();
  const song = songs.find((s) => s.id === activeId) ?? songs[0] ?? null;

  // --- the active production -------------------------------------------------
  if (!song) {
    issues.push({ level: "warning", message: "No active production — import a song to begin." });
  } else {
    const treatment = getTreatment(song.id, song.templateId ?? null);
    if (!treatment) {
      issues.push({
        level: "warning",
        message: `“${song.name}” has no treatment yet — open MV Director and Direct it.`,
      });
    } else {
      const shots = treatment.sections.flatMap((s) => s.shots);
      const noFrame = shots.filter((s) => !s.imageUrl).length;
      if (noFrame > 0)
        issues.push({
          level: "warning",
          message: `${noFrame} of ${shots.length} shots have no generated frame.`,
        });
      const noClip = shots.filter((s) => !s.videoUrl).length;
      if (noClip > 0 && noClip < shots.length)
        issues.push({ level: "warning", message: `${noClip} shots have no rendered clip.` });
      else if (noClip === shots.length && shots.length > 0)
        issues.push({ level: "warning", message: "No shots have a rendered clip yet." });
    }

    // Sections that still need a performer assigned.
    const needPerformer = song.sections.filter(
      (s) => !s.performerRole && !detectSectionPerformer(s).confident
    ).length;
    if (needPerformer > 0)
      issues.push({
        level: "warning",
        message: `${needPerformer} song section${needPerformer === 1 ? "" : "s"} need a performer assigned.`,
      });

    // Choreography for the performance sections.
    if (!getChoreo(song.id))
      issues.push({ level: "warning", message: "No choreography generated for this song." });
  }

  // --- cast -----------------------------------------------------------------
  const cast = loadCast();
  if (cast.length === 0) {
    issues.push({ level: "warning", message: "No performers in the cast." });
  } else {
    const orphan = cast.filter(
      (p) => p.characterId && !characters.some((c) => c.id === p.characterId)
    );
    if (orphan.length > 0)
      issues.push({
        level: "error",
        message: `${orphan.length} performer${orphan.length === 1 ? " is" : "s are"} linked to a deleted character.`,
      });
  }

  // --- bible references -----------------------------------------------------
  const charNoImg = characters.filter(
    (c) => !c.portraitUrl && (c.referenceImages?.length ?? 0) === 0
  ).length;
  if (charNoImg > 0)
    issues.push({
      level: "warning",
      message: `${charNoImg} character${charNoImg === 1 ? " has" : "s have"} no portrait or reference image.`,
    });

  const noDna =
    characters.filter((c) => !c.promptDna?.trim()).length +
    environments.filter((e) => !e.promptDna?.trim()).length +
    props.filter((p) => !p.promptDna?.trim()).length;
  if (noDna > 0)
    issues.push({
      level: "warning",
      message: `${noDna} bible entr${noDna === 1 ? "y has" : "ies have"} no Prompt DNA composed.`,
    });

  return issues;
}
