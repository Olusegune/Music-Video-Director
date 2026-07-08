import { useMemo, useRef, useState } from "react";
import {
  LayoutTemplate,
  Search,
  Check,
  Camera,
  Scissors,
  Footprints,
  Shirt,
  MapPin,
  Sparkles,
  ArrowRight,
  Plus,
  Upload,
  Download,
  Copy,
  Trash2,
  X,
  Mic,
  Mic2,
  Music,
  Guitar,
  Drum,
  Disc3,
  Radio,
  Drama,
  Clapperboard,
  Bot,
  Rocket,
  Palette,
  Shapes,
  Globe,
  Heart,
  Type,
  Star,
} from "lucide-react";
import {
  allTemplates,
  newCustomTemplate,
  saveCustomTemplate,
  deleteCustomTemplate,
  isCustomTemplateId,
  TEMPLATE_CATEGORIES,
  type MvTemplate,
  type TemplateCategory,
} from "@/platform/lib/templates";
import { loadSongs } from "@/apps/music-video/lib/songBrain";
import { useAppStore } from "@/platform/store/useAppStore";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { Badge } from "@/platform/components/ui/badge";
import { TemplateHeroImage } from "@/platform/components/templates/TemplateCard";

/** Pick an elegant genre/style icon for a template by matching its name/tags. */
function templateIcon(t: MvTemplate): React.ReactNode {
  const s = `${t.name} ${t.tagline} ${t.mood} ${t.danceStyle ?? ""} ${t.visualStyle}`.toLowerCase();
  const cls = "h-6 w-6";
  const has = (...w: string[]) => w.some((x) => s.includes(x));
  if (has("hip hop", "hip-hop", "rap", "trap", "drill")) return <Mic className={cls} />;
  if (has("afrobeat", "afro", "amapiano")) return <Globe className={cls} />;
  if (has("rock", "metal", "punk", "grunge")) return <Guitar className={cls} />;
  if (has("worship", "gospel", "praise", "spiritual")) return <Heart className={cls} />;
  if (has("k-pop", "kpop", "j-pop")) return <Star className={cls} />;
  if (has("pop")) return <Music className={cls} />;
  if (has("electronic", "edm", "house", "techno", "dance floor", "club"))
    return <Disc3 className={cls} />;
  if (has("dance", "choreo", "ballet")) return <Footprints className={cls} />;
  if (has("drum", "percussion", "marching")) return <Drum className={cls} />;
  if (has("narrative", "story", "cinematic", "short film", "film noir"))
    return <Drama className={cls} />;
  if (has("documentary", "performance", "concert", "live", "stage"))
    return <Mic2 className={cls} />;
  if (has("sci-fi", "scifi", "space", "cyber", "futur")) return <Bot className={cls} />;
  if (has("retro", "vintage", "80s", "synthwave")) return <Radio className={cls} />;
  if (has("pixar", "animated", "cartoon", "anime", "3d")) return <Palette className={cls} />;
  if (has("motion graphic", "kinetic", "typograph", "lyric"))
    return has("lyric") ? <Type className={cls} /> : <Shapes className={cls} />;
  if (has("launch", "product", "tech", "ai")) return <Rocket className={cls} />;
  if (has("abstract", "art", "experimental")) return <Sparkles className={cls} />;
  // Fallback by category.
  if (t.category === "Genre") return <Music className={cls} />;
  if (t.category === "Style") return <Palette className={cls} />;
  return <Clapperboard className={cls} />;
}

export function TemplatesView() {
  const activeTemplateId = useAppStore((s) => s.activeTemplateId);
  const setActiveTemplate = useAppStore((s) => s.setActiveTemplate);
  const openSong = useAppStore((s) => s.openSong);
  const openMvDirector = useAppStore((s) => s.openMvDirector);

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<TemplateCategory | "All">("All");
  const [detail, setDetail] = useState<MvTemplate | null>(null);
  const [editing, setEditing] = useState<MvTemplate | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const importRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTemplates().filter((t) => {
      if (cat !== "All" && t.category !== cat) return false;
      if (!q) return true;
      return `${t.name} ${t.tagline} ${t.mood} ${t.visualStyle} ${t.danceStyle ?? ""}`
        .toLowerCase()
        .includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, cat, tick]);

  const use = (t: MvTemplate) => {
    setActiveTemplate(t.id);
    setDetail(null);
    // Go where it's useful: direct now if a song exists, else import one.
    if (loadSongs().length > 0) openMvDirector();
    else openSong();
  };

  const duplicate = (t: MvTemplate) => {
    const copy = newCustomTemplate({ ...t, name: `${t.name} copy` });
    saveCustomTemplate(copy);
    refresh();
    setEditing(copy);
  };

  const exportTemplate = (t: MvTemplate) => {
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.name.replace(/[^a-z0-9]+/gi, "-")}.wbtemplate.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<MvTemplate>;
      const imported = newCustomTemplate(parsed); // fresh custom id
      saveCustomTemplate(imported);
      refresh();
    } catch {
      /* ignore malformed file */
    }
  };

  const removeTemplate = (t: MvTemplate) => {
    deleteCustomTemplate(t.id);
    if (activeTemplateId === t.id) setActiveTemplate(null);
    refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        <div className="grad-primary flex h-9 w-9 items-center justify-center rounded-lg">
          <LayoutTemplate className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="mr-auto">
          <h1 className="text-lg font-semibold leading-tight">Music Video Templates</h1>
          <p className="text-xs text-muted">
            Part of Music Video Director · adapts directing blueprints to the active song.
          </p>
          <p className="text-xs text-muted">
            Production blueprints by genre, style, and format — the Director Brain adapts them to
            your song.
          </p>
        </div>
        <div className="relative w-56 max-w-[36vw]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="pl-8"
            aria-label="Search templates"
          />
        </div>
        <Button variant="secondary" onClick={() => importRef.current?.click()}>
          <Upload className="h-4 w-4" /> Import
        </Button>
        <Button onClick={() => setEditing(newCustomTemplate())}>
          <Plus className="h-4 w-4" /> Create template
        </Button>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onImport}
        />
      </header>

      <div className="flex items-center gap-2 border-b border-border px-6 py-2">
        {(["All", ...TEMPLATE_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              cat === c
                ? "bg-primary/12 text-primary"
                : "text-muted hover:bg-elevated hover:text-foreground"
            )}
          >
            {c}
          </button>
        ))}
        {activeTemplateId && (
          <button
            onClick={() => setActiveTemplate(null)}
            className="ml-auto text-xs font-medium text-muted hover:text-danger"
          >
            Clear selection
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              selected={t.id === activeTemplateId}
              custom={isCustomTemplateId(t.id)}
              onUse={() => use(t)}
              onDetails={() => setDetail(t)}
              onEdit={() => setEditing(t)}
              onDuplicate={() => duplicate(t)}
              onExport={() => exportTemplate(t)}
              onDelete={() => removeTemplate(t)}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No templates match “{query}”.</p>
        )}
      </div>

      {detail && (
        <TemplateDetail
          template={detail}
          selected={detail.id === activeTemplateId}
          onUse={() => use(detail)}
          onClose={() => setDetail(null)}
        />
      )}

      {editing && (
        <TemplateEditor
          template={editing}
          onSave={(t) => {
            saveCustomTemplate(t);
            setEditing(null);
            refresh();
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Swatches({ palette }: { palette: string[] }) {
  return (
    <div className="flex gap-1">
      {palette.map((c, i) => (
        <span
          key={i}
          className="h-4 w-4 rounded-sm border border-black/20"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function TemplateCard({
  template: t,
  selected,
  custom,
  onUse,
  onDetails,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
}: {
  template: MvTemplate;
  selected: boolean;
  custom: boolean;
  onUse: () => void;
  onDetails: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const moodTags = t.mood
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface shadow-card transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
      )}
    >
      <button onClick={onDetails} className="text-left">
        <TemplateHeroImage
          template={t}
          overlay={
            <>
              <span
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur"
                style={{ color: t.accent }}
              >
                {templateIcon(t)}
              </span>
              {custom && (
                <span className="absolute bottom-1.5 left-1.5">
                  <Badge variant="accent" className="normal-case">
                    Custom
                  </Badge>
                </span>
              )}
            </>
          }
        />
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <button onClick={onDetails} className="text-left">
          <h3 className="text-sm font-semibold leading-tight hover:underline">{t.name}</h3>
          <p className="line-clamp-2 text-xs text-muted">{t.tagline}</p>
        </button>
        {moodTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {moodTags.map((m) => (
              <span
                key={m}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${t.accent}1f`, color: t.accent }}
              >
                {m}
              </span>
            ))}
          </div>
        )}
        <Swatches palette={t.palette} />
        <div className="mt-1 space-y-1 text-[11px] text-muted">
          <Attr icon={<Scissors className="h-3 w-3" />} value={t.editingRhythm} />
          {t.danceStyle && (
            <Attr
              icon={<Footprints className="h-3 w-3" />}
              value={`${t.danceStyle} choreography`}
            />
          )}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button variant="gold" size="sm" className="flex-1" onClick={onUse}>
            {selected ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {selected ? "Selected · Use" : "Use template"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDetails}>
            Details
          </Button>
        </div>
        {/* Manage actions: custom = full set; built-in = duplicate to customize. */}
        <div className="flex items-center gap-1 border-t border-border pt-2 text-muted">
          <IconBtn title="Duplicate" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" />
          </IconBtn>
          {custom && (
            <IconBtn title="Edit" onClick={onEdit}>
              <LayoutTemplate className="h-3.5 w-3.5" />
            </IconBtn>
          )}
          <IconBtn title="Export (.json)" onClick={onExport}>
            <Download className="h-3.5 w-3.5" />
          </IconBtn>
          {custom && (
            <IconBtn title="Delete" onClick={onDelete} danger>
              <Trash2 className="h-3.5 w-3.5" />
            </IconBtn>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md hover:bg-elevated",
        danger ? "hover:text-danger" : "hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Attr({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="line-clamp-1">{value}</span>
    </div>
  );
}

function TemplateDetail({
  template: t,
  selected,
  onUse,
  onClose,
}: {
  template: MvTemplate;
  selected: boolean;
  onUse: () => void;
  onClose: () => void;
}) {
  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Sparkles className="h-4 w-4" />, label: "Visual style", value: t.visualStyle },
    { icon: <Camera className="h-4 w-4" />, label: "Camera language", value: t.cameraLanguage },
    { icon: <Sparkles className="h-4 w-4" />, label: "Lighting", value: t.lightingStyle },
    { icon: <Scissors className="h-4 w-4" />, label: "Editing rhythm", value: t.editingRhythm },
    {
      icon: <LayoutTemplate className="h-4 w-4" />,
      label: "Shot structure",
      value: t.shotStructure,
    },
    { icon: <Sparkles className="h-4 w-4" />, label: "Performance", value: t.performanceStyle },
    ...(t.danceStyle
      ? [{ icon: <Footprints className="h-4 w-4" />, label: "Choreography", value: t.danceStyle }]
      : []),
    { icon: <Shirt className="h-4 w-4" />, label: "Wardrobe", value: t.wardrobe },
    { icon: <MapPin className="h-4 w-4" />, label: "Sets", value: t.setDirection },
    { icon: <Sparkles className="h-4 w-4" />, label: "Props", value: t.props },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card">
        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: t.accent }} />
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{t.name}</h2>
              <Badge
                className="normal-case"
                style={{ backgroundColor: `${t.accent}1f`, color: t.accent }}
              >
                {t.category}
              </Badge>
            </div>
            <p className="text-xs text-muted">
              {t.tagline} · {t.mood}
            </p>
          </div>
          <Swatches palette={t.palette} />
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-4">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-3 text-sm">
              <span className="mt-0.5 shrink-0 text-muted">{r.icon}</span>
              <span>
                <span className="font-medium">{r.label}: </span>
                <span className="text-muted">{r.value}</span>
              </span>
            </div>
          ))}
          <div className="rounded-[var(--radius-input)] border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
            <span className="font-semibold">Recommended providers: </span>
            {t.recommendedProviders.join(" · ")}
          </div>
          <p className="pt-1 text-[11px] text-muted">
            This is a blueprint, not a lock — the Director Brain adapts it to your song's tempo,
            sections, and energy, and you can tweak everything after.
          </p>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="gold" onClick={onUse}>
            {selected ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            Use this template
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Create / edit a custom template. Lists → comma-separated text for simplicity. */
function TemplateEditor({
  template,
  onSave,
  onClose,
}: {
  template: MvTemplate;
  onSave: (t: MvTemplate) => void;
  onClose: () => void;
}) {
  const [t, setT] = useState<MvTemplate>(template);
  const set = (patch: Partial<MvTemplate>) => setT((cur) => ({ ...cur, ...patch }));
  const csv = (a: string[]) => a.join(", ");
  const parse = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">
            {template.name ? "Edit template" : "New template"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <EF label="Name">
              <Input value={t.name} onChange={(e) => set({ name: e.target.value })} />
            </EF>
            <EF label="Category">
              <select
                value={t.category}
                onChange={(e) => set({ category: e.target.value as TemplateCategory })}
                className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm focus-visible:border-primary focus-visible:outline-none"
              >
                {TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </EF>
            <EF label="Mood">
              <Input value={t.mood} onChange={(e) => set({ mood: e.target.value })} />
            </EF>
            <EF label="Accent color">
              <input
                type="color"
                value={t.accent}
                onChange={(e) => set({ accent: e.target.value })}
                className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface"
              />
            </EF>
          </div>
          <EF label="Tagline">
            <Input value={t.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          </EF>
          <EF label="Visual style">
            <Textarea
              value={t.visualStyle}
              onChange={(e) => set({ visualStyle: e.target.value })}
              className="min-h-14"
            />
          </EF>
          <EF label="Palette (comma-separated hex)">
            <Input
              value={csv(t.palette)}
              onChange={(e) => set({ palette: parse(e.target.value) })}
            />
          </EF>
          <div className="grid gap-3 sm:grid-cols-2">
            <EF label="Camera language">
              <Input
                value={t.cameraLanguage}
                onChange={(e) => set({ cameraLanguage: e.target.value })}
              />
            </EF>
            <EF label="Lighting style">
              <Input
                value={t.lightingStyle}
                onChange={(e) => set({ lightingStyle: e.target.value })}
              />
            </EF>
            <EF label="Editing rhythm">
              <Input
                value={t.editingRhythm}
                onChange={(e) => set({ editingRhythm: e.target.value })}
              />
            </EF>
            <EF label="Dance style (optional)">
              <Input
                value={t.danceStyle ?? ""}
                onChange={(e) => set({ danceStyle: e.target.value || undefined })}
              />
            </EF>
            <EF label="Wardrobe direction">
              <Input value={t.wardrobe} onChange={(e) => set({ wardrobe: e.target.value })} />
            </EF>
            <EF label="Set direction">
              <Input
                value={t.setDirection}
                onChange={(e) => set({ setDirection: e.target.value })}
              />
            </EF>
          </div>
          <EF label="Location pool (comma-separated)">
            <Input
              value={csv(t.locations)}
              onChange={(e) => set({ locations: parse(e.target.value) })}
            />
          </EF>
          <EF label="Wardrobe pool (comma-separated)">
            <Input
              value={csv(t.wardrobePool)}
              onChange={(e) => set({ wardrobePool: parse(e.target.value) })}
            />
          </EF>
          <div className="grid gap-3 sm:grid-cols-2">
            <EF label="Cut bias (1 = normal, <1 faster)">
              <Input
                type="number"
                step={0.05}
                value={t.cutBias}
                onChange={(e) => set({ cutBias: Number(e.target.value) || 1 })}
              />
            </EF>
            <EF label="Performance lean">
              <select
                value={t.lean}
                onChange={(e) => set({ lean: e.target.value as MvTemplate["lean"] })}
                className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm focus-visible:border-primary focus-visible:outline-none"
              >
                <option value="balanced">Balanced</option>
                <option value="performance">Performance-forward</option>
                <option value="narrative">Narrative-forward</option>
              </select>
            </EF>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(t)} disabled={!t.name.trim()}>
            <Check className="h-4 w-4" /> Save template
          </Button>
        </div>
      </div>
    </div>
  );
}

function EF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
