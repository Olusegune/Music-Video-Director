import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Standalone (Music Video Director only) edition: exactly one studio exists,
// so the copy must not imply the output is shared across several. Module-
// level vi.mock (hoisted automatically) so ScriptStudio picks up the mocked
// module list on its normal static import — see the suite-build sibling test
// for why this is a separate file rather than a mock swap mid-file.

vi.mock("@/platform/lib/moduleManifest", async () => {
  const actual = await vi.importActual<typeof import("@/platform/lib/moduleManifest")>(
    "@/platform/lib/moduleManifest"
  );
  return { ...actual, listModuleManifests: () => actual.listAllModuleManifests().slice(0, 1) };
});

vi.mock("@/platform/lib/docParse", () => ({
  extractTextFromFile: vi.fn(),
  ACCEPT_ATTR: ".txt,.md",
}));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("ScriptStudio copy — standalone (single-studio) build", () => {
  it("doesn't imply multiple studios share the output when there's only one", async () => {
    const { ScriptStudio } = await import("./ScriptStudio");
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <ScriptStudio />
      </QueryClientProvider>
    );
    expect(screen.queryByText(/used by all studios/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Available in every studio")).not.toBeInTheDocument();
    expect(screen.getByText("Feeds every Bible")).toBeInTheDocument();
    expect(
      screen.getByText(
        /extracts cast, locations, props, tone, and motifs into your Character, World, and Prop Bibles/
      )
    ).toBeInTheDocument();
  });
});
