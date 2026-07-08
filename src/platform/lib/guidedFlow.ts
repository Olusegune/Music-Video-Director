import type { ComponentType, ReactNode } from "react";
import { getStudioMode, type StudioMode } from "@/platform/lib/settings";

export type GuidedFlowStatus = "draft" | "active" | "completed" | "abandoned";
export type GuidedFlowPatch<TState> =
  | Partial<TState>
  | ((state: TState) => TState);

export interface GuidedFlowSession<TState = unknown> {
  id: string;
  definitionId: string;
  moduleId: string;
  definitionVersion: number;
  projectId?: string;
  stepIndex: number;
  state: TState;
  status: GuidedFlowStatus;
  completedStepIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GuidedFlowStepComponentProps<TState> {
  state: TState;
  patch: (patch: GuidedFlowPatch<TState>) => void;
  session: GuidedFlowSession<TState>;
  mode: StudioMode;
  goNext: () => void;
  goBack: () => void;
  complete: () => void;
}

export interface GuidedFlowStep<TState> {
  id: string;
  title: string;
  subtitle?: string;
  component: ComponentType<GuidedFlowStepComponentProps<TState>>;
  advancedComponent?: ComponentType<GuidedFlowStepComponentProps<TState>>;
  technicalComponent?: ComponentType<GuidedFlowStepComponentProps<TState>>;
  validate?: (state: TState) => boolean | string;
  skippable?: boolean;
}

export interface GuidedFlowDefinition<TState = unknown> {
  id: string;
  moduleId: string;
  version: number;
  title: string;
  description?: string;
  initialState: TState;
  steps: GuidedFlowStep<TState>[];
  onComplete?: (
    state: TState,
    session: GuidedFlowSession<TState>
  ) => void | Promise<void>;
  renderSummary?: (state: TState) => ReactNode;
}

const LS_GUIDED_FLOW_SESSIONS = "mf.guidedFlow.sessions";
const registry = new Map<string, GuidedFlowDefinition>();

function now() {
  return new Date().toISOString();
}

function uid(prefix = "flow") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function readSessions(): Record<string, GuidedFlowSession> {
  try {
    const raw = localStorage.getItem(LS_GUIDED_FLOW_SESSIONS);
    return raw ? (JSON.parse(raw) as Record<string, GuidedFlowSession>) : {};
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, GuidedFlowSession>) {
  try {
    localStorage.setItem(LS_GUIDED_FLOW_SESSIONS, JSON.stringify(sessions));
  } catch {
    /* ignore */
  }
}

export function registerGuidedFlow<TState>(
  definition: GuidedFlowDefinition<TState>
): GuidedFlowDefinition<TState> {
  registry.set(definition.id, definition as GuidedFlowDefinition);
  return definition;
}

export function getGuidedFlow<TState = unknown>(
  id: string
): GuidedFlowDefinition<TState> | undefined {
  return registry.get(id) as GuidedFlowDefinition<TState> | undefined;
}

export function listGuidedFlows(moduleId?: string): GuidedFlowDefinition[] {
  const flows = Array.from(registry.values());
  return moduleId ? flows.filter((flow) => flow.moduleId === moduleId) : flows;
}

export function createGuidedFlowSession<TState>(
  definition: GuidedFlowDefinition<TState>,
  options: { projectId?: string; initialState?: Partial<TState> } = {}
): GuidedFlowSession<TState> {
  const timestamp = now();
  const session: GuidedFlowSession<TState> = {
    id: uid(definition.id),
    definitionId: definition.id,
    moduleId: definition.moduleId,
    definitionVersion: definition.version,
    projectId: options.projectId,
    stepIndex: 0,
    state: {
      ...(definition.initialState as object),
      ...(options.initialState as object),
    } as TState,
    status: "active",
    completedStepIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  saveGuidedFlowSession(session);
  return session;
}

export function saveGuidedFlowSession<TState>(
  session: GuidedFlowSession<TState>
): GuidedFlowSession<TState> {
  const sessions = readSessions();
  const saved = { ...session, updatedAt: now() };
  sessions[session.id] = saved as GuidedFlowSession;
  writeSessions(sessions);
  return saved;
}

export function getGuidedFlowSession<TState = unknown>(
  id: string
): GuidedFlowSession<TState> | null {
  return (readSessions()[id] as GuidedFlowSession<TState> | undefined) ?? null;
}

export function listGuidedFlowSessions<TState = unknown>(
  moduleId?: string
): GuidedFlowSession<TState>[] {
  return Object.values(readSessions()).filter(
    (session) => !moduleId || session.moduleId === moduleId
  ) as GuidedFlowSession<TState>[];
}

export function patchGuidedFlowSession<TState>(
  session: GuidedFlowSession<TState>,
  patch: GuidedFlowPatch<TState>
): GuidedFlowSession<TState> {
  const nextState =
    typeof patch === "function"
      ? patch(session.state)
      : ({ ...(session.state as object), ...(patch as object) } as TState);
  return saveGuidedFlowSession({ ...session, state: nextState, status: "active" });
}

export function validateGuidedFlowStep<TState>(
  definition: GuidedFlowDefinition<TState>,
  session: GuidedFlowSession<TState>
): true | string {
  const step = definition.steps[session.stepIndex];
  if (!step?.validate) return true;
  const result = step.validate(session.state);
  if (result === true) return true;
  if (result === false) return "Complete this step before continuing.";
  return result;
}

export function advanceGuidedFlowSession<TState>(
  definition: GuidedFlowDefinition<TState>,
  session: GuidedFlowSession<TState>
): { session: GuidedFlowSession<TState>; error?: string; completed?: boolean } {
  const validation = validateGuidedFlowStep(definition, session);
  const step = definition.steps[session.stepIndex];
  if (validation !== true && !step?.skippable) return { session, error: validation };
  const completedStepIds = step
    ? Array.from(new Set([...session.completedStepIds, step.id]))
    : session.completedStepIds;

  if (session.stepIndex >= definition.steps.length - 1) {
    return {
      session: saveGuidedFlowSession({
        ...session,
        completedStepIds,
        status: "completed",
      }),
      completed: true,
    };
  }

  return {
    session: saveGuidedFlowSession({
      ...session,
      completedStepIds,
      stepIndex: session.stepIndex + 1,
      status: "active",
    }),
  };
}

export function retreatGuidedFlowSession<TState>(
  session: GuidedFlowSession<TState>
): GuidedFlowSession<TState> {
  return saveGuidedFlowSession({
    ...session,
    stepIndex: Math.max(0, session.stepIndex - 1),
    status: "active",
  });
}

export function jumpGuidedFlowSession<TState>(
  definition: GuidedFlowDefinition<TState>,
  session: GuidedFlowSession<TState>,
  stepIndex: number
): GuidedFlowSession<TState> {
  const boundedIndex = Math.max(
    0,
    Math.min(stepIndex, definition.steps.length - 1)
  );
  const requestedStep = definition.steps[boundedIndex];
  const canMoveBack = boundedIndex <= session.stepIndex;
  const canMoveForward =
    requestedStep != null &&
    definition.steps
      .slice(0, boundedIndex)
      .every((step) => session.completedStepIds.includes(step.id));

  if (!canMoveBack && !canMoveForward) return session;

  return saveGuidedFlowSession({
    ...session,
    stepIndex: boundedIndex,
    status: "active",
  });
}

export function saveGuidedFlowDraft<TState>(
  session: GuidedFlowSession<TState>
): GuidedFlowSession<TState> {
  return saveGuidedFlowSession({ ...session, status: "draft" });
}

export function abandonGuidedFlowSession<TState>(
  session: GuidedFlowSession<TState>
): GuidedFlowSession<TState> {
  return saveGuidedFlowSession({ ...session, status: "abandoned" });
}

export function createGuidedFlowStore<TState>(
  definition: GuidedFlowDefinition<TState>,
  options: { sessionId?: string; projectId?: string } = {}
) {
  let session =
    (options.sessionId && getGuidedFlowSession<TState>(options.sessionId)) ||
    createGuidedFlowSession(definition, { projectId: options.projectId });

  return {
    get mode() {
      return getStudioMode();
    },
    get session() {
      return session;
    },
    patch(patch: GuidedFlowPatch<TState>) {
      session = patchGuidedFlowSession(session, patch);
      return session;
    },
    next() {
      const result = advanceGuidedFlowSession(definition, session);
      session = result.session;
      return result;
    },
    back() {
      session = retreatGuidedFlowSession(session);
      return session;
    },
    jump(stepIndex: number) {
      session = jumpGuidedFlowSession(definition, session, stepIndex);
      return session;
    },
    saveDraft() {
      session = saveGuidedFlowDraft(session);
      return session;
    },
    abandon() {
      session = abandonGuidedFlowSession(session);
      return session;
    },
  };
}
