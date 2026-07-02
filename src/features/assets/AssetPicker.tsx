import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Check, X, Upload, Users, Globe, Package, Layers, Loader2 } from "lucide-react";
import { api } from "@/lib/ipc";
import {
  buildAssetRefs,
  importImageToLibrary,
  UPLOAD_CATEGORIES,
  ASSET_KINDS,
  type AssetKind,
  type AssetRef,
} from "@/lib/assets";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const KIND_ICON: Record<AssetKind, React.ReactNode> = {
  Character: <Users className="h-3.5 w-3.5" />,
  Environment: <Globe className="h-3.5 w-3.5" />,
  Prop: <Package className="h-3.5 w-3.5" />,
};

/** Visual, multi-select asset browser. Pulls Characters / Environments / Props
 *  from the Bibles (shared source of truth) plus ad-hoc uploads. */
export function AssetPicker({
  onAdd,
  onClose,
  allowUpload = true,
}: {
  onAdd: (srcs: string[]) => void;
  onClose: () => void;
  allowUpload?: boolean;
}) {
  const qc = useQueryClient();
  const { data: characters = [] } = useQuery({ queryKey: ["characters"], queryFn: api.listCharacters });
  const { data: environments = [] } = useQuery({ queryKey: ["environments"], queryFn: api.listEnvironments });
  const { data: props = [] } = useQuery({ queryKey: ["props"], queryFn: api.listProps });

  const all = useMemo(
    () => buildAssetRefs(characters, environments, props),
    [characters, environments, props]
  );

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<AssetKind | "All">("All");
  const [selected, setSelected] = useState<Record<string, string>>({}); // id -> src
  const fileRef = useRef<HTMLInputElement>(null);
  // Uploads — usable as references immediately; saving to a Bible is optional.
  const [pending, setPending] = useState<{ id: string; name: string; dataUrl: string }[]>([]);
  const [uploadCat, setUploadCat] = useState<string>("Character");
  const [saving, setSaving] = useState(false);

  const filtered = all.filter((a) => {
    if (kind !== "All" && a.kind !== kind) return false;
    const q = query.trim().toLowerCase();
    return !q || `${a.label} ${a.sub} ${a.kind}`.toLowerCase().includes(q);
  });

  const toggle = (a: AssetRef) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[a.id]) delete next[a.id];
      else next[a.id] = a.src;
      return next;
    });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const read: { id: string; name: string; dataUrl: string }[] = [];
    for (const f of files) {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      read.push({ id: crypto.randomUUID(), name: f.name.replace(/\.[^.]+$/, ""), dataUrl });
    }
    setPending((p) => [...p, ...read]);
    // Auto-select so the upload is immediately usable as a reference (no
    // "Add to library" step required).
    setSelected((s) => {
      const next = { ...s };
      read.forEach((u) => (next[u.id] = u.dataUrl));
      return next;
    });
    e.target.value = "";
  };

  const confirmUpload = async () => {
    setSaving(true);
    try {
      for (const u of pending) await importImageToLibrary(uploadCat, u.name, u.dataUrl);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["characters"] }),
        qc.invalidateQueries({ queryKey: ["environments"] }),
        qc.invalidateQueries({ queryKey: ["props"] }),
      ]);
      const bible = UPLOAD_CATEGORIES.find((c) => c.id === uploadCat)?.bible ?? "All";
      setKind(bible as AssetKind | "All");
      setPending([]);
    } finally {
      setSaving(false);
    }
  };

  const count = Object.keys(selected).length;
  const tabs: (AssetKind | "All")[] = ["All", ...ASSET_KINDS];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-6 backdrop-blur">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
          <Layers className="h-5 w-5 text-primary" />
          <div className="mr-auto">
            <h2 className="text-sm font-semibold leading-tight">Add production assets</h2>
            <p className="text-[11px] text-muted">
              Characters, environments, and props from your Bibles — reused, not recreated.
            </p>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets…"
              className="pl-8"
              aria-label="Search assets"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-5 py-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setKind(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                kind === t ? "bg-primary/12 text-primary" : "text-muted hover:bg-elevated hover:text-foreground"
              )}
            >
              {t !== "All" && KIND_ICON[t as AssetKind]}
              {t}
            </button>
          ))}
          {allowUpload && (
            <button
              onClick={() => fileRef.current?.click()}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-foreground hover:bg-elevated"
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
        </div>

        {/* Pending uploads → choose a category before saving to a Bible */}
        {pending.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-elevated/40 px-5 py-3">
            <div className="flex -space-x-2">
              {pending.slice(0, 5).map((u, i) => (
                <img
                  key={i}
                  src={u.dataUrl}
                  alt={u.name}
                  className="h-9 w-9 rounded-md border-2 border-surface object-cover"
                />
              ))}
            </div>
            <span className="text-xs text-muted">
              {pending.length} upload{pending.length === 1 ? "" : "s"} ready to use ✓ — optionally also save to:
            </span>
            <select
              value={uploadCat}
              onChange={(e) => setUploadCat(e.target.value)}
              className="h-8 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
              aria-label="Upload category"
            >
              {UPLOAD_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <Button size="sm" variant="secondary" onClick={confirmUpload} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save to library
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelected((s) => {
                  const next = { ...s };
                  pending.forEach((u) => delete next[u.id]);
                  return next;
                });
                setPending([]);
              }}
              disabled={saving}
            >
              Clear uploads
            </Button>
          </div>
        )}

        {/* Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {filtered.length === 0 && pending.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted">
              <Layers className="h-8 w-8 opacity-40" />
              <p>
                No {kind === "All" ? "" : kind.toLowerCase()} assets with images yet.
                <br />
                Create them in the Character / World / Prop Bibles, or upload one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {/* Uploaded (unsaved) images — selectable immediately */}
              {pending.map((u) => {
                const on = !!selected[u.id];
                return (
                  <button
                    key={u.id}
                    onClick={() =>
                      setSelected((s) => {
                        const next = { ...s };
                        if (next[u.id]) delete next[u.id];
                        else next[u.id] = u.dataUrl;
                        return next;
                      })
                    }
                    className={cn(
                      "group relative overflow-hidden rounded-[var(--radius-card)] border bg-elevated/40 text-left transition-all",
                      on ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="aspect-square w-full overflow-hidden bg-elevated">
                      <img src={u.dataUrl} alt={u.name} className="h-full w-full object-cover" />
                    </div>
                    {on && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-background/70 px-1.5 py-0.5 text-[9px] font-medium text-foreground">
                      <Upload className="h-3 w-3" /> Upload
                    </span>
                    <div className="p-2">
                      <div className="truncate text-xs font-medium">{u.name}</div>
                      <div className="truncate text-[10px] text-muted">unsaved — usable now</div>
                    </div>
                  </button>
                );
              })}
              {filtered.map((a) => {
                const on = !!selected[a.id];
                return (
                  <button
                    key={a.id}
                    onClick={() => toggle(a)}
                    className={cn(
                      "group relative overflow-hidden rounded-[var(--radius-card)] border bg-elevated/40 text-left transition-all",
                      on ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="aspect-square w-full overflow-hidden bg-elevated">
                      <AssetImage
                        src={a.src}
                        alt={a.label}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    {on && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-background/70 px-1.5 py-0.5 text-[9px] font-medium text-foreground">
                      {a.kind !== "Prop" || a.sub !== "upload" ? KIND_ICON[a.kind] : <Upload className="h-3 w-3" />}
                      {a.sub === "upload" ? "Upload" : a.kind}
                    </span>
                    <div className="p-2">
                      <div className="truncate text-xs font-medium">{a.label}</div>
                      <div className="truncate text-[10px] text-muted">{a.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3">
          <span className="text-xs text-muted">
            {count > 0 ? `${count} selected` : "Click assets to select"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={count === 0}
              onClick={() => {
                onAdd(Object.values(selected));
                onClose();
              }}
            >
              <Check className="h-4 w-4" />
              Add {count > 0 ? count : ""} reference{count === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
