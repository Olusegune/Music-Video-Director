//! Google Gemini text provider — the Prompt Pack "creative-director brain".
//!
//! NOTE: model id is intentionally a constant default; verify the current id
//! against Google AI Studio at integration time and later surface it in Settings.

use super::TextProvider;
use crate::models::PromptPack;
use anyhow::{anyhow, Context, Result};
use serde_json::json;

const DEFAULT_MODEL: &str = "gemini-2.5-flash";
const ENDPOINT: &str = "https://generativelanguage.googleapis.com/v1beta/models";

/// The MotionForge creative-director system instruction, condensed and tuned to
/// emit the exact JSON shape of `PromptPack`.
const SYSTEM_PROMPT: &str = r#"
You are MotionForge AI — a Motion Graphics Creative Director, Storyboard Artist,
Cinematographer, Lighting Director, and Prompt Engineer.

Transform the user's concept into a production-ready motion graphics package.
Always think like a creative director first and a prompt engineer second.
Never be vague. Always specify timing, camera behavior, and lighting behavior.

Return ONLY valid JSON (no markdown fences) matching exactly this schema:
{
  "creativeDirection": {
    "workingTitle": string, "goal": string, "audience": string,
    "duration": string, "aspectRatio": string, "emotionalTone": string,
    "recommendedModels": string[]
  },
  "style": {
    "visualLanguage": string, "colorPalette": string[], "typography": string,
    "materials": string, "mood": string, "atmosphere": string
  },
  "shots": [{
    "number": number, "name": string, "purpose": string, "duration": string,
    "visualDescription": string, "cameraMovement": string,
    "transition": string, "audio": string, "locked": false,
    "camera": {
      "shotType": string, "lens": string, "cameraHeight": string,
      "cameraAngle": string, "movement": string, "composition": string,
      "emotionalPurpose": string, "editorialPurpose": string, "notes": string
    },
    "lighting": {
      "sceneIntent": string, "visualStrategy": string, "keyLight": string,
      "fillLight": string, "rimLight": string, "colorTemperature": string,
      "contrastRatio": string, "atmosphere": string, "depthSeparation": string,
      "continuityRules": string
    }
  }],
  "qcChecklist": [{ "label": string, "checked": boolean }]
}
Produce 4-8 shots. For EVERY shot, fully populate the camera and lighting
objects using professional cinematography and lighting terminology — never leave
them blank. The Cinematic Director and Lighting Director layers are always active.
Maintain key-light direction and color continuity across shots.
Set every qcChecklist item "checked" to false.
"#;

pub struct GeminiTextProvider {
    api_key: String,
    model: String,
}

impl GeminiTextProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            model: DEFAULT_MODEL.to_string(),
        }
    }
}

impl TextProvider for GeminiTextProvider {
    async fn generate_pack(&self, input: &str) -> Result<PromptPack> {
        let url = format!(
            "{ENDPOINT}/{model}:generateContent?key={key}",
            model = self.model,
            key = self.api_key
        );

        let body = json!({
            "system_instruction": { "parts": [{ "text": SYSTEM_PROMPT }] },
            "contents": [{ "parts": [{ "text": input }] }],
            "generationConfig": {
                "temperature": 0.9,
                "responseMimeType": "application/json"
            }
        });

        let client = reqwest::Client::new();
        let resp = client
            .post(&url)
            .json(&body)
            .send()
            .await
            .context("calling Gemini API")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("Gemini API error {status}: {text}"));
        }

        let v: serde_json::Value = resp.json().await.context("parsing Gemini response")?;

        // Extract the model's text from candidates[0].content.parts[0].text
        let text = v["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or_else(|| anyhow!("unexpected Gemini response shape: {v}"))?;

        let pack: PromptPack =
            serde_json::from_str(text).context("Gemini did not return valid PromptPack JSON")?;
        Ok(pack)
    }
}
