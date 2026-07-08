import { beforeEach, describe, expect, it } from "vitest";
import { generatePlan, planBlueprint, produceNativeCopy } from "@/apps/campaign/lib/planGenerator";
import type { CampaignStrategy } from "@/apps/campaign/lib/types";
import { listDeliverables } from "@/platform/lib/deliverables";

const strategy: CampaignStrategy = {
  positioning: "The connected creative studio",
  keyMessage: "Direct every launch from one place.",
  pillars: ["Connected", "Local-first", "Art directed"],
  audienceInsight: "Creative teams want control without fragmentation.",
  channelPlan: ["glam", "web", "motion", "social", "email"],
};

describe("Campaign plan generator", () => {
  beforeEach(() => localStorage.clear());

  it("scales the blueprint by effort without changing core order", () => {
    const small = planBlueprint("small");
    const medium = planBlueprint("medium");
    const large = planBlueprint("large");

    expect(small).toHaveLength(8);
    expect(medium).toHaveLength(11);
    expect(large).toHaveLength(14);
    expect(medium.slice(0, small.length)).toEqual(small);
    expect(large.slice(0, medium.length)).toEqual(medium);
  });

  it("covers all five campaign channels in the core plan", () => {
    expect(new Set(planBlueprint("small").map((item) => item.channel))).toEqual(
      new Set(["glam", "web", "motion", "social", "email"])
    );
  });

  it("creates linked deliverables and strategy-rich briefs", () => {
    const plan = generatePlan("campaign-1", strategy, "small");

    expect(plan).toHaveLength(8);
    expect(plan.every((item) => item.deliverableId)).toBe(true);
    expect(plan.every((item) => item.brief.includes(strategy.keyMessage))).toBe(true);
    expect(listDeliverables({ projectId: "campaign-1" })).toHaveLength(8);
  });

  it("produces channel-appropriate native copy", () => {
    const social = produceNativeCopy(
      "Launch post",
      "social",
      "Director Studio",
      "Every idea, directed.",
      strategy
    );
    const email = produceNativeCopy(
      "Launch email",
      "email",
      "Director Studio",
      "Every idea, directed.",
      strategy
    );

    expect(social).toContain("#DirectorStudio");
    expect(email).toContain("Subject:");
    expect(email).toContain(strategy.audienceInsight);
  });
});
