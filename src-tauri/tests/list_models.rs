//! Diagnostic: ask Google which models this machine's key can actually reach.
//!
//! cargo test --test list_models -- --nocapture --ignored
//!
//! Ignored by default: it needs the real key from the OS keychain and makes a
//! network call. It exists because model ids are being retired under the app
//! faster than anyone notices — gemini-2.0-flash for transcription, then
//! gemini-2.5-flash-image and imagen-3.0-generate-002 for frames, each found
//! only when a batch failed.

#[tokio::test]
#[ignore]
async fn list_models() {
    let key = motionforge_lib::secrets::get_key("gemini")
        .expect("keychain read")
        .or(motionforge_lib::secrets::get_key("google_imagen").expect("keychain read"))
        .expect("no gemini/google key set");

    let url =
        format!("https://generativelanguage.googleapis.com/v1beta/models?key={key}&pageSize=200");
    let json: serde_json::Value = reqwest::get(&url).await.unwrap().json().await.unwrap();

    let mut names: Vec<(String, String)> = json["models"]
        .as_array()
        .expect("models array")
        .iter()
        .map(|m| {
            let n = m["name"].as_str().unwrap_or("").trim_start_matches("models/").to_string();
            let methods = m["supportedGenerationMethods"]
                .as_array()
                .map(|a| a.iter().filter_map(|s| s.as_str()).collect::<Vec<_>>().join(","))
                .unwrap_or_default();
            (n, methods)
        })
        .collect();
    names.sort();

    println!("\n=== IMAGE-CAPABLE ===");
    for (n, m) in names.iter().filter(|(n, _)| n.contains("image") || n.contains("imagen")) {
        println!("  {n}   [{m}]");
    }
    println!("\n=== TOTAL: {} models ===", names.len());
}
