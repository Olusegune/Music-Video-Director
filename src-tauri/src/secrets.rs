//! API-key storage backed by the OS keychain (Windows Credential Manager).
//! Keys are never returned to the frontend — only their presence is reported.

use anyhow::Result;
use keyring::Entry;

const SERVICE: &str = "ai.wheelbarrow.motionforge";

/// Allowed provider ids — mirrors `ProviderId` in the frontend.
pub const PROVIDERS: [&str; 25] = [
    "gemini",
    "openai",
    "fal",
    "kie",
    "google_imagen",
    "google_veo",
    "nano_banana",
    "nano_banana_pro",
    "gpt_image",
    "stability",
    "midjourney",
    "runway",
    "kling",
    "luma",
    "pika",
    "elevenlabs",
    "suno",
    "replicate",
    "local_endpoint",
    "grok",
    "wavespeed",
    "happyhorse",
    "minimax",
    "recraft",
    "ideogram",
];

fn entry(provider: &str) -> Result<Entry> {
    Ok(Entry::new(SERVICE, provider)?)
}

pub fn set_key(provider: &str, key: &str) -> Result<()> {
    entry(provider)?.set_password(key)?;
    Ok(())
}

pub fn get_key(provider: &str) -> Result<Option<String>> {
    match entry(provider)?.get_password() {
        Ok(k) => Ok(Some(k)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn clear_key(provider: &str) -> Result<()> {
    match entry(provider)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.into()),
    }
}

pub fn is_configured(provider: &str) -> bool {
    matches!(get_key(provider), Ok(Some(_)))
}
