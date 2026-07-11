//! Live provider probe — lists which API keys are configured in the OS keychain,
//! and (optionally) runs ONE real round-trip against a chosen provider to verify
//! the adapter end-to-end. Usage:
//!   cargo run --example probe                 # list configured providers
//!   cargo run --example probe -- gemini       # verify Gemini text round-trip
//!   cargo run --example probe -- elevenlabs   # verify ElevenLabs TTS
//!   cargo run --example probe -- fal          # verify fal.ai image
//!   cargo run --example probe -- openai        | gpt_image | stability
//!   cargo run --example probe -- google_imagen | replicate
//!   cargo run --example probe -- nano_banana    | nano_banana_pro | wavespeed
//!   cargo run --example probe -- google_veo    # video (slower — polls a long-running op)
//!   cargo run --example probe -- kie_seedance  # Seedance 2.0 video via Kie.ai (bytedance/seedance-2)
//!   cargo run --example probe -- badkey        # deliberately-invalid key, proves the failure path
//!   cargo run --example probe -- smart_import  # Smart Import structured-JSON extraction (Gemini)

use motionforge_lib::providers::audio::ElevenLabsProvider;
use motionforge_lib::providers::image::{
    FalImageProvider, GoogleImagenProvider, OpenAiImageProvider, StabilityImageProvider,
};
use motionforge_lib::providers::kie::{KieImageProvider, KieVideoProvider};
use motionforge_lib::providers::replicate::ReplicateProvider;
use motionforge_lib::providers::text::GeminiTextProvider;
use motionforge_lib::providers::video::GoogleVeoProvider;
use motionforge_lib::providers::wavespeed::WaveSpeedImageProvider;
use motionforge_lib::providers::{AudioProvider, ImageProvider, TextProvider, VideoProvider};
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
                    println!(
                        "'{p}' key has no whitespace ({} chars) — unchanged.",
                        k.len()
                    );
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

    // Deliberately-invalid credential, to prove the failure path renders a real
    // provider rejection rather than a stored key. Uses fal.ai (cheap, fast to
    // reject on auth, does not touch anyone's real key or quota).
    if which == "badkey" {
        println!("\n== Live round-trip: badkey == (intentionally invalid credential)");
        match FalImageProvider::new("fal_key_intentionally_invalid_00000".to_string())
            .generate_image("A glowing 3D notebook icon, premium dark studio, 16:9")
            .await
        {
            Ok(bytes) => println!("UNEXPECTED OK — received {} bytes with a bad key.", bytes.len()),
            Err(e) => println!("FAILED as expected — {e:#}"),
        }
        return;
    }

    // kie_seedance reuses the "kie" keychain entry — Seedance is routed through
    // Kie.ai by model slug, not a separate credential.
    let key_lookup = match which.as_str() {
        "kie_seedance" => "kie",
        "smart_import" => "gemini",
        other => other,
    };
    let key = match secrets::get_key(key_lookup) {
        Ok(Some(k)) => k,
        _ => {
            println!("\nNo key stored for '{key_lookup}'.");
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
        "stability" => report(
            StabilityImageProvider::new(key)
                .generate_image(prompt)
                .await,
        ),
        "google_imagen" => report(GoogleImagenProvider::new(key).generate_image(prompt).await),
        "replicate" => report(ReplicateProvider::new(key).generate_image(prompt).await),
        "kie" => report(KieImageProvider::new(key).generate_image(prompt).await),
        "nano_banana" | "nano_banana_pro" => {
            report(GoogleImagenProvider::new(key).generate_image(prompt).await)
        }
        "wavespeed" => report(WaveSpeedImageProvider::new(key).generate_image(prompt).await),
        "google_veo" => report(GoogleVeoProvider::new(key).generate_video(prompt).await),
        "kie_seedance" => report(
            KieVideoProvider::new(key)
                .with_model(Some("bytedance/seedance-2".to_string()))
                .generate_video(prompt)
                .await,
        ),
        "smart_import" => {
            let doc = "SCENE 1. Mara Okafor, late 30s, a weathered freighter pilot with a shaved \
                head and a scar across her left cheek. She wears a patched flight jacket over \
                grease-stained coveralls. Quiet, methodical, distrustful of authority. She's \
                haunted by a crash that killed her crew and is searching for the saboteur.";
            let schema = r#"{"name":{"value":"string","confidence":"high|low","source":"string"},"age":{"value":"string","confidence":"high|low","source":"string"},"distinguishingFeatures":{"value":"string","confidence":"high|low","source":"string"},"primaryOutfit":{"value":"string","confidence":"high|low","source":"string"},"traits":{"value":"string","confidence":"high|low","source":"string"},"motivations":{"value":"string","confidence":"high|low","source":"string"}}"#;
            let prompt = format!(
                "You are extracting character sheet fields from a production document. Only \
                 include a field if the text directly supports it; omit anything not present — \
                 do not invent values. Include a short verbatim `source` excerpt per field.\n\nDOCUMENT:\n{doc}"
            );
            match GeminiTextProvider::new(key)
                .generate_structured(&prompt, schema)
                .await
            {
                Ok(json) => println!("OK — Gemini returned structured extraction:\n{json}"),
                Err(e) => println!("FAILED — {e:#}"),
            }
        }
        other => println!("No live test wired for '{other}' yet."),
    }
}

fn report(result: anyhow::Result<Vec<u8>>) {
    match result {
        Ok(bytes) => println!("OK — received {} bytes of media.", bytes.len()),
        Err(e) => println!("FAILED — {e:#}"),
    }
}
