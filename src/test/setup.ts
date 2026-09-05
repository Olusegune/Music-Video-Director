// Component-test setup. Loaded by vitest.config.ts for every test file.
//
// Until now the suite was 100% pure-logic: 146 files, zero of which rendered
// a component. That's structurally why a rendered X button whose handler was
// never wired, a card missing its icon prop, and a preview grid showing the
// same image six times all shipped green. This makes the wiring layer
// testable.

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom implements neither, and components that measure or observe layout
// throw without them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as Record<string, unknown>).ResizeObserver = ResizeObserverStub;
}

if (!("matchMedia" in window)) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// jsdom has no layout engine, so scrollIntoView is undefined and any component
// that calls it on select/focus blows up mid-render.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
