import { useState } from "react";
import { Plus, Trash2, Check, Image as ImageIcon, Film } from "lucide-react";
import { ReferenceAsset } from "@/platform/lib/referenceLabTypes";
import { Card } from "@/platform/components/ui/card";
import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";

export interface ReferenceAssetCardProps {
  asset: ReferenceAsset;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  showCheckbox?: boolean;
}

export default function ReferenceAssetCard({ asset, selected = false, onSelect, onDelete, showCheckbox = false }: ReferenceAssetCardProps) {
  const [showDescription, setShowDescription] = useState(false);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-lg border transition hover:border-primary/50",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-surface hover:bg-surface/80"
      )}
    >
      {/* Checkbox Overlay */}
      {showCheckbox && (
        <div className="absolute right-2 top-2 z-10 flex items-center justify-center">
          <div
            className={cn(
              "h-5 w-5 rounded border-2 transition",
              selected ? "border-primary bg-primary" : "border-border bg-surface"
            )}
          >
            {selected && <Check className="h-4 w-4 text-primary-foreground" />}
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-surface-alt">
        {asset.thumbnailUrl && (asset.type === "image" || asset.type === "pose") ? (
          <img src={asset.thumbnailUrl} alt={asset.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {asset.type === "video" ? <Film className="h-8 w-8 text-muted" /> : <ImageIcon className="h-8 w-8 text-muted" />}
          </div>
        )}

        {/* Type Badge */}
        <Badge className="absolute bottom-2 left-2 rounded-full bg-black/60 text-xs text-white capitalize">{asset.type}</Badge>

        {/* Hover Actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 transition group-hover:bg-black/40">
          <button onClick={onSelect} className="opacity-0 transition group-hover:opacity-100">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-primary-foreground transition hover:bg-primary/90">
              {showCheckbox ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
          </button>
          {onDelete && (
            <button onClick={onDelete} className="opacity-0 transition group-hover:opacity-100">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-destructive/80 text-destructive-foreground transition hover:bg-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 p-3">
        <div
          onClick={() => setShowDescription(!showDescription)}
          className="cursor-pointer space-y-1"
        >
          <h3 className="text-xs font-semibold text-foreground line-clamp-1">{asset.name}</h3>
          <p className={cn("text-xs text-muted transition", showDescription ? "line-clamp-none" : "line-clamp-2")}>
            {asset.description || "(no description)"}
          </p>
        </div>

        {/* Tags */}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="default" className="text-[10px]">
                {tag}
              </Badge>
            ))}
            {asset.tags.length > 2 && <span className="text-[10px] text-muted">+{asset.tags.length - 2}</span>}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted/50">
          {new Date(asset.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>
    </Card>
  );
}
