//! Diagnostic: does the real request shape work against the live model?
//!
//! cargo test --test probe_image -- --nocapture --ignored

#[tokio::test]
#[ignore]
async fn probe_image() {
    let key = motionforge_lib::secrets::get_key("gemini")
        .expect("keychain")
        .or(motionforge_lib::secrets::get_key("google_imagen").expect("keychain"))
        .expect("no key");

    for model in ["gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"] {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        );
        let body = serde_json::json!({
            "contents": [{ "parts": [{ "text": "A single wide cinematic frame of an empty neon street at night." }] }],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
                "imageConfig": { "aspectRatio": "16:9" }
            }
        });
        let resp = reqwest::Client::new().post(&url).json(&body).send().await.unwrap();
        let status = resp.status();
        let json: serde_json::Value = resp.json().await.unwrap();
        if !status.is_success() {
            println!("{model}: FAILED {} — {}", status, json["error"]["message"].as_str().unwrap_or("?"));
            continue;
        }
        // Find the returned image and report its real dimensions.
        let mut reported = "no image part".to_string();
        if let Some(parts) = json["candidates"][0]["content"]["parts"].as_array() {
            for p in parts {
                if let Some(b64) = p["inlineData"]["data"].as_str().or(p["inline_data"]["data"].as_str()) {
                    use base64::{engine::general_purpose::STANDARD as B64, Engine};
                    let bytes = B64.decode(b64).unwrap();
                    // PNG header: width/height are big-endian u32 at bytes 16..24.
                    reported = if bytes.len() > 24 && &bytes[1..4] == b"PNG" {
                        let w = u32::from_be_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]);
                        let h = u32::from_be_bytes([bytes[20], bytes[21], bytes[22], bytes[23]]);
                        format!("{w}x{h}  ratio {:.3}", w as f32 / h as f32)
                    } else {
                        format!("{} bytes (not PNG)", bytes.len())
                    };
                }
            }
        }
        println!("{model}: OK — {reported}");
    }
}
