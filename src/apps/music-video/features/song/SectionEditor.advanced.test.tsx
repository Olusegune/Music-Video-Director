import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SectionEditor } from "./SectionEditor";
import type { SongSection } from "@/apps/music-video/lib/songBrain";

// The "Advanced — mood, visual style, choreography, energy" disclosure used to
// be a bespoke ChevronRight/ChevronDown toggle, independent of the shared
// InspectorGroup primitive every other collapsible panel in the app (ShotRow,
// dnaKit) had already migrated to. This locks its behavior — closed by
// default, opens on click, exposes its fields once open — through the shared
// component rather than the old one-off implementation.

const section = (): SongSection =>
  ({
    id: "s1",
    kind: "Chorus",
    label: "Chorus 1",
    start: 112,
    end: 130,
    energy: 0.8,
  }) as SongSection;

function setup() {
  const onPatch = vi.fn();
  render(<SectionEditor section={section()} onPatch={onPatch} onSeek={() => {}} />);
  return { onPatch };
}

describe("SectionEditor advanced disclosure", () => {
  it("starts collapsed, hiding mood/style/choreography/energy fields", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /advanced.*mood.*visual style.*choreography.*energy/i })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/energy level/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/e\.g\. neon, hazy/i)).not.toBeInTheDocument();
  });

  it("reveals the fields on click, and lets them edit the section", async () => {
    const { onPatch } = setup();
    await userEvent.click(screen.getByRole("button", { name: /advanced/i }));

    const energySlider = screen.getByLabelText(/energy level/i);
    expect(energySlider).toBeInTheDocument();

    const visualStyle = screen.getByPlaceholderText(/e\.g\. neon, hazy/i);
    await userEvent.type(visualStyle, "x");
    expect(onPatch).toHaveBeenCalled();
  });

  it("collapses again on a second click", async () => {
    setup();
    const toggle = screen.getByRole("button", { name: /advanced/i });
    await userEvent.click(toggle);
    expect(screen.getByLabelText(/energy level/i)).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.queryByLabelText(/energy level/i)).not.toBeInTheDocument();
  });
});
