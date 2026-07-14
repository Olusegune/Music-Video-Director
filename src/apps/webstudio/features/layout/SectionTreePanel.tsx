import { useState } from "react";
import { Eye, EyeOff, Copy, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";
import { Input } from "@/platform/components/ui/input";
import { cn } from "@/platform/lib/utils";
import { patternById } from "@/apps/webstudio/lib/patterns";
import type { SectionInstance } from "@/apps/webstudio/lib/types";

export interface SectionTreePanelProps {
  sections: SectionInstance[];
  selectedIds: string[];
  onSelect: (id: string, multiSelect: boolean) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

export function SectionTreePanel({
  sections,
  selectedIds,
  onSelect,
  onReorder,
  onDelete,
  onDuplicate,
  onToggleVisibility,
  onRename,
}: SectionTreePanelProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== toIdx) {
      onReorder(draggedIdx, toIdx);
    }
    setDraggedIdx(null);
  };

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleConfirmRename = (id: string) => {
    if (renameValue.trim()) {
      onRename(id, renameValue);
    }
    setRenamingId(null);
  };

  return (
    <Card className="border-border bg-elevated">
      <CardHeader>
        <CardTitle className="text-base">Sections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sections.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">No sections yet</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {sections.map((section, idx) => {
              const pattern = patternById(section.patternId);
              const isSelected = selectedIds.includes(section.id);
              const isRenaming = renamingId === section.id;

              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border p-2 transition",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border/50 bg-surface hover:border-border"
                  )}
                >
                  {/* Drag handle */}
                  <div className="cursor-move opacity-50 group-hover:opacity-100">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Visibility toggle */}
                  <button
                    onClick={() => onToggleVisibility(section.id)}
                    className="flex-shrink-0 text-muted hover:text-foreground"
                    title={section.hidden ? "Show section" : "Hide section"}
                  >
                    {section.hidden ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                  {/* Section name / content */}
                  <div
                    onClick={() => onSelect(section.id, false)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    {isRenaming ? (
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleConfirmRename(section.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleConfirmRename(section.id);
                          } else if (e.key === "Escape") {
                            setRenamingId(null);
                          }
                        }}
                        className="h-6 text-xs px-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div
                        onDoubleClick={() => handleStartRename(section.id, pattern?.name || "Section")}
                        className="space-y-0.5"
                      >
                        <p className="text-xs font-medium truncate">{pattern?.name || "Unknown"}</p>
                        {section.copy?.heading && (
                          <p className="text-[10px] text-muted truncate">{section.copy.heading}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => onDuplicate(section.id)}
                      className="flex-shrink-0 p-1 hover:bg-primary/20 rounded"
                      title="Duplicate section"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(section.id)}
                      className="flex-shrink-0 p-1 hover:bg-destructive/20 rounded"
                      title="Delete section"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add section button */}
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-2"
          onClick={() => {
            /* Will wire up to add section */
          }}
        >
          + Add section
        </Button>
      </CardContent>
    </Card>
  );
}
