//! WaveSpeed AI — aggregator provider (image + video).
//!
//! WaveSpeed exposes many image/video models behind one async job API:
//!   POST https://api.wavespeed.ai/api/v3/<model>   → { data: { id } }
//!   GET  https://api.wavespeed.ai/api/v3/predictions/<id>/result
//!        → { data: { status, outputs: [url] } }   (status: completed | failed)
//!
//! NOTE: model slugs (e.g. "bytedance/seedance-v1-pro-i2v-720p", "flux-dev") are
//! sensible defaults — confirm against WaveSpeed's current catalog. The adapter
//! is model-agnostic: the slug is passed in from the registry.

use super::{ClipOpts, ImageProvider, VideoProvider};
use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde_json::{json, Value};
use std::time::Duration;
use tokio::time::sleep;

const BASE: &str = "https://api.wavespeed.ai/api/v3";
const DEFAULT_IMAGE: &str = "wavespeed-ai/flux-dev";
const DEFAULT_VIDEO: &str = "bytedance/seedance-2.0/image-to-video";
const POLL_INTERVAL: Duration = Duration::from_secs(3);
const MAX_POLLS: u32 = 120;

async fn run_job(api_key: &str, model: &str, body: Value) -> Result<Vec<u8>> {
    let client = reqwest::Client::new();
    let create: Value = client
        .post(format!("{BASE}/{model}"))
        .header("Authorization", format!("Bearer {api_key}"))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .context("creating WaveSpeed job")?
        .json()
        .await
        .context("parsing WaveSpeed create response")?;

    let id = create["data"]["id"]
        .as_str()
        .or_else(|| create["id"].as_str())
        .ok_or_else(|| anyhow!("WaveSpeed create missing id: {create}"))?
        .to_string();

    for _ in 0..MAX_POLLS {
        sleep(POLL_INTERVAL).await;
        let st: Value = client
            .get(format!("{BASE}/predictions/{id}/result"))
            .header("Authorization", format!("Bearer {api_key}"))
            .send()
            .await
            .context("polling WaveSpeed job")?
            .json()
            .await
            .context("parsing WaveSpeed poll response")?;

        let data = &st["data"];
        let status = data["status"].as_str().unwrap_or("").to_lowercase();
        if status == "completed" || status == "succeeded" {
            let url = data["outputs"][0]
                .as_str()
                .or_else(|| data["output"].as_str())
                .ok_or_else(|| anyhow!("WaveSpeed completed but no output: {st}"))?;
            let bytes = client.get(url).send().await.context("downloading WaveSpeed output")?
                .bytes().await.context("reading WaveSpeed bytes")?;
            return Ok(bytes.to_vec());
        }
        if status == "failed" || status == "error" {
            return Err(anyhow!("WaveSpeed job failed: {st}"));
        }
    }
    Err(anyhow!("WaveSpeed job timed out"))
}

fn data_uri(bytes: &[u8]) -> String {
    format!("data:image/png;base64,{}", B64.encode(bytes))
}

// ----- Image ---------------------------------------------------------------

pub struct WaveSpeedImageProvider {
    api_key: String,
    model: Option<String>,
}

impl WaveSpeedImageProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key, model: None }
    }
    pub fn with_model(mut self, model: Option<String>) -> Self {
        self.model = model.filter(|s| !s.is_empty());
        self
    }
}

impl ImageProvider for WaveSpeedImageProvider {
    async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>> {
        self.generate_image_sized(prompt, 1024, 1024).await
    }
    async fn generate_image_sized(&self, prompt: &str, width: u32, height: u32) -> Result<Vec<u8>> {
        run_job(
            &self.api_key,
            self.model.as_deref().unwrap_or(DEFAULT_IMAGE),
            json!({ "prompt": prompt, "size": format!("{width}*{height}") }),
        )
        .await
    }
    async fn generate_image_ref(&self, prompt: &str, width: u32, height: u32, refs: &[Vec<u8>]) -> Result<Vec<u8>> {
        let mut body = json!({ "prompt": prompt, "size": format!("{width}*{height}") });
        if let Some(img) = refs.first() {
            body["image"] = json!(data_uri(img));
        }
        run_job(&self.api_key, self.model.as_deref().unwrap_or(DEFAULT_IMAGE), body).await
    }
}

// ----- Video ---------------------------------------------------------------

pub struct WaveSpeedVideoProvider {
    api_key: String,
    model: Option<String>,
}

impl WaveSpeedVideoProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key, model: None }
    }
    pub fn with_model(mut self, model: Option<String>) -> Self {
        self.model = model.filter(|s| !s.is_empty());
        self
    }

    /// Image-to-video with an optional end/last frame (Seedance `last_image`).
    pub async fn generate_video_omni(
        &self,
        prompt: &str,
        refs: &[Vec<u8>],
        end_frame: Option<&[u8]>,
        opts: &ClipOpts,
    ) -> Result<Vec<u8>> {
        let model = self.model.as_deref().unwrap_or(DEFAULT_VIDEO);
        // An "image-to-video" model slug requires the "image" field — calling it
        // with no reference just gets "field \"image\" is required" back from
        // WaveSpeed. Fail fast locally with an actionable message instead.
        if refs.is_empty() && model.contains("image-to-video") {
            return Err(anyhow!(
                "{model} needs a reference image, but none was provided. Add a reference or pick a text-to-video model."
            ));
        }
        let mut body = json!({
            "prompt": prompt,
            "aspect_ratio": "16:9",
            "resolution": opts.resolution_or("720p"),
            "duration": opts.duration_or(5),
            "generate_audio": opts.audio_or(true),
        });
        if let Some(img) = refs.first() {
            body["image"] = json!(data_uri(img));
        }
        if let Some(end) = end_frame {
            body["last_image"] = json!(data_uri(end));
        }
        run_job(&self.api_key, model, body).await
    }
}

impl VideoProvider for WaveSpeedVideoProvider {
    async fn generate_video(&self, prompt: &str) -> Result<Vec<u8>> {
        run_job(
            &self.api_key,
            self.model.as_deref().unwrap_or(DEFAULT_VIDEO),
            json!({ "prompt": prompt, "aspect_ratio": "16:9", "resolution": "720p", "duration": 5 }),
        )
        .await
    }
    async fn generate_video_ref(&self, prompt: &str, refs: &[Vec<u8>]) -> Result<Vec<u8>> {
        self.generate_video_omni(prompt, refs, None, &ClipOpts::default()).await
    }
}
