import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

function renderWithClient() {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MagicOutputScreen />
    </QueryClientProvider>
  );
}

describe("MagicOutputScreen", () => {
  it("labels itself 'Story', matching the sidebar item that opens it", () => {
    // The sidebar's nav item for this screen is "Story" (navModel.ts), but
    // the screen itself only ever said "Your treatment is ready." — nothing
    // on screen echoed the nav label, so there was no on-page confirmation
    // you'd landed where the sidebar said you would.
    renderWithClient();
    expect(screen.getByText("Story")).toBeInTheDocument();
  });

  it("uses the same header shell as Song Studio/Direct/Cast/Choreography/Timeline", () => {
    // This screen used to be its own centered, icon-less banner — the only
    // one of eight Music Video screens without the shared icon-badge +
    // title + subtitle header. "Your treatment is ready." is still here,
    // just as page content below the standard chrome, not standing in for it.
    renderWithClient();
    const heading = screen.getByRole("heading", { level: 1, name: "Story" });
    const header = heading.closest("header");
    expect(header).not.toBeNull();
    expect(header!.querySelector(".grad-primary")).toBeInTheDocument();
    expect(screen.getByText("Your treatment is ready.")).toBeInTheDocument();
  });
});

describe("MagicOutputScreen scene cards", () => {
  it("shows one card per section, not an arbitrary handful of shots", () => {
    renderWithClient();
    expect(screen.getByText("Verse 1")).toBeInTheDocument();
    expect(screen.getByText("Chorus 1")).toBeInTheDocument();
  });

  it("opens Direct at that exact section when a card is clicked", async () => {
    renderWithClient();
    await userEvent.click(screen.getByTitle("Open Chorus 1 in Direct"));

    expect(useAppStore.getState().view).toBe("mvdirector");
    expect(useAppStore.getState().pendingDirectSectionId).toBe("sec-chorus");
  });
});
