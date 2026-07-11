import { describe, expect, it, vi } from "vitest";
import { buildMotionScript, exportMotionProject } from "@/apps/motion-studio/lib/motionExport";
import type { MotionProject, MotionScene } from "@/apps/motion-studio/lib/types";

vi.mock("@/platform/lib/archive", () => ({
  buildZip: vi.fn((entries: { name: string; bytes: Uint8Array }[]) => ({
    entries,
    type: "application/zip",
  })),
  downloadBlob: vi.fn(),
}));
vi.mock("@/platform/lib/deliverables", () => ({
  createDeliverable: vi.fn((input: unknown) => input),
}));

const scene = (over: Partial<MotionScene> = {}): MotionScene => ({
  id: "s1",
  role: "Hook",
  start: 0,
  end: 3,
  headline: "Stop scrolling",
  support: "Your inbox, finally calm",
  intent: "Grab attention",
  layout: "Full-bleed",
  motion: "Slow zoom in",
  camera: "Static",
  energy: 80,
  accent: "#fff",
  transition: "Cut",
  voiceover: "Meet the inbox that thinks for you",
  audioCue: "Whoosh",
  approved: true,
  ...over,
});

const project = (over: Partial<MotionProject> = {}): MotionProject => ({
  id: "p1",
  name: "Launch Explainer",
  typeId: "explainer",
  styleId: "clean",
  brief: "A 30s explainer for the launch.",
  businessInput: "Aurora — an AI inbox assistant.",
  marketingBrief: "",
  script: "Open on chaos. Cut to calm.",
  aspect: "16:9",
  durationSec: 30,
  feeling: "Confident, calm",
  status: "storyboard",
  direction: {
    visualLanguage: "Minimal, high-contrast",
    animationStyleId: "smooth",
    characterStyleId: "none",
    cameraStyleId: "static",
    lightingStyleId: "soft",
    typographyStyleId: "modern",
    transitionStyleId: "cut",
    editingStyleId: "punchy",
    colorPalette: ["#111", "#fff"],
    motionLanguage: "Smooth ease-in-out",
    composition: "Centered, generous negative space",
    establishedAt: "2026-07-01T00:00:00Z",
  },
  typography: { heading: "Inter", body: "Inter", weight: 600, tracking: 0, leading: 1.2 },
  scenes: [scene()],
  loopLog: [],
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
  ...over,
});

describe("buildMotionScript", () => {
  it("includes the project brief, script, and direction", () => {
    const md = buildMotionScript(project());
    expect(md).toContain("# Launch Explainer");
    expect(md).toContain("A 30s explainer for the launch.");
    expect(md).toContain("Open on chaos. Cut to calm.");
    expect(md).toContain("Minimal, high-contrast");
  });

  it("reports approval count in the header", () => {
    const md = buildMotionScript(
      project({ scenes: [scene({ approved: true }), scene({ id: "s2", approved: false })] })
    );
    expect(md).toContain("1/2 scenes approved");
  });

  it("writes every scene as a labeled block with its production fields", () => {
    const md = buildMotionScript(project());
    expect(md).toContain("### Hook — 0:00–0:03");
    expect(md).toContain("**Headline:** Stop scrolling");
    expect(md).toContain("**Motion:** Slow zoom in");
    expect(md).toContain("**Voiceover:** Meet the inbox that thinks for you");
  });

  it("marks draft vs approved scenes distinctly", () => {
    const md = buildMotionScript(project({ scenes: [scene({ approved: false })] }));
    expect(md).toContain("_Draft_");
    expect(md).not.toContain("_Approved_");
  });

  it("falls back to em dashes for empty fields rather than blank lines", () => {
    const md = buildMotionScript(
      project({ brief: "", marketingBrief: "", scenes: [scene({ support: "" })] })
    );
    expect(md).toContain("## Brief\n—");
    expect(md).toContain("**Support copy:** —");
  });

  it("only includes a prompt override line when one is set", () => {
    expect(buildMotionScript(project({ scenes: [scene()] }))).not.toContain("Prompt override");
    expect(
      buildMotionScript(project({ scenes: [scene({ promptOverride: "cinematic, 35mm" })] }))
    ).toContain("**Prompt override:** cinematic, 35mm");
  });
});

describe("exportMotionProject", () => {
  it("bundles the script and raw project data, and downloads a slugged filename", async () => {
    const { downloadBlob } = await import("@/platform/lib/archive");
    const result = exportMotionProject(project());
    expect(result.filename).toBe("launch-explainer-motion-script.zip");
    expect(result.sceneCount).toBe(1);
    expect(result.approvedCount).toBe(1);
    expect(downloadBlob).toHaveBeenCalledWith(
      expect.anything(),
      "launch-explainer-motion-script.zip"
    );
  });

  it("registers a deliverable scoped to the motion module and this project", async () => {
    const { createDeliverable } = await import("@/platform/lib/deliverables");
    exportMotionProject(project());
    expect(createDeliverable).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleId: "motion",
        projectId: "p1",
        kind: "script",
        format: "zip",
        status: "approved",
      })
    );
  });

  it("marks the deliverable draft when not every scene is approved", async () => {
    const { createDeliverable } = await import("@/platform/lib/deliverables");
    vi.mocked(createDeliverable).mockClear();
    exportMotionProject(
      project({ scenes: [scene({ approved: true }), scene({ id: "s2", approved: false })] })
    );
    expect(createDeliverable).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
  });

  it("marks an empty scene list as draft rather than falsely approved", async () => {
    const { createDeliverable } = await import("@/platform/lib/deliverables");
    vi.mocked(createDeliverable).mockClear();
    exportMotionProject(project({ scenes: [] }));
    expect(createDeliverable).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
  });
});
