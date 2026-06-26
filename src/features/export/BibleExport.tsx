import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookMarked,
  FileText,
  FileJson,
  FileType,
  FileCode,
  Check,
  Loader2,
  Users,
  Globe,
  Package,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { api, isTauri, type ExportFormat } from "@/lib/ipc";
import { validateProduction } from "@/lib/validate";

const FORMATS: {
  id: ExportFormat;
  label: string;
  desc: string;
  icon: React.ReactNode;
  desktopOnly?: boolean;
}[] = [
  { id: "markdown", label: "Markdown", desc: "Readable .md — great for Notion / GitHub", icon: <FileText className="h-5 w-5" /> },
  { id: "json", label: "JSON", desc: "Structured data — re-import or pipe into tools", icon: <FileJson className="h-5 w-5" /> },
  { id: "pdf", label: "PDF", desc: "Print-ready production document", icon: <FileType className="h-5 w-5" />, desktopOnly: true },
  { id: "docx", label: "Word (DOCX)", desc: "Editable document for handoff", icon: <FileCode className="h-5 w-5" />, desktopOnly: true },
];

export function BibleExport() {
  const { data: characters = [] } = useQuery({ queryKey: ["characters"], queryFn: api.listCharacters });
  const { data: environments = [] } = useQuery({ queryKey: ["environments"], queryFn: api.listEnvironments });
  const { data: props = [] } = useQuery({ queryKey: ["props"], queryFn: api.listProps });

  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [result, setResult] = useState<{ format: ExportFormat; path: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = characters.length + environments.length + props.length;
  const issues = validateProduction(characters, environments, props);
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  const run = async (format: ExportFormat) => {
    setBusy(format);
    setError(null);
    setResult(null);
    try {
      const path = await api.exportBible(format);
      setResult({ format, path });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-lg font-semibold">Export Center</h1>
        <p className="text-xs text-muted">
          Bundle your entire visual bible — every character, location, and prop — into one document.
        </p>
      </header>

      <div className="max-w-3xl space-y-6 p-8">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Stat icon={<Users className="h-4 w-4 text-primary" />} label="Characters" value={characters.length} />
          <Stat icon={<Globe className="h-4 w-4 text-primary" />} label="Environments" value={environments.length} />
          <Stat icon={<Package className="h-4 w-4 text-primary" />} label="Props & Vehicles" value={props.length} />
        </div>

        {total === 0 && (
          <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <BookMarked className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your bible is empty. Add characters, environments, or props (or import a script in
              Script Studio) — then export.
            </span>
          </div>
        )}

        {/* Production readiness */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
          <div className="mb-2 flex items-center gap-2">
            {errors.length > 0 ? (
              <XCircle className="h-4 w-4 text-danger" />
            ) : warnings.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-warning" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-success" />
            )}
            <h2 className="text-sm font-semibold">Production readiness</h2>
            <span className="ml-auto text-[11px] text-muted">
              {errors.length} error{errors.length === 1 ? "" : "s"} · {warnings.length} warning
              {warnings.length === 1 ? "" : "s"}
            </span>
          </div>
          {issues.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-success">
              <Check className="h-3.5 w-3.5" /> All checks passed — ready to export.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {issues.map((iss, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  {iss.level === "error" ? (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  )}
                  <span className={iss.level === "error" ? "text-danger" : "text-muted"}>
                    {iss.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted">
            Warnings won't block export — they flag work you may want to finish first.
          </p>
        </div>

        {/* Formats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FORMATS.map((f) => {
            const disabled = busy !== null || total === 0 || (f.desktopOnly && !isTauri);
            return (
              <button
                key={f.id}
                onClick={() => run(f.id)}
                disabled={disabled}
                className="flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left shadow-card transition-colors enabled:hover:border-primary/40 disabled:opacity-50"
              >
                <span className="mt-0.5 text-primary">
                  {busy === f.id ? <Loader2 className="h-5 w-5 animate-spin" /> : f.icon}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {f.label}
                    {f.desktopOnly && !isTauri && (
                      <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted">
                        Desktop only
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-muted">{f.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        {result && (
          <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-success/30 bg-success/10 p-3 text-xs text-success">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-all">
              {result.path === "Downloaded"
                ? `Visual bible downloaded as ${result.format.toUpperCase()}.`
                : `Exported to: ${result.path}`}
            </span>
          </div>
        )}
        {error && (
          <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </div>
        )}

        <p className="text-[11px] text-muted">
          {isTauri
            ? "Files are written to the app's exports folder. Every entity's Prompt DNA and consistency rules are included."
            : "Browser preview downloads Markdown/JSON. PDF and Word export run in the desktop app."}
        </p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs text-muted">
        {icon} {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
