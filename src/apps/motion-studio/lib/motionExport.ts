// Motion Studio export — a real production package, not a placeholder button.
//
// Motion Studio is a planning/scripting tool today (no image/video generation is
// wired in yet), so the honest deliverable is the production script itself: a
// scene-by-scene shot list with headline, motion, camera, and voiceover, plus
// the creative direction that governs it. Exporting a fake rendered video would
// lie about what the module actually produces.

import { buildZip, downloadBlob } from "@/platform/lib/archive";
import { createDeliverable } from "@/platform/lib/deliverables";
import type { MotionProject, MotionScene } from "@/apps/motion-studio/lib/types";

function slug(value: string): string {
  return (
    (value || "untitled")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function sceneBlock(scene: MotionScene): string {
  return [
    `### ${scene.role} — ${fmtTime(scene.start)}–${fmtTime(scene.end)}`,
    scene.approved ? "_Approved_" : "_Draft_",
    "",
    `**Headline:** ${scene.headline || "—"}`,
    `**Support copy:** ${scene.support || "—"}`,
    `**Intent:** ${scene.intent || "—"}`,
    `**Layout:** ${scene.layout || "—"}`,
    `**Motion:** ${scene.motion || "—"}`,
    `**Camera:** ${scene.camera || "—"}`,
    `**Transition:** ${scene.transition || "—"}`,
    `**Voiceover:** ${scene.voiceover || "—"}`,
    `**Audio cue:** ${scene.audioCue || "—"}`,
    scene.promptOverride ? `**Prompt override:** ${scene.promptOverride}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** The production script as Markdown — the real artifact Motion Studio produces. */
export function buildMotionScript(project: MotionProject): string {
  const approved = project.scenes.filter((s) => s.approved).length;
  return [
    `# ${project.name || "Untitled Motion Project"}`,
    "",
    `**Status:** ${project.status} · **Duration:** ${fmtTime(project.durationSec)} · **Aspect:** ${project.aspect} · **${approved}/${project.scenes.length} scenes approved**`,
    "",
    "## Brief",
    project.brief || project.marketingBrief || "—",
    "",
    "## Business / Product",
    project.businessInput || "—",
    "",
    "## Script",
    project.script || "—",
    "",
    "## Creative Direction",
    `- Visual language: ${project.direction.visualLanguage || "—"}`,
    `- Feeling: ${project.feeling || "—"}`,
    `- Typography: ${project.typography.heading} / ${project.typography.body}`,
    "",
    "## Shot List",
    "",
    ...project.scenes.map(sceneBlock),
  ].join("\n");
}

export interface MotionExportResult {
  filename: string;
  sceneCount: number;
  approvedCount: number;
}

/**
 * Build and download the export ZIP (script.md + project.json), and register
 * the deliverable so it shows up in Recent/Dashboard/Export Center like every
 * other studio's output.
 */
export function exportMotionProject(project: MotionProject): MotionExportResult {
  const script = buildMotionScript(project);
  const zip = buildZip([
    { name: "script.md", bytes: new TextEncoder().encode(script) },
    { name: "project.json", bytes: new TextEncoder().encode(JSON.stringify(project, null, 2)) },
  ]);
  const filename = `${slug(project.name)}-motion-script.zip`;
  downloadBlob(zip, filename);

  const approvedCount = project.scenes.filter((s) => s.approved).length;
  createDeliverable({
    moduleId: "motion",
    projectId: project.id,
    kind: "script",
    format: "zip",
    status:
      approvedCount === project.scenes.length && project.scenes.length > 0 ? "approved" : "draft",
    title: `${project.name || "Untitled"} — Production Script`,
    assetRefs: [filename],
  });

  return { filename, sceneCount: project.scenes.length, approvedCount };
}
