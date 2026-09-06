import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MagicOutputScreen } from "./MagicOutputScreen";
import { useAppStore } from "@/platform/store/useAppStore";
import { saveSong, type SongMap, type SongSection } from "@/apps/music-video/lib/songBrain";
import { directSong, saveTreatment } from "@/apps/music-video/lib/mvDirector";
import { hydrateDurableStore, __resetDurableStoreForTests } from "@/platform/lib/durableStore";

// The scene filmstrip used to show "the first 6 shots that happened to have a
// lyric or idea" — arbitrary shots, not scenes, and clicking one did nothing.
// It's now one card per section, and each is a real link into Direct.

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args),
}));

const SECTIONS: SongSection[] = [
  { id: "sec-verse", kind: "Verse", label: "Verse 1", start: 0, end: 20, energy: 0.5 },
  { id: "sec-chorus", kind: "Chorus", label: "Chorus 1", start: 20, end: 40, energy: 0.9 },
];

function song(): SongMap {
  return {
    id: "song-1",
    name: "Test Song",
    fileName: "t.wav",
    durationSec: 40,
    bpm: 120,
    beatOffsetSec: 0,
    beatsPerBar: 4,
    sections: SECTIONS,
    lyrics: [],
    peaks: [],
    energyEnvelope: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as SongMap;
}

beforeEach(async () => {
  __resetDurableStoreForTests();
  invokeMock.mockReset();
  localStorage.clear();
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  invokeMock.mockImplementation((cmd: string) =>
    cmd === "doc_get_all" ? Promise.resolve([]) : Promise.resolve()
  );
  await hydrateDurableStore();

  const s = song();
  saveSong(s);
  saveTreatment(directSong(s, null));
  useAppStore.setState({ activeSongId: "song-1", pendingDirectSectionId: null, view: "magicoutput" });
});

describe("MagicOutputScreen scene cards", () => {
  it("shows one card per section, not an arbitrary handful of shots", () => {
    render(<MagicOutputScreen />);
    expect(screen.getByText("Verse 1")).toBeInTheDocument();
    expect(screen.getByText("Chorus 1")).toBeInTheDocument();
  });

  it("opens Direct at that exact section when a card is clicked", async () => {
    render(<MagicOutputScreen />);
    await userEvent.click(screen.getByTitle("Open Chorus 1 in Direct"));

    expect(useAppStore.getState().view).toBe("mvdirector");
    expect(useAppStore.getState().pendingDirectSectionId).toBe("sec-chorus");
  });
});
