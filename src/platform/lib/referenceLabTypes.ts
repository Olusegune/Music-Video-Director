export type ReferenceAssetType = "image" | "video" | "pose" | "mood" | "sketch";

export type ReferenceTagCategory = "style" | "mood" | "character" | "motion" | "lighting" | "composition";

export interface ReferenceTag {
  id: string;
  label: string;
  category: ReferenceTagCategory;
  usageCount: number;
}

export interface ReferenceAsset {
  id: string;
  name: string;
  type: ReferenceAssetType;
  description: string;
  thumbnailUrl?: string; // data URL for local storage
  uploadUrl?: string; // external URL if ever needed
  tags: string[]; // tag IDs
  createdAt: string; // ISO timestamp
  updatedAt?: string;
}

export interface MoodBoard {
  id: string;
  name: string;
  description: string;
  assetIds: string[]; // references to ReferenceAssets
  color?: string; // hex color for visual grouping
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceLabData {
  assets: ReferenceAsset[];
  moodBoards: MoodBoard[];
  tags: ReferenceTag[];
  version: number; // for future migrations
}
