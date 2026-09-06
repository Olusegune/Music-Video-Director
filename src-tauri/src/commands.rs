//! Tauri command surface — the IPC boundary the frontend (`src/lib/ipc.ts`) calls.
//! Tauri maps JS camelCase args to these snake_case params automatically.

use crate::db::{self, Db};
use crate::export;
use crate::models::{
    BrandKit, Character, Environment, NewProject, Project, PromptPack, Prop, ProviderKeyStatus,
};
use crate::providers::{
    audio::ElevenLabsProvider,
    image::{
        FalImageProvider, GoogleImagenProvider, GrokImageProvider, OpenAiImageProvider,
        StabilityImageProvider,
    },
    kie::{KieImageProvider, KieVideoProvider},
    replicate::ReplicateProvider,
    text::GeminiTextProvider,
    video::{FalVideoProvider, GoogleVeoProvider},
    wavespeed::{WaveSpeedImageProvider, WaveSpeedVideoProvider},
    AudioProvider, ClipOpts, ImageProvider, TextProvider, VideoProvider,
};
use crate::secrets;
use chrono::Utc;
use rusqlite::OptionalExtension;
use tauri::{AppHandle, State};
use uuid::Uuid;

/// Convert any error into a String so it crosses the IPC boundary cleanly.
fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

/// Detect the real image format from magic bytes so we save with the correct
/// extension. Providers often return JPEG even when we'd default to .png, and a
/// content-type/extension mismatch makes the webview refuse to render the file.
fn image_ext(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "jpg"
    } else if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        "png"
    } else if bytes.len() > 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        "webp"
    } else if bytes.starts_with(&[0x47, 0x49, 0x46]) {
        "gif"
    } else {
        "png"
    }
}

#[tauri::command]
pub fn list_projects(db: State<Db>) -> Result<Vec<Project>, String> {
    let conn = db.0.lock().map_err(err)?;
    db::list_projects(&conn).map_err(err)
}

#[tauri::command]
pub fn create_project(db: State<Db>, input: NewProject) -> Result<Project, String> {
    let conn = db.0.lock().map_err(err)?;
    db::create_project(&conn, input).map_err(err)
}

#[tauri::command]
pub fn delete_project(db: State<Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::delete_project(&conn, &id).map_err(err)
}

#[tauri::command]
pub async fn generate_structured_text(
    provider: String,
    prompt: String,
    schema: String,
) -> Result<String, String> {
    match provider.as_str() {
        "gemini" => {
            let key = secrets::get_key("gemini")
                .map_err(err)?
                .ok_or("Add a Gemini API key in the API Key Dashboard.")?;
            GeminiTextProvider::new(key)
                .generate_structured(&prompt, &schema)
                .await
                .map_err(err)
        }
        _ => Err(format!(
            "Structured text is not wired for provider '{provider}' yet."
        )),
    }
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn record_usage(
    db: State<Db>,
    provider: String,
    model: String,
    capability: String,
    module_id: Option<String>,
    project_id: Option<String>,
    units: Option<f64>,
    cost_usd: f64,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::record_usage(
        &conn,
        &provider,
        &model,
        &capability,
        module_id.as_deref().unwrap_or(""),
        project_id.as_deref().unwrap_or(""),
        units.unwrap_or(1.0),
        cost_usd,
    )
    .map_err(err)
}

#[tauri::command]
pub fn list_usage(db: State<Db>, since: Option<String>) -> Result<Vec<db::UsageEntry>, String> {
    let conn = db.0.lock().map_err(err)?;
    db::list_usage(&conn, since).map_err(err)
}

/// Whole doc_store, read once at startup to hydrate the frontend's in-memory
/// cache (durableStore.ts). Returned as pairs rather than a map so the
/// frontend controls its own ordering/shape.
#[tauri::command]
pub fn doc_get_all(db: State<Db>) -> Result<Vec<(String, String)>, String> {
    let conn = db.0.lock().map_err(err)?;
    db::doc_get_all(&conn).map_err(err)
}

#[tauri::command]
pub fn doc_set(db: State<Db>, key: String, value: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::doc_set(&conn, &key, &value).map_err(err)
}

#[tauri::command]
pub fn doc_delete(db: State<Db>, key: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::doc_delete(&conn, &key).map_err(err)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderBalance {
    pub provider: String,
    pub label: String,
    pub remaining: f64,
    pub unit: String,
}

/// Real account balance/usage for the small set of providers that expose one
/// through their normal API key (most providers don't — billing lives behind
/// a separate dashboard-only login, not the generation key). Every other
/// provider's spend is estimate-only, from usage_log.
#[tauri::command]
pub async fn check_provider_balance(provider: String) -> Result<Option<ProviderBalance>, String> {
    let client = reqwest::Client::new();
    match provider.as_str() {
        "stability" => {
            let Some(key) = secrets::get_key("stability").map_err(err)? else {
                return Ok(None);
            };
            let resp = client
                .get("https://api.stability.ai/v1/user/balance")
                .bearer_auth(&key)
                .send()
                .await
                .map_err(|e| format!("Stability balance check failed: {e}"))?;
            if !resp.status().is_success() {
                return Err(format!("Stability balance check failed: HTTP {}", resp.status()));
            }
            let body: serde_json::Value = resp.json().await.map_err(err)?;
            let credits = body.get("credits").and_then(|v| v.as_f64()).unwrap_or(0.0);
            Ok(Some(ProviderBalance {
                provider,
                label: "Stability AI".into(),
                remaining: credits,
                unit: "credits".into(),
            }))
        }
        "elevenlabs" => {
            let Some(key) = secrets::get_key("elevenlabs").map_err(err)? else {
                return Ok(None);
            };
            let resp = client
                .get("https://api.elevenlabs.io/v1/user/subscription")
                .header("xi-api-key", &key)
                .send()
                .await
                .map_err(|e| format!("ElevenLabs usage check failed: {e}"))?;
            if !resp.status().is_success() {
                return Err(format!("ElevenLabs usage check failed: HTTP {}", resp.status()));
            }
            let body: serde_json::Value = resp.json().await.map_err(err)?;
            let used = body.get("character_count").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let limit = body.get("character_limit").and_then(|v| v.as_f64()).unwrap_or(0.0);
            Ok(Some(ProviderBalance {
                provider,
                label: "ElevenLabs".into(),
                remaining: (limit - used).max(0.0),
                unit: "characters".into(),
            }))
        }
        // Every other provider (Gemini, OpenAI, fal.ai, Kie, Replicate, Google
        // Veo/Imagen, WaveSpeed...) doesn't expose account balance through the
        // same key used for generation — billing is dashboard-only there.
        _ => Ok(None),
    }
}

#[tauri::command]
pub fn list_brand_kits(db: State<Db>) -> Result<Vec<BrandKit>, String> {
    let conn = db.0.lock().map_err(err)?;
    db::list_brand_kits(&conn).map_err(err)
}

#[tauri::command]
pub fn save_brand_kit(db: State<Db>, kit: BrandKit) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::save_brand_kit(&conn, &kit).map_err(err)
}

#[tauri::command]
pub fn delete_brand_kit(db: State<Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::delete_brand_kit(&conn, &id).map_err(err)
}

// ----- Characters --------------------------------------------------------

#[tauri::command]
pub fn list_characters(db: State<Db>) -> Result<Vec<Character>, String> {
    let conn = db.0.lock().map_err(err)?;
    db::list_characters(&conn).map_err(err)
}

#[tauri::command]
pub fn save_character(db: State<Db>, character: Character) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::save_character(&conn, &character).map_err(err)
}

#[tauri::command]
pub fn delete_character(db: State<Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::delete_character(&conn, &id).map_err(err)
}

/// Pick the first configured image provider and generate one image from `prompt`.
/// Mirrors the chain used by `generate_shot_image`.
async fn generate_image_any(prompt: &str) -> Result<(&'static str, Vec<u8>), String> {
    if let Some(key) = secrets::get_key("fal").map_err(err)? {
        Ok((
            "fal",
            FalImageProvider::new(key)
                .generate_image(prompt)
                .await
                .map_err(err)?,
        ))
    } else if let Some(key) = secrets::get_key("kie").map_err(err)? {
        Ok((
            "kie",
            KieImageProvider::new(key)
                .generate_image(prompt)
                .await
                .map_err(err)?,
        ))
    } else if let Some(key) = secrets::get_key("openai")
        .map_err(err)?
        .or(secrets::get_key("gpt_image").map_err(err)?)
    {
        Ok((
            "openai",
            OpenAiImageProvider::new(key)
                .generate_image(prompt)
                .await
                .map_err(err)?,
        ))
    } else if let Some(key) = secrets::get_key("stability").map_err(err)? {
        Ok((
            "stability",
            StabilityImageProvider::new(key)
                .generate_image(prompt)
                .await
                .map_err(err)?,
        ))
    } else if let Some(key) = secrets::get_key("google_imagen").map_err(err)? {
        Ok((
            "google_imagen",
            GoogleImagenProvider::new(key)
                .generate_image(prompt)
                .await
                .map_err(err)?,
        ))
    } else if let Some(key) = secrets::get_key("replicate").map_err(err)? {
        Ok((
            "replicate",
            ReplicateProvider::new(key)
                .generate_image(prompt)
                .await
                .map_err(err)?,
        ))
    } else {
        Err("No image provider key set. Add fal.ai, OpenAI, Stability, Google, or Replicate in Settings.".into())
    }
}

/// Generate a hero portrait for a character from its composed Prompt DNA and
/// store it under the app's assets dir. Returns the absolute file path. The
/// portrait belongs to the character (persisted in `portrait_url`), so it is
/// not written to the project-scoped `assets` table.
#[tauri::command]
pub async fn generate_character_portrait(
    app: AppHandle,
    character_id: String,
    prompt: String,
) -> Result<String, String> {
    let (_provider_name, bytes) = generate_image_any(&prompt).await?;

    let dir = crate::paths::base_dir(&app)?
        .join("assets")
        .join("characters")
        .join(&character_id);
    std::fs::create_dir_all(&dir).map_err(err)?;
    let file_path = dir.join(format!("portrait_{}.{}", Uuid::new_v4(), image_ext(&bytes)));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    Ok(file_path.to_string_lossy().to_string())
}

/// Generate an image from `prompt` and store it under assets/<kind>/<id>/.
/// Shared by environment + prop generation. Returns the absolute file path.
async fn generate_entity_image(
    app: &AppHandle,
    kind: &str,
    id: &str,
    prompt: &str,
) -> Result<String, String> {
    let (_provider_name, bytes) = generate_image_any(prompt).await?;
    let dir = crate::paths::base_dir(app)?
        .join("assets")
        .join(kind)
        .join(id);
    std::fs::create_dir_all(&dir).map_err(err)?;
    let file_path = dir.join(format!("{kind}_{}.{}", Uuid::new_v4(), image_ext(&bytes)));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    Ok(file_path.to_string_lossy().to_string())
}

// ----- Environments ------------------------------------------------------

#[tauri::command]
pub fn list_environments(db: State<Db>) -> Result<Vec<Environment>, String> {
    let conn = db.0.lock().map_err(err)?;
    db::list_environments(&conn).map_err(err)
}

#[tauri::command]
pub fn save_environment(db: State<Db>, environment: Environment) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::save_environment(&conn, &environment).map_err(err)
}

#[tauri::command]
pub fn delete_environment(db: State<Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::delete_environment(&conn, &id).map_err(err)
}

#[tauri::command]
pub async fn generate_environment_image(
    app: AppHandle,
    environment_id: String,
    prompt: String,
) -> Result<String, String> {
    generate_entity_image(&app, "environments", &environment_id, &prompt).await
}

// ----- Props -------------------------------------------------------------

#[tauri::command]
pub fn list_props(db: State<Db>) -> Result<Vec<Prop>, String> {
    let conn = db.0.lock().map_err(err)?;
    db::list_props(&conn).map_err(err)
}

#[tauri::command]
pub fn save_prop(db: State<Db>, prop: Prop) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::save_prop(&conn, &prop).map_err(err)
}

#[tauri::command]
pub fn delete_prop(db: State<Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(err)?;
    db::delete_prop(&conn, &id).map_err(err)
}

#[tauri::command]
pub async fn generate_prop_image(
    app: AppHandle,
    prop_id: String,
    prompt: String,
) -> Result<String, String> {
    generate_entity_image(&app, "props", &prop_id, &prompt).await
}

/// Provider+size-aware image generation for the Image Studio. `provider` is the
/// chosen model's key id (e.g. "google_imagen", "openai", "fal", "stability",
/// "replicate"); "custom" falls back to the first configured provider. Saves to
/// assets/sheets/ and returns the absolute file path.
#[tauri::command]
pub async fn generate_image_pro(
    app: AppHandle,
    provider: String,
    prompt: String,
    width: u32,
    height: u32,
    refs: Option<Vec<String>>,
    seed: Option<i64>,
    model: Option<String>,
    negative_prompt: Option<String>,
    operation: Option<String>,
    mask: Option<String>,
    batch: Option<u32>,
) -> Result<String, String> {
    let get = |id: &str| secrets::get_key(id).map_err(err);
    let model = model.filter(|s| !s.is_empty());
    let negative_prompt = negative_prompt.filter(|s| !s.trim().is_empty());
    let operation = operation.filter(|s| !s.trim().is_empty());
    let mask_bytes = mask.as_deref().and_then(|value| B64.decode(value).ok());
    let batch = batch.unwrap_or(1).clamp(1, 4);

    // Decode any reference images (base64, no data: prefix) once.
    use base64::{engine::general_purpose::STANDARD as B64, Engine};
    let ref_bytes: Vec<Vec<u8>> = refs
        .unwrap_or_default()
        .iter()
        .filter_map(|b| B64.decode(b).ok())
        .collect();
    let r = ref_bytes.as_slice();

    let bytes: Vec<u8> = match provider.as_str() {
        "google_imagen" | "gemini" | "nano_banana" | "nano_banana_pro" => {
            let key = get("google_imagen")?
                .or(get("gemini")?)
                .ok_or("Add a Google (Imagen/Gemini) key in the API Key Dashboard.")?;
            GoogleImagenProvider::new(key)
                .generate_image_ref(&prompt, width, height, r)
                .await
                .map_err(err)?
        }
        "openai" | "gpt_image" => {
            let key = get("openai")?
                .or(get("gpt_image")?)
                .ok_or("Add an OpenAI key in the API Key Dashboard.")?;
            OpenAiImageProvider::new(key)
                .generate_image_op(&prompt, width, height, r, operation.as_deref(), mask_bytes.as_deref())
                .await
                .map_err(err)?
        }
        "fal" => {
            let key = get("fal")?.ok_or("Add a fal.ai key in the API Key Dashboard.")?;
            FalImageProvider::new(key)
                .with_seed(seed)
                .with_batch(batch)
                .with_model(model.clone())
                .with_negative(negative_prompt.clone())
                .generate_image_ref(&prompt, width, height, r)
                .await
                .map_err(err)?
        }
        "kie" => {
            let key = get("kie")?.ok_or("Add a kie.ai key in the API Key Dashboard.")?;
            KieImageProvider::new(key)
                .with_model(model.clone())
                .generate_image_ref(&prompt, width, height, r)
                .await
                .map_err(err)?
        }
        "wavespeed" => {
            let key = get("wavespeed")?.ok_or("Add a WaveSpeed key in the API Key Dashboard.")?;
            WaveSpeedImageProvider::new(key)
                .with_model(model.clone())
                .generate_image_ref(&prompt, width, height, r)
                .await
                .map_err(err)?
        }
        "stability" => {
            let key = get("stability")?.ok_or("Add a Stability key in the API Key Dashboard.")?;
            StabilityImageProvider::new(key)
                .with_seed(seed)
                .with_batch(batch)
                .with_negative(negative_prompt.clone())
                .generate_image_ref(&prompt, width, height, r)
                .await
                .map_err(err)?
        }
        "grok" => {
            let key = get("grok")?.ok_or("Add a Grok / xAI key in the API Key Dashboard.")?;
            GrokImageProvider::new(key)
                .generate_image_ref(&prompt, width, height, r)
                .await
                .map_err(err)?
        }
        "replicate" => {
            let key = get("replicate")?.ok_or("Add a Replicate key in the API Key Dashboard.")?;
            ReplicateProvider::new(key).generate_image(&prompt).await.map_err(err)?
        }
        "midjourney" => {
            return Err(
                "Midjourney has no public API. Use “Copy Prompt”, generate in Midjourney, then import the image."
                    .into(),
            )
        }
        // "custom" / anything else → first configured provider.
        _ => {
            if let Some(key) = get("fal")? {
                FalImageProvider::new(key).with_seed(seed).with_batch(batch).with_negative(negative_prompt.clone()).generate_image_ref(&prompt, width, height, r).await.map_err(err)?
            } else if let Some(key) = get("openai")?.or(get("gpt_image")?) {
                OpenAiImageProvider::new(key).generate_image_op(&prompt, width, height, r, operation.as_deref(), mask_bytes.as_deref()).await.map_err(err)?
            } else if let Some(key) = get("google_imagen")? {
                GoogleImagenProvider::new(key).generate_image_ref(&prompt, width, height, r).await.map_err(err)?
            } else if let Some(key) = get("stability")? {
                StabilityImageProvider::new(key).with_batch(batch).with_negative(negative_prompt.clone()).generate_image_ref(&prompt, width, height, r).await.map_err(err)?
            } else {
                return Err("No image provider key set. Add one in the API Key Dashboard.".into());
            }
        }
    };

    let dir = crate::paths::base_dir(&app)?.join("assets").join("sheets");
    std::fs::create_dir_all(&dir).map_err(err)?;
    let file_path = dir.join(format!("sheet_{}.{}", Uuid::new_v4(), image_ext(&bytes)));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    Ok(file_path.to_string_lossy().to_string())
}

// ----- Animation Lab -----------------------------------------------------

/// Pick the first configured video provider and generate a clip from `prompt`.
/// Mirrors the chain used by `generate_shot_video`.
async fn generate_video_any(
    prompt: &str,
    refs: &[Vec<u8>],
) -> Result<(&'static str, Vec<u8>), String> {
    if let Some(key) = secrets::get_key("fal").map_err(err)? {
        Ok((
            "fal",
            FalVideoProvider::new(key)
                .generate_video_ref(prompt, refs)
                .await
                .map_err(err)?,
        ))
    } else if let Some(key) = secrets::get_key("google_veo").map_err(err)? {
        Ok((
            "google_veo",
            GoogleVeoProvider::new(key)
                .generate_video_ref(prompt, refs)
                .await
                .map_err(err)?,
        ))
    } else if let Some(key) = secrets::get_key("replicate").map_err(err)? {
        Ok((
            "replicate",
            ReplicateProvider::new(key)
                .generate_video(prompt)
                .await
                .map_err(err)?,
        ))
    } else if let Some(key) = secrets::get_key("kie").map_err(err)? {
        Ok((
            "kie",
            KieVideoProvider::new(key)
                .generate_video_ref(prompt, refs)
                .await
                .map_err(err)?,
        ))
    } else {
        Err(
            "No video provider key set. Add fal.ai, Google Veo, kie.ai, or Replicate in Settings."
                .into(),
        )
    }
}

/// Generate a quick motion-test clip from a composed prompt (character +
/// environment + prop + motion type). Project-agnostic; stored under
/// assets/motion/. Returns the absolute file path.
#[tauri::command]
pub async fn generate_motion_test(app: AppHandle, prompt: String) -> Result<String, String> {
    let (_provider_name, bytes) = generate_video_any(&prompt, &[]).await?;
    let dir = crate::paths::base_dir(&app)?.join("assets").join("motion");
    std::fs::create_dir_all(&dir).map_err(err)?;
    let file_path = dir.join(format!("motion_{}.mp4", Uuid::new_v4()));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    Ok(file_path.to_string_lossy().to_string())
}

// ----- Music Video (song-keyed, no DB project) ---------------------------

/// Generate a video clip with an explicitly chosen provider, or fall back to the
/// first configured one (the per-shot provider picker in the MV Director). Only
/// providers with a wired adapter are routable; others fall through to auto.
async fn generate_video_with(
    provider: Option<&str>,
    prompt: &str,
    refs: &[Vec<u8>],
    model: Option<String>,
    end_frame: Option<Vec<u8>>,
    audio_refs: &[Vec<u8>],
    video_refs: &[Vec<u8>],
    opts: &ClipOpts,
) -> Result<Vec<u8>, String> {
    let model = model.filter(|s| !s.is_empty());
    match provider {
        Some("fal") => {
            let key = secrets::get_key("fal")
                .map_err(err)?
                .ok_or("Add a fal.ai key in the API Key Dashboard.")?;
            FalVideoProvider::new(key)
                .with_model(model)
                .generate_video_omni(prompt, refs, end_frame.as_deref(), opts)
                .await
                .map_err(err)
        }
        Some("google_veo") => {
            let key = secrets::get_key("google_veo")
                .map_err(err)?
                .ok_or("Add a Google Veo key in the API Key Dashboard.")?;
            GoogleVeoProvider::new(key)
                .generate_video_ref(prompt, refs)
                .await
                .map_err(err)
        }
        Some("replicate") => {
            let key = secrets::get_key("replicate")
                .map_err(err)?
                .ok_or("Add a Replicate key in the API Key Dashboard.")?;
            ReplicateProvider::new(key)
                .generate_video(prompt)
                .await
                .map_err(err)
        }
        Some("kie") => {
            let key = secrets::get_key("kie")
                .map_err(err)?
                .ok_or("Add a kie.ai key in the API Key Dashboard.")?;
            // Kie supports the full omni reference set (end frame, audio, video).
            KieVideoProvider::new(key)
                .with_model(model)
                .generate_video_omni(
                    prompt,
                    refs,
                    end_frame.as_deref(),
                    audio_refs,
                    video_refs,
                    opts,
                )
                .await
                .map_err(err)
        }
        Some("wavespeed") => {
            let key = secrets::get_key("wavespeed")
                .map_err(err)?
                .ok_or("Add a WaveSpeed key in the API Key Dashboard.")?;
            WaveSpeedVideoProvider::new(key)
                .with_model(model)
                .generate_video_omni(prompt, refs, end_frame.as_deref(), opts)
                .await
                .map_err(err)
        }
        Some("grok") => {
            return Err(
                "Grok video has no public API yet. Use Seedance/Kling via Kie, Fal, or WaveSpeed."
                    .into(),
            );
        }
        // "auto" / unknown / none → first configured video provider.
        _ => generate_video_any(prompt, refs)
            .await
            .map(|(_, bytes)| bytes),
    }
}

/// Generate a per-shot video clip for the music-video flow. Unlike
/// `generate_shot_video` this is keyed to a *song* + opaque shot id (the MV
/// Director/Timeline have no DB project), so it stores under assets/mv/<song>/
/// and is not written to the project-scoped `assets` table. `provider` selects
/// the video model (fal / google_veo / replicate); empty = auto. Returns the path.
#[tauri::command]
pub async fn generate_mv_shot_video(
    app: AppHandle,
    song_id: String,
    shot_id: String,
    prompt: String,
    provider: Option<String>,
    refs: Option<Vec<String>>,
    model: Option<String>,
    end_frame: Option<String>,
    audio_refs: Option<Vec<String>>,
    video_refs: Option<Vec<String>>,
    duration: Option<u32>,
    resolution: Option<String>,
    generate_audio: Option<bool>,
) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD as B64, Engine};
    let decode_all =
        |v: Vec<String>| -> Vec<Vec<u8>> { v.iter().filter_map(|b| B64.decode(b).ok()).collect() };
    let ref_bytes = decode_all(refs.unwrap_or_default());
    let end_bytes = end_frame.and_then(|b| B64.decode(b).ok());
    let audio_bytes = decode_all(audio_refs.unwrap_or_default());
    let video_bytes = decode_all(video_refs.unwrap_or_default());
    let opts = ClipOpts {
        duration,
        resolution: resolution.filter(|s| !s.is_empty()),
        generate_audio,
    };
    let prov = provider.filter(|s| !s.is_empty());
    let bytes = generate_video_with(
        prov.as_deref(),
        &prompt,
        &ref_bytes,
        model,
        end_bytes,
        &audio_bytes,
        &video_bytes,
        &opts,
    )
    .await?;
    let dir = crate::paths::base_dir(&app)?
        .join("assets")
        .join("mv")
        .join(&song_id);
    std::fs::create_dir_all(&dir).map_err(err)?;
    let safe_shot: String = shot_id.chars().filter(|c| c.is_alphanumeric()).collect();
    let file_path = dir.join(format!("clip_{safe_shot}_{}.mp4", Uuid::new_v4()));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    Ok(file_path.to_string_lossy().to_string())
}

// ----- File I/O & Recent Files ------------------------------------------

#[tauri::command]
pub fn get_recent_projects() -> Result<Vec<crate::file_ops::RecentFile>, String> {
    crate::file_ops::load_recent_files()
}

#[tauri::command]
pub fn add_recent_project(path: String, name: String) -> Result<(), String> {
    crate::file_ops::add_recent_file(&path, &name)
}

#[tauri::command]
pub fn write_project_to_disk(path: String, data: String) -> Result<(), String> {
    crate::file_ops::write_project_file(&path, &data)
}

#[tauri::command]
pub fn read_project_from_disk(path: String) -> Result<String, String> {
    crate::file_ops::read_project_file(&path)
}

/// Generate a spoken/vocal audio layer for the song (intro tags, ad-libs,
/// narration, spoken hooks) via the wired audio provider. Stored under
/// assets/mv/<song>/audio/. `provider` defaults to ElevenLabs; Suno has no
/// public generation API, so we direct the user to import that track instead.
#[tauri::command]
pub async fn generate_mv_audio(
    app: AppHandle,
    song_id: String,
    text: String,
    voice: Option<String>,
    provider: Option<String>,
) -> Result<String, String> {
    let prov = provider.unwrap_or_default();
    let bytes = match prov.as_str() {
        "" | "elevenlabs" => {
            let key = secrets::get_key("elevenlabs")
                .map_err(err)?
                .ok_or("Add an ElevenLabs key in the API Key Dashboard.")?;
            ElevenLabsProvider::new(key)
                .generate_speech(&text, voice.as_deref())
                .await
                .map_err(err)?
        }
        "suno" => {
            return Err(
                "Suno has no public generation API yet. Generate the track in Suno, then import it in Song Studio."
                    .into(),
            )
        }
        other => return Err(format!("Unsupported audio provider: {other}")),
    };

    let dir = crate::paths::base_dir(&app)?
        .join("assets")
        .join("mv")
        .join(&song_id)
        .join("audio");
    std::fs::create_dir_all(&dir).map_err(err)?;
    let file_path = dir.join(format!("voice_{}.mp3", Uuid::new_v4()));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    Ok(file_path.to_string_lossy().to_string())
}

/// Persist the imported song audio so it can later be muxed into a render.
/// The Song Brain analyzes audio in the webview and never sends bytes to Rust;
/// this is the one place we copy the original file to disk (assets/mv/<song>/).
#[tauri::command]
pub fn import_song_audio(
    app: AppHandle,
    song_id: String,
    data_base64: String,
    ext: String,
) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD as B64, Engine};
    let bytes = B64.decode(data_base64.as_bytes()).map_err(err)?;
    let safe_ext: String = ext.chars().filter(|c| c.is_alphanumeric()).collect();
    let safe_ext = if safe_ext.is_empty() {
        "mp3".into()
    } else {
        safe_ext
    };
    let dir = crate::paths::base_dir(&app)?
        .join("assets")
        .join("mv")
        .join(&song_id);
    std::fs::create_dir_all(&dir).map_err(err)?;
    let file_path = dir.join(format!("source.{safe_ext}"));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    Ok(file_path.to_string_lossy().to_string())
}

/// Cut a `duration_sec`-long slice of the song's own imported audio starting
/// at `start_sec`, so a shot's clip-generation call can hand the video model
/// the actual vocal/instrumental audio for its time range instead of nothing
/// at all. Without this, "lip-sync" was a text-prompt instruction with zero
/// audio signal behind it — the model had nothing real to lock a mouth to.
/// Returns a file path under assets/mv/<song>/clip-audio/, reused if the
/// exact same range was sliced before.
#[tauri::command]
pub fn slice_song_audio(
    app: AppHandle,
    song_id: String,
    start_sec: f64,
    duration_sec: f64,
) -> Result<String, String> {
    let dir = crate::paths::base_dir(&app)?
        .join("assets")
        .join("mv")
        .join(&song_id);
    let source = std::fs::read_dir(&dir)
        .map_err(err)?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .find(|p| p.file_stem().and_then(|s| s.to_str()) == Some("source"))
        .ok_or_else(|| "No song audio imported for this project yet.".to_string())?;

    let ffmpeg = crate::ffmpeg::resolve(&app).ok_or(
        "Audio slicing needs FFmpeg. Open Help → \u{201C}Install FFmpeg\u{201D} to set it up in one click.",
    )?;

    let clips_dir = dir.join("clip-audio");
    std::fs::create_dir_all(&clips_dir).map_err(err)?;
    let out_path = clips_dir.join(format!(
        "{}-{}.m4a",
        (start_sec * 1000.0).round() as i64,
        (duration_sec * 1000.0).round() as i64
    ));
    if out_path.exists() {
        return Ok(out_path.to_string_lossy().to_string());
    }

    let mut cmd = std::process::Command::new(&ffmpeg);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let output = cmd
        .arg("-y")
        .arg("-ss")
        .arg(format!("{start_sec}"))
        .arg("-t")
        .arg(format!("{duration_sec}"))
        .arg("-i")
        .arg(&source)
        .args(["-vn", "-c:a", "aac", "-b:a", "192k"])
        .arg(&out_path)
        .output()
        .map_err(|e| format!("Could not launch FFmpeg: {e}."))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let tail: Vec<&str> = stderr.lines().rev().take(10).collect();
        let tail: Vec<&str> = tail.into_iter().rev().collect();
        return Err(format!("FFmpeg failed to slice audio:\n{}", tail.join("\n")));
    }
    Ok(out_path.to_string_lossy().to_string())
}

/// Assemble the timeline segments (stills/clips) into one MP4 muxed to the song
/// audio, via FFmpeg. The blocking ffmpeg work runs off the async runtime.
/// Returns the rendered file path under assets/mv/<song>/.
#[tauri::command]
pub async fn render_music_video(
    app: AppHandle,
    song_id: String,
    audio_path: Option<String>,
    segments: Vec<crate::render::Segment>,
    voice_layers: Option<Vec<crate::render::VoiceLayer>>,
    width: Option<u32>,
    height: Option<u32>,
    fps: Option<u32>,
) -> Result<String, String> {
    if segments.is_empty() {
        return Err("Nothing to render — generate frames or clips first.".into());
    }
    let dir = crate::paths::base_dir(&app)?
        .join("assets")
        .join("mv")
        .join(&song_id);
    std::fs::create_dir_all(&dir).map_err(err)?;

    let w = width.unwrap_or(1280);
    let h = height.unwrap_or(720);
    let fps = fps.unwrap_or(24);
    let audio = audio_path.filter(|s| !s.is_empty());
    let voices = voice_layers.unwrap_or_default();

    // Resolve FFmpeg (env → managed copy → PATH); fail with a friendly message.
    let ffmpeg = crate::ffmpeg::resolve(&app).ok_or(
        "Video render needs FFmpeg. Open Help → \u{201C}Install FFmpeg\u{201D} to set it up in one click.",
    )?;
    let ffmpeg_s = ffmpeg.to_string_lossy().to_string();

    let out = tokio::task::spawn_blocking(move || {
        crate::render::render(
            &dir,
            &ffmpeg_s,
            w,
            h,
            fps,
            audio.as_deref(),
            &voices,
            &segments,
        )
    })
    .await
    .map_err(err)??;

    Ok(out.to_string_lossy().to_string())
}

/// Report whether a usable FFmpeg is available, and where.
#[tauri::command]
pub fn check_ffmpeg(app: AppHandle) -> Result<crate::ffmpeg::FfmpegStatus, String> {
    Ok(crate::ffmpeg::check(&app))
}

/// Download + install a static FFmpeg build into the app data dir (one click).
#[tauri::command]
pub async fn install_ffmpeg(app: AppHandle) -> Result<String, String> {
    crate::ffmpeg::install(&app).await
}

#[tauri::command]
pub fn get_provider_key_statuses() -> Result<Vec<ProviderKeyStatus>, String> {
    Ok(secrets::PROVIDERS
        .iter()
        .map(|p| ProviderKeyStatus {
            provider: p.to_string(),
            configured: secrets::is_configured(p),
        })
        .collect())
}

/// Test a provider's stored key with a cheap, credit-free probe. Returns a
/// status the API Key Dashboard renders (connected / invalid / offline /
/// untested / not_configured). The key is read from the keychain and only ever
/// sent to that provider's own API.
#[tauri::command]
pub async fn test_provider_connection(
    provider: String,
) -> Result<crate::connectivity::ConnectionResult, String> {
    let key = match secrets::get_key(&provider).map_err(err)? {
        Some(k) => k,
        None => {
            return Ok(crate::connectivity::ConnectionResult {
                status: "not_configured".into(),
                message: "No key set.".into(),
            })
        }
    };
    Ok(crate::connectivity::test(&provider, &key).await)
}

#[tauri::command]
pub fn set_provider_key(provider: String, key: String) -> Result<(), String> {
    if !secrets::PROVIDERS.contains(&provider.as_str()) {
        return Err(format!("unknown provider: {provider}"));
    }
    // Strip all whitespace — no API key contains any; a stray space/newline on
    // paste is a common cause of 401s.
    let key: String = key.chars().filter(|c| !c.is_whitespace()).collect();
    secrets::set_key(&provider, &key).map_err(err)
}

#[tauri::command]
pub fn clear_provider_key(provider: String) -> Result<(), String> {
    secrets::clear_key(&provider).map_err(err)
}

#[tauri::command]
pub fn get_latest_pack(db: State<Db>, project_id: String) -> Result<Option<PromptPack>, String> {
    let conn = db.0.lock().map_err(err)?;
    let json: Option<String> = conn
        .query_row(
            "SELECT content_json FROM prompt_packs
             WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1",
            [&project_id],
            |r| r.get(0),
        )
        .optional()
        .map_err(err)?;

    match json {
        Some(j) => Ok(Some(serde_json::from_str(&j).map_err(err)?)),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn save_pack(db: State<Db>, project_id: String, pack: PromptPack) -> Result<(), String> {
    let json = serde_json::to_string(&pack).map_err(err)?;
    let conn = db.0.lock().map_err(err)?;

    // Update the latest pack for this project, or insert the first one.
    let updated = conn
        .execute(
            "UPDATE prompt_packs SET content_json = ?1
             WHERE id = (SELECT id FROM prompt_packs
                         WHERE project_id = ?2 ORDER BY created_at DESC LIMIT 1)",
            rusqlite::params![json, project_id],
        )
        .map_err(err)?;

    if updated == 0 {
        conn.execute(
            "INSERT INTO prompt_packs (id, project_id, content_json, version, created_at)
             VALUES (?1, ?2, ?3, 1, ?4)",
            rusqlite::params![
                Uuid::new_v4().to_string(),
                project_id,
                json,
                Utc::now().to_rfc3339(),
            ],
        )
        .map_err(err)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn generate_prompt_pack(
    db: State<'_, Db>,
    project_id: String,
    input: String,
) -> Result<PromptPack, String> {
    // 1) Resolve the Gemini key from the OS keychain.
    let key = secrets::get_key("gemini")
        .map_err(err)?
        .ok_or("No Gemini API key set. Add one in Settings.")?;

    // 2) Call the provider (await — no DB lock held across this point).
    let provider = GeminiTextProvider::new(key);
    let pack = provider.generate_pack(&input).await.map_err(err)?;

    // 3) Persist the generated pack.
    let json = serde_json::to_string(&pack).map_err(err)?;
    {
        let conn = db.0.lock().map_err(err)?;
        conn.execute(
            "INSERT INTO prompt_packs (id, project_id, content_json, version, created_at)
             VALUES (?1, ?2, ?3, 1, ?4)",
            rusqlite::params![
                Uuid::new_v4().to_string(),
                project_id,
                json,
                Utc::now().to_rfc3339(),
            ],
        )
        .map_err(err)?;
    }

    Ok(pack)
}

#[tauri::command]
pub async fn generate_shot_image(
    app: AppHandle,
    db: State<'_, Db>,
    project_id: String,
    shot_number: i64,
    prompt: String,
    refs: Option<Vec<String>>,
) -> Result<String, String> {
    // Decode any attached reference images (shared with the MV asset system).
    use base64::{engine::general_purpose::STANDARD as B64, Engine};
    let r: Vec<Vec<u8>> = refs
        .unwrap_or_default()
        .iter()
        .filter_map(|b| B64.decode(b).ok())
        .collect();

    // Pick the configured image provider (fal → OpenAI → Stability → Imagen).
    let (provider_name, bytes): (&str, Vec<u8>) = if let Some(key) =
        secrets::get_key("fal").map_err(err)?
    {
        (
            "fal",
            FalImageProvider::new(key)
                .generate_image_ref(&prompt, 1280, 720, &r)
                .await
                .map_err(err)?,
        )
    } else if let Some(key) = secrets::get_key("kie").map_err(err)? {
        (
            "kie",
            KieImageProvider::new(key)
                .generate_image_ref(&prompt, 1280, 720, &r)
                .await
                .map_err(err)?,
        )
    } else if let Some(key) = secrets::get_key("openai")
        .map_err(err)?
        .or(secrets::get_key("gpt_image").map_err(err)?)
    {
        (
            "openai",
            OpenAiImageProvider::new(key)
                .generate_image_ref(&prompt, 1280, 720, &r)
                .await
                .map_err(err)?,
        )
    } else if let Some(key) = secrets::get_key("stability").map_err(err)? {
        (
            "stability",
            StabilityImageProvider::new(key)
                .generate_image_ref(&prompt, 1280, 720, &r)
                .await
                .map_err(err)?,
        )
    } else if let Some(key) = secrets::get_key("google_imagen").map_err(err)? {
        (
            "google_imagen",
            GoogleImagenProvider::new(key)
                .generate_image_ref(&prompt, 1280, 720, &r)
                .await
                .map_err(err)?,
        )
    } else if let Some(key) = secrets::get_key("replicate").map_err(err)? {
        (
            "replicate",
            ReplicateProvider::new(key)
                .generate_image(&prompt)
                .await
                .map_err(err)?,
        )
    } else {
        return Err(
                "No image provider key set. Add fal.ai, OpenAI, Stability, Google, or Replicate in Settings."
                    .into(),
            );
    };

    // Persist the image under the app's assets directory.
    let dir = crate::paths::base_dir(&app)?
        .join("assets")
        .join(&project_id);
    std::fs::create_dir_all(&dir).map_err(err)?;
    let file_path = dir.join(format!(
        "shot_{shot_number}_{}.{}",
        Uuid::new_v4(),
        image_ext(&bytes)
    ));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    let path_str = file_path.to_string_lossy().to_string();

    {
        let conn = db.0.lock().map_err(err)?;
        conn.execute(
            "INSERT INTO assets (id, project_id, shot_number, kind, file_path, source_provider, created_at)
             VALUES (?1, ?2, ?3, 'image', ?4, ?5, ?6)",
            rusqlite::params![
                Uuid::new_v4().to_string(),
                project_id,
                shot_number,
                path_str,
                provider_name,
                Utc::now().to_rfc3339(),
            ],
        )
        .map_err(err)?;
    }

    Ok(path_str)
}

#[tauri::command]
pub async fn generate_voiceover(
    app: AppHandle,
    db: State<'_, Db>,
    project_id: String,
    shot_number: i64,
    text: String,
    voice: Option<String>,
) -> Result<String, String> {
    let key = secrets::get_key("elevenlabs")
        .map_err(err)?
        .ok_or("No audio provider key set. Add ElevenLabs in Settings.")?;
    let bytes = ElevenLabsProvider::new(key)
        .generate_speech(&text, voice.as_deref())
        .await
        .map_err(err)?;

    let dir = crate::paths::base_dir(&app)?
        .join("assets")
        .join(&project_id);
    std::fs::create_dir_all(&dir).map_err(err)?;
    let file_path = dir.join(format!("vo_{shot_number}_{}.mp3", Uuid::new_v4()));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    let path_str = file_path.to_string_lossy().to_string();

    {
        let conn = db.0.lock().map_err(err)?;
        conn.execute(
            "INSERT INTO assets (id, project_id, shot_number, kind, file_path, source_provider, created_at)
             VALUES (?1, ?2, ?3, 'audio', ?4, 'elevenlabs', ?5)",
            rusqlite::params![
                Uuid::new_v4().to_string(),
                project_id,
                shot_number,
                path_str,
                Utc::now().to_rfc3339(),
            ],
        )
        .map_err(err)?;
    }

    Ok(path_str)
}

#[tauri::command]
pub fn export_project(
    app: AppHandle,
    db: State<Db>,
    project_id: String,
    format: String,
) -> Result<String, String> {
    // Load the project + its latest pack.
    let (project, pack) = {
        let conn = db.0.lock().map_err(err)?;
        let project = db::get_project(&conn, &project_id)
            .map_err(err)?
            .ok_or("Project not found")?;
        let json: Option<String> = conn
            .query_row(
                "SELECT content_json FROM prompt_packs
                 WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1",
                [&project_id],
                |r| r.get(0),
            )
            .optional()
            .map_err(err)?;
        let pack: PromptPack =
            serde_json::from_str(&json.ok_or("No Prompt Pack to export — generate one first.")?)
                .map_err(err)?;
        (project, pack)
    };

    let blocks = export::build_blocks(&project, &pack);
    let (bytes, ext): (Vec<u8>, &str) = match format.as_str() {
        "markdown" => (export::to_markdown(&blocks).into_bytes(), "md"),
        "json" => (
            export::to_json(&project, &pack).map_err(err)?.into_bytes(),
            "json",
        ),
        "pdf" => (export::to_pdf(&blocks).map_err(err)?, "pdf"),
        "docx" => (export::to_docx(&blocks).map_err(err)?, "docx"),
        other => return Err(format!("Unknown export format: {other}")),
    };

    // Write to the app's exports directory.
    let slug: String = project
        .name
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();
    let dir = crate::paths::base_dir(&app)?.join("exports");
    std::fs::create_dir_all(&dir).map_err(err)?;
    let stamp = Utc::now().format("%Y%m%d-%H%M%S");
    let file_path = dir.join(format!("{slug}-{stamp}.{ext}"));
    std::fs::write(&file_path, &bytes).map_err(err)?;

    Ok(file_path.to_string_lossy().to_string())
}

/// Sniff a media MIME type from magic bytes.
fn sniff_mime(b: &[u8]) -> &'static str {
    if b.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg"
    } else if b.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        "image/png"
    } else if b.starts_with(b"GIF8") {
        "image/gif"
    } else if b.get(0..4) == Some(&b"RIFF"[..]) && b.get(8..12) == Some(&b"WEBP"[..]) {
        "image/webp"
    } else if b.get(4..8) == Some(&b"ftyp"[..]) {
        "video/mp4"
    } else if b.starts_with(&[0x1A, 0x45, 0xDF, 0xA3]) {
        "video/webm"
    } else if b.starts_with(b"ID3") || b.starts_with(&[0xFF, 0xFB]) {
        "audio/mpeg"
    } else {
        "application/octet-stream"
    }
}

/// Read a local asset file and return it as a `data:` URL. The frontend renders
/// generated images/videos this way instead of via the asset protocol, which is
/// unreliable across installs — a data URL always loads in the webview.
#[tauri::command]
pub fn read_asset_data_url(path: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD as B64, Engine};
    let bytes = std::fs::read(&path).map_err(err)?;
    let mime = sniff_mime(&bytes);
    Ok(format!("data:{};base64,{}", mime, B64.encode(&bytes)))
}

/// Export the full Visual Production Bible (every Character / Environment /
/// Prop DNA) to the app's exports dir. Returns the written file path.
#[tauri::command]
pub fn export_bible(app: AppHandle, db: State<Db>, format: String) -> Result<String, String> {
    let (characters, environments, props) = {
        let conn = db.0.lock().map_err(err)?;
        (
            db::list_characters(&conn).map_err(err)?,
            db::list_environments(&conn).map_err(err)?,
            db::list_props(&conn).map_err(err)?,
        )
    };

    let blocks = export::build_bible_blocks(&characters, &environments, &props);
    let (bytes, ext): (Vec<u8>, &str) = match format.as_str() {
        "markdown" => (export::to_markdown(&blocks).into_bytes(), "md"),
        "json" => (
            export::bible_to_json(&characters, &environments, &props)
                .map_err(err)?
                .into_bytes(),
            "json",
        ),
        "pdf" => (export::to_pdf(&blocks).map_err(err)?, "pdf"),
        "docx" => (export::to_docx(&blocks).map_err(err)?, "docx"),
        other => return Err(format!("Unknown export format: {other}")),
    };

    let dir = crate::paths::base_dir(&app)?.join("exports");
    std::fs::create_dir_all(&dir).map_err(err)?;
    let stamp = Utc::now().format("%Y%m%d-%H%M%S");
    let file_path = dir.join(format!("visual-bible-{stamp}.{ext}"));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn import_shot_image(
    app: AppHandle,
    db: State<Db>,
    project_id: String,
    shot_number: i64,
    data_base64: String,
    ext: String,
) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD as B64, Engine};
    let bytes = B64.decode(data_base64.as_bytes()).map_err(err)?;

    let safe_ext = ext
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<String>();
    let safe_ext = if safe_ext.is_empty() {
        "png".into()
    } else {
        safe_ext
    };

    let dir = crate::paths::base_dir(&app)?
        .join("assets")
        .join(&project_id);
    std::fs::create_dir_all(&dir).map_err(err)?;
    let file_path = dir.join(format!(
        "upload_{shot_number}_{}.{safe_ext}",
        Uuid::new_v4()
    ));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    let path_str = file_path.to_string_lossy().to_string();

    {
        let conn = db.0.lock().map_err(err)?;
        conn.execute(
            "INSERT INTO assets (id, project_id, shot_number, kind, file_path, source_provider, created_at)
             VALUES (?1, ?2, ?3, 'image', ?4, 'upload', ?5)",
            rusqlite::params![
                Uuid::new_v4().to_string(),
                project_id,
                shot_number,
                path_str,
                Utc::now().to_rfc3339(),
            ],
        )
        .map_err(err)?;
    }

    Ok(path_str)
}

#[tauri::command]
pub async fn generate_shot_video(
    app: AppHandle,
    db: State<'_, Db>,
    project_id: String,
    shot_number: i64,
    prompt: String,
) -> Result<String, String> {
    // Pick the configured video provider (fal preferred, then Google Veo).
    let (provider_name, bytes): (&str, Vec<u8>) = if let Some(key) =
        secrets::get_key("fal").map_err(err)?
    {
        (
            "fal",
            FalVideoProvider::new(key)
                .generate_video(&prompt)
                .await
                .map_err(err)?,
        )
    } else if let Some(key) = secrets::get_key("google_veo").map_err(err)? {
        (
            "google_veo",
            GoogleVeoProvider::new(key)
                .generate_video(&prompt)
                .await
                .map_err(err)?,
        )
    } else if let Some(key) = secrets::get_key("replicate").map_err(err)? {
        (
            "replicate",
            ReplicateProvider::new(key)
                .generate_video(&prompt)
                .await
                .map_err(err)?,
        )
    } else {
        return Err(
            "No video provider key set. Add fal.ai, Google Veo, or Replicate in Settings.".into(),
        );
    };

    // Persist the video under the app's assets directory.
    let dir = crate::paths::base_dir(&app)?
        .join("assets")
        .join(&project_id);
    std::fs::create_dir_all(&dir).map_err(err)?;
    let file_path = dir.join(format!("shot_{shot_number}_{}.mp4", Uuid::new_v4()));
    std::fs::write(&file_path, &bytes).map_err(err)?;
    let path_str = file_path.to_string_lossy().to_string();

    {
        let conn = db.0.lock().map_err(err)?;
        conn.execute(
            "INSERT INTO assets (id, project_id, shot_number, kind, file_path, source_provider, created_at)
             VALUES (?1, ?2, ?3, 'video', ?4, ?5, ?6)",
            rusqlite::params![
                Uuid::new_v4().to_string(),
                project_id,
                shot_number,
                path_str,
                provider_name,
                Utc::now().to_rfc3339(),
            ],
        )
        .map_err(err)?;
    }

    Ok(path_str)
}

/// Transcribe the sung lyrics of one song section.
///
/// Sections already carry exact start/end times, so slicing to the section and
/// transcribing that is simpler and more accurate than transcribing the whole
/// track and trying to align words back to boundaries: the text belongs to the
/// section by construction, and a bad section can be re-run on its own.
///
/// Sung vocals are much harder than speech — instrumentation, melisma, doubled
/// takes and heavy processing all hurt. The prompt below leans on that, and
/// the result is always presented to the user as a draft to correct, never as
/// the truth. An empty string means "nothing intelligible here", which is a
/// real and common answer for an intro or an instrumental break.
#[tauri::command]
pub async fn transcribe_song_section(
    app: AppHandle,
    song_id: String,
    start_sec: f64,
    duration_sec: f64,
) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD as B64, Engine};

    let key = secrets::get_key("gemini")
        .map_err(err)?
        .ok_or("Transcribing lyrics needs a Gemini API key. Add one in Settings → API Keys.")?;

    let clip = slice_song_audio(app, song_id, start_sec, duration_sec)?;
    let bytes = std::fs::read(&clip).map_err(err)?;
    let audio = B64.encode(&bytes);

    let prompt = "Transcribe only the sung or rapped lyrics in this audio clip. \
Write one line per sung line. Do not translate. Do not add punctuation that isn't sung. \
Do not describe the music, the instruments, or the production. \
Do not add section labels, timestamps, quotation marks, or commentary. \
If there are no intelligible words \u{2014} an instrumental, ad-libs only, or unclear vocals \u{2014} \
reply with exactly: (no lyrics)";

    let body = serde_json::json!({
        "contents": [{
            "parts": [
                { "text": prompt },
                { "inline_data": { "mime_type": "audio/mp4", "data": audio } }
            ]
        }],
        // Deterministic: the same clip should not transcribe differently each run.
        "generationConfig": { "temperature": 0.0 }
    });

    // gemini-2.0-flash was retired and now returns a hard error naming its
    // replacement, so this is pinned to the current flash model rather than an
    // alias that could shift under us mid-project.
    const TRANSCRIBE_MODEL: &str = "gemini-3.6-flash";
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{TRANSCRIBE_MODEL}:generateContent?key={key}"
    );
    let resp = reqwest::Client::new()
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Could not reach Gemini: {e}."))?;

    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Gemini returned something unreadable: {e}."))?;
    if !status.is_success() {
        let msg = json["error"]["message"].as_str().unwrap_or("unknown error");
        return Err(format!("Gemini rejected the transcription request: {msg}"));
    }

    let text = json["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();

    // Normalise the model's "nothing here" answer to an empty string so the UI
    // has one thing to check rather than a magic phrase to string-match.
    if text.eq_ignore_ascii_case("(no lyrics)") || text.is_empty() {
        return Ok(String::new());
    }
    Ok(text)
}

/// List the image-capable models the configured Gemini key can actually reach.
///
/// Twice in one day a batch failed because a model id had been retired under
/// the app: gemini-2.0-flash for transcription, then gemini-2.5-flash-image
/// and imagen-3.0-generate-002 for frames. The 404 tells you to call
/// ListModels, which needs the key — so the app asks on the user's behalf
/// rather than leaving them to guess which id is current.
#[tauri::command]
pub async fn list_gemini_models() -> Result<Vec<String>, String> {
    let key = secrets::get_key("gemini")
        .map_err(err)?
        .or(secrets::get_key("google_imagen").map_err(err)?)
        .ok_or("No Gemini or Google key set. Add one in Settings → API Keys.")?;

    let url =
        format!("https://generativelanguage.googleapis.com/v1beta/models?key={key}&pageSize=200");
    let resp = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Could not reach Gemini: {e}."))?;
    let status = resp.status();
    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Gemini returned something unreadable: {e}."))?;
    if !status.is_success() {
        let msg = json["error"]["message"].as_str().unwrap_or("unknown error");
        return Err(format!("Gemini rejected the model list request: {msg}"));
    }

    let mut out: Vec<String> = json["models"]
        .as_array()
        .map(|models| {
            models
                .iter()
                .filter(|m| {
                    // Keep anything that can return an image, plus the plain
                    // generateContent models so a transcription id is visible too.
                    m["supportedGenerationMethods"]
                        .as_array()
                        .map(|ms| {
                            ms.iter().any(|s| {
                                let s = s.as_str().unwrap_or("");
                                s == "generateContent" || s == "predict"
                            })
                        })
                        .unwrap_or(false)
                })
                .filter_map(|m| m["name"].as_str().map(|s| s.trim_start_matches("models/").to_string()))
                .collect()
        })
        .unwrap_or_default();
    out.sort();
    Ok(out)
}
