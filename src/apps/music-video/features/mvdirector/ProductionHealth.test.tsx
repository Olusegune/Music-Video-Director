import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductionHealth, type HealthIssue } from "./ProductionHealth";

const warn = (id: string, summary: string): HealthIssue => ({ id, level: "warning", summary });
const block = (id: string, summary: string): HealthIssue => ({ id, level: "blocking", summary });

describe("ProductionHealth", () => {
  it("shows nothing when the production is healthy", () => {
    const { container } = render(<ProductionHealth issues={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  // Four stacked banners of equal weight flattened severity and pushed the
  // shot list below the fold.
  it("collapses several warnings into one line", () => {
    render(
      <ProductionHealth
        issues={[warn("a", "First thing"), warn("b", "Second thing"), warn("c", "Third thing")]}
      />
    );
    expect(screen.getByText("3 things to check before you render")).toBeInTheDocument();
    expect(screen.queryByText("Second thing")).not.toBeInTheDocument();
  });

  it("opens on request to show every issue", async () => {
    render(<ProductionHealth issues={[warn("a", "First thing"), warn("b", "Second thing")]} />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("First thing")).toBeInTheDocument();
    expect(screen.getByText("Second thing")).toBeInTheDocument();
  });

  // "Nobody is on camera anywhere" is not the same news as "three shots need
  // a clip", so it opens the strip rather than waiting behind a chevron.
  it("opens itself when something is blocking", () => {
    render(<ProductionHealth issues={[block("x", "Nobody on camera"), warn("a", "Minor")]} />);
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // The blocking issue also fills the headline, hence getAllByText.
    expect(screen.getAllByText("Nobody on camera").length).toBeGreaterThan(0);
    expect(screen.getByText("Minor")).toBeInTheDocument();
  });

  it("leads with the blocking issue, not the first one added", () => {
    render(<ProductionHealth issues={[warn("a", "Minor thing"), block("x", "Serious thing")]} />);
    // The toggle is the first button; its label is the headline.
    expect(screen.getAllByRole("button")[0]).toHaveTextContent("Serious thing");
    // And the blocking issue is listed first, ahead of the warning.
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Serious thing");
  });

  // The chevron used to be inert whenever a blocker existed: it toggled state
  // that `expanded` ignored. Folding it away is allowed; the headline still
  // carries the blocking summary, so nothing is hidden.
  it("can be folded back up even while blocking, without losing the headline", async () => {
    render(<ProductionHealth issues={[block("x", "Nobody on camera"), warn("a", "Minor")]} />);
    await userEvent.click(screen.getByRole("button", { expanded: true }));
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
    expect(screen.queryByText("Minor")).not.toBeInTheDocument();
    expect(screen.getByText("Nobody on camera")).toBeInTheDocument();
  });

  it("re-opens when a new blocking issue arrives after being folded away", async () => {
    const { rerender } = render(<ProductionHealth issues={[block("x", "First blocker")]} />);
    await userEvent.click(screen.getByRole("button", { expanded: true }));
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
    rerender(<ProductionHealth issues={[block("y", "A different blocker")]} />);
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
  });

  it("runs an issue's action", async () => {
    const onClick = vi.fn();
    render(
      <ProductionHealth
        issues={[{ id: "a", level: "blocking", summary: "Fix me", action: { label: "Fix", onClick } }]}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Fix" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("counts the issues so the collapsed state isn't a black box", () => {
    render(<ProductionHealth issues={[warn("a", "One"), warn("b", "Two")]} />);
    expect(screen.getByText("2 issues")).toBeInTheDocument();
  });
});
