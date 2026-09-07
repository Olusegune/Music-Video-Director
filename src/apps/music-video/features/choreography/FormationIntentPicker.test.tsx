import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormationIntentPicker } from "./ChoreographyView";
import { FORMATION_INTENTS } from "@/apps/music-video/lib/choreography";

describe("FormationIntentPicker", () => {
  it("names itself on screen — the row used to be six unlabeled buttons", () => {
    // "how performers are arranged, orthogonal to dance style" lived only in
    // a code comment; nothing on screen or for a screen reader said what
    // this group of buttons meant, unlike StylePicker next to it (which
    // self-labels via its own aria-label and its button showing the current
    // value).
    render(<FormationIntentPicker value="group" onChange={vi.fn()} />);
    expect(screen.getByText("Formation")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Formation" })).toBeInTheDocument();
  });

  it("shows all six presets, Group among them", () => {
    render(<FormationIntentPicker value="group" onChange={vi.fn()} />);
    for (const preset of FORMATION_INTENTS) {
      expect(screen.getByRole("button", { name: preset.label })).toBeInTheDocument();
    }
  });

  it("reports the clicked preset's key, not its label", async () => {
    const onChange = vi.fn();
    render(<FormationIntentPicker value="group" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Narrative Movement" }));
    expect(onChange).toHaveBeenCalledWith("narrative");
  });

  it("only the current value's button reads as selected", () => {
    render(<FormationIntentPicker value="solo" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Solo Performance" }).className).toMatch(/border-primary/);
    expect(screen.getByRole("button", { name: "Group" }).className).not.toMatch(/border-primary/);
  });
});
