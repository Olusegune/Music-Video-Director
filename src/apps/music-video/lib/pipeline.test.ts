import { describe, expect, it } from "vitest";
import { directSong, carryGeneratedWork } from "@/apps/music-video/lib/mvDirector";
import { buildShotImagePrompt, buildShotVideoPrompt } from "@/apps/music-video/lib/mvGen";
import { resolveSize } from "@/platform/lib/imageGen";
import type { SongMap, SongSection, LyricLine } from "@/apps/music-video/lib/songBrain";
import type { Performer } from "@/apps/music-video/lib/cast";

// One walk down the whole chain: words -> sections -> treatment -> shot ->
// prompt -> pixel size.
//
// Every bug found in this app during the September 2026 sweep lived in a link
// between two stages rather than inside either one, and the unit tests on both
// sides stayed green throughout: lyrics written but never reaching a prompt, a
// treatment stranded in a slot nothing read, a diagnosis measured against a
// plan the song had already moved past, an aspect asked for in prose that the
// model ignored. Testing components more thoroughly would not have caught any
// of them. Walking the chain does.

const SECTIONS: SongSection[] = [
  { id: "sec-intro", kind: "Intro", label: "Intro", start: 0, end: 20, energy: 0.25 },
  { id: "sec-verse", kind: "Verse", label: "Verse 1", start: 20, end: 50, energy: 0.5 },
  { id: "sec-chorus", kind: "Chorus", label: "Chorus 1", start: 50, end: 80, energy: 0.9 },
  { id: "sec-outro", kind: "Outro", label: "Outro", start: 80, end: 100, energy: 0.2 },
];

/** The derivation SongView performs whenever a section's words change. */
function timedLyrics(sections: SongSection[]): LyricLine[] {
  return sections.flatMap((s) => {
    const lines = (s.lyricsText ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const span = Math.max(0.1, s.end - s.start);
    return lines.map((text, k) => ({
      id: `${s.id}-${k}`,
      text,
      start: s.start + ((k + 0.5) / lines.length) * span,
      sectionId: s.id,
    }));
  });
}

function song(): SongMap {
  const sections = SECTIONS.map((s) => ({
    ...s,
    lyricsText:
      s.kind === "Chorus"
        ? "we dance until the lights go out\nhold the night a little longer"
        : s.kind === "Verse"
          ? "he walks out into the rain\nnobody follows him"
          : "",
    lead: s.kind === "Chorus" || s.kind === "Verse" ? "Lead vocal" : undefined,
  }));
  return {
    id: "song-pipeline",
    name: "Pipeline Fixture",
    fileName: "fixture.wav",
    durationSec: 100,
    bpm: 120,
    beatOffsetSec: 0,
    beatsPerBar: 4,
    sections,
    lyrics: timedLyrics(sections),
    peaks: [],
    energyEnvelope: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as SongMap;
}

const CAST: Performer[] = [
  { id: "p1", name: "Neo Dude", role: "Lead Singer", characterId: "c1" } as Performer,
];

describe("song to screen pipeline", () => {
  it("turns a song into a shot list that covers it end to end", () => {
    const t = directSong(song(), null);
    const shots = t.sections.flatMap((s) => s.shots);
    expect(shots.length).toBeGreaterThan(0);
    expect(t.sections).toHaveLength(SECTIONS.length);

    const ordered = [...shots].sort((a, b) => a.start - b.start);
    expect(ordered[0].start).toBeCloseTo(0, 1);
    expect(ordered[ordered.length - 1].end).toBeCloseTo(100, 1);
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i].start).toBeCloseTo(ordered[i - 1].end, 1);
    }
  });

  // The bug: nine sections were transcribed and not one word reached a prompt,
  // because the timed list the Director reads was never rebuilt from them.
  it("carries a section's words all the way into its prompts", () => {
    const s = song();
    const t = directSong(s, null);
    const chorus = t.sections.find((x) => x.kind === "Chorus")!;
    const withLyric = chorus.shots.find((sh) => sh.lyric);
    expect(withLyric, "a chorus shot should carry one of the chorus lines").toBeTruthy();

    const written = s.sections
      .find((x) => x.kind === "Chorus")!
      .lyricsText!.split("\n")
      .map((l) => l.trim());
    expect(written).toContain(withLyric!.lyric);

    const prompt = buildShotImagePrompt({
      shot: withLyric!,
      section: chorus,
      treatment: t,
      cast: CAST,
      characters: [],
      aspect: "16:9",
    });
    expect(prompt.length).toBeGreaterThan(40);
    // The lyric anchors the shot, but must not be quoted into the prompt:
    // image models render a quoted string as on-screen typography.
    expect(prompt).not.toContain('"' + withLyric!.lyric + '"');
  });

  it("puts a performer on camera where the song says someone sings", () => {
    const t = directSong(song(), null);
    const chorus = t.sections.find((x) => x.kind === "Chorus")!;
    const prompt = buildShotImagePrompt({
      shot: chorus.shots[0],
      section: chorus,
      treatment: t,
      cast: CAST,
      characters: [],
      aspect: "16:9",
    });
    expect(prompt).toContain("Neo Dude");
  });

  it("asks for a frame size a model will accept, for every offered aspect", () => {
    for (const aspect of ["16:9", "21:9", "9:16", "4:5", "3:4", "1:1"]) {
      const { width, height } = resolveSize(aspect, "large");
      expect(width % 16, aspect + " width " + width).toBe(0);
      expect(height % 16, aspect + " height " + height).toBe(0);
    }
  });

  it("keeps a clip prompt anchored to the same shot as its frame", () => {
    const t = directSong(song(), null);
    const chorus = t.sections.find((x) => x.kind === "Chorus")!;
    const shot = chorus.shots[0];
    const video = buildShotVideoPrompt({
      shot,
      section: chorus,
      treatment: t,
      cast: CAST,
      characters: [],
      aspect: "16:9",
    });
    expect(video).toContain(shot.movement);
  });

  // The bug: re-directing rebuilt the list and discarded paid-for frames.
  it("does not lose generated frames when the song is re-directed", () => {
    const s = song();
    const first = directSong(s, null);
    const withFrames = {
      ...first,
      sections: first.sections.map((sec) => ({
        ...sec,
        shots: sec.shots.map((sh, i) => (i === 0 ? { ...sh, imageUrl: sec.kind + ".png" } : sh)),
      })),
    };
    const { treatment: rebuilt, carried } = carryGeneratedWork(withFrames, directSong(s, null));
    expect(carried).toBe(SECTIONS.length);
    const kept = rebuilt.sections.flatMap((sec) => sec.shots).filter((sh) => sh.imageUrl);
    expect(kept).toHaveLength(SECTIONS.length);
  });

  // The bug: editing words after directing left the shot list describing the
  // previous song, with nothing saying so.
  it("reflects edited words once the song is re-directed", () => {
    const before = song();
    const t1 = directSong(before, null);
    const lyricsBefore = t1.sections.flatMap((s) => s.shots.map((sh) => sh.lyric)).filter(Boolean);
    expect(lyricsBefore.some((l) => l!.includes("rain"))).toBe(true);

    const edited: SongMap = {
      ...before,
      sections: before.sections.map((s) =>
        s.kind === "Verse" ? { ...s, lyricsText: "she drives across the bridge" } : s
      ),
    };
    const relinked = { ...edited, lyrics: timedLyrics(edited.sections) };
    const t2 = directSong(relinked, null);
    const lyricsAfter = t2.sections.flatMap((s) => s.shots.map((sh) => sh.lyric)).filter(Boolean);
    expect(lyricsAfter.some((l) => l!.includes("bridge"))).toBe(true);
    expect(lyricsAfter.some((l) => l!.includes("rain"))).toBe(false);
  });
});
