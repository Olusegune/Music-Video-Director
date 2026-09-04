import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/platform/components/ui/badge";
import { Button } from "@/platform/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";
import {
  advanceGuidedFlowSession,
  createGuidedFlowSession,
  getGuidedFlowSession,
  patchGuidedFlowSession,
  retreatGuidedFlowSession,
  saveGuidedFlowSession,
  validateGuidedFlowStep,
  type GuidedFlowDefinition,
  type GuidedFlowPatch,
  type GuidedFlowSession,
} from "@/platform/lib/guidedFlow";
import { cn } from "@/platform/lib/utils";
import { useAppStore } from "@/platform/store/useAppStore";

interface GuidedFlowShellProps<TState> {
  definition: GuidedFlowDefinition<TState>;
  sessionId?: string;
  projectId?: string;
  onExit?: (session: GuidedFlowSession<TState>) => void;
  onComplete?: (session: GuidedFlowSession<TState>) => void;
}

export function GuidedFlowShell<TState>({
  definition,
  sessionId,
  projectId,
  onExit,
  onComplete,
}: GuidedFlowShellProps<TState>) {
  const mode = useAppStore((state) => state.studioMode);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [session, setSession] = useState<GuidedFlowSession<TState>>(() => {
    const existing = sessionId ? getGuidedFlowSession<TState>(sessionId) : null;
    return existing ?? createGuidedFlowSession(definition, { projectId });
  });

  useEffect(() => {
    setError(null);
    const existing = sessionId ? getGuidedFlowSession<TState>(sessionId) : null;
    setSession(existing ?? createGuidedFlowSession(definition, { projectId }));
  }, [definition, projectId, sessionId]);

  const step = definition.steps[session.stepIndex];
  const progress = useMemo(() => {
    if (definition.steps.length === 0) return 100;
    return Math.round(((session.stepIndex + 1) / definition.steps.length) * 100);
  }, [definition.steps.length, session.stepIndex]);

  function patch(patch: GuidedFlowPatch<TState>) {
    setError(null);
    setSession((current) => patchGuidedFlowSession(current, patch));
  }

  async function complete(currentSession: GuidedFlowSession<TState>) {
    setCompleting(true);
    setError(null);
    try {
      await definition.onComplete?.(currentSession.state, currentSession);
      onComplete?.(currentSession);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not complete this flow. Your draft is still available.");
    } finally {
      setCompleting(false);
    }
  }

  async function goNext() {
    const result = advanceGuidedFlowSession(definition, session);
    setSession(result.session);
    setError(result.error ?? null);
    if (result.completed && !result.error) {
      await complete(result.session);
    }
  }

  function goBack() {
    setError(null);
    setSession((current) => retreatGuidedFlowSession(current));
  }

  function saveDraftAndExit() {
    const draft = saveGuidedFlowSession({ ...session, status: "draft" });
    setSession(draft);
    onExit?.(draft);
  }

  const validation = validateGuidedFlowStep(definition, session);
  const PrimaryStep = step?.component;
  const AdvancedStep =
    mode === "studio" || mode === "creator" ? step?.advancedComponent : undefined;
  const TechnicalStep = mode === "creator" ? step?.technicalComponent : undefined;
  const stepProps = {
    state: session.state,
    patch,
    session,
    mode,
    goNext,
    goBack,
    complete: () => void complete(session),
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{definition.title}</h1>
            <Badge variant="primary">{mode}</Badge>
          </div>
          {definition.description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted">{definition.description}</p>
          ) : null}
        </div>
        {onExit ? (
          <Button variant="ghost" onClick={saveDraftAndExit}>
            <X /> Save draft
          </Button>
        ) : null}
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Flow</CardTitle>
            <CardDescription>{progress}% planned</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full rounded-full grad-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ol className="space-y-2">
              {definition.steps.map((item, index) => {
                const active = index === session.stepIndex;
                const done = session.completedStepIds.includes(item.id);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex gap-3 rounded-md border border-transparent p-2 text-sm",
                      active && "border-primary/40 bg-primary/10",
                      done && !active && "bg-elevated/50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-[11px]",
                        active && "border-primary text-primary",
                        done && "border-success bg-success/15 text-success"
                      )}
                    >
                      {done ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    <span>
                      <span className="block font-medium">{item.title}</span>
                      {item.subtitle ? (
                        <span className="block text-xs text-muted">{item.subtitle}</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{step?.title ?? "Flow complete"}</CardTitle>
              {step?.subtitle ? <CardDescription>{step.subtitle}</CardDescription> : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {PrimaryStep ? (
                <PrimaryStep {...stepProps} />
              ) : (
                definition.renderSummary?.(session.state)
              )}
              {error ? (
                <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <Button variant="secondary" onClick={goBack} disabled={session.stepIndex === 0}>
                  <ChevronLeft /> Back
                </Button>
                <Button
                  onClick={() => void goNext()}
                  disabled={completing || (validation !== true && !step?.skippable)}
                >
                  {completing ? "Creating…" : session.stepIndex >= definition.steps.length - 1 ? "Approve & open studio" : "Continue"}
                  <ChevronRight />
                </Button>
              </div>
            </CardContent>
          </Card>

          {AdvancedStep ? (
            <Card>
              <CardHeader>
                <CardTitle>Creative Controls</CardTitle>
                <CardDescription>Studio-level direction for this step.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdvancedStep {...stepProps} />
              </CardContent>
            </Card>
          ) : null}

          {TechnicalStep ? (
            <Card>
              <CardHeader>
                <CardTitle>Creator Controls</CardTitle>
                <CardDescription>Provider, prompt, and loop details for this step.</CardDescription>
              </CardHeader>
              <CardContent>
                <TechnicalStep {...stepProps} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}
