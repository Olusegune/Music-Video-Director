//! Video providers — text-to-video for storyboard shots. Video generation is
//! asynchronous: each provider submits a job then polls until the result is ready,
//! finally downloading the encoded video bytes. The async job loop is encapsulated
//! here so callers get a simple `generate_video(prompt) -> bytes`.
//!
//! NOTE: model ids are constant defaults; verify with each vendor and later expose
//! them in Settings. Image-to-video (using a shot's generated frame) is a follow-up.

use super::VideoProvider;
use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde_json::{json, Value};
use std::time::Duration;
use tokio::time::sleep;

const FAL_MODEL: &str = "fal-ai/ltx-video";
const FAL_I2V_MODEL: &str = "fal-ai/ltx-video/image-to-video"; // image-to-video variant
const VEO_MODEL: &str = "veo-3.0-generate-preview";
const POLL_INTERVAL: Duration = Duration::from_secs(5);
const MAX_POLLS: u32 = 120; // ~10 minutes

fn data_uri(bytes: &[u8]) -> String {
    format!("data:image/png;base64,{}", B64.encode(bytes))
}

/// fal.ai queue API: submit → poll status → fetch result → download.
pub struct FalVideoProvider {
    api_key: String,
}

impl FalVideoProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
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
}

impl VideoProvider for FalVideoProvider {
    async fn generate_video(&self, prompt: &str) -> Result<Vec<u8>> {
        self.run(FAL_MODEL, json!({ "prompt": prompt })).await
    }

    async fn generate_video_ref(&self, prompt: &str, refs: &[Vec<u8>]) -> Result<Vec<u8>> {
        match refs.first() {
            // Drive the clip from the shot's frame (image-to-video).
            Some(img) => {
                self.run(FAL_I2V_MODEL, json!({ "prompt": prompt, "image_url": data_uri(img) }))
                    .await
            }
            None => self.generate_video(prompt).await,
        }
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

        // 1) Submit a long-running operation
        let op: serde_json::Value = client
            .post(format!(
                "{base}/models/{VEO_MODEL}:predictLongRunning?key={}",
                self.api_key
            ))
            .json(&json!({ "instances": [instance] }))
            .send()
            .await
            .context("submitting Veo job")?
            .json()
            .await
            .context("parsing Veo submit response")?;

        let name = op["name"]
            .as_str()
            .ok_or_else(|| anyhow!("Veo submit missing operation name: {op}"))?
            .to_string();

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
