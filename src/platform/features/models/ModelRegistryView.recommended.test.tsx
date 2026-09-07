import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelRegistryView } from "./ModelRegistryView";
import { recordTest } from "@/platform/lib/providerMeta";

// "Recommended" must never show a model the user can't actually use yet — no
// speed/quality/cost field exists in this registry to rank by, and inventing
// one would be the same unearned claim flagged elsewhere in this app. The one
// real signal available is: wired, key configured, and an actual passed
// connection test. Anything short of all three must not appear here.
//
// Scoped to the strip's own data-testid throughout: "GPT Image 1" also
// appears, unconditionally, in the always-rendered catalog below — an
// unscoped text query resolves on that immediately regardless of whether the
// recommendation logic ran at all, which is exactly the bug that made the
// first version of this test a false pass.

vi.mock("@/platform/lib/ipc", async () => {
  const actual = await vi.importActual<typeof import("@/platform/lib/ipc")>("@/platform/lib/ipc");
  return {
    ...actual,
    api: {
      ...actual.api,
      getProviderKeyStatuses: vi.fn(),
    },
  };
});

import { api } from "@/platform/lib/ipc";

function setup() {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <ModelRegistryView />
    </QueryClientProvider>
  );
}

async function strip() {
  return screen.findByTestId("recommended-strip");
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.getProviderKeyStatuses).mockReset();
});

describe("ModelRegistryView recommended strip", () => {
  it("recommends nothing when no provider has a passed connection test", async () => {
    vi.mocked(api.getProviderKeyStatuses).mockResolvedValue([
      { provider: "openai", configured: true },
    ]);
    setup();
    await waitFor(async () =>
      expect(
        within(await strip()).getByText(/only ever shows a model that is wired/)
      ).toBeInTheDocument()
    );
  });

  it("recommends nothing for a key that's configured but never tested", async () => {
    // Configured, but no recordTest() call — never actually tested.
    vi.mocked(api.getProviderKeyStatuses).mockResolvedValue([
      { provider: "openai", configured: true },
    ]);
    setup();
    await waitFor(async () =>
      expect(
        within(await strip()).getByText(/only ever shows a model that is wired/)
      ).toBeInTheDocument()
    );
  });

  it("recommends a model once its provider is configured AND has a real passed test", async () => {
    recordTest("openai" as never, "connected");
    vi.mocked(api.getProviderKeyStatuses).mockResolvedValue([
      { provider: "openai", configured: true },
    ]);
    setup();
    // GPT Image covers several workflows (text-to-image, image-to-image,
    // character-ref, variation), so it can legitimately appear once per
    // workflow — this only needs to prove at least one recommendation landed.
    await waitFor(async () =>
      expect(within(await strip()).getAllByText("GPT Image 1").length).toBeGreaterThan(0)
    );
    expect(within(await strip()).queryByText(/only ever shows a model/)).not.toBeInTheDocument();
  });

  it("does not recommend a configured provider whose last test failed", async () => {
    recordTest("openai" as never, "invalid");
    vi.mocked(api.getProviderKeyStatuses).mockResolvedValue([
      { provider: "openai", configured: true },
    ]);
    setup();
    await waitFor(async () =>
      expect(
        within(await strip()).getByText(/only ever shows a model that is wired/)
      ).toBeInTheDocument()
    );
  });
});
