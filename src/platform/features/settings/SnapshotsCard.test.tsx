import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SnapshotsCard } from "./SettingsView";
import { snapshot } from "@/platform/lib/snapshots";
import { hydrateDurableStore, __resetDurableStoreForTests, setDoc } from "@/platform/lib/durableStore";

// Session snapshots used to render every one of them, unbounded — the
// autosave heartbeat fires roughly every 20s while the app is open, so this
// was routinely a dozen identical-looking rows above anything the user came
// to Settings for. Now shows a handful, with the rest one click away.

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args),
}));

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

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

function seedSnapshots(n: number) {
  // snapshot() dedupes on a signature keyed by each value's *length*, not its
  // content — same-length payloads collapse to one snapshot. Padding each
  // entry to a distinct length keeps this fixture honest about that.
  for (let i = 0; i < n; i++) {
    setDoc("mf.songs", JSON.stringify([{ id: "s" + i, pad: "x".repeat(i) }]));
    snapshot(`reason ${i}`, 1_700_000_000_000 + i * 1000);
  }
}

describe("SnapshotsCard", () => {
  it("shows every snapshot when there are only a few", () => {
    seedSnapshots(2);
    render(<SnapshotsCard />);
    expect(screen.getAllByRole("button", { name: /^restore$/i })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /show all/i })).not.toBeInTheDocument();
  });

  it("collapses to a handful once there are many, with an expander", async () => {
    seedSnapshots(8);
    render(<SnapshotsCard />);
    const restoreButtons = screen.getAllByRole("button", { name: /^restore$/i });
    expect(restoreButtons.length).toBeLessThan(8);

    const expander = screen.getByRole("button", { name: /show all 8 snapshots/i });
    await userEvent.click(expander);
    expect(screen.getAllByRole("button", { name: /^restore$/i })).toHaveLength(8);

    await userEvent.click(screen.getByRole("button", { name: /show fewer/i }));
    expect(screen.getAllByRole("button", { name: /^restore$/i }).length).toBeLessThan(8);
  });

  it("says so plainly when there are none yet", () => {
    render(<SnapshotsCard />);
    expect(screen.getByText(/no snapshots yet/i)).toBeInTheDocument();
  });
});
