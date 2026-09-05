import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DirectorStylePicker } from "./DirectorStyleStep";
import { DIRECTOR_STYLES } from "@/apps/music-video/lib/directorStyles";

describe("DirectorStylePicker", () => {
  it("offers every style plus an explicit way to keep your own look", () => {
    render(<DirectorStylePicker value={null} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /My own look/ })).toBeInTheDocument();
    for (const style of DIRECTOR_STYLES) {
      expect(screen.getByRole("button", { name: new RegExp(style.name) })).toBeInTheDocument();
    }
  });

  // Skipping must read as a peer choice, not an escape hatch tucked at the end.
  it("puts 'my own look' first, ahead of the directors", () => {
    render(<DirectorStylePicker value={null} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("My own look");
  });

  it("reports null when the user keeps their own look", async () => {
    const onChange = vi.fn();
    render(<DirectorStylePicker value="precise-ominous" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /My own look/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("reports the style id when a director is chosen", async () => {
    const onChange = vi.fn();
    render(<DirectorStylePicker value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Hype Williams/ }));
    expect(onChange).toHaveBeenCalledWith("glossy-kinetic-hiphop");
  });

  // The effect of a style should never be a black box: what gets woven into
  // the prompts is shown before the user commits to it.
  it("shows the actual techniques once a style is selected", () => {
    render(<DirectorStylePicker value="glossy-kinetic-hiphop" onChange={vi.fn()} />);
    const panel = screen.getByText(/techniques woven into every shot/).parentElement!;
    expect(within(panel).getByText("Fisheye lens")).toBeInTheDocument();
    expect(within(panel).getByText("Slow motion")).toBeInTheDocument();
  });

  it("shows no technique panel while no style is chosen", () => {
    render(<DirectorStylePicker value={null} onChange={vi.fn()} />);
    expect(screen.queryByText(/techniques woven into every shot/)).not.toBeInTheDocument();
  });
});
