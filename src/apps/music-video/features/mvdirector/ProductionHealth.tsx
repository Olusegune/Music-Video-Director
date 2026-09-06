import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import { cn } from "@/platform/lib/utils";

// One place to look before you spend money.
//
// These checks arrived one at a time, each as its own full-width banner, and
// by the fourth the screen led with a wall of yellow that pushed the actual
// shot list below the fold. Stacked warnings of equal weight also flatten
// severity: "nobody is on camera anywhere in this video" and "three shots
// still need a clip" are not the same news, but they looked identical.
//
// So: one strip, worst first, collapsed to a single line once the user has
// seen it. Blocking problems stay expanded, because those are the ones worth
// interrupting for.

export type HealthLevel = "blocking" | "warning";

export interface HealthIssue {
  id: string;
  level: HealthLevel;
  /** One line. The detail belongs in `detail`, not here. */
  summary: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
}

export function ProductionHealth({ issues }: { issues: HealthIssue[] }) {
  const blocking = issues.filter((i) => i.level === "blocking");
  const warnings = issues.filter((i) => i.level === "warning");
  // Anything blocking opens the strip on arrival; a list of warnings does not.
  //
  // It opens itself rather than being pinned open. Forcing `expanded` true
  // while a blocker existed left the chevron toggling state nothing read — a
  // control that looks live and does nothing. The user can now fold this back
  // to its headline, which still names the blocking issue, so the news is
  // never hidden; what they cannot do is dismiss it while it is still true.
  const blockingKey = blocking.map((i) => i.id).join("|");
  const [open, setOpen] = useState(blocking.length > 0);
  useEffect(() => {
    if (blockingKey) setOpen(true);
  }, [blockingKey]);
  const expanded = open;

  if (issues.length === 0) return null;

  const headline =
    blocking.length > 0
      ? blocking[0].summary
      : `${warnings.length} thing${warnings.length === 1 ? "" : "s"} to check before you render`;

  return (
    <div
      className={cn(
        "border-b",
        blocking.length > 0 ? "border-danger/30 bg-danger/10" : "border-warning/30 bg-warning/10"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center gap-2 px-6 py-2 text-left text-xs",
          blocking.length > 0 ? "text-danger" : "text-warning"
        )}
      >
        {blocking.length > 0 ? (
          <XCircle className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium">{headline}</span>
        {issues.length > 1 && (
          <span className="shrink-0 opacity-70">
            {issues.length} issue{issues.length === 1 ? "" : "s"}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
      </button>

      {expanded && (
        <ul className="space-y-1.5 px-6 pb-3">
          {[...blocking, ...warnings].map((issue) => (
            <li
              key={issue.id}
              className={cn(
                "flex flex-wrap items-start gap-2 text-xs",
                issue.level === "blocking" ? "text-danger" : "text-warning"
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="font-medium">{issue.summary}</span>
                {issue.detail && <span className="opacity-80"> {issue.detail}</span>}
              </span>
              {issue.action && (
                <button
                  onClick={issue.action.onClick}
                  className="shrink-0 font-semibold underline hover:no-underline"
                >
                  {issue.action.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The all-clear, shown only where it reassures rather than nags. */
export function ProductionHealthClear() {
  return (
    <div className="flex items-center gap-2 border-b border-success/25 bg-success/5 px-6 py-2 text-xs text-success">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      <span>Everything checks out — performers cast, shots directed, ready to render.</span>
    </div>
  );
}
