import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { MagicOutputScreen } from "./MagicOutputScreen";
import { useAppStore } from "@/platform/store/useAppStore";
import { saveSong, type SongMap } from "@/apps/music-video/lib/songBrain";
import { hydrateDurableStore, __resetDurableStoreForTests } from "@/platform/lib/durableStore";

// Story's two "nothing here" guard clauses used to be the only ones of eight
// screens without the shared empty-state pattern (icon badge + heading +
// explanation + a real action button) — Direct/Choreography/Cast/Timeline
// all already had it. The "no production selected" case was worse: it had
// no button at all, just text saying where to go with no way to get there.

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args),
}));

function song(): SongMap {
  return {
    id: "song-1",
    name: "Test Song",
    fileName: "t.wav",
    durationSec: 40,
    bpm: 120,
    beatOffsetSec: 0,
    beatsPerBar: 4,
    sections: [],
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
});

function renderWithClient() {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MagicOutputScreen />
    </QueryClientProvider>
  );
}

describe("MagicOutputScreen empty states", () => {
  it("gives a real way forward when no production is selected, not just text", () => {
    useAppStore.setState({ activeSongId: null, view: "magicoutput" });
    renderWithClient();
    expect(screen.getByRole("heading", { name: "No production selected" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go to Dashboard/ })).toBeInTheDocument();
  });

  it("uses the same icon-badge pattern as Direct/Choreography/Cast/Timeline when no plan exists yet", () => {
    const s = song();
    saveSong(s);
    useAppStore.setState({ activeSongId: s.id, view: "magicoutput" });
    renderWithClient();
    const heading = screen.getByRole("heading", { name: "No plan yet" });
    const container = heading.closest("div")!.parentElement!;
    expect(container.querySelector(".bg-elevated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Go to Song Studio/ })).toBeInTheDocument();
  });
});
