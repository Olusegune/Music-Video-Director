import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScriptStudio } from "./ScriptStudio";

// "Feeds your Bibles — used by all studios" was suite-era copy, technically
// never false but implying multiple studios share the output — this file
// checks it still reads correctly in the suite build (real, unmocked module
// state, all five studios enabled). See ScriptStudio.standalone.copy.test.tsx
// for the single-studio build's honest alternative. Kept as separate files
// rather than switching mocks mid-file with vi.resetModules(), which caused
// a real, reproducible flake in an unrelated test file (~60% failure rate
// across five full-suite runs, always the same test, always passing alone).

// ScriptStudio pulls in docParse.ts for file import, which pulls in
// pdfjs-dist — that needs DOMMatrix, which jsdom doesn't provide, and file
// parsing isn't what this test is about.
vi.mock("@/platform/lib/docParse", () => ({
  extractTextFromFile: vi.fn(),
  ACCEPT_ATTR: ".txt,.md",
}));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("ScriptStudio copy — suite build (default test environment)", () => {
  it("says it's shared across studios when more than one exists", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <ScriptStudio />
      </QueryClientProvider>
    );
    expect(screen.getByText(/used by all studios/i)).toBeInTheDocument();
    expect(screen.getByText("Available in every studio")).toBeInTheDocument();
  });
});
