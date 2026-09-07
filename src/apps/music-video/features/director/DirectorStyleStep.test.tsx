import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

  // Every card used to render an arbitrary CSS gradient in the style's accent
  // colors — decorative, not actual art. Real photos now ship at
  // /director-style-art/<id>.jpg, tried before any gradient renders.
  it("tries the real preset photo before falling back to a gradient", () => {
    render(<DirectorStylePicker value={null} onChange={vi.fn()} />);
    const card = screen.getByRole("button", { name: /Hype Williams/ });
    const img = card.querySelector("img");
    expect(img).toHaveAttribute("src", "/director-style-art/glossy-kinetic-hiphop.jpg");
  });

  it("falls back to the gradient only once every image extension 404s", () => {
    render(<DirectorStylePicker value={null} onChange={vi.fn()} />);
    const card = screen.getByRole("button", { name: /Hype Williams/ });
    for (const ext of ["jpg", "png", "jpeg", "webp"]) {
      const img = card.querySelector("img");
      expect(img).toHaveAttribute("src", `/director-style-art/glossy-kinetic-hiphop.${ext}`);
      fireEvent.error(img!);
    }
    expect(card.querySelector("img")).not.toBeInTheDocument();
    const swatch = card.firstElementChild as HTMLElement;
    expect(swatch.style.background).toMatch(/linear-gradient/);
  });
});
