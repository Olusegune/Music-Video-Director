import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReferenceTray } from "@/platform/components/generation/ReferenceTray";
import type { GenerationReference } from "@/platform/lib/generationSpec";

// The first component test in this codebase. Every bug found by hand this
// session lived in this layer — a control rendered without a working handler,
// a prop never passed — and none of the 1100+ pure-logic tests could see it.

function refs(...urls: string[]): GenerationReference[] {
  return urls.map((url) => ({ url, category: "asset", strength: 0.6 }));
}

describe("ReferenceTray remove control", () => {
  it("removes the reference you clicked, not another one", async () => {
    const onRemove = vi.fn();
    render(
      <ReferenceTray
        references={refs("a.png", "b.png", "c.png")}
        support="multi"
        onChange={vi.fn()}
        onRemove={onRemove}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /remove reference 2/i }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith("b.png");
  });

  // The guard that makes an unwired host visible rather than silently broken.
  it("shows no remove control at all when removal isn't wired", () => {
    render(
      <ReferenceTray references={refs("a.png")} support="multi" onChange={vi.fn()} />
    );

    expect(screen.queryByRole("button", { name: /remove reference/i })).toBeNull();
  });

  it("renders one remove control per reference when wired", () => {
    render(
      <ReferenceTray
        references={refs("a.png", "b.png")}
        support="multi"
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getAllByRole("button", { name: /remove reference/i })).toHaveLength(2);
  });

  it("renders nothing when there are no references", () => {
    const { container } = render(
      <ReferenceTray references={[]} support="multi" onChange={vi.fn()} onRemove={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
