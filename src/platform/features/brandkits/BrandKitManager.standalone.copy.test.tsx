import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Standalone (Music Video Director only) edition: no other studio exists, so
// the subtitle must not name Glam/Web/Campaign. Module-level vi.mock (hoisted
// automatically, no vi.resetModules() needed) so BrandKitManager picks up the
// mocked isModuleEnabled on its normal static import — see the suite-build
// sibling test for why this is a separate file rather than a second describe
// block with a mock swap mid-file.

vi.mock("@/platform/lib/productConfig", () => ({
  isModuleEnabled: () => false,
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
  it("does not name studios that don't exist in this build", async () => {
    const { BrandKitManager } = await import("./BrandKitManager");
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <BrandKitManager />
      </QueryClientProvider>
    );
    expect(screen.queryByText(/Glam, Web, and Campaign/)).not.toBeInTheDocument();
    expect(
      await screen.findByText(/not yet read by any studio in this build/)
    ).toBeInTheDocument();
  });
});
