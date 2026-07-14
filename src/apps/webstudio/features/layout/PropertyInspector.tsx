import { useState } from "react";
import { Button } from "@/platform/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { cn } from "@/platform/lib/utils";
import { SECTION_PATTERNS } from "@/apps/webstudio/lib/patterns";
import type { SectionInstance } from "@/apps/webstudio/lib/types";

type InspectorTab = "section" | "copy" | "media" | "positioning" | "advanced";

export interface PropertyInspectorProps {
  selectedSections: SectionInstance[];
  onUpdate: (id: string, patch: Partial<SectionInstance>) => void;
  onRemove: (id: string) => void;
  studioMode?: "director" | "studio" | "creator";
}

export function PropertyInspector({
  selectedSections,
  onUpdate,
  onRemove,
  studioMode = "studio",
}: PropertyInspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("section");

  if (selectedSections.length === 0) {
    return (
      <Card className="border-border bg-elevated">
        <CardHeader>
          <CardTitle className="text-base">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted text-center py-4">Select a section to edit</p>
        </CardContent>
      </Card>
    );
  }

  const section = selectedSections[0];
  const isMultiSelect = selectedSections.length > 1;

  const tabs: { id: InspectorTab; label: string; show: boolean }[] = [
    { id: "section", label: "Section", show: true },
    { id: "copy", label: "Copy", show: true },
    { id: "media", label: "Media", show: true },
    { id: "positioning", label: "Positioning", show: true },
    { id: "advanced", label: "Advanced", show: studioMode === "creator" },
  ];

  return (
    <Card className="border-border bg-elevated">
      <CardHeader>
        <CardTitle className="text-base">
          Properties
          {isMultiSelect && <span className="text-xs text-muted ml-2">({selectedSections.length} selected)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-border">
          {tabs
            .filter((t) => t.show)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-2 text-xs font-medium border-b-2 transition",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
        </div>

        {/* Section Tab */}
        {activeTab === "section" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Pattern</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {SECTION_PATTERNS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onUpdate(section.id, { patternId: p.id })}
                    className={cn(
                      "w-full rounded-lg border p-2 text-left text-xs font-medium transition",
                      section.patternId === p.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface hover:border-primary/50"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: null, label: "None" },
                  { value: "hero", label: "Hero" },
                  { value: "proof", label: "Proof" },
                  { value: "trust", label: "Trust" },
                  { value: "conversion", label: "CTA" },
                ].map((role) => (
                  <button
                    key={role.value ?? "none"}
                    onClick={() => onUpdate(section.id, { role: role.value as any })}
                    className={cn(
                      "rounded-lg border p-2 text-xs font-medium transition",
                      section.role === role.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface hover:border-primary/50"
                    )}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Copy Tab */}
        {activeTab === "copy" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Heading</label>
              <Input
                value={section.copy?.heading || ""}
                onChange={(e) =>
                  onUpdate(section.id, {
                    copy: { ...section.copy, heading: e.target.value },
                  })
                }
                placeholder="Section heading"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Body</label>
              <Textarea
                value={section.copy?.body || ""}
                onChange={(e) =>
                  onUpdate(section.id, {
                    copy: { ...section.copy, body: e.target.value },
                  })
                }
                placeholder="Section description"
                rows={3}
                className="text-xs"
              />
            </div>

            {section.copy?.items && section.copy.items.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold">Items</label>
                {section.copy.items.map((item, idx) => (
                  <Input
                    key={idx}
                    value={item}
                    onChange={(e) => {
                      const newItems = [...(section.copy?.items || [])];
                      newItems[idx] = e.target.value;
                      onUpdate(section.id, {
                        copy: { ...section.copy, items: newItems },
                      });
                    }}
                    placeholder={`Item ${idx + 1}`}
                    className="text-xs"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Media Tab */}
        {activeTab === "media" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Image URL</label>
              <Input
                value={section.mediaUrl || ""}
                onChange={(e) => onUpdate(section.id, { mediaUrl: e.target.value })}
                placeholder="https://..."
                className="text-xs"
              />
            </div>
            {section.mediaUrl && (
              <div className="rounded-lg bg-surface p-2">
                <img
                  src={section.mediaUrl}
                  alt={section.copy?.heading || "Section media"}
                  className="w-full h-32 object-cover rounded"
                />
              </div>
            )}
          </div>
        )}

        {/* Positioning Tab */}
        {activeTab === "positioning" && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Set this section's role in the customer journey. Hero sections introduce your offer. Proof sections build
              trust. Conversion sections drive action.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "hero", label: "Hero" },
                { value: "proof", label: "Proof" },
                { value: "trust", label: "Trust" },
                { value: "conversion", label: "CTA" },
              ].map((role) => (
                <button
                  key={role.value}
                  onClick={() => onUpdate(section.id, { role: role.value as any })}
                  className={cn(
                    "rounded-lg border-2 p-2 text-xs font-medium transition",
                    section.role === role.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface hover:border-primary/50"
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Tab (Creator mode only) */}
        {activeTab === "advanced" && studioMode === "creator" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Generation Settings</label>
              <p className="text-xs text-muted">Fine-tune how this section is generated by AI models.</p>
            </div>
            {/* Placeholder for advanced generation controls */}
            <div className="rounded-lg border border-dashed border-border p-3 text-center">
              <p className="text-xs text-muted">Advanced generation options coming soon</p>
            </div>
          </div>
        )}

        {/* Delete button */}
        {!isMultiSelect && (
          <Button
            size="sm"
            variant="danger"
            className="w-full"
            onClick={() => onRemove(section.id)}
          >
            Delete section
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
