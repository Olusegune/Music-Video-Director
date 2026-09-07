import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "@/platform/store/useAppStore";

// The sidebar's own logo badge was a generic lucide Film glyph on a gradient
// square — a placeholder, not the app's real branding. It now uses the
// actual supplied app icon image.

vi.mock("@/platform/lib/ipc", async () => {
  const actual = await vi.importActual<typeof import("@/platform/lib/ipc")>("@/platform/lib/ipc");
  return {
    ...actual,
    api: { ...actual.api, listProjects: vi.fn().mockResolvedValue([]) },
  };
});

function renderSidebar() {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <Sidebar />
    </QueryClientProvider>
  );
}

describe("Sidebar branding", () => {
  it("uses the real app icon image, not a placeholder glyph", () => {
    useAppStore.setState({ studioMode: "director" });
    renderSidebar();
    const logo = screen.getAllByAltText("")[0] as HTMLImageElement;
    expect(logo).toBeInTheDocument();
    expect(logo.src).toContain("/app-icon.png");
  });
});
