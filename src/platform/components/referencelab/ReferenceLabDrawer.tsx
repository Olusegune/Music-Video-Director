import { useState, useRef } from "react";
import { Upload, X, FileQuestion } from "lucide-react";
import { listReferenceAssets, createReferenceAsset, deleteReferenceAsset, listTags } from "@/platform/lib/referenceLabStore";
import { ReferenceAsset } from "@/platform/lib/referenceLabTypes";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Card } from "@/platform/components/ui/card";
import { cn } from "@/platform/lib/utils";
import ReferenceAssetCard from "./ReferenceAssetCard";
import MoodBoardPanel from "./MoodBoardPanel";

export interface ReferenceLabDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (asset: ReferenceAsset) => void;
  multiSelect?: boolean;
}

export default function ReferenceLabDrawer({ open, onClose, onSelect, multiSelect = false }: ReferenceLabDrawerProps) {
  const [assets, setAssets] = useState<ReferenceAsset[]>(listReferenceAssets);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<"assets" | "boards">("assets");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tags = listTags();

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || asset.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || asset.tags.some((tag) => selectedTags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (typeof evt.target?.result === "string") {
          const asset = createReferenceAsset({
            name: file.name.replace(/\.[^/.]+$/, ""),
            type: file.type.startsWith("video") ? "video" : "image",
            description: "",
            thumbnailUrl: evt.target.result,
            tags: [],
          });
          setAssets((prev) => [...prev, asset]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.currentTarget.value = "";
  };

  const handleSelectAsset = (assetId: string) => {
    if (multiSelect) {
      setSelectedAssets((prev) => (prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]));
    } else {
      const asset = assets.find((a) => a.id === assetId);
      if (asset && onSelect) {
        onSelect(asset);
      }
    }
  };

  const handleDeleteAsset = (assetId: string) => {
    if (confirm("Delete this reference? This cannot be undone.")) {
      deleteReferenceAsset(assetId);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      setSelectedAssets((prev) => prev.filter((id) => id !== assetId));
    }
  };

  const handleConfirmSelection = () => {
    if (multiSelect && onSelect) {
      selectedAssets.forEach((id) => {
        const asset = assets.find((a) => a.id === id);
        if (asset) onSelect(asset);
      });
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-surface p-0 shadow-2xl">
        <div className="flex flex-col gap-4 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Reference Lab</h2>
              <p className="text-xs text-muted">Mood boards, poses, style references for all studios</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            <button
              onClick={() => setView("assets")}
              className={cn("px-3 py-2 text-xs font-medium transition", view === "assets" ? "border-b-2 border-primary text-primary" : "text-muted hover:text-foreground")}
            >
              Assets
            </button>
            <button
              onClick={() => setView("boards")}
              className={cn("px-3 py-2 text-xs font-medium transition", view === "boards" ? "border-b-2 border-primary text-primary" : "text-muted hover:text-foreground")}
            >
              Mood Boards
            </button>
          </div>

          {/* Content */}
          {view === "assets" && (
            <div className="flex max-h-[calc(90vh-180px)] flex-col gap-4 overflow-y-auto">
              {/* Upload & Search */}
              <div className="sticky top-0 space-y-3 bg-surface">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                  <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-1.5 h-4 w-4" />
                    Upload
                  </Button>
                </div>

                {/* Tag Filter */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 8).map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() =>
                          setSelectedTags((prev) => (prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]))
                        }
                        className={cn(
                          "rounded-full px-2 py-1 text-xs font-medium transition",
                          selectedTags.includes(tag.id) ? "bg-primary/30 text-primary ring-1 ring-primary" : "bg-surface-alt text-muted hover:bg-surface-alt/80"
                        )}
                      >
                        {tag.label}
                      </button>
                    ))}
                    {tags.length > 8 && <span className="text-xs text-muted">+{tags.length - 8} more</span>}
                  </div>
                )}
              </div>

              {/* Asset Grid */}
              {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <FileQuestion className="h-8 w-8 text-muted" />
                  <p className="text-sm text-muted">{assets.length === 0 ? "No references yet. Upload images or videos to get started." : "No matches. Try adjusting your search or tags."}</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAssets.map((asset) => (
                    <ReferenceAssetCard
                      key={asset.id}
                      asset={asset}
                      selected={multiSelect && selectedAssets.includes(asset.id)}
                      onSelect={() => handleSelectAsset(asset.id)}
                      onDelete={() => handleDeleteAsset(asset.id)}
                      showCheckbox={multiSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "boards" && (
            <div className="max-h-[calc(90vh-180px)] overflow-y-auto">
              <MoodBoardPanel />
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-2 border-t border-border pt-4">
            {multiSelect && selectedAssets.length > 0 && <span className="text-xs text-muted">{selectedAssets.length} selected</span>}
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {multiSelect && <Button size="sm" onClick={handleConfirmSelection}>
              Confirm Selection
            </Button>}
          </div>
        </div>
      </Card>
    </div>
  );
}
