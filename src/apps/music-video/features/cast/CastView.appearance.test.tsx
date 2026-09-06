import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PerformerCard } from "./CastView";
import { useAppStore } from "@/platform/store/useAppStore";
import type { Performer } from "@/apps/music-video/lib/cast";
import type { Character } from "@/platform/lib/types";

// The "no appearance is described yet" warning used to be a sentence with
// nowhere to go — it told the user what to do ("Add hair, eyes, skin, or
// wardrobe in Character Designer") and left them to navigate there and find
// the right character themselves. It's now a one-click deep link.

const performer = (over: Partial<Performer> = {}): Performer =>
  ({
    id: "p1",
    name: "Neo",
    role: "Lead Singer",
    danceStyle: "",
    wardrobe: "",
    performanceNotes: "",
    lipSync: true,
    characterId: "c1",
    ...over,
  }) as Performer;

const character = (over: Partial<Character> = {}): Character =>
  ({ id: "c1", name: "Neo Dude", ...over }) as Character;

beforeEach(() => useAppStore.setState({ pendingCharacterCardId: null, view: "song" }));

describe("PerformerCard appearance warning", () => {
  it("offers a one-click fix, not just prose, when the linked character has no appearance", async () => {
    render(
      <PerformerCard
        performer={performer()}
        characters={[character()]}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onCharacterAdded={vi.fn()}
      />
    );

    expect(screen.getByText(/no appearance is described yet/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /describe them/i }));

    expect(useAppStore.getState().view).toBe("characters");
    expect(useAppStore.getState().pendingCharacterCardId).toBe("c1");
  });

  it("shows no warning, and no fix-it button, once the character has real appearance data", () => {
    render(
      <PerformerCard
        performer={performer()}
        characters={[character({ hairColor: "black", eyeColor: "brown" })]}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onCharacterAdded={vi.fn()}
      />
    );

    expect(screen.queryByText(/no appearance is described yet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /describe them/i })).not.toBeInTheDocument();
    expect(screen.getByText(/visual DNA/i)).toBeInTheDocument();
  });

  it("shows nothing appearance-related when no character is linked at all", () => {
    render(
      <PerformerCard
        performer={performer({ characterId: undefined })}
        characters={[character()]}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onCharacterAdded={vi.fn()}
      />
    );
    expect(screen.queryByText(/no appearance is described yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/visual DNA/i)).not.toBeInTheDocument();
  });
});
