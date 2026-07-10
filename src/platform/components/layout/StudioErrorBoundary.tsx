import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { useAppStore } from "@/platform/store/useAppStore";

// A render error inside one studio must never blank the whole application.
// This boundary is keyed by the active view, so navigating elsewhere clears it.

interface Props {
  children: ReactNode;
  /** Shown in the panel, e.g. "Web Studio". */
  label?: string;
}

interface State {
  error: Error | null;
}

export class StudioErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the detail in the console for diagnosis; the panel stays calm.
    console.error("[Director Studio] view crashed:", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  private goHome = () => {
    this.setState({ error: null });
    useAppStore.getState().openDashboard();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-card">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-warning/30 bg-warning/10 text-warning">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-semibold">
            {this.props.label ? `${this.props.label} hit a problem` : "This screen hit a problem"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            Your work is saved. You can retry this screen or head back to the dashboard.
          </p>
          <p className="mt-3 truncate rounded-md border border-border bg-elevated/60 px-3 py-2 text-xs text-muted">
            {error.message || "Unknown error"}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={this.reset}>
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
            <Button variant="secondary" onClick={this.goHome}>
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
