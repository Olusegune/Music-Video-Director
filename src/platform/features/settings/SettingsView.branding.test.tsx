import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutCard } from "./SettingsView";

// Settings' About card had the same placeholder-glyph badge as the sidebar
// (a lucide Film icon on a gradient square) — now the real app icon.

describe("AboutCard branding", () => {
  it("uses the real app icon image, not a placeholder glyph", () => {
    render(<AboutCard />);
    const logo = screen.getByAltText("") as HTMLImageElement;
    expect(logo).toBeInTheDocument();
    expect(logo.src).toContain("/app-icon.png");
  });
});
