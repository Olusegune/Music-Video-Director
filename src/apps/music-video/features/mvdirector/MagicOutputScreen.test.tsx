import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShotBoard } from "./MagicOutputScreen";

// This slot used to paint a per-shot gradient with abstract shapes arranged
// like a composition, and gave each tile a different accent colour. The board
// then looked like six finished frames that did not exist — the "weird
// thumbnail" complaint. An ungenerated shot must read as ungenerated.

const shot = { idea: "Wide on the rooftop", start: 12 };

describe("ShotBoard", () => {
  it("says so when a shot has no generated frame", () => {
    render(<ShotBoard shot={shot} />);
    expect(screen.getByText("Not generated yet")).toBeInTheDocument();
  });

  it("paints no synthetic imagery in an empty slot", () => {
    const { container } = render(<ShotBoard shot={shot} />);
    const painted = Array.from(container.querySelectorAll<HTMLElement>("*")).filter((el) =>
      /gradient/.test(el.style.backgroundImage || el.style.background)
    );
    expect(painted).toEqual([]);
  });

  it("still shows the timecode so the slot is identifiable", () => {
    render(<ShotBoard shot={shot} />);
    expect(screen.getByText("0:12")).toBeInTheDocument();
  });

  it("renders the frame, not the placeholder, once one exists", () => {
    render(<ShotBoard shot={{ ...shot, imageUrl: "asset://frame-1.png" }} />);
    expect(screen.queryByText("Not generated yet")).not.toBeInTheDocument();
    expect(screen.getByAltText("Wide on the rooftop")).toBeInTheDocument();
  });

  it("marks an absent shot as empty rather than drawing a panel", () => {
    render(<ShotBoard />);
    expect(screen.getByText("No shot here yet")).toBeInTheDocument();
  });
});
