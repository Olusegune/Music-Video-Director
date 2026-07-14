/**
 * Hook for cross-studio Reference Lab management
 */

import { useState, useCallback } from "react";
import type { ReferenceAsset } from "@/platform/lib/referenceLabTypes";
import {
  listReferenceAssets,
  listMoodBoards,
  searchAssetsByTagLabel,
} from "@/platform/lib/referenceLabStore";

export function useReferenceLab() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<ReferenceAsset[]>([]);

  const assets = listReferenceAssets();
  const boards = listMoodBoards();

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const selectAsset = useCallback((asset: ReferenceAsset) => {
    setSelectedAssets((prev) => {
      const isAlreadySelected = prev.some((a) => a.id === asset.id);
      if (isAlreadySelected) {
        return prev.filter((a) => a.id !== asset.id);
      }
      return [...prev, asset];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAssets([]);
  }, []);

  const composeReferenceContext = useCallback(() => {
    if (selectedAssets.length === 0) return "";

    const descriptions = selectedAssets
      .map((asset) => `${asset.name}: ${asset.description}`)
      .filter((desc) => desc.trim().length > 0);

    if (descriptions.length === 0) return "";
    return `Visual references: ${descriptions.join("; ")}.`;
  }, [selectedAssets]);

  return {
    isOpen,
    toggleDrawer,
    setIsOpen,
    assets,
    boards,
    selectedAssets,
    selectAsset,
    clearSelection,
    searchAssets: searchAssetsByTagLabel,
    composeReferenceContext,
  };
}
