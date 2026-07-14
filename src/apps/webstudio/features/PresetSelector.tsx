/**
 * Preset Selector - Browse and select Web Studio presets
 * Organized by category with preview images and generation prompts
 */

import { useState } from "react";
import { ChevronRight, Grid2X2, LayoutGrid } from "lucide-react";
import {
  getAllPresets,
  PRESETS_BY_CATEGORY,
  type PresetCategory,
  type PresetId,
} from "@/apps/webstudio/lib/presetLibrary";
import { Button } from "@/platform/components/ui/button";
import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";

interface PresetSelectorProps {
  onSelect: (presetId: PresetId) => void;
  loading?: boolean;
}

const CATEGORY_LABELS: Record<PresetCategory, string> = {
  "hero-landing": "Hero & Landing",
  "portfolio-creative": "Portfolio & Creative",
  "product-ecommerce": "Product & E-Commerce",
  "tech-web3": "Tech & Web3",
  "corporate-brand": "Corporate & Brand",
  "entertainment-lifestyle": "Entertainment & Lifestyle",
};

export function PresetSelector({ onSelect, loading = false }: PresetSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>("hero-landing");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categories = Object.keys(PRESETS_BY_CATEGORY) as PresetCategory[];
  const currentPresets = PRESETS_BY_CATEGORY[selectedCategory]
    .map((id) => getAllPresets().find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold">Web Studio Presets</h1>
        <p className="text-sm text-muted mt-1">
          Choose a design pattern to start your website
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Category Sidebar */}
        <div className="w-48 border-r border-border overflow-y-auto">
          <div className="p-4 space-y-2">
            {categories.map((category) => {
              const count = PRESETS_BY_CATEGORY[category].length;
              const isActive = category === selectedCategory;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{CATEGORY_LABELS[category]}</span>
                    <Badge className="text-xs bg-muted text-muted-foreground">
                      {count}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Presets Grid/List */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* View Mode Toggle */}
          <div className="border-b border-border px-6 py-3 flex items-center justify-between">
            <h2 className="font-semibold">{CATEGORY_LABELS[selectedCategory]}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
                title="List view"
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="flex-1 overflow-y-auto p-6">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-4">
                {currentPresets.map((preset) => (
                  <PresetCard
                    key={preset!.id}
                    preset={preset!}
                    onSelect={onSelect}
                    loading={loading}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {currentPresets.map((preset) => (
                  <PresetListItem
                    key={preset!.id}
                    preset={preset!}
                    onSelect={onSelect}
                    loading={loading}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PresetCardProps {
  preset: any;
  onSelect: (presetId: PresetId) => void;
  loading?: boolean;
}

function PresetCard({ preset, onSelect, loading }: PresetCardProps) {
  return (
    <div className="group cursor-pointer">
      <div
        className="relative overflow-hidden rounded-lg border border-border bg-muted aspect-video mb-2 flex items-center justify-center hover:border-primary/50 transition-colors"
        onClick={() => onSelect(preset.id)}
      >
        {/* Placeholder for reference image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: preset.accentColor || "#e5e7eb",
            opacity: 0.1,
          }}
        />
        <div className="relative text-center text-muted-foreground">
          <p className="text-xs font-medium">{preset.label}</p>
        </div>
      </div>
      <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
        {preset.label}
      </h3>
      <p className="text-xs text-muted line-clamp-2">{preset.summary}</p>
      <Button
        size="sm"
        variant="ghost"
        className="w-full mt-2"
        disabled={loading}
        onClick={() => onSelect(preset.id)}
      >
        Use Preset
        <ChevronRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}

function PresetListItem({ preset, onSelect, loading }: PresetCardProps) {
  return (
    <button
      onClick={() => onSelect(preset.id)}
      disabled={loading}
      className="w-full text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium group-hover:text-primary transition-colors">
            {preset.label}
          </h3>
          <p className="text-sm text-muted mt-1">{preset.summary}</p>
          <p className="text-xs text-muted-foreground mt-2">{preset.description}</p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {preset.sections.slice(0, 3).map((section: any) => (
              <Badge key={section.name} className="text-xs bg-muted text-muted-foreground">
                {section.name}
              </Badge>
            ))}
            {preset.sections.length > 3 && (
              <Badge className="text-xs bg-muted text-muted-foreground">
                +{preset.sections.length - 3}
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary mt-1 flex-shrink-0" />
      </div>
    </button>
  );
}
