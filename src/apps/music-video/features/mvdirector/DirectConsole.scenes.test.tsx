import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { DirectConsole } from "./DirectConsole";
import type { MvTreatment, MvSectionPlan, MvShot } from "@/apps/music-video/lib/mvDirector";

// The scene rail used to render every section's thumbnail grid fully expanded
// at once, all the time, with no shot count anywhere — nine sections meant
// nine always-open grids and no way to tell "16 shots" from "3 shots" without
// counting tiles. Now only the section holding the current shot opens by
// default, each header states its count, and any section can be toggled.

const shot = (id: string, start: number): MvShot =>
  ({
    id,
    start,
    end: start + 2,
    idea: "",
    shotType: "",
    movement: "",
    lighting: "",
    performanceNote: "",
    transition: "",
  }) as MvShot;

function makeTreatment(): MvTreatment {
  const verse: MvSectionPlan = {
    sectionId: "sec-verse",
    label: "Verse 1",
    kind: "Verse",
    approach: "Narrative",
    start: 0,
    shots: [shot("v1", 0), shot("v2", 2), shot("v3", 4)],
  } as MvSectionPlan;
  const chorus: MvSectionPlan = {
    sectionId: "sec-chorus",
    label: "Chorus 1",
    kind: "Chorus",
    approach: "Performance",
    start: 20,
    shots: [shot("c1", 20), shot("c2", 22)],
  } as MvSectionPlan;
  return {
    songId: "s",
    sections: [verse, chorus],
    logline: "",
    visualWorld: "",
    energyArc: "",
  } as MvTreatment;
}

function setup(initialShotId?: string) {
  const treatment = makeTreatment();
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
    <DirectConsole
      treatment={treatment}
      initialShotId={initialShotId}
      onChange={vi.fn()}
      onGenerate={vi.fn()}
      onGenerateClip={vi.fn()}
      onGeneratePoseSheet={vi.fn()}
      onTune={vi.fn()}
      genShotId={null}
      genClipId={null}
      genPoseId={null}
      isImageReady={() => true}
      defaultImageModelId="m"
      isVideoReady={() => true}
      defaultVideoModelId="m"
      performers={[]}
      choreoMoves={[]}
      poseSheets={[]}
      buildPrompt={() => ""}
      continuityFor={() => ({ hasReference: false, note: "" }) as ReturnType<never>}
      bpm={120}
    />
    </QueryClientProvider>
  );
  return { treatment };
}

describe("DirectConsole deep link", () => {
  // The Story screen's scene cards jump here via initialShotId, which used
  // to not exist at all — the console always opened on the song's first shot
  // regardless of which scene the user actually clicked.
  it("opens on the deep-linked shot's section, not the song's first shot", () => {
    setup("c1");
    expect(screen.getByRole("button", { name: /Chorus 1/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: /Verse 1/ })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("falls back to the song's first shot with no deep link", () => {
    setup();
    expect(screen.getByRole("button", { name: /Verse 1/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });
});

describe("DirectConsole scene rail", () => {
  it("states each section's shot count in its header", () => {
    setup();
    // Scoped to the section header buttons themselves — the AI Director
    // Copilot panel elsewhere on screen also prints sentences containing a
    // shot count ("N/M shots have a frame in this scene"), which is a
    // different, legitimate use of similar words, not a duplicate of this.
    expect(screen.getByRole("button", { name: /Verse 1/ }).textContent).toMatch(/3 shots/);
    expect(screen.getByRole("button", { name: /Chorus 1/ }).textContent).toMatch(/2 shots/);
  });

  it("opens only the section holding the current shot, by default", () => {
    setup();
    // Verse 1 (holding shot v1, the first/selected shot) is expanded: its
    // three thumbnail buttons are present.
    const verseHeader = screen.getByRole("button", { name: /Verse 1/ });
    expect(verseHeader).toHaveAttribute("aria-expanded", "true");

    // Chorus 1 is not the current section and starts collapsed.
    const chorusHeader = screen.getByRole("button", { name: /Chorus 1/ });
    expect(chorusHeader).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles a section open and closed on click, independent of selection", async () => {
    setup();
    const chorusHeader = screen.getByRole("button", { name: /Chorus 1/ });
    expect(chorusHeader).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(chorusHeader);
    expect(chorusHeader).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(chorusHeader);
    expect(chorusHeader).toHaveAttribute("aria-expanded", "false");
  });

  it("still lets a shot inside a collapsed section be reached by expanding it first", async () => {
    setup();
    const chorusHeader = screen.getByRole("button", { name: /Chorus 1/ });
    await userEvent.click(chorusHeader);

    // With Chorus 1 open, its two shot thumbnails are clickable buttons.
    // chorusHeader's own parent is the one section wrapper (<div key=sectionId>),
    // which is what scopes this to Chorus 1's shots and not Verse 1's.
    const sectionWrapper = chorusHeader.parentElement!;
    const thumbs = within(sectionWrapper).getAllByRole("button", { name: /^Shot \d/ });
    expect(thumbs).toHaveLength(2);
  });
});
