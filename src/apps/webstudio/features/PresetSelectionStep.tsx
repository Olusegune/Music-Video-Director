/**
 * Preset Selection Step - Part of Web Studio guided workflow
 * Allows users to choose a design preset before generating website
 */

import { useState } from "react";
import { ChevronRight, Check } from "lucide-react";
import {
  getAllPresets,
  PRESETS_BY_CATEGORY,
  type PresetCategory,
  type PresetId,
} from "@/apps/webstudio/lib/presetLibrary";
import { Button } from "@/platform/components/ui/button";
import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";

interface PresetSelectionStepProps {
  onSelect: (presetId: PresetId) => void;
  selectedPreset?: PresetId;
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

const CATEGORY_DESCRIPTIONS: Record<PresetCategory, string> = {
  "hero-landing":
    "Bold entry points with video, products, or storytelling—perfect for first impressions.",
  "portfolio-creative":
    "Showcase your work with grids, case studies, or designer portfolios.",
  "product-ecommerce":
    "Luxury launches, SaaS teasers, retail grids, or food photography.",
  "tech-web3": "Developer APIs, blockchain platforms, enterprise tech, or AI showcases.",
  "corporate-brand":
    "Mission-driven messaging, B2B services, or sustainability impact.",
  "entertainment-lifestyle":
    "Artists, events, fitness programs, travel destinations, fashion, or restaurants.",
};

export function PresetSelectionStep({
  onSelect,
  selectedPreset,
  loading = false,
}: PresetSelectionStepProps) {
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>(
    "hero-landing"
  );
  const [showDetails, setShowDetails] = useState<PresetId | null>(null);

  const categories = Object.keys(PRESETS_BY_CATEGORY) as PresetCategory[];
  const currentPresets = PRESETS_BY_CATEGORY[selectedCategory]
    .map((id) => getAllPresets().find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Choose Your Design Style</h2>
        <p className="text-muted mt-2">
          Select a design pattern to guide the AI in generating your website.
          You can customize it afterwards.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => {
          const count = PRESETS_BY_CATEGORY[category].length;
          const isActive = category === selectedCategory;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {CATEGORY_LABELS[category]}
              <span className="ml-2 opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Category Description */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-foreground">
          {CATEGORY_DESCRIPTIONS[selectedCategory]}
        </p>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentPresets.map((preset) => {
          if (!preset) return null;
          const isSelected = selectedPreset === preset.id;

          return (
            <div key={preset.id}>
              <button
                onClick={() => onSelect(preset.id)}
                disabled={loading}
                className={cn(
                  "w-full text-left p-4 rounded-lg border-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 bg-surface hover:bg-muted/50"
                )}
              >
                {/* Preset Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm leading-tight">
                        {preset.label}
                      </h3>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1 line-clamp-2">
                      {preset.summary}
                    </p>
                  </div>

                  {/* Accent Color Dot */}
                  <div
                    className="w-6 h-6 rounded-lg flex-shrink-0 border border-border"
                    style={{ backgroundColor: preset.accentColor }}
                    title={`Accent: ${preset.accentColor}`}
                  />
                </div>

                {/* Sections Preview */}
                <div className="mt-3 flex gap-1 flex-wrap">
                  {preset.sections.slice(0, 3).map((section) => (
                    <Badge
                      key={section.name}
                      className="text-[10px] bg-muted text-muted-foreground"
                    >
                      {section.name}
                    </Badge>
                  ))}
                  {preset.sections.length > 3 && (
                    <Badge className="text-[10px] bg-muted text-muted-foreground">
                      +{preset.sections.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Details Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(
                      showDetails === preset.id ? null : preset.id
                    );
                  }}
                  className="mt-2 text-xs text-muted hover:text-foreground transition-colors"
                >
                  {showDetails === preset.id ? "Hide" : "Show"} details →
                </button>
              </button>

              {/* Expanded Details */}
              {showDetails === preset.id && (
                <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Description
                    </p>
                    <p className="text-xs mt-1">{preset.description}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Design Style
                    </p>
                    <div className="text-xs mt-1 space-y-1">
                      <p>
                        <span className="text-muted-foreground">Style:</span>{" "}
                        {preset.aesthetic.style}
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          Typography:
                        </span>{" "}
                        {preset.aesthetic.typography}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Colors:</span>{" "}
                        {preset.aesthetic.colorPalette}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Interactions
                    </p>
                    <div className="text-xs mt-1 flex gap-1 flex-wrap">
                      {preset.interactions.map((interaction) => (
                        <Badge
                          key={interaction}
                          className="text-[10px] border border-border bg-transparent"
                        >
                          {interaction}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="flex gap-3 justify-between items-center p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div>
          <p className="text-sm font-medium">
            {selectedPreset ? "Ready to generate?" : "Select a preset to continue"}
          </p>
          <p className="text-xs text-muted mt-0.5">
            You can customize everything after generation
          </p>
        </div>
        <Button
          disabled={!selectedPreset || loading}
          onClick={() => selectedPreset && onSelect(selectedPreset)}
          size="sm"
        >
          Continue
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
