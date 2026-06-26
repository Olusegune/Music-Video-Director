//! Audio providers — render real voiceover from the Audio Director's script.
//! ElevenLabs text-to-speech returns MP3 bytes directly (no job polling).
//!
//! NOTE: voice/model ids are sensible defaults; expose them in Settings later.

use super::AudioProvider;
use anyhow::{anyhow, Context, Result};
use serde_json::json;

const DEFAULT_VOICE: &str = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — a safe default
const TTS_MODEL: &str = "eleven_multilingual_v2";

/// ElevenLabs TTS. Returns MP3 audio bytes.
pub struct ElevenLabsProvider {
    api_key: String,
}

impl ElevenLabsProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

impl AudioProvider for ElevenLabsProvider {
    async fn generate_speech(&self, text: &str, voice: Option<&str>) -> Result<Vec<u8>> {
        let voice_id = voice.filter(|v| !v.is_empty()).unwrap_or(DEFAULT_VOICE);
        let client = reqwest::Client::new();
        let resp = client
            .post(format!(
                "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            ))
            .header("xi-api-key", &self.api_key)
            .header("accept", "audio/mpeg")
            .json(&json!({
                "text": text,
                "model_id": TTS_MODEL,
                "voice_settings": { "stability": 0.5, "similarity_boost": 0.75 }
            }))
            .send()
            .await
            .context("calling ElevenLabs")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(anyhow!("ElevenLabs error {status}: {body}"));
        }

        let bytes = resp.bytes().await.context("reading ElevenLabs audio")?;
        Ok(bytes.to_vec())
    }
}
