import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Standalone (Music Video Director only) edition: Glam/Web/Campaign don't
// exist, but Music Video Director itself always does (ENABLED_MODULES
// always includes "musicvideo", in every edition) and now has a real
// brand-kit integration — the mock below reflects that exactly:
// isModuleEnabled is true only for "musicvideo", matching what the real
// single-studio build actually reports, not "nothing is enabled" (which no
// real build configuration produces). Module-level vi.mock (hoisted
// automatically, no vi.resetModules() needed) so BrandKitManager picks up
// the mock on its normal static import — see the suite-build sibling test
// for why this is a separate file rather than a mock swap mid-file.

vi.mock("@/platform/lib/productConfig", () => ({
  isModuleEnabled: (id: string) => id === "musicvideo",
  PRODUCT_EDITION: "musicvideo",
  PRODUCT_NAME: "Music Video Director",
  ENABLED_MODULES: ["musicvideo"],
}));

vi.mock("@/platform/lib/ipc", async () => {
  const actual = await vi.importActual<typeof import("@/platform/lib/ipc")>("@/platform/lib/ipc");
  return { ...actual, api: { ...actual.api, listBrandKits: vi.fn().mockResolvedValue([]) } };
});

afterEach(cleanup);

describe("BrandKitManager copy — standalone (single-studio) build", () => {
  it("names only Music Video Director, not studios that don't exist in this build", async () => {
    const { BrandKitManager } = await import("./BrandKitManager");
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <BrandKitManager />
      </QueryClientProvider>
    );
    expect(screen.queryByText(/Glam, Web, and Campaign/)).not.toBeInTheDocument();
    expect(
      await screen.findByText("Applied to every prompt Music Video Director generates.")
    ).toBeInTheDocument();
  });
});
