import { beforeEach, describe, expect, it } from "vitest";
import {
  getStartupReadiness,
  hydrateStartupStores,
  markAppShellMounted,
  resetStartupReadinessForTests,
} from "@/platform/lib/startupReadiness";

describe("startup readiness", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStartupReadinessForTests();
  });

  it("requires an explicit app-shell mount signal", () => {
    expect(getStartupReadiness().appShellMounted).toBe(false);
    markAppShellMounted();
    expect(getStartupReadiness().appShellMounted).toBe(true);
  });

  it("hydrates the startup stores before declaring them ready", () => {
    expect(getStartupReadiness().storesHydrated).toBe(false);
    hydrateStartupStores();
    expect(getStartupReadiness().storesHydrated).toBe(true);
  });
});
