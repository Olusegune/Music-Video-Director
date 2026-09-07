import { describe, expect, it } from "vitest";
import { directSong } from "@/apps/music-video/lib/mvDirector";
import { buildShotImagePrompt, buildShotVideoPrompt } from "@/apps/music-video/lib/mvGen";
import type { SongMap, SongSection } from "@/apps/music-video/lib/songBrain";
import type { Performer } from "@/apps/music-video/lib/cast";
import type { BrandKit } from "@/platform/lib/types";

// Brand Kits used to have zero real consumer in the Music Video Director
// edition — the screen's own subtitle claimed integration with three studios
// that don't exist in this build, and grep confirmed nothing in
// src/apps/music-video read brand kit data at all. This is the actual
// integration: an active kit's palette and visual rules fold into every
// generated prompt, following the same "skip costs nothing" contract
// styleDirectionFragment (director styles) already established.

function section(overrides: Partial<SongSection>): SongSection {
  return {
    id: "s1",
    kind: "Chorus",
    label: "Chorus 1",
    start: 0,
    end: 16,
    energy: 0.8,
    ...overrides,
  };
}

function songWith(sections: SongSection[]): SongMap {
  return {
    id: "song-1",
    name: "Test Song",
    fileName: "test.wav",
    durationSec: 16,
    bpm: 120,
    beatOffsetSec: 0,
    beatsPerBar: 4,
    sections,
    lyrics: [],
    peaks: [],
    energyEnvelope: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const CAST: Performer[] = [];

const kit: BrandKit = {
  id: "kit-1",
  name: "Test Kit",
  colors: ["#FF0000", "#00FF00"],
  fonts: "Inter",
  voice: "Confident, concise",
  visualRules: "Generous negative space and focused imagery.",
};

describe("directSong with no brand kit", () => {
  it("leaves the treatment's brand fields unset — the pre-existing, unlabeled behavior", () => {
    const song = songWith([section({})]);
    const withoutArg = directSong(song, null);
    const withNull = directSong(song, null, undefined, null);
    expect(withoutArg.brandKitId).toBeUndefined();
    expect(withoutArg.brandKitDirection).toBe("");
    // Shot ids are crypto.randomUUID()-generated per call, so two directSong
    // calls never deep-equal on that field alone — compare what a missing vs.
    // explicit-null brand kit could actually differ on instead.
    expect(withNull.brandKitId).toBe(withoutArg.brandKitId);
    expect(withNull.brandKitDirection).toBe(withoutArg.brandKitDirection);
    expect(withNull.visualWorld).toBe(withoutArg.visualWorld);
  });

  it("produces a prompt with no brand-identity fragment", () => {
    const song = songWith([section({})]);
    const t = directSong(song, null);
    const shot = t.sections[0].shots[0];
    const prompt = buildShotImagePrompt({
      shot,
      section: t.sections[0],
      treatment: t,
      cast: CAST,
      characters: [],
      aspect: "16:9",
    });
    expect(prompt).not.toMatch(/brand/i);
  });
});

describe("directSong with an active brand kit", () => {
  it("bakes the kit's id, name, and a real direction fragment onto the treatment", () => {
    const song = songWith([section({})]);
    const t = directSong(song, null, undefined, kit);
    expect(t.brandKitId).toBe("kit-1");
    expect(t.brandKitName).toBe("Test Kit");
    expect(t.brandKitDirection).toContain("#FF0000");
    expect(t.brandKitDirection).toContain("#00FF00");
    expect(t.brandKitDirection).toContain("Generous negative space and focused imagery");
  });

  it("leaves 'voice' out of the visual fragment — it's written-copy tone, not a visual instruction", () => {
    const song = songWith([section({})]);
    const t = directSong(song, null, undefined, kit);
    expect(t.brandKitDirection).not.toMatch(/confident, concise/i);
  });

  it("reaches the actual image and video prompts, not just the treatment", () => {
    const song = songWith([section({})]);
    const t = directSong(song, null, undefined, kit);
    const shot = t.sections[0].shots[0];
    const ctx = { shot, section: t.sections[0], treatment: t, cast: CAST, characters: [], aspect: "16:9" };

    const image = buildShotImagePrompt(ctx);
    expect(image).toContain("#FF0000");
    expect(image).toContain("Generous negative space and focused imagery");

    const video = buildShotVideoPrompt(ctx);
    expect(video).toContain("#FF0000");
  });

  it("produces an empty fragment, not a broken 'Brand identity: .' string, for a kit with nothing set", () => {
    const song = songWith([section({})]);
    const empty: BrandKit = { id: "k2", name: "Empty", colors: [], fonts: "", voice: "", visualRules: "" };
    const t = directSong(song, null, undefined, empty);
    expect(t.brandKitDirection).toBe("");
  });
});
