//! Live provider probe — lists which API keys are configured in the OS keychain,
//! and (optionally) runs ONE real round-trip against a chosen provider to verify
//! the adapter end-to-end. Usage:
//!   cargo run --example probe                 # list configured providers
//!   cargo run --example probe -- gemini       # verify Gemini text round-trip
//!   cargo run --example probe -- elevenlabs   # verify ElevenLabs TTS
//!   cargo run --example probe -- fal          # verify fal.ai image
//!   cargo run --example probe -- openai        | gpt_image | stability
//!   cargo run --example probe -- google_imagen | replicate

use motionforge_lib::providers::audio::ElevenLabsProvider;
use motionforge_lib::providers::image::{
    FalImageProvider, GoogleImagenProvider, OpenAiImageProvider, StabilityImageProvider,
};
use motionforge_lib::providers::kie::KieImageProvider;
use motionforge_lib::providers::replicate::ReplicateProvider;
use motionforge_lib::providers::text::GeminiTextProvider;
use motionforge_lib::providers::{AudioProvider, ImageProvider, TextProvider};
use motionforge_lib::secrets;

#[tokio::main]
async fn main() {
    println!("== Configured providers (keychain) ==");
    let mut configured = vec![];
    for p in secrets::PROVIDERS {
        if secrets::is_configured(p) {
            println!("  [x] {p}");
            configured.push(p);
        }
    }
    if configured.is_empty() {
        println!("  (none — add keys in the desktop app's Settings)");
    }

    // Maintenance: `-- cleankey <provider>` strips ALL whitespace from a stored
    // key (fixes paste errors) and saves it back. No API key contains whitespace.
    if std::env::args().nth(1).as_deref() == Some("cleankey") {
        let p = std::env::args().nth(2).unwrap_or_default();
        match secrets::get_key(&p) {
            Ok(Some(k)) => {
                let cleaned: String = k.chars().filter(|c| !c.is_whitespace()).collect();
                if cleaned == k {
                    println!("'{p}' key has no whitespace ({} chars) — unchanged.", k.len());
                } else {
                    let _ = secrets::set_key(&p, &cleaned);
                    println!(
                        "'{p}' key cleaned: {} → {} chars (removed {} whitespace).",
                        k.len(),
                        cleaned.len(),
                        k.len() - cleaned.len()
                    );
                }
            }
            _ => println!("No key stored for '{p}'."),
        }
        return;
    }

    let which = match std::env::args().nth(1) {
        Some(w) => w,
        None => {
            println!("\nPass a provider id to run a live round-trip, e.g. `-- gemini`.");
            return;
        }
    };

    let key = match secrets::get_key(&which) {
        Ok(Some(k)) => k,
        _ => {
            println!("\nNo key stored for '{which}'.");
            return;
        }
    };

    println!(
        "\n== Live round-trip: {which} == (key length: {} chars, prefix: {}…)",
        key.len(),
        key.chars().take(4).collect::<String>()
    );
    let prompt = "A glowing 3D notebook icon resolving from particles, premium dark studio, soft key light, 16:9";

    match which.as_str() {
        "gemini" => {
            match GeminiTextProvider::new(key)
                .generate_pack("A 15-second teaser for an AI meeting-notes app called Aurora Notes")
                .await
            {
                Ok(pack) => println!(
                    "OK — Gemini returned a pack: \"{}\" with {} shots.",
                    pack.creative_direction.working_title,
                    pack.shots.len()
                ),
                Err(e) => println!("FAILED — {e:#}"),
            }
        }
        "elevenlabs" => report(
            ElevenLabsProvider::new(key)
                .generate_speech("Hello from Wheelbarrow MotionForge.", None)
                .await,
        ),
        "fal" => report(FalImageProvider::new(key).generate_image(prompt).await),
        "openai" | "gpt_image" => {
            report(OpenAiImageProvider::new(key).generate_image(prompt).await)
        }
        "stability" => report(StabilityImageProvider::new(key).generate_image(prompt).await),
        "google_imagen" => report(GoogleImagenProvider::new(key).generate_image(prompt).await),
        "replicate" => report(ReplicateProvider::new(key).generate_image(prompt).await),
        "kie" => report(KieImageProvider::new(key).generate_image(prompt).await),
        other => println!("No live test wired for '{other}' yet."),
    }
}

fn report(result: anyhow::Result<Vec<u8>>) {
    match result {
        Ok(bytes) => println!("OK — received {} bytes of media.", bytes.len()),
        Err(e) => println!("FAILED — {e:#}"),
    }
}
