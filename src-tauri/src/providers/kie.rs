//! kie.ai — unified jobs API (createTask → poll recordInfo → download).
//! kie fronts many models (GPT Image, Nano Banana, Veo, Kling, …) behind one
//! job interface, so a single adapter covers them via the `model` field.
//!
//! NOTE: model ids are sensible defaults; expose them in Settings later.

use super::{ClipOpts, ImageProvider, VideoProvider};
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

/// Upload raw bytes to kie's file API and return a public HTTP URL.
/// kie video models accept only hosted URLs — not base64 data-URIs — so any
/// reference (frame, end frame, audio, video) must be uploaded first.
async fn upload_file(api_key: &str, bytes: &[u8], mime: &str, ext: &str) -> Result<String> {
    let client = reqwest::Client::new();
    let data_uri = format!("data:{mime};base64,{}", B64.encode(bytes));
    let resp: Value = client
        .post("https://kieai.redpandaai.co/api/file-base64-upload")
        .header("Authorization", auth(api_key))
        .header("Content-Type", "application/json")
        .json(&json!({
            "base64Data": data_uri,
            "uploadPath": "mv-refs",
            "fileName": format!("ref_{}.{ext}", uuid_like(bytes))
        }))
        .send()
        .await
        .context("uploading reference to kie")?
        .json()
        .await
        .context("parsing kie upload response")?;
    resp["data"]["downloadUrl"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| anyhow!("kie upload missing downloadUrl: {resp}"))
}

/// Convenience: upload an image frame (PNG).
async fn upload_image(api_key: &str, bytes: &[u8]) -> Result<String> {
    upload_file(api_key, bytes, "image/png", "png").await
}

/// Cheap deterministic-ish suffix from the bytes (avoids a uuid dep here).
fn uuid_like(bytes: &[u8]) -> String {
    let n = bytes.len();
    let a = bytes.first().copied().unwrap_or(0);
    let b = bytes.get(n / 2).copied().unwrap_or(0);
    let c = bytes.last().copied().unwrap_or(0);
    format!("{n:x}{a:02x}{b:02x}{c:02x}")
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
    model: Option<String>,
}

impl KieImageProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            model: None,
        }
    }

    /// Route a specific Kie image model by slug (e.g. "google/nano-banana", "gpt-image-1").
    pub fn with_model(mut self, model: Option<String>) -> Self {
        self.model = model.filter(|s| !s.is_empty());
        self
    }
}

impl ImageProvider for KieImageProvider {
    async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>> {
        self.generate_image_sized(prompt, 1536, 864).await
    }

    async fn generate_image_sized(&self, prompt: &str, width: u32, height: u32) -> Result<Vec<u8>> {
        let model = self.model.as_deref().unwrap_or(IMAGE_MODEL);
        // Per-model input shape. Nano Banana takes aspect_ratio + output_format
        // (NOT a resolution field — sending one is rejected). GPT/other image
        // models accept a minimal prompt + aspect_ratio.
        let input = if model.contains("nano-banana") {
            json!({
                "prompt": prompt,
                "aspect_ratio": kie_aspect(width, height),
                "output_format": "png"
            })
        } else {
            json!({
                "prompt": prompt,
                "aspect_ratio": kie_aspect(width, height)
            })
        };
        run_job(&self.api_key, model, input).await
    }
}

// ----- Video -------------------------------------------------------------

pub struct KieVideoProvider {
    api_key: String,
    /** Model slug to route (e.g. "bytedance/seedance-v1-pro"); falls back to Veo. */
    model: Option<String>,
}

impl KieVideoProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            model: None,
        }
    }

    /// Route a specific Kie model (Seedance / Kling / Veo …) by slug.
    pub fn with_model(mut self, model: Option<String>) -> Self {
        self.model = model.filter(|s| !s.is_empty());
        self
    }

    fn model_slug(&self) -> &str {
        self.model.as_deref().unwrap_or(VIDEO_MODEL)
    }

    /// Full multimodal generation: start frame + extra image references + an
    /// optional end frame + audio references + video references. Each is uploaded
    /// to a hosted URL and mapped to the right field for the model family.
    /// Seedance supports the full omni set; Kling takes first/last frame only.
    pub async fn generate_video_omni(
        &self,
        prompt: &str,
        image_refs: &[Vec<u8>],
        end_frame: Option<&[u8]>,
        audio_refs: &[Vec<u8>],
        video_refs: &[Vec<u8>],
        opts: &ClipOpts,
    ) -> Result<Vec<u8>> {
        let model = self.model_slug();
        let duration = opts.duration_or(5);
        let resolution = opts.resolution_or("720p").to_string();
        let audio = opts.audio_or(true);
        // Upload all image refs (refs[0] = start frame, rest = reference images).
        let mut img_urls: Vec<String> = Vec::new();
        for img in image_refs.iter().take(10) {
            img_urls.push(upload_image(&self.api_key, img).await?);
        }
        let frame_url = img_urls.first().cloned();
        let extra_refs: Vec<String> = img_urls.iter().skip(1).take(9).cloned().collect();

        let end_url = match end_frame {
            Some(b) => Some(upload_image(&self.api_key, b).await?),
            None => None,
        };
        let mut audio_urls: Vec<String> = Vec::new();
        for a in audio_refs.iter().take(3) {
            audio_urls.push(upload_file(&self.api_key, a, "audio/mpeg", "mp3").await?);
        }
        let mut video_urls: Vec<String> = Vec::new();
        for v in video_refs.iter().take(3) {
            video_urls.push(upload_file(&self.api_key, v, "video/mp4", "mp4").await?);
        }

        let input = if model.contains("kling-3") {
            // Kling 3.0 requires aspect_ratio, mode, multi_shots, multi_prompt.
            // image_urls carries first (and optional last) frame.
            let mut frames: Vec<String> = Vec::new();
            if let Some(u) = frame_url.clone() {
                frames.push(u);
            }
            if let Some(u) = end_url.clone() {
                frames.push(u);
            }
            let mut v = json!({
                "prompt": prompt,
                "sound": audio,
                "duration": duration.to_string(),
                "aspect_ratio": "16:9",
                "mode": "pro",
                "multi_shots": false,
                "multi_prompt": []
            });
            if !frames.is_empty() {
                v["image_urls"] = json!(frames);
            }
            v
        } else if model.contains("kling") {
            // Kling 2.6 i2v REQUIRES image_urls (first, optional last frame).
            let url = frame_url.ok_or_else(|| {
                anyhow!("Kling needs a start frame — generate the shot's frame first.")
            })?;
            let mut frames = vec![url];
            if let Some(u) = end_url.clone() {
                frames.push(u);
            }
            json!({
                "prompt": prompt,
                "image_urls": frames,
                "sound": audio,
                "duration": duration.to_string()
            })
        } else {
            // Seedance family — full omni reference support.
            let mut v = json!({
                "prompt": prompt,
                "aspect_ratio": "16:9",
                "resolution": resolution,
                "duration": duration,
                "generate_audio": audio
            });
            if let Some(url) = frame_url {
                v["first_frame_url"] = json!(url);
            }
            if let Some(url) = end_url {
                v["last_frame_url"] = json!(url);
            }
            if !extra_refs.is_empty() {
                v["reference_image_urls"] = json!(extra_refs);
            }
            if !audio_urls.is_empty() {
                v["reference_audio_urls"] = json!(audio_urls);
            }
            if !video_urls.is_empty() {
                v["reference_video_urls"] = json!(video_urls);
            }
            v
        };
        run_job(&self.api_key, model, input).await
    }
}

impl VideoProvider for KieVideoProvider {
    async fn generate_video(&self, prompt: &str) -> Result<Vec<u8>> {
        run_job(
            &self.api_key,
            self.model_slug(),
            json!({
                "prompt": prompt,
                "aspect_ratio": "16:9",
                "resolution": "720p",
                "duration": 5,
                "generate_audio": true
            }),
        )
        .await
    }

    async fn generate_video_ref(&self, prompt: &str, refs: &[Vec<u8>]) -> Result<Vec<u8>> {
        self.generate_video_omni(prompt, refs, None, &[], &[], &ClipOpts::default())
            .await
    }
}
