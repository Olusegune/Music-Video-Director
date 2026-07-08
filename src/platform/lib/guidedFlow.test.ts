import { beforeEach, describe, expect, it } from "vitest";
import {
  advanceGuidedFlowSession,
  createGuidedFlowSession,
  createGuidedFlowStore,
  getGuidedFlowSession,
  jumpGuidedFlowSession,
  saveGuidedFlowDraft,
  type GuidedFlowDefinition,
} from "@/platform/lib/guidedFlow";

interface TestState {
  name: string;
  approved: boolean;
}

const EmptyStep = () => null;
const definition: GuidedFlowDefinition<TestState> = {
  id: "test-flow",
  moduleId: "test",
  version: 1,
  title: "Test flow",
  initialState: { name: "", approved: false },
  steps: [
    {
      id: "name",
      title: "Name",
      component: EmptyStep,
      validate: (state) => Boolean(state.name) || "Name is required.",
    },
    { id: "review", title: "Review", component: EmptyStep },
    {
      id: "approve",
      title: "Approve",
      component: EmptyStep,
      validate: (state) => state.approved,
    },
  ],
};

describe("guided-flow navigation state machine", () => {
  beforeEach(() => localStorage.clear());

  it("gates next on the current step validator", () => {
    const session = createGuidedFlowSession(definition);
    const result = advanceGuidedFlowSession(definition, session);

    expect(result.error).toBe("Name is required.");
    expect(result.session.stepIndex).toBe(0);
  });

  it("advances after validation and records completed steps", () => {
    const store = createGuidedFlowStore(definition);
    store.patch({ name: "Director Studio" });
    const result = store.next();

    expect(result.error).toBeUndefined();
    expect(result.session.stepIndex).toBe(1);
    expect(result.session.completedStepIds).toEqual(["name"]);
  });

  it("allows back-jumps but blocks unvalidated forward jumps", () => {
    const store = createGuidedFlowStore(definition);
    store.patch({ name: "Director Studio" });
    store.next();

    const blocked = jumpGuidedFlowSession(definition, store.session, 2);
    expect(blocked.stepIndex).toBe(1);

    const backJump = jumpGuidedFlowSession(definition, store.session, 0);
    expect(backJump.stepIndex).toBe(0);
  });

  it("saves a cancellable draft and resumes the same session", () => {
    const session = createGuidedFlowSession(definition, {
      initialState: { name: "Saved idea" },
    });
    const draft = saveGuidedFlowDraft(session);
    const resumed = createGuidedFlowStore(definition, {
      sessionId: draft.id,
    });

    expect(getGuidedFlowSession(draft.id)?.status).toBe("draft");
    expect(resumed.session.id).toBe(draft.id);
    expect(resumed.session.state.name).toBe("Saved idea");
  });
});
