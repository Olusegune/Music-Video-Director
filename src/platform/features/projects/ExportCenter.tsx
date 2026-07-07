import { useState } from "react";
import {
  FileText,
  FileJson,
  FileType,
  FileType2,
  Loader2,
  Check,
  FolderDown,
} from "lucide-react";
import { api, isTauri, type ExportFormat } from "@/platform/lib/ipc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";
import { Button } from "@/platform/components/ui/button";
import { Badge } from "@/platform/components/ui/badge";

const FORMATS: {
  id: ExportFormat;
  label: string;
  icon: React.ReactNode;
  desc: string;
  desktopOnly?: boolean;
}[] = [
  { id: "markdown", label: "Markdown", icon: <FileText className="h-4 w-4" />, desc: "Editable .md document" },
  { id: "json", label: "JSON", icon: <FileJson className="h-4 w-4" />, desc: "Machine-readable package" },
  { id: "pdf", label: "PDF", icon: <FileType className="h-4 w-4" />, desc: "Production document", desktopOnly: true },
  { id: "docx", label: "DOCX", icon: <FileType2 className="h-4 w-4" />, desc: "Word document", desktopOnly: true },
];

export function ExportCenter({
  projectId,
  hasPack,
}: {
  projectId: string;
  hasPack: boolean;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [results, setResults] = useState<{ format: string; msg: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run(format: ExportFormat) {
    setBusy(format);
    setError(null);
    try {
      const msg = await api.exportProject(projectId, format);
      setResults((prev) => [{ format, msg }, ...prev].slice(0, 6));
    } catch (e) {
      setError((e as Error).message ?? "Export failed");
    } finally {
      setBusy(null);
    }
  }

  if (!hasPack) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border py-16 text-center">
        <FolderDown className="mb-2 h-7 w-7 text-muted" />
        <p className="text-sm text-muted">
          Generate a Prompt Pack to enable exports.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="mb-3 text-sm font-semibold">Export Center</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FORMATS.map((f) => {
          const disabled = (f.desktopOnly && !isTauri) || busy !== null;
          return (
            <Card key={f.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-primary">{f.icon}</span>
                  {f.label}
                  {f.desktopOnly && !isTauri && (
                    <Badge variant="warning">Desktop only</Badge>
                  )}
                </CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant={f.id === "pdf" ? "primary" : "secondary"}
                  size="sm"
                  disabled={disabled}
                  onClick={() => run(f.id)}
                >
                  {busy === f.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FolderDown className="h-4 w-4" />
                  )}
                  Export {f.label}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-[var(--radius-card)] border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Recent exports
          </h3>
          <div className="flex flex-col gap-1.5">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-[var(--radius-button)] bg-elevated px-3 py-2 text-xs"
              >
                <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                <Badge variant="primary">{r.format}</Badge>
                <span className="truncate text-muted" title={r.msg}>
                  {r.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
