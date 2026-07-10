//! Replicate — a single, uniform adapter that runs many vendors' models through
//! the Replicate predictions API (create → poll → download). This is how we cover
//! the long tail of image/video models (Flux, Kling, Luma, Minimax, etc.) without
//! a bespoke adapter per vendor: just point it at a model slug.
//!
//! NOTE: model slugs are sensible defaults; expose them in Settings later so the
//! user can pick any Replicate model (e.g. kwaivgi/kling-v1.6-pro, luma/ray).

use super::{ImageProvider, VideoProvider};
use anyhow::{anyhow, Context, Result};
use serde_json::{json, Value};
use std::time::Duration;
use tokio::time::sleep;

const IMAGE_MODEL: &str = "black-forest-labs/flux-schnell";
const VIDEO_MODEL: &str = "minimax/video-01";
const POLL_INTERVAL: Duration = Duration::from_secs(3);
const MAX_POLLS: u32 = 200; // ~10 minutes

pub struct ReplicateProvider {
    api_key: String,
}

impl ReplicateProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }

    fn auth(&self) -> String {
        format!("Bearer {}", self.api_key)
    }

    /// Create a prediction for an official model and poll it to completion,
    /// returning the raw `output` JSON value.
    async fn run(&self, model: &str, input: Value) -> Result<Value> {
        let client = reqwest::Client::new();

        let create: Value = client
            .post(format!(
                "https://api.replicate.com/v1/models/{model}/predictions"
            ))
            .header("Authorization", self.auth())
            .header("Content-Type", "application/json")
            .json(&json!({ "input": input }))
            .send()
            .await
            .context("creating Replicate prediction")?
            .json()
            .await
            .context("parsing Replicate create response")?;

        if let Some(detail) = create.get("detail").and_then(|d| d.as_str()) {
            return Err(anyhow!("Replicate error: {detail}"));
        }

        let get_url = create["urls"]["get"]
            .as_str()
            .ok_or_else(|| anyhow!("Replicate response missing urls.get: {create}"))?
            .to_string();

        for _ in 0..MAX_POLLS {
            let st: Value = client
                .get(&get_url)
                .header("Authorization", self.auth())
                .send()
                .await
                .context("polling Replicate prediction")?
                .json()
                .await
                .context("parsing Replicate poll response")?;

            match st["status"].as_str().unwrap_or("") {
                "succeeded" => return Ok(st["output"].clone()),
                "failed" | "canceled" => {
                    return Err(anyhow!(
                        "Replicate prediction {}: {}",
                        st["status"],
                        st.get("error").cloned().unwrap_or(Value::Null)
                    ))
                }
                _ => sleep(POLL_INTERVAL).await, // starting / processing
            }
        }
        Err(anyhow!("Replicate prediction timed out"))
    }

    async fn download(&self, url: &str) -> Result<Vec<u8>> {
        let bytes = reqwest::Client::new()
            .get(url)
            .send()
            .await
            .context("downloading Replicate output")?
            .bytes()
            .await
            .context("reading Replicate output bytes")?;
        Ok(bytes.to_vec())
    }
}

/// Replicate outputs can be a bare URL string, an array of URLs, or an object
/// carrying a `url`. Pull the first usable URL out.
fn first_url(output: &Value) -> Option<String> {
    match output {
        Value::String(s) => Some(s.clone()),
        Value::Array(a) => a.iter().find_map(|v| v.as_str().map(String::from)),
        Value::Object(o) => o.get("url").and_then(|v| v.as_str()).map(String::from),
        _ => None,
    }
}

impl ImageProvider for ReplicateProvider {
    async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>> {
        let out = self
            .run(
                IMAGE_MODEL,
                json!({ "prompt": prompt, "aspect_ratio": "16:9" }),
            )
            .await?;
        let url =
            first_url(&out).ok_or_else(|| anyhow!("Replicate image output had no url: {out}"))?;
        self.download(&url).await
    }
}

impl VideoProvider for ReplicateProvider {
    async fn generate_video(&self, prompt: &str) -> Result<Vec<u8>> {
        let out = self.run(VIDEO_MODEL, json!({ "prompt": prompt })).await?;
        let url =
            first_url(&out).ok_or_else(|| anyhow!("Replicate video output had no url: {out}"))?;
        self.download(&url).await
    }
}
