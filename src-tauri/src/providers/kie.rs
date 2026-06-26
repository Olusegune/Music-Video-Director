//! kie.ai — unified jobs API (createTask → poll recordInfo → download).
//! kie fronts many models (GPT Image, Nano Banana, Veo, Kling, …) behind one
//! job interface, so a single adapter covers them via the `model` field.
//!
//! NOTE: model ids are sensible defaults; expose them in Settings later.

use super::{ImageProvider, VideoProvider};
use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde_json::{json, Value};
use std::time::Duration;
use tokio::time::sleep;

const CREATE_URL: &str = "https://api.kie.ai/api/v1/jobs/createTask";
const QUERY_URL: &str = "https://api.kie.ai/api/v1/jobs/recordInfo";
const IMAGE_MODEL: &str = "gpt-image-2-text-to-image";
const VIDEO_MODEL: &str = "veo3-fast"; // verify current id; kie also offers kling/runway models
const POLL_INTERVAL: Duration = Duration::from_secs(3);
const MAX_POLLS: u32 = 120; // ~6 minutes (video can be slow)

fn auth(api_key: &str) -> String {
    format!("Bearer {api_key}")
}

/// Map a requested w/h to a kie aspect-ratio token.
fn kie_aspect(width: u32, height: u32) -> &'static str {
    if width == 0 || height == 0 {
        return "1:1";
    }
    let r = width as f32 / height as f32;
    let table = [
        (16.0 / 9.0, "16:9"),
        (4.0 / 3.0, "4:3"),
        (1.0, "1:1"),
        (3.0 / 4.0, "3:4"),
        (9.0 / 16.0, "9:16"),
    ];
    table
        .iter()
        .min_by(|a, b| (a.0 - r).abs().partial_cmp(&(b.0 - r).abs()).unwrap())
        .map(|(_, s)| *s)
        .unwrap_or("16:9")
}

/// Run a kie job to completion and return the downloaded result bytes.
async fn run_job(api_key: &str, model: &str, input: Value) -> Result<Vec<u8>> {
    let client = reqwest::Client::new();

    // 1) Create the task.
    let create: Value = client
        .post(CREATE_URL)
        .header("Authorization", auth(api_key))
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&json!({ "model": model, "input": input }))
        .send()
        .await
        .context("creating kie.ai task")?
        .json()
        .await
        .context("parsing kie.ai create response")?;

    if create["code"].as_i64().unwrap_or(0) != 200 {
        return Err(anyhow!("kie.ai create error: {create}"));
    }
    let task_id = create["data"]["taskId"]
        .as_str()
        .ok_or_else(|| anyhow!("kie.ai create missing taskId: {create}"))?
        .to_string();

    // 2) Poll until the task succeeds or fails.
    for _ in 0..MAX_POLLS {
        sleep(POLL_INTERVAL).await;
        let st: Value = client
            .get(QUERY_URL)
            .query(&[("taskId", task_id.as_str())])
            .header("Authorization", auth(api_key))
            .send()
            .await
            .context("polling kie.ai task")?
            .json()
            .await
            .context("parsing kie.ai poll response")?;

        let data = &st["data"];
        let state = data["state"].as_str().unwrap_or("").to_lowercase();
        let flag = data["successFlag"].as_i64();

        if state == "success" || flag == Some(1) {
            if let Some(url) = extract_url(data) {
                let bytes = client
                    .get(&url)
                    .send()
                    .await
                    .context("downloading kie.ai result")?
                    .bytes()
                    .await
                    .context("reading kie.ai result bytes")?;
                return Ok(bytes.to_vec());
            }
            return Err(anyhow!("kie.ai succeeded but no result url: {st}"));
        }
        if state == "fail" || flag == Some(2) || flag == Some(3) {
            return Err(anyhow!("kie.ai task failed: {st}"));
        }
    }
    Err(anyhow!("kie.ai task timed out"))
}

/// kie returns result URLs in a few shapes depending on the model; try them all.
fn extract_url(data: &Value) -> Option<String> {
    if let Some(u) = data["resultUrls"][0].as_str() {
        return Some(u.to_string());
    }
    if let Some(u) = data["response"]["resultUrls"][0].as_str() {
        return Some(u.to_string());
    }
    // resultJson is a stringified JSON blob carrying resultUrls.
    if let Some(s) = data["resultJson"].as_str() {
        if let Ok(parsed) = serde_json::from_str::<Value>(s) {
            if let Some(u) = parsed["resultUrls"][0].as_str() {
                return Some(u.to_string());
            }
        }
    }
    None
}

// ----- Image -------------------------------------------------------------

pub struct KieImageProvider {
    api_key: String,
}

impl KieImageProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

impl ImageProvider for KieImageProvider {
    async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>> {
        self.generate_image_sized(prompt, 1536, 864).await
    }

    async fn generate_image_sized(&self, prompt: &str, width: u32, height: u32) -> Result<Vec<u8>> {
        let resolution = if width.max(height) >= 1536 { "2K" } else { "1K" };
        run_job(
            &self.api_key,
            IMAGE_MODEL,
            json!({
                "prompt": prompt,
                "aspect_ratio": kie_aspect(width, height),
                "resolution": resolution
            }),
        )
        .await
    }
}

// ----- Video -------------------------------------------------------------

pub struct KieVideoProvider {
    api_key: String,
}

impl KieVideoProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

impl VideoProvider for KieVideoProvider {
    async fn generate_video(&self, prompt: &str) -> Result<Vec<u8>> {
        run_job(
            &self.api_key,
            VIDEO_MODEL,
            json!({ "prompt": prompt, "aspect_ratio": "16:9" }),
        )
        .await
    }

    async fn generate_video_ref(&self, prompt: &str, refs: &[Vec<u8>]) -> Result<Vec<u8>> {
        let mut input = json!({ "prompt": prompt, "aspect_ratio": "16:9" });
        if let Some(img) = refs.first() {
            // kie image-to-video: pass the frame as a data-URI image input.
            input["image_urls"] = json!([format!("data:image/png;base64,{}", B64.encode(img))]);
        }
        run_job(&self.api_key, VIDEO_MODEL, input).await
    }
}
