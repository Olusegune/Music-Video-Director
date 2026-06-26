//! Shared data types. `rename_all = "camelCase"` keeps the JSON shape identical
//! to the TypeScript types in `src/lib/types.ts`.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub project_type: String,
    pub status: String,
    pub aspect_ratio: String,
    pub duration: String,
    pub emotional_tone: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewProject {
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub project_type: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderKeyStatus {
    pub provider: String,
    pub configured: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionMeta {
    pub id: String,
    pub version: i64,
    pub created_at: String,
}

// ----- Character DNA (mirrors Character in types.ts) -----
//
// The persistent "source of truth" for one character. Every field feeds the
// composed Prompt DNA, which is what keeps the character consistent across
// every generated image and video.

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Character {
    pub id: String,
    // Identity
    pub name: String,
    pub age: String,
    pub gender: String,
    pub occupation: String,
    pub role: String,
    // Appearance
    pub face_shape: String,
    pub eye_shape: String,
    pub eye_color: String,
    pub hair_style: String,
    pub hair_color: String,
    pub body_type: String,
    pub skin_tone: String,
    pub distinguishing_features: String,
    // Wardrobe
    pub primary_outfit: String,
    pub secondary_outfit: String,
    pub accessories: String,
    // Personality
    pub traits: String,
    pub motivations: String,
    pub fears: String,
    pub goals: String,
    // Visual binding
    pub style_preset: String,
    // Generation
    pub prompt_dna: String,
    pub consistency_rules: String,
    #[serde(default)]
    pub reference_images: Vec<String>,
    pub portrait_url: String,
    // Status
    #[serde(default)]
    pub locked: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ----- Environment DNA (mirrors Environment in types.ts) -----

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Environment {
    pub id: String,
    pub name: String,
    pub description: String,
    pub architecture: String,
    pub time_of_day: String,
    pub mood: String,
    pub lighting_style: String,
    #[serde(default)]
    pub color_palette: Vec<String>,
    pub materials: String,
    pub key_props: String,
    pub environment_rules: String,
    pub style_preset: String,
    pub prompt_dna: String,
    pub consistency_rules: String,
    #[serde(default)]
    pub reference_images: Vec<String>,
    pub establishing_url: String,
    #[serde(default)]
    pub locked: bool,
    pub created_at: String,
    pub updated_at: String,
}

// ----- Prop DNA (mirrors Prop in types.ts) -----
// One entity covers props, vehicles, and creatures via `category`.

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Prop {
    pub id: String,
    pub name: String,
    pub category: String,
    pub dimensions: String,
    pub materials: String,
    pub condition: String,
    #[serde(default)]
    pub color_palette: Vec<String>,
    pub usage: String,
    pub story_significance: String,
    pub style_preset: String,
    pub prompt_dna: String,
    pub consistency_rules: String,
    #[serde(default)]
    pub reference_images: Vec<String>,
    pub hero_url: String,
    #[serde(default)]
    pub locked: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrandKit {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub colors: Vec<String>,
    #[serde(default)]
    pub fonts: String,
    #[serde(default)]
    pub voice: String,
    #[serde(default)]
    pub visual_rules: String,
}

// ----- Prompt Pack (mirrors PromptPack in types.ts) -----

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptPack {
    pub creative_direction: CreativeDirection,
    pub style: Style,
    pub shots: Vec<ShotBreakdown>,
    pub qc_checklist: Vec<QcItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeDirection {
    pub working_title: String,
    pub goal: String,
    pub audience: String,
    pub duration: String,
    pub aspect_ratio: String,
    pub emotional_tone: String,
    pub recommended_models: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Style {
    pub visual_language: String,
    pub color_palette: Vec<String>,
    pub typography: String,
    pub materials: String,
    pub mood: String,
    pub atmosphere: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShotBreakdown {
    pub number: u32,
    pub name: String,
    pub purpose: String,
    pub duration: String,
    pub visual_description: String,
    pub camera_movement: String,
    pub transition: String,
    pub audio: String,
    #[serde(default)]
    pub locked: bool,
    #[serde(default)]
    pub image_url: String,
    #[serde(default)]
    pub video_url: String,
    #[serde(default)]
    pub camera: CameraPlan,
    #[serde(default)]
    pub lighting: LightingPlan,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CameraPlan {
    pub shot_type: String,
    pub lens: String,
    pub camera_height: String,
    pub camera_angle: String,
    pub movement: String,
    pub composition: String,
    pub emotional_purpose: String,
    pub editorial_purpose: String,
    pub notes: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LightingPlan {
    pub scene_intent: String,
    pub visual_strategy: String,
    pub key_light: String,
    pub fill_light: String,
    pub rim_light: String,
    pub color_temperature: String,
    pub contrast_ratio: String,
    pub atmosphere: String,
    pub depth_separation: String,
    pub continuity_rules: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QcItem {
    pub label: String,
    pub checked: bool,
}
