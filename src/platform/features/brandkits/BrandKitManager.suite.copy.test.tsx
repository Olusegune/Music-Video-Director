import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrandKitManager } from "./BrandKitManager";

// The header subtitle used to be a fixed string naming Glam, Web, and
// Campaign Studios regardless of which studios this build actually ships.
// This file runs under the suite build's real, unmocked module state (all
// five studios enabled) and checks the subtitle still names them correctly
// there. See BrandKitManager.standalone.copy.test.tsx for the single-studio
// build's honest alternative copy — kept in a separate file rather than
// switching mocks mid-file, since doing that with vi.resetModules() caused a
// real, reproducible flake in an unrelated test file elsewhere in the suite
// (confirmed: ~60% failure rate across five full-suite runs, always the same
// test, always passing in isolation — a global side effect, not a fluke).

vi.mock("@/platform/lib/ipc", async () => {
  const actual = await vi.importActual<typeof import("@/platform/lib/ipc")>("@/platform/lib/ipc");
  return { ...actual, api: { ...actual.api, listBrandKits: vi.fn().mockResolvedValue([]) } };
});

afterEach(cleanup);

describe("BrandKitManager copy — suite build (default test environment)", () => {
  it("names the studios that actually share brand kits when more than one exists", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <BrandKitManager />
      </QueryClientProvider>
    );
    expect(
      await screen.findByText(/Shared by Glam, Web, and Campaign Studios/)
    ).toBeInTheDocument();
  });
});
