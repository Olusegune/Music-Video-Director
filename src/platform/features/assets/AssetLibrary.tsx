import { useMemo, useState } from "react";
import { useConfirm } from "@/platform/components/ui/confirm-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ImageOff,
  Users,
  Globe,
  Package,
  Film,
  Footprints,
  Download,
  Trash2,
} from "lucide-react";
import { api } from "@/platform/lib/ipc";
import {
  buildAssetRefs,
  isChoreographyCategory,
  type AssetKind,
  type AssetOrigin,
} from "@/platform/lib/assets";
import { loadMotionTests, deleteMotionTest } from "@/apps/music-video/lib/motionTest";
import { useAppStore } from "@/platform/store/useAppStore";
import { Badge } from "@/platform/components/ui/badge";
import { Input } from "@/platform/components/ui/input";
import { AssetImage, AssetVideo } from "@/platform/components/ui/asset-image";
import { cn } from "@/platform/lib/utils";
import { SafeDeleteDialog } from "@/platform/features/assets/SafeDeleteDialog";
import { deleteAsset, loadAssets } from "@/platform/lib/generatedAssets";

// A library "kind" is the tab/grouping a user sees — an origin, not a storage
// bucket. Choreography assets live in the Prop bible but group on their own.
type LibKind = "Character" | "Environment" | "Prop" | "Choreography" | "Motion test" | "Glam";

interface LibItem {
  id: string;
  entityId: string; // bible entity id (for delete/usage); "" for motion tests
  motionId?: string; // motion-test id, when applicable
  generatedId?: string;
  kind: LibKind;
  /** The persistent Bible this asset is stored in (for safe-delete). */
  storageKind: AssetKind;
  /** Where it came from / which system made it — shown on every card. */
  origin: AssetOrigin;
  category: string; // sub-type (Pose sheet, Wardrobe, …) or motion label
  label: string;
  src: string;
  isVideo: boolean;
  open: () => void;
}

const KIND_ICON: Record<LibKind, React.ReactNode> = {
  Character: <Users className="h-3 w-3" />,
  Environment: <Globe className="h-3 w-3" />,
  Prop: <Package className="h-3 w-3" />,
  Choreography: <Footprints className="h-3 w-3" />,
  "Motion test": <Film className="h-3 w-3" />,
  Glam: <ImageOff className="h-3 w-3" />,
};

/** The system each library kind belongs to — shown as the card's origin badge. */
const KIND_ORIGIN: Record<LibKind, AssetOrigin> = {
  Character: "Character Bible",
  Environment: "World Bible",
  Prop: "Props & Vehicles",
  Choreography: "Choreography",
  "Motion test": "Animation Lab",
  Glam: "Glam Studio",
};

const TABS: ("All" | LibKind)[] = [
  "All",
  "Character",
  "Environment",
  "Prop",
  "Glam",
  "Choreography",
  "Motion test",
];

export function AssetLibrary() {
  const confirm = useConfirm();
  const openCharacters = useAppStore((s) => s.openCharacters);
  const openWorld = useAppStore((s) => s.openWorld);
  const openProps = useAppStore((s) => s.openProps);
  const openAnimation = useAppStore((s) => s.openAnimation);
  const openChoreography = useAppStore((s) => s.openChoreography);

  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: api.listCharacters,
  });
  const { data: environments = [] } = useQuery({
    queryKey: ["environments"],
    queryFn: api.listEnvironments,
  });
  const { data: props = [] } = useQuery({ queryKey: ["props"], queryFn: api.listProps });

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"All" | LibKind>("All");
  const [del, setDel] = useState<LibItem | null>(null);
  const [tick, setTick] = useState(0);
  const qc = useQueryClient();

  const items = useMemo<LibItem[]>(() => {
    // One card per entity (its hero image), not one per reference image.
    const seen = new Set<string>();
    const refs: LibItem[] = [];
    for (const a of buildAssetRefs(characters, environments, props)) {
      const entityId = a.id.split(":")[1] ?? a.id;
      if (seen.has(entityId)) continue;
      seen.add(entityId);
      const category = a.sub.replace(/ · ref \d+$/, "");
      // A Prop-bible asset whose category is choreography output (pose sheet,
      // formation, …) is re-presented as a Choreography asset — its own tab,
      // never mixed in with real props.
      const choreo = a.kind === "Prop" && isChoreographyCategory(category);
      const kind: LibKind = choreo ? "Choreography" : (a.kind as LibKind);
      refs.push({
        id: a.id,
        entityId,
        kind,
        storageKind: a.kind,
        origin: KIND_ORIGIN[kind],
        category,
        label: a.label,
        src: a.src,
        isVideo: false,
        open: choreo
          ? openChoreography
          : a.kind === "Character"
            ? openCharacters
            : a.kind === "Environment"
              ? openWorld
              : openProps,
      });
    }
    const motion: LibItem[] = loadMotionTests().map((t) => ({
      id: `motion:${t.id}`,
      entityId: "",
      motionId: t.id,
      kind: "Motion test",
      storageKind: "Prop",
      origin: KIND_ORIGIN["Motion test"],
      category: t.motionLabel || "motion test",
      label: t.label,
      src: t.url,
      isVideo: true,
      open: openAnimation,
    }));
    const glam: LibItem[] = loadAssets()
      .filter((asset) => asset.entityKind === "glam")
      .map((asset) => ({
        id: `glam:${asset.id}`,
        entityId: asset.entityId,
        generatedId: asset.id,
        kind: "Glam",
        storageKind: "Prop",
        origin: "Glam Studio",
        category: asset.sheetType,
        label: asset.entityName,
        src: asset.url,
        isVideo: false,
        open: () => undefined,
      }));
    return [...glam, ...refs, ...motion];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    characters,
    environments,
    props,
    openCharacters,
    openWorld,
    openProps,
    openAnimation,
    openChoreography,
    tick,
  ]);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["characters"] });
    qc.invalidateQueries({ queryKey: ["environments"] });
    qc.invalidateQueries({ queryKey: ["props"] });
    qc.invalidateQueries({ queryKey: ["cast"] });
  };

  const removeItem = async (item: LibItem) => {
    if (item.kind === "Glam" && item.generatedId) {
      if (
        await confirm({
          title: `Delete Glam asset “${item.label}”?`,
          confirmLabel: "Delete",
          destructive: true,
        })
      ) {
        deleteAsset(item.generatedId);
        setTick((n) => n + 1);
      }
      return;
    }
    if (item.kind === "Motion test" && item.motionId) {
      if (
        await confirm({
          title: `Delete motion test “${item.label}”?`,
          confirmLabel: "Delete",
          destructive: true,
        })
      ) {
        deleteMotionTest(item.motionId);
        setTick((n) => n + 1);
      }
      return;
    }
    setDel(item); // Bible asset → safe-delete dialog with usage tracking
  };

  // Distinct sub-categories present, for quick chips (e.g. Pose sheet, Formation sheet…).
  const subCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(i.category));
    return [...set].sort();
  }, [items]);

  const filtered = items.filter((i) => {
    if (tab !== "All" && i.kind !== tab) return false;
    const q = query.trim().toLowerCase();
    return !q || `${i.label} ${i.category} ${i.kind}`.toLowerCase().includes(q);
  });

  const download = (item: LibItem) => {
    const a = document.createElement("a");
    a.href = item.src;
    a.download = `${item.label.replace(/[^a-z0-9]+/gi, "-")}.${item.isVideo ? "mp4" : "png"}`;
    a.click();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-lg font-semibold">Production Library</h1>
        <p className="text-xs text-muted">
          Shared across all studios · reusable generated and imported assets.
        </p>
        <p className="text-xs text-muted">
          Every reusable asset — characters, sets, props, pose &amp; formation sheets, and motion
          tests — searchable across the whole production.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-8 py-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets… (try “pose”, “formation”)"
            className="pl-8"
            aria-label="Search assets"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                tab === t
                  ? "bg-primary/12 text-primary"
                  : "text-muted hover:bg-elevated hover:text-foreground"
              )}
            >
              {t !== "All" && KIND_ICON[t]}
              {t}
            </button>
          ))}
        </div>
        {/* quick chips for sub-categories (Pose sheet, Formation sheet, Wardrobe…) */}
        {subCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {subCategories.slice(0, 8).map((c) => (
              <button
                key={c}
                onClick={() => setQuery(c)}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted hover:border-primary/50 hover:text-foreground"
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto text-[11px] text-muted">{filtered.length} assets</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border py-16 text-center">
            <ImageOff className="mb-2 h-7 w-7 text-muted" />
            <p className="text-sm text-muted">
              {items.length === 0
                ? "No assets yet — create characters, sets, props, or generate pose/formation sheets and motion tests."
                : "No assets match your search."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface text-left shadow-card transition-colors hover:border-primary/50"
              >
                <button
                  onClick={item.open}
                  className="block w-full"
                  title={`${item.label} — ${item.category || item.kind} · from ${item.origin}`}
                >
                  <div className="relative aspect-square bg-elevated">
                    {item.isVideo ? (
                      <AssetVideo
                        src={item.src}
                        controls={false}
                        className="h-full w-full object-cover"
                        label="Clip"
                      />
                    ) : (
                      <AssetImage
                        src={item.src}
                        alt={item.label}
                        className="h-full w-full object-cover"
                        label="Asset"
                      />
                    )}
                    {/* Origin badge — which system this asset came from. */}
                    <span className="absolute left-1.5 top-1.5">
                      <Badge variant="primary" className="gap-1">
                        {KIND_ICON[item.kind]} {item.origin}
                      </Badge>
                    </span>
                  </div>
                  <div className="p-2.5">
                    <div className="truncate text-xs font-medium">{item.label}</div>
                    {/* What this asset is (its sub-type). */}
                    <div className="truncate text-[11px] text-muted">
                      {item.category || item.kind}
                    </div>
                  </div>
                </button>
                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => download(item)}
                    className="flex h-6 w-6 items-center justify-center rounded bg-black/55 text-white hover:bg-black/80"
                    title="Download"
                    aria-label="Download asset"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeItem(item)}
                    className="flex h-6 w-6 items-center justify-center rounded bg-black/55 text-white hover:bg-danger"
                    title="Delete asset"
                    aria-label="Delete asset"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {del && (
        <SafeDeleteDialog
          kind={del.storageKind}
          entityId={del.entityId}
          name={del.label}
          srcs={[del.src]}
          onDone={() => {
            refreshAll();
            setTick((n) => n + 1);
            setDel(null);
          }}
          onClose={() => setDel(null)}
        />
      )}
    </div>
  );
}
