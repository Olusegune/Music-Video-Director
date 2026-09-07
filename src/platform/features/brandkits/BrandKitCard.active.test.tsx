import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrandKitCard } from "./BrandKitManager";
import { useAppStore } from "@/platform/store/useAppStore";

// This card's "Music Video · not connected" badge used to be a hardcoded
// string, true because nothing in the build ever read brand kit data.
// Music Video Director now reads an active kit's palette and visual rules
// into every generated prompt, so this button is what actually turns that
// on — checked here against the real store, not a mock, since
// setActiveBrandKit's persistence (and the deliberate choice not to reset it
// per-song, unlike activeTemplateId) is real behavior worth locking down.

const kit = {
  id: "kit-1",
  name: "Test Kit",
  colors: ["#111111", "#222222"],
  fonts: "Inter",
  voice: "Confident",
  visualRules: "Clean and minimal.",
};

function setup() {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <BrandKitCard kit={kit} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ activeBrandKitId: null });
});

describe("BrandKitCard active toggle", () => {
  it("starts inactive when this kit isn't the active one", () => {
    setup();
    expect(screen.getByRole("button", { name: /use this kit/i })).toBeInTheDocument();
  });

  it("activates on click, and persists it as the store's active brand kit", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /use this kit/i }));
    expect(screen.getByRole("button", { name: /music video · active/i })).toBeInTheDocument();
    expect(useAppStore.getState().activeBrandKitId).toBe("kit-1");
  });

  it("deactivates on a second click", async () => {
    setup();
    const toggle = () => screen.getByRole("button", { name: /music video/i });
    await userEvent.click(toggle());
    await userEvent.click(toggle());
    expect(useAppStore.getState().activeBrandKitId).toBeNull();
    expect(screen.getByRole("button", { name: /use this kit/i })).toBeInTheDocument();
  });

  it("shows as active when the store already points at this kit", () => {
    useAppStore.setState({ activeBrandKitId: "kit-1" });
    setup();
    expect(screen.getByRole("button", { name: /music video · active/i })).toBeInTheDocument();
  });

  it("persists to localStorage, matching activeTemplateId's durability", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /use this kit/i }));
    expect(localStorage.getItem("mf.activeBrandKitId")).toBe("kit-1");
  });

  it("clears the persisted id on deactivate, not just the in-memory state", async () => {
    setup();
    const toggle = () => screen.getByRole("button", { name: /music video/i });
    await userEvent.click(toggle());
    await userEvent.click(toggle());
    expect(localStorage.getItem("mf.activeBrandKitId")).toBeNull();
  });
});
