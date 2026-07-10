//! Video providers — text-to-video for storyboard shots. Video generation is
//! asynchronous: each provider submits a job then polls until the result is ready,
//! finally downloading the encoded video bytes. The async job loop is encapsulated
//! here so callers get a simple `generate_video(prompt) -> bytes`.
//!
//! NOTE: model ids are constant defaults; verify with each vendor and later expose
//! them in Settings. Image-to-video (using a shot's generated frame) is a follow-up.

use super::{ClipOpts, VideoProvider};
use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde_json::{json, Value};
use std::time::Duration;
use tokio::time::sleep;

// Default fal video models — Seedance 2.0 (cinematic + synchronized audio),
// not the old/cheap LTX. Overridable per-shot via `with_model`.
// ByteDance models on fal live under the `bytedance/` owner (no `fal-ai/` prefix).
const FAL_MODEL: &str = "bytedance/seedance-2.0/text-to-video";
const FAL_I2V_MODEL: &str = "bytedance/seedance-2.0/image-to-video";
/// Veo model ids tried in order (GA first, then preview, then older) — the one
/// available on the user's key wins. The long-running poll is model-agnostic.
const VEO_MODELS: [&str; 4] = [
    "veo-3.1-generate-preview",
    "veo-3.0-generate-001",
    "veo-3.0-generate-preview",
    "veo-2.0-generate-001",
];
const POLL_INTERVAL: Duration = Duration::from_secs(5);
const MAX_POLLS: u32 = 120; // ~10 minutes

fn data_uri(bytes: &[u8]) -> String {
    format!("data:image/png;base64,{}", B64.encode(bytes))
}

/// fal.ai queue API: submit → poll status → fetch result → download.
pub struct FalVideoProvider {
    api_key: String,
    /** fal model path (e.g. "fal-ai/kling-video/v1.6/pro/image-to-video"). */
    model: Option<String>,
}

impl FalVideoProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            model: None,
        }
    }
    /// Route a specific fal model path (Seedance / Kling …) instead of the default.
    pub fn with_model(mut self, model: Option<String>) -> Self {
        self.model = model.filter(|s| !s.is_empty());
        self
    }
    fn auth(&self) -> String {
        format!("Key {}", self.api_key)
    }

    /// Submit a job to `model` with `body`, poll to completion, download the video.
    async fn run(&self, model: &str, body: Value) -> Result<Vec<u8>> {
        let client = reqwest::Client::new();

        // 1) Submit
        let submit: serde_json::Value = client
            .post(format!("https://queue.fal.run/{model}"))
            .header("Authorization", self.auth())
            .json(&body)
            .send()
            .await
            .context("submitting fal.ai video job")?
            .json()
            .await
            .context("parsing fal.ai submit response")?;

        let status_url = submit["status_url"]
            .as_str()
            .ok_or_else(|| anyhow!("fal.ai submit missing status_url: {submit}"))?;
        let response_url = submit["response_url"]
            .as_str()
            .ok_or_else(|| anyhow!("fal.ai submit missing response_url: {submit}"))?;

        // 2) Poll
        let mut completed = false;
        for _ in 0..MAX_POLLS {
            sleep(POLL_INTERVAL).await;
            let st: serde_json::Value = client
                .get(status_url)
                .header("Authorization", self.auth())
                .send()
                .await
                .context("polling fal.ai status")?
                .json()
                .await
                .context("parsing fal.ai status")?;
            match st["status"].as_str().unwrap_or("") {
                "COMPLETED" => {
                    completed = true;
                    break;
                }
                "FAILED" | "ERROR" => return Err(anyhow!("fal.ai job failed: {st}")),
                _ => continue, // IN_QUEUE / IN_PROGRESS
            }
        }
        if !completed {
            return Err(anyhow!("fal.ai video job timed out"));
        }

        // 3) Result → video URL
        let result: serde_json::Value = client
            .get(response_url)
            .header("Authorization", self.auth())
            .send()
            .await
            .context("fetching fal.ai result")?
            .json()
            .await
            .context("parsing fal.ai result")?;

        let url = result["video"]["url"]
            .as_str()
            .or_else(|| result["video_url"].as_str())
            .or_else(|| result["url"].as_str())
            .ok_or_else(|| anyhow!("fal.ai result missing video url: {result}"))?;

        // 4) Download
        let bytes = client
            .get(url)
            .send()
            .await
            .context("downloading fal.ai video")?
            .bytes()
            .await
            .context("reading fal.ai video bytes")?;
        Ok(bytes.to_vec())
    }

    /// Image-to-video with an optional end/last frame (Seedance 2.0 supports
    /// start→end interpolation via `end_image_url`).
    pub async fn generate_video_omni(
        &self,
        prompt: &str,
        refs: &[Vec<u8>],
        end_frame: Option<&[u8]>,
        opts: &ClipOpts,
    ) -> Result<Vec<u8>> {
        match refs.first() {
            Some(img) => {
                let model = self.model.as_deref().unwrap_or(FAL_I2V_MODEL);
                let mut body = json!({
                    "prompt": prompt,
                    "image_url": data_uri(img),
                    "duration": opts.duration_or(5),
                    "resolution": opts.resolution_or("720p"),
                });
                if let Some(end) = end_frame {
                    body["end_image_url"] = json!(data_uri(end));
                }
                self.run(model, body).await
            }
            // An "image-to-video" model slug requires image_url — calling it with
            // no reference just gets a 422 from fal ("image_url: Field required").
            // Fail fast locally with an actionable message instead.
            None if self.model.as_deref().unwrap_or("").contains("image-to-video") => {
                Err(anyhow!(
                    "{} needs a reference image, but none was provided. Add a reference or pick a text-to-video model.",
                    self.model.as_deref().unwrap_or(FAL_I2V_MODEL)
                ))
            }
            None => self.generate_video(prompt).await,
        }
    }
}

impl VideoProvider for FalVideoProvider {
    async fn generate_video(&self, prompt: &str) -> Result<Vec<u8>> {
        let model = self.model.as_deref().unwrap_or(FAL_MODEL);
        self.run(model, json!({ "prompt": prompt })).await
    }

    async fn generate_video_ref(&self, prompt: &str, refs: &[Vec<u8>]) -> Result<Vec<u8>> {
        self.generate_video_omni(prompt, refs, None, &ClipOpts::default())
            .await
    }
}

/// Google Veo via the Generative Language long-running operations API.
/// Best-effort — confirm the model id and response shape before production use.
pub struct GoogleVeoProvider {
    api_key: String,
}

impl GoogleVeoProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }

    /// Submit a Veo long-running op with the given instance, poll, download.
    async fn run(&self, instance: Value) -> Result<Vec<u8>> {
        let client = reqwest::Client::new();
        let base = "https://generativelanguage.googleapis.com/v1beta";

        // 1) Submit a long-running operation — try each Veo model id until one
        // is accepted on this key (returns an operation name).
        let mut name = String::new();
        let mut last: serde_json::Value = serde_json::Value::Null;
        for model in VEO_MODELS {
            let op: serde_json::Value = client
                .post(format!(
                    "{base}/models/{model}:predictLongRunning?key={}",
                    self.api_key
                ))
                .json(&json!({ "instances": [instance] }))
                .send()
                .await
                .context("submitting Veo job")?
                .json()
                .await
                .context("parsing Veo submit response")?;
            if let Some(n) = op["name"].as_str() {
                name = n.to_string();
                break;
            }
            last = op;
        }
        if name.is_empty() {
            return Err(anyhow!(
                "Veo submit failed for all model ids ({}): {last}",
                VEO_MODELS.join(", ")
            ));
        }

        // 2) Poll the operation
        let mut result = serde_json::Value::Null;
        let mut done = false;
        for _ in 0..MAX_POLLS {
            sleep(POLL_INTERVAL).await;
            let status: serde_json::Value = client
                .get(format!("{base}/{name}?key={}", self.api_key))
                .send()
                .await
                .context("polling Veo operation")?
                .json()
                .await
                .context("parsing Veo operation")?;
            if status["done"].as_bool().unwrap_or(false) {
                if let Some(err) = status.get("error").filter(|e| !e.is_null()) {
                    return Err(anyhow!("Veo job failed: {err}"));
                }
                result = status["response"].clone();
                done = true;
                break;
            }
        }
        if !done {
            return Err(anyhow!("Veo video job timed out"));
        }

        // 3) Extract the video file URI and download it (key appended).
        let uri = result["generateVideoResponse"]["generatedSamples"][0]["video"]["uri"]
            .as_str()
            .or_else(|| result["generatedSamples"][0]["video"]["uri"].as_str())
            .ok_or_else(|| anyhow!("Veo result missing video uri: {result}"))?;

        let sep = if uri.contains('?') { '&' } else { '?' };
        let bytes = client
            .get(format!("{uri}{sep}key={}", self.api_key))
            .send()
            .await
            .context("downloading Veo video")?
            .bytes()
            .await
            .context("reading Veo video bytes")?;
        Ok(bytes.to_vec())
    }
}

impl VideoProvider for GoogleVeoProvider {
    async fn generate_video(&self, prompt: &str) -> Result<Vec<u8>> {
        self.run(json!({ "prompt": prompt })).await
    }

    async fn generate_video_ref(&self, prompt: &str, refs: &[Vec<u8>]) -> Result<Vec<u8>> {
        match refs.first() {
            // Veo image-to-video: seed the first frame.
            Some(img) => {
                self.run(json!({
                    "prompt": prompt,
                    "image": { "bytesBase64Encoded": B64.encode(img), "mimeType": "image/png" }
                }))
                .await
            }
            None => self.generate_video(prompt).await,
        }
    }
}
