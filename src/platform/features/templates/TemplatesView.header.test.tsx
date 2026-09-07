import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplatesView } from "./TemplatesView";

// The sidebar's nav item for this screen is "Templates" (navModel.ts), but
// the screen's own h1 said "Music Video Templates" — a small but real
// version of the same mismatch already fixed on Story. It also carried a
// "Part of Music Video Director" line that only ever existed on this screen
// and Animation Lab, on two of eight sibling screens for no evident reason;
// Animation Lab lost that line when its header was unified with the rest,
// and this screen follows for the same reason.

describe("TemplatesView header", () => {
  it("labels itself 'Templates', matching the sidebar item that opens it", () => {
    render(<TemplatesView />);
    expect(screen.getByRole("heading", { level: 1, name: "Templates" })).toBeInTheDocument();
    expect(screen.queryByText("Music Video Templates")).not.toBeInTheDocument();
  });

  it("uses the same header shell as the other Music Video screens", () => {
    render(<TemplatesView />);
    const heading = screen.getByRole("heading", { level: 1, name: "Templates" });
    const header = heading.closest("header");
    expect(header).not.toBeNull();
    expect(header!.querySelector(".grad-primary")).toBeInTheDocument();
  });

  it("drops the redundant 'Part of Music Video Director' line", () => {
    render(<TemplatesView />);
    expect(screen.queryByText(/Part of Music Video Director/)).not.toBeInTheDocument();
  });
});
