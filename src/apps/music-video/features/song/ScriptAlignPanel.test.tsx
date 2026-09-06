import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScriptAlignPanel } from "./ScriptAlignPanel";
import type { SongMap, SongSection, SectionKind } from "@/apps/music-video/lib/songBrain";

const sec = (kind: SectionKind, i: number): SongSection => ({
  id: `s${i}`,
  kind,
  label: `${kind} ${i}`,
  start: i * 30,
  end: (i + 1) * 30,
  energy: 0.5,
});

const song: SongMap = {
  id: "song-1",
  name: "Test",
  fileName: "t.wav",
  durationSec: 90,
  bpm: 120,
  beatOffsetSec: 0,
  beatsPerBar: 4,
  sections: [sec("Verse", 0), sec("Chorus", 1)],
  lyrics: [],
  peaks: [],
  energyEnvelope: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const SCRIPT = "[Verse 1]\nhe walks out into the rain\n\n[Chorus]\nwe dance until the lights go out";

beforeEach(() => {
  localStorage.clear();
});

describe("ScriptAlignPanel", () => {
  it("shows the proposed mapping once a script is pasted", async () => {
    render(<ScriptAlignPanel song={song} onApply={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.paste(SCRIPT);

    expect(screen.getByText(/2 of 2 song sections matched/)).toBeInTheDocument();
    expect(screen.getByLabelText("Script section for Verse 0")).toBeInTheDocument();
    expect(screen.getByLabelText("Script section for Chorus 1")).toBeInTheDocument();
  });

  // The whole point of the reconcile step: nothing is written to the song
  // until the user has seen the mapping and accepted it.
  it("writes nothing to the song before Apply is pressed", async () => {
    const onApply = vi.fn();
    render(<ScriptAlignPanel song={song} onApply={onApply} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.paste(SCRIPT);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("hands back a song carrying the script's words on Apply", async () => {
    const onApply = vi.fn();
    render(<ScriptAlignPanel song={song} onApply={onApply} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.paste(SCRIPT);
    await userEvent.click(screen.getByRole("button", { name: /Apply to 2 sections/ }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const next = onApply.mock.calls[0][0] as SongMap;
    expect(next.sections[0].lyricsText).toContain("walks out into the rain");
    expect(next.sections[1].lyricsText).toContain("dance until the lights");
    expect(next.sections[1].choreoNote).toContain("dance");
  });

  it("lets the user re-point a section and honours the override", async () => {
    const onApply = vi.fn();
    render(<ScriptAlignPanel song={song} onApply={onApply} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.paste(SCRIPT);

    // Point the song's Verse at the script's Chorus instead.
    await userEvent.click(screen.getByLabelText("Script section for Verse 0"));
    await userEvent.click(screen.getByRole("option", { name: /Chorus/ }));
    await userEvent.click(screen.getByRole("button", { name: /Apply to/ }));

    const next = onApply.mock.calls[0][0] as SongMap;
    expect(next.sections[0].lyricsText).toContain("dance until the lights");
  });

  it("says so when the script has no section markers to line up", async () => {
    render(<ScriptAlignPanel song={song} onApply={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole("textbox"));
    await userEvent.paste("just some prose with no markers at all");
    expect(screen.getByText(/No \[Verse\] \/ \[Chorus\] markers found/)).toBeInTheDocument();
  });

  it("cannot apply an empty script", () => {
    render(<ScriptAlignPanel song={song} onApply={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Apply to/ })).toBeDisabled();
  });

  it("closes without touching the song on Cancel", async () => {
    const onApply = vi.fn();
    const onCancel = vi.fn();
    render(<ScriptAlignPanel song={song} onApply={onApply} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
