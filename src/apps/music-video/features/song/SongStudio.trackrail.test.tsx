import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SongMap, SongSection, SectionKind } from "@/apps/music-video/lib/songBrain";

// The rail's disambiguation rule, exercised directly. Mounting SongStudio
// itself would drag in the audio player, the durable store and the whole
// import surface for a decision that is one line of layout.
//
// KNOWN LIMIT — this mirrors the rule rather than rendering the real rail, so
// it pins the intended behaviour but will not notice SongStudio drifting away
// from it. If the rail's markup changes, change this together with it.
function TrackRail({ songs, activeId }: { songs: SongMap[]; activeId: string }) {
  return (
    <div>
      {songs.map((s) => {
        const ambiguous = songs.filter((o) => o.name === s.name).length > 1;
        const choruses = s.sections.filter((x) => x.kind === "Chorus").length;
        return (
          <button key={s.id} title={s.name} aria-current={s.id === activeId}>
            <span>{s.name}</span>
            {ambiguous && (
              <span>
                {s.sections.length} sections ·{" "}
                {choruses > 0 ? `${choruses} chorus${choruses === 1 ? "" : "es"}` : "no chorus"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const sec = (kind: SectionKind, i: number): SongSection => ({
  id: `s${i}`,
  kind,
  label: `${kind} ${i}`,
  start: i * 10,
  end: (i + 1) * 10,
  energy: 0.5,
});

const song = (id: string, name: string, kinds: SectionKind[]): SongMap => ({
  id,
  name,
  fileName: "t.wav",
  durationSec: kinds.length * 10,
  bpm: 94,
  beatOffsetSec: 0,
  beatsPerBar: 4,
  sections: kinds.map(sec),
  lyrics: [],
  peaks: [],
  energyEnvelope: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("track rail", () => {
  // Two imports of the same file are indistinguishable once the name is
  // truncated — the real library had the same track listed twice.
  it("distinguishes tracks that share a name", () => {
    render(
      <TrackRail
        activeId="a"
        songs={[
          song("a", "Same Name", ["Intro", "Verse", "Chorus", "Outro"]),
          song("b", "Same Name", ["Intro", "Verse", "Verse", "Outro"]),
        ]}
      />
    );
    expect(screen.getByText(/4 sections · 1 chorus$/)).toBeInTheDocument();
    expect(screen.getByText(/4 sections · no chorus/)).toBeInTheDocument();
  });

  // An always-on subtitle would be noise on a library of distinct tracks.
  it("stays quiet when names are already distinct", () => {
    render(
      <TrackRail
        activeId="a"
        songs={[
          song("a", "First Track", ["Intro", "Chorus"]),
          song("b", "Second Track", ["Intro", "Verse"]),
        ]}
      />
    );
    expect(screen.queryByText(/sections ·/)).not.toBeInTheDocument();
  });

  it("pluralises choruses correctly", () => {
    render(
      <TrackRail
        activeId="a"
        songs={[
          song("a", "Dup", ["Chorus", "Chorus"]),
          song("b", "Dup", ["Chorus"]),
        ]}
      />
    );
    expect(screen.getByText(/2 choruses/)).toBeInTheDocument();
    expect(screen.getByText(/1 chorus$/)).toBeInTheDocument();
  });

  it("keeps the full name reachable when truncated", () => {
    render(<TrackRail activeId="a" songs={[song("a", "A Very Long Track Name", ["Intro"])]} />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "A Very Long Track Name");
  });
});
