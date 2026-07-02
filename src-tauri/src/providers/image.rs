//! Image providers — generate storyboard frames. Each returns raw PNG/JPEG bytes
//! so the caller can persist them uniformly to the assets directory.
//!
//! NOTE: model ids are constant defaults; verify current ids with each vendor and
//! later expose them in Settings.

use super::ImageProvider;
use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use serde_json::json;

const FAL_MODEL: &str = "fal-ai/flux/schnell";
const IMAGEN_MODEL: &str = "imagen-3.0-generate-002";
/// Gemini "Nano Banana" image generation via generateContent (supports
/// reference images). GA id first, with the older preview id as a fallback.
const GEMINI_IMAGE_MODELS: [&str; 2] = ["gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"];
const OPENAI_IMAGE_MODEL: &str = "gpt-image-1";
const STABILITY_ENGINE: &str = "stable-diffusion-xl-1024-v1-0";

/// Map a requested w/h to the nearest Imagen/Gemini aspect-ratio token.
fn imagen_aspect(width: u32, height: u32) -> &'static str {
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
        .map(|t| t.1)
        .unwrap_or("1:1")
}

/// Map a requested w/h to an OpenAI gpt-image-1 allowed size.
fn openai_size(width: u32, height: u32) -> &'static str {
    if width > height {
        "1536x1024"
    } else if height > width {
        "1024x1536"
    } else {
        "1024x1024"
    }
}

/// dall-e-3 allows a different fixed set of sizes than gpt-image-1.
fn dalle3_size(width: u32, height: u32) -> &'static str {
    if width > height {
        "1792x1024"
    } else if height > width {
        "1024x1792"
    } else {
        "1024x1024"
    }
}

/// SDXL v1 only allows a fixed set of dimensions; pick the closest by ratio.
fn sdxl_size(width: u32, height: u32) -> (u32, u32) {
    let allowed = [
        (1024, 1024),
        (1152, 896),
        (1216, 832),
        (1344, 768),
        (1536, 640),
        (896, 1152),
        (832, 1216),
        (768, 1344),
        (640, 1536),
    ];
    let r = if height == 0 { 1.0 } else { width as f32 / height as f32 };
    *allowed
        .iter()
        .min_by(|a, b| {
            let ra = a.0 as f32 / a.1 as f32;
            let rb = b.0 as f32 / b.1 as f32;
            (ra - r).abs().partial_cmp(&(rb - r).abs()).unwrap()
        })
        .unwrap()
}

/// Map a requested w/h to the nearest fal "image_size" preset enum used by
/// models like Recraft / Ideogram that take a preset string, not a {w,h} object.
fn fal_size_preset(width: u32, height: u32) -> &'static str {
    if height == 0 || width == height {
        return "square_hd";
    }
    let r = width as f32 / height as f32;
    if r >= 1.55 {
        "landscape_16_9"
    } else if r >= 1.15 {
        "landscape_4_3"
    } else if r <= 0.64 {
        "portrait_16_9"
    } else {
        "portrait_4_3"
    }
}

/// Map a requested w/h to a fal `aspect_ratio` token (Flux Pro Ultra etc.).
fn fal_aspect(width: u32, height: u32) -> &'static str {
    if width == 0 || height == 0 {
        return "1:1";
    }
    let r = width as f32 / height as f32;
    let table = [
        (21.0 / 9.0, "21:9"),
        (16.0 / 9.0, "16:9"),
        (4.0 / 3.0, "4:3"),
        (1.0, "1:1"),
        (3.0 / 4.0, "3:4"),
        (9.0 / 16.0, "9:16"),
    ];
    table
        .iter()
        .min_by(|a, b| (a.0 - r).abs().partial_cmp(&(b.0 - r).abs()).unwrap())
        .map(|t| t.1)
        .unwrap_or("1:1")
}

/// fal.ai — synchronous run endpoint. Returns a hosted image URL we then fetch.
/// Model-agnostic: the slug picks which fal image model runs, and the request
/// body is shaped to that model family's expected size parameter.
pub struct FalImageProvider {
    api_key: String,
    seed: Option<i64>,
    model: Option<String>,
}

impl FalImageProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key, seed: None, model: None }
    }
    pub fn with_seed(mut self, seed: Option<i64>) -> Self {
        self.seed = seed;
        self
    }
    /// Route a specific fal image model (e.g. "fal-ai/flux-pro/v1.1-ultra").
    pub fn with_model(mut self, model: Option<String>) -> Self {
        self.model = model.filter(|s| !s.is_empty());
        self
    }
}

impl ImageProvider for FalImageProvider {
    async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>> {
        self.generate_image_sized(prompt, 1280, 720).await
    }

    async fn generate_image_sized(&self, prompt: &str, width: u32, height: u32) -> Result<Vec<u8>> {
        let model = self.model.as_deref().unwrap_or(FAL_MODEL);
        let w = width.clamp(256, 1536);
        let h = height.clamp(256, 1536);
        let client = reqwest::Client::new();

        // Shape the size parameter to the model family:
        //  - Ultra / Kontext families take an `aspect_ratio` string.
        //  - Recraft / Ideogram take an `image_size` preset enum string.
        //  - Flux dev/schnell/pro + Stable Diffusion take an {width,height} object.
        let mut body = json!({ "prompt": prompt, "num_images": 1 });
        if model.contains("ultra") || model.contains("kontext") {
            body["aspect_ratio"] = json!(fal_aspect(width, height));
        } else if model.contains("recraft") || model.contains("ideogram") {
            body["image_size"] = json!(fal_size_preset(width, height));
        } else {
            body["image_size"] = json!({ "width": w, "height": h });
        }
        if let Some(s) = self.seed {
            body["seed"] = json!(s);
        }
        let resp = client
            .post(format!("https://fal.run/{model}"))
            .header("Authorization", format!("Key {}", self.api_key))
            .json(&body)
            .send()
            .await
            .context("calling fal.ai")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("fal.ai error {status}: {text}"));
        }

        let v: serde_json::Value = resp.json().await.context("parsing fal.ai response")?;
        // fal returns images under `images` (most models) or `image` (a few).
        let url = v["images"][0]["url"]
            .as_str()
            .or_else(|| v["image"]["url"].as_str())
            .ok_or_else(|| anyhow!("unexpected fal.ai response: {v}"))?;

        let bytes = client
            .get(url)
            .send()
            .await
            .context("downloading fal.ai image")?
            .bytes()
            .await
            .context("reading fal.ai image bytes")?;
        Ok(bytes.to_vec())
    }
}

/// Google Imagen via the Generative Language API `:predict` endpoint.
/// Returns base64-encoded image bytes.
pub struct GoogleImagenProvider {
    api_key: String,
}

impl GoogleImagenProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }

    /// Imagen text-to-image via :predict (no reference-image support).
    async fn imagen(&self, prompt: &str, width: u32, height: u32) -> Result<Vec<u8>> {
        let aspect = imagen_aspect(width, height);
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{IMAGEN_MODEL}:predict?key={}",
            self.api_key
        );
        let resp = reqwest::Client::new()
            .post(&url)
            .json(&json!({
                "instances": [{ "prompt": prompt }],
                "parameters": { "sampleCount": 1, "aspectRatio": aspect }
            }))
            .send()
            .await
            .context("calling Imagen")?;
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("Imagen error {status}: {text}"));
        }
        let v: serde_json::Value = resp.json().await.context("parsing Imagen response")?;
        let b64 = v["predictions"][0]["bytesBase64Encoded"]
            .as_str()
            .ok_or_else(|| anyhow!("unexpected Imagen response: {v}"))?;
        B64.decode(b64).context("decoding Imagen image")
    }

    /// Gemini "Nano Banana" via :generateContent — supports reference images as
    /// inline_data parts, so character/prop refs guide the output.
    async fn nano_banana(
        &self,
        prompt: &str,
        width: u32,
        height: u32,
        refs: &[Vec<u8>],
    ) -> Result<Vec<u8>> {
        let mut last_err = anyhow!("no Gemini image model attempted");
        // Try the GA id first, then the legacy preview id — the preview suffix
        // is being retired, so older keys/endpoints differ.
        for model in GEMINI_IMAGE_MODELS {
            match self.nano_banana_with(model, prompt, width, height, refs).await {
                Ok(bytes) => return Ok(bytes),
                Err(e) => last_err = e,
            }
        }
        Err(last_err)
    }

    async fn nano_banana_with(
        &self,
        model: &str,
        prompt: &str,
        width: u32,
        height: u32,
        refs: &[Vec<u8>],
    ) -> Result<Vec<u8>> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={}",
            self.api_key
        );
        let mut parts: Vec<serde_json::Value> = refs
            .iter()
            .map(|b| json!({ "inline_data": { "mime_type": "image/png", "data": B64.encode(b) } }))
            .collect();
        parts.push(json!({
            "text": format!("{prompt} Aspect ratio {}.", imagen_aspect(width, height))
        }));

        let resp = reqwest::Client::new()
            .post(&url)
            .json(&json!({
                "contents": [{ "parts": parts }],
                "generationConfig": { "responseModalities": ["TEXT", "IMAGE"] }
            }))
            .send()
            .await
            .context("calling Gemini image")?;
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("Gemini image error {status} ({model}): {text}"));
        }
        let v: serde_json::Value = resp.json().await.context("parsing Gemini image response")?;
        let parts = v["candidates"][0]["content"]["parts"]
            .as_array()
            .ok_or_else(|| anyhow!("unexpected Gemini image response: {v}"))?;
        for p in parts {
            if let Some(b64) = p["inline_data"]["data"]
                .as_str()
                .or_else(|| p["inlineData"]["data"].as_str())
            {
                return B64.decode(b64).context("decoding Gemini image");
            }
        }
        Err(anyhow!("Gemini returned no image: {v}"))
    }
}

impl ImageProvider for GoogleImagenProvider {
    async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>> {
        self.generate_image_sized(prompt, 1280, 720).await
    }

    async fn generate_image_sized(&self, prompt: &str, width: u32, height: u32) -> Result<Vec<u8>> {
        self.generate_image_ref(prompt, width, height, &[]).await
    }

    async fn generate_image_ref(
        &self,
        prompt: &str,
        width: u32,
        height: u32,
        refs: &[Vec<u8>],
    ) -> Result<Vec<u8>> {
        // Prefer Nano Banana (works with refs + most keys); fall back to Imagen
        // for text-only when Nano Banana is unavailable on this key.
        match self.nano_banana(prompt, width, height, refs).await {
            Ok(bytes) => Ok(bytes),
            Err(e) if refs.is_empty() => self.imagen(prompt, width, height).await.map_err(|e2| {
                anyhow!("Gemini image failed ({e}); Imagen fallback also failed ({e2})")
            }),
            Err(e) => Err(e),
        }
    }
}

/// OpenAI image generation (gpt-image-1). Returns base64 image bytes.
pub struct OpenAiImageProvider {
    api_key: String,
}

impl OpenAiImageProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }

    /// One images/generations call for a given model + size. dall-e-3 needs an
    /// explicit response_format; gpt-image-1 rejects it (returns b64 by default).
    async fn generate_with(
        &self,
        model: &str,
        size: &str,
        prompt: &str,
    ) -> Result<Vec<u8>> {
        let mut body = json!({ "model": model, "prompt": prompt, "size": size, "n": 1 });
        if model == "dall-e-3" {
            body["response_format"] = json!("b64_json");
        }
        let client = reqwest::Client::new();
        let resp = client
            .post("https://api.openai.com/v1/images/generations")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&body)
            .send()
            .await
            .context("calling OpenAI images")?;
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("OpenAI image error {status} ({model}): {text}"));
        }
        let v: serde_json::Value = resp.json().await.context("parsing OpenAI image response")?;
        if let Some(b64) = v["data"][0]["b64_json"].as_str() {
            return B64.decode(b64).context("decoding OpenAI image");
        }
        let url = v["data"][0]["url"]
            .as_str()
            .ok_or_else(|| anyhow!("unexpected OpenAI image response: {v}"))?;
        let bytes = client
            .get(url)
            .send()
            .await
            .context("downloading OpenAI image")?
            .bytes()
            .await
            .context("reading OpenAI image bytes")?;
        Ok(bytes.to_vec())
    }
}

impl ImageProvider for OpenAiImageProvider {
    async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>> {
        self.generate_image_sized(prompt, 1536, 1024).await
    }

    async fn generate_image_sized(&self, prompt: &str, width: u32, height: u32) -> Result<Vec<u8>> {
        // gpt-image-1 is the latest model but needs a verified org; if it's
        // unavailable (403/verification), fall back to dall-e-3 automatically.
        match self
            .generate_with(OPENAI_IMAGE_MODEL, openai_size(width, height), prompt)
            .await
        {
            Ok(bytes) => Ok(bytes),
            Err(e) => self
                .generate_with("dall-e-3", dalle3_size(width, height), prompt)
                .await
                .map_err(|e2| {
                    anyhow!("gpt-image-1 unavailable ({e}); dall-e-3 fallback also failed ({e2})")
                }),
        }
    }

    /// gpt-image-1 supports reference images via the /images/edits endpoint
    /// (multipart). Each ref is sent as an `image[]` file part.
    async fn generate_image_ref(
        &self,
        prompt: &str,
        width: u32,
        height: u32,
        refs: &[Vec<u8>],
    ) -> Result<Vec<u8>> {
        if refs.is_empty() {
            return self.generate_image_sized(prompt, width, height).await;
        }
        let size = openai_size(width, height);
        let mut form = reqwest::multipart::Form::new()
            .text("model", OPENAI_IMAGE_MODEL)
            .text("prompt", prompt.to_string())
            .text("size", size.to_string());
        for (i, bytes) in refs.iter().enumerate() {
            let part = reqwest::multipart::Part::bytes(bytes.clone())
                .file_name(format!("ref_{i}.png"))
                .mime_str("image/png")?;
            form = form.part("image[]", part);
        }

        let client = reqwest::Client::new();
        let resp = client
            .post("https://api.openai.com/v1/images/edits")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .multipart(form)
            .send()
            .await
            .context("calling OpenAI image edits")?;
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("OpenAI image edit error {status}: {text}"));
        }
        let v: serde_json::Value = resp.json().await.context("parsing OpenAI edit response")?;
        if let Some(b64) = v["data"][0]["b64_json"].as_str() {
            return B64.decode(b64).context("decoding OpenAI edited image");
        }
        let url = v["data"][0]["url"]
            .as_str()
            .ok_or_else(|| anyhow!("unexpected OpenAI edit response: {v}"))?;
        let bytes = client.get(url).send().await?.bytes().await?;
        Ok(bytes.to_vec())
    }
}

/// Stability AI v1 text-to-image (SDXL). Returns base64 image bytes.
pub struct StabilityImageProvider {
    api_key: String,
    seed: Option<i64>,
}

impl StabilityImageProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key, seed: None }
    }
    pub fn with_seed(mut self, seed: Option<i64>) -> Self {
        self.seed = seed;
        self
    }
}

impl ImageProvider for StabilityImageProvider {
    async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>> {
        self.generate_image_sized(prompt, 1344, 768).await
    }

    async fn generate_image_sized(&self, prompt: &str, width: u32, height: u32) -> Result<Vec<u8>> {
        let (w, h) = sdxl_size(width, height);
        let client = reqwest::Client::new();
        let mut body = json!({
            "text_prompts": [{ "text": prompt }],
            "width": w,
            "height": h,
            "samples": 1,
            "steps": 30
        });
        if let Some(s) = self.seed {
            body["seed"] = json!(s.max(0));
        }
        let resp = client
            .post(format!(
                "https://api.stability.ai/v1/generation/{STABILITY_ENGINE}/text-to-image"
            ))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Accept", "application/json")
            .json(&body)
            .send()
            .await
            .context("calling Stability")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("Stability error {status}: {text}"));
        }

        let v: serde_json::Value = resp.json().await.context("parsing Stability response")?;
        let b64 = v["artifacts"][0]["base64"]
            .as_str()
            .ok_or_else(|| anyhow!("unexpected Stability response: {v}"))?;
        B64.decode(b64).context("decoding Stability image")
    }
}

/// Grok / xAI image generation — OpenAI-compatible `/v1/images/generations`
/// (model `grok-2-image`). Returns base64 image bytes.
pub struct GrokImageProvider {
    api_key: String,
}

impl GrokImageProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

impl ImageProvider for GrokImageProvider {
    async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>> {
        self.generate_image_sized(prompt, 1024, 1024).await
    }

    async fn generate_image_sized(&self, prompt: &str, _width: u32, _height: u32) -> Result<Vec<u8>> {
        // xAI's image API takes prompt + n only (no size/seed); aspect is implicit.
        let resp = reqwest::Client::new()
            .post("https://api.x.ai/v1/images/generations")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&json!({ "model": "grok-2-image", "prompt": prompt, "n": 1, "response_format": "b64_json" }))
            .send()
            .await
            .context("calling Grok image")?;
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("Grok image error {status}: {text}"));
        }
        let v: serde_json::Value = resp.json().await.context("parsing Grok response")?;
        if let Some(b64) = v["data"][0]["b64_json"].as_str() {
            return B64.decode(b64).context("decoding Grok image");
        }
        let url = v["data"][0]["url"]
            .as_str()
            .ok_or_else(|| anyhow!("unexpected Grok response: {v}"))?;
        let bytes = reqwest::Client::new().get(url).send().await?.bytes().await?;
        Ok(bytes.to_vec())
    }
}
