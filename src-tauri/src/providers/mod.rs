//! Provider layer. One trait per capability (text / image / video) so vendors
//! are interchangeable (plan §4). Phase 0 ships the text capability via Gemini.

pub mod audio;
pub mod image;
pub mod kie;
pub mod replicate;
pub mod text;
pub mod video;
pub mod wavespeed;

use crate::models::PromptPack;
use anyhow::Result;

/// Granular per-clip generation options, applied where the model supports them.
#[derive(Default, Clone)]
pub struct ClipOpts {
    /// Target clip length in seconds (Seedance 4–15; Kling 5/10).
    pub duration: Option<u32>,
    /// Output resolution token ("480p" | "720p" | "1080p").
    pub resolution: Option<String>,
    /// Whether the model should generate audio (dialogue/SFX/music) at all.
    pub generate_audio: Option<bool>,
}

impl ClipOpts {
    pub fn duration_or(&self, d: u32) -> u32 {
        self.duration.unwrap_or(d)
    }
    pub fn resolution_or<'a>(&'a self, r: &'a str) -> &'a str {
        self.resolution.as_deref().unwrap_or(r)
    }
    pub fn audio_or(&self, a: bool) -> bool {
        self.generate_audio.unwrap_or(a)
    }
}

/// Generates a structured MotionForge Prompt Pack from freeform input.
#[allow(async_fn_in_trait)]
pub trait TextProvider {
    async fn generate_pack(&self, input: &str) -> Result<PromptPack>;
}

/// Generates a single image, returning raw encoded bytes (PNG/JPEG).
#[allow(async_fn_in_trait)]
pub trait ImageProvider {
    async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>>;

    /// Generate at a target pixel size. Providers that support sizing override
    /// this; the default ignores size and falls back to `generate_image`.
    async fn generate_image_sized(
        &self,
        prompt: &str,
        _width: u32,
        _height: u32,
    ) -> Result<Vec<u8>> {
        self.generate_image(prompt).await
    }

    /// Generate guided by reference images (img2img / character & prop control).
    /// `refs` are raw decoded image bytes. Providers that support reference input
    /// override this; the default ignores refs and falls back to sized output.
    async fn generate_image_ref(
        &self,
        prompt: &str,
        width: u32,
        height: u32,
        _refs: &[Vec<u8>],
    ) -> Result<Vec<u8>> {
        self.generate_image_sized(prompt, width, height).await
    }
}

/// Generates a video (async job: submit → poll → download), returning encoded bytes.
#[allow(async_fn_in_trait)]
pub trait VideoProvider {
    async fn generate_video(&self, prompt: &str) -> Result<Vec<u8>>;

    /// Image-to-video: guide generation with reference image bytes (e.g. the
    /// shot's generated frame + attached assets). Default ignores refs and falls
    /// back to text-to-video; providers that support it override this.
    async fn generate_video_ref(&self, prompt: &str, _refs: &[Vec<u8>]) -> Result<Vec<u8>> {
        self.generate_video(prompt).await
    }
}

/// Renders speech audio from text, returning encoded bytes (MP3).
#[allow(async_fn_in_trait)]
pub trait AudioProvider {
    async fn generate_speech(&self, text: &str, voice: Option<&str>) -> Result<Vec<u8>>;
}
