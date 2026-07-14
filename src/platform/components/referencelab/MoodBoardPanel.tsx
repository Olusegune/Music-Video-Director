import { useState } from "react";
import { Plus, Edit, Trash2, BookOpen } from "lucide-react";
import { listMoodBoards, createMoodBoard, updateMoodBoard, deleteMoodBoard, listReferenceAssets } from "@/platform/lib/referenceLabStore";
import { MoodBoard, ReferenceAsset } from "@/platform/lib/referenceLabTypes";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Card } from "@/platform/components/ui/card";
import { cn } from "@/platform/lib/utils";

export default function MoodBoardPanel() {
  const [moodBoards, setMoodBoards] = useState<MoodBoard[]>(listMoodBoards);
  const [assets] = useState<ReferenceAsset[]>(listReferenceAssets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("#FF69B4");
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const handleCreateBoard = () => {
    const name = prompt("Mood Board Name:");
    if (!name) return;
    const board = createMoodBoard({
      name,
      description: "",
      assetIds: [],
      color: "#FF69B4",
    });
    setMoodBoards((prev) => [...prev, board]);
  };

  const handleStartEdit = (board: MoodBoard) => {
    setEditingId(board.id);
    setEditName(board.name);
    setEditDesc(board.description);
    setEditColor(board.color || "#FF69B4");
  };

  const handleSaveEdit = (boardId: string) => {
    updateMoodBoard(boardId, {
      name: editName,
      description: editDesc,
      color: editColor,
    });
    setMoodBoards((prev) =>
      prev.map((b) =>
        b.id === boardId
          ? { ...b, name: editName, description: editDesc, color: editColor }
          : b
      )
    );
    setEditingId(null);
  };

  const handleDeleteBoard = (boardId: string) => {
    if (confirm("Delete this mood board?")) {
      deleteMoodBoard(boardId);
      setMoodBoards((prev) => prev.filter((b) => b.id !== boardId));
      setSelectedBoardId(null);
    }
  };

  const selectedBoard = selectedBoardId ? moodBoards.find((b) => b.id === selectedBoardId) : null;
  const selectedAssets = selectedBoard ? assets.filter((a) => selectedBoard.assetIds.includes(a.id)) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Boards List */}
      <div className="space-y-3 lg:col-span-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Collections</h3>
          <Button size="sm" variant="ghost" onClick={handleCreateBoard}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {moodBoards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted">No mood boards yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {moodBoards.map((board) => (
              <div
                key={board.id}
                onClick={() => setSelectedBoardId(board.id)}
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-3 transition",
                  selectedBoardId === board.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface hover:bg-surface/80"
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: board.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{board.name}</p>
                    <p className="text-[11px] text-muted truncate">
                      {board.assetIds.length} asset{board.assetIds.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Board Editor */}
      <div className="space-y-3 lg:col-span-2">
        {selectedBoard && editingId === selectedBoard.id ? (
          <Card className="space-y-3 border border-border bg-surface-alt p-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Mood board name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Describe the mood, theme, or context..."
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted resize-none h-20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-10 w-10 rounded-md border border-border cursor-pointer"
                />
                <Input
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  placeholder="#FF69B4"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => handleSaveEdit(selectedBoard.id)}
                className="flex-1"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingId(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        ) : selectedBoard ? (
          <Card className="space-y-4 border border-border bg-surface-alt p-4">
            <div className="flex items-start justify-between">
              <div className="flex gap-3 flex-1">
                <div
                  className="mt-1 h-5 w-5 flex-shrink-0 rounded-lg"
                  style={{ backgroundColor: selectedBoard.color }}
                />
                <div>
                  <h3 className="text-sm font-semibold">{selectedBoard.name}</h3>
                  <p className="text-xs text-muted">{selectedBoard.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStartEdit(selectedBoard)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteBoard(selectedBoard.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Board Assets */}
            <div className="space-y-2">
              <p className="text-xs font-semibold">Assets ({selectedAssets.length})</p>
              {selectedAssets.length === 0 ? (
                <p className="text-xs text-muted">No assets in this board yet</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex gap-2 rounded-lg border border-border bg-surface p-2"
                    >
                      {asset.thumbnailUrl && (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{asset.name}</p>
                        <p className="text-[10px] text-muted truncate">{asset.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-surface-alt p-8 text-center">
            <BookOpen className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">Select a mood board to view or edit</p>
          </Card>
        )}
      </div>
    </div>
  );
}
