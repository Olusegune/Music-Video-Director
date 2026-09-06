import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { useNavigateToView } from "./Sidebar";
import { NAV_MODEL } from "@/platform/lib/navModel";
import { useAppStore } from "@/platform/store/useAppStore";
import type { View } from "@/platform/store/useAppStore";

// "Story" (view: "magicoutput") was added to NAV_MODEL, appeared in the
// sidebar, highlighted correctly on hover — and clicking it did nothing.
// useNavigateToView's dispatch table is a second, separate list of views that
// nothing had ever checked against NAV_MODEL, so an entry could be added to
// one and not the other with no error, no test failure, and no visual sign
// beyond "the screen didn't change." This walks every view NAV_MODEL actually
// links to and proves the dispatch table has a working entry for each one.

function everyReachableView(): View[] {
  const views: View[] = [];
  for (const section of NAV_MODEL) {
    for (const item of section.items) {
      views.push(item.view);
      for (const sub of item.subItems ?? []) views.push(sub.view);
    }
  }
  return [...new Set(views)];
}

function Harness({ onReady }: { onReady: (navigate: (v: View) => void) => void }) {
  onReady(useNavigateToView());
  return null;
}

describe("useNavigateToView", () => {
  it("has a working dispatch entry for every view the sidebar can link to", () => {
    let navigate!: (v: View) => void;
    render(<Harness onReady={(n) => (navigate = n)} />);

    const untouched: View[] = [];
    for (const view of everyReachableView()) {
      useAppStore.setState({ view: "dashboard" });
      navigate(view);
      if (useAppStore.getState().view !== view) untouched.push(view);
    }

    expect(untouched, `sidebar links to these views but navigating does nothing: ${untouched}`).toEqual(
      []
    );
  });
});
