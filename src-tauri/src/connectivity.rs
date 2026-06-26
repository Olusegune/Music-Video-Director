//! Provider connection tests.
//!
//! Each test is a cheap, well-known GET that validates a key without spending
//! generation credits. We map HTTP outcomes to the spec's status vocabulary:
//! Connected / Invalid Key / Offline. Providers without a safe, free probe
//! return `Untested` (the key is stored, we just can't verify it for free).
//!
//! Keys never leave Rust — this module receives the key from the keychain and
//! sends it only to the provider's own API.

use serde::Serialize;
use std::time::Duration;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionResult {
    /// "connected" | "invalid" | "offline" | "untested" | "not_configured"
    pub status: String,
    pub message: String,
}

impl ConnectionResult {
    fn ok(msg: &str) -> Self {
        Self { status: "connected".into(), message: msg.into() }
    }
    fn invalid(msg: String) -> Self {
        Self { status: "invalid".into(), message: msg }
    }
    fn offline(msg: String) -> Self {
        Self { status: "offline".into(), message: msg }
    }
    fn untested(msg: &str) -> Self {
        Self { status: "untested".into(), message: msg.into() }
    }
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .unwrap_or_default()
}

/// Map a finished response to a result. 2xx → connected, 401/403 → invalid key,
/// other 4xx → invalid (with the provider's message), 5xx → offline.
async fn classify(resp: reqwest::Response, ok_msg: &str) -> ConnectionResult {
    let status = resp.status();
    if status.is_success() {
        return ConnectionResult::ok(ok_msg);
    }
    let code = status.as_u16();
    let body = resp.text().await.unwrap_or_default();
    let snippet: String = body.chars().take(180).collect();
    match code {
        401 | 403 => ConnectionResult::invalid(
            "Key rejected (auth failed) — double-check the key value.".into(),
        ),
        404 => ConnectionResult::invalid(format!(
            "Not found (404) — endpoint or model may have changed. {snippet}"
        )),
        405 => ConnectionResult::offline(
            "Method not allowed (405) — app probe issue, not your key.".into(),
        ),
        429 => ConnectionResult::invalid(
            "Rate limited / quota exceeded (429) — key is valid but throttled.".into(),
        ),
        c if status.is_server_error() => {
            ConnectionResult::offline(format!("Provider error {c} — try again later."))
        }
        c => ConnectionResult::invalid(format!("HTTP {c}: {snippet}")),
    }
}

/// Run the probe for `provider` using `key`. Never returns Err — transport
/// failures map to `offline`.
pub async fn test(provider: &str, key: &str) -> ConnectionResult {
    let c = client();

    let result = match provider {
        "gemini" | "google_imagen" | "google_veo" => {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models?key={key}"
            );
            c.get(url).send().await
        }
        "openai" | "gpt_image" => {
            c.get("https://api.openai.com/v1/models")
                .bearer_auth(key)
                .send()
                .await
        }
        "stability" => {
            c.get("https://api.stability.ai/v1/user/account")
                .bearer_auth(key)
                .send()
                .await
        }
        "elevenlabs" => {
            c.get("https://api.elevenlabs.io/v1/user")
                .header("xi-api-key", key)
                .send()
                .await
        }
        "replicate" => {
            c.get("https://api.replicate.com/v1/account")
                .header("Authorization", format!("Token {key}"))
                .send()
                .await
        }
        "fal" => {
            // fal has no free account endpoint. POST an empty body to the queue:
            // auth is checked BEFORE the (missing-prompt) validation error, so
            // 401/403 = bad key, while 422/400 = key accepted, no job queued.
            let resp = c
                .post("https://queue.fal.run/fal-ai/flux/schnell")
                .header("Authorization", format!("Key {key}"))
                .json(&serde_json::json!({}))
                .send()
                .await;
            return match resp {
                Ok(r) => {
                    let code = r.status().as_u16();
                    if code == 401 || code == 403 {
                        ConnectionResult::invalid(
                            "Key rejected (auth failed) — check your fal key.".into(),
                        )
                    } else {
                        // 200 / 422 / 400 etc. all mean auth was accepted.
                        ConnectionResult::ok("fal key accepted.")
                    }
                }
                Err(e) => ConnectionResult::offline(format!("Could not reach fal: {e}")),
            };
        }
        "kie" => {
            // kie validates the bearer on createTask before model validation;
            // an empty body → non-401 means the key is accepted.
            let resp = c
                .post("https://api.kie.ai/api/v1/jobs/createTask")
                .header("Authorization", format!("Bearer {key}"))
                .json(&serde_json::json!({}))
                .send()
                .await;
            return match resp {
                Ok(r) => {
                    let code = r.status().as_u16();
                    if code == 401 || code == 403 {
                        ConnectionResult::invalid(
                            "Key rejected (auth failed) — check your kie.ai key.".into(),
                        )
                    } else {
                        ConnectionResult::ok("kie.ai key accepted.")
                    }
                }
                Err(e) => ConnectionResult::offline(format!("Could not reach kie.ai: {e}")),
            };
        }
        // No safe/free probe documented — the key is stored, just unverified.
        _ => {
            return ConnectionResult::untested(
                "Key stored — automatic test not available for this provider.",
            );
        }
    };

    match result {
        Ok(resp) => classify(resp, "Authenticated successfully.").await,
        Err(e) => {
            if e.is_timeout() {
                ConnectionResult::offline("Request timed out.".into())
            } else if e.is_connect() {
                ConnectionResult::offline("Could not reach the provider.".into())
            } else {
                ConnectionResult::offline(format!("Network error: {e}"))
            }
        }
    }
}
