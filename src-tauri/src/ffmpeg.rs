//! FFmpeg management — detect, resolve, and one-click install.
//!
//! The render path needs FFmpeg. Rather than make the user edit PATH, the app
//! looks for it in three places (in order): the `MOTIONFORGE_FFMPEG` env var, a
//! copy we manage under the app data dir, then the system PATH. If none is
//! found, the UI offers a one-click download of a static Windows build.

use std::path::{Path, PathBuf};
use tauri::AppHandle;

const FFMPEG_URL: &str = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip";

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FfmpegStatus {
    pub available: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    /// True when the resolved binary is the app-managed copy.
    pub managed: bool,
}

/// Build a Command that won't flash a console window on Windows.
fn command(bin: &Path) -> std::process::Command {
    let cmd = std::process::Command::new(bin);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let mut cmd = cmd;
        cmd.creation_flags(CREATE_NO_WINDOW);
        return cmd;
    }
    #[allow(unreachable_code)]
    cmd
}

/// The app-managed ffmpeg location: <app data>/ffmpeg/ffmpeg.exe.
pub fn managed_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(crate::paths::base_dir(app)?.join("ffmpeg").join(exe_name()))
}

fn exe_name() -> &'static str {
    if cfg!(windows) {
        "ffmpeg.exe"
    } else {
        "ffmpeg"
    }
}

/// Probe a candidate by running `<bin> -version`; return the version line.
fn probe(bin: &Path) -> Option<String> {
    let out = command(bin).arg("-version").output().ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&out.stdout);
    text.lines().next().map(|l| l.trim().to_string())
}

/// Resolve a usable ffmpeg binary, preferring explicit > managed > PATH.
pub fn resolve(app: &AppHandle) -> Option<PathBuf> {
    if let Ok(env) = std::env::var("MOTIONFORGE_FFMPEG") {
        let p = PathBuf::from(env);
        if probe(&p).is_some() {
            return Some(p);
        }
    }
    if let Ok(managed) = managed_path(app) {
        if managed.exists() && probe(&managed).is_some() {
            return Some(managed);
        }
    }
    let path_bin = PathBuf::from("ffmpeg");
    if probe(&path_bin).is_some() {
        return Some(path_bin);
    }
    None
}

pub fn check(app: &AppHandle) -> FfmpegStatus {
    match resolve(app) {
        Some(path) => {
            let version = probe(&path);
            let managed = managed_path(app).map(|m| m == path).unwrap_or(false);
            FfmpegStatus {
                available: true,
                path: Some(path.to_string_lossy().to_string()),
                version,
                managed,
            }
        }
        None => FfmpegStatus {
            available: false,
            path: None,
            version: None,
            managed: false,
        },
    }
}

/// Download a static Windows ffmpeg build and extract ffmpeg.exe into the
/// app-managed location. Returns the installed path. Windows-only download URL.
pub async fn install(app: &AppHandle) -> Result<String, String> {
    if !cfg!(windows) {
        return Err(
            "Automatic install is Windows-only. Install FFmpeg via your package manager.".into(),
        );
    }
    let dest = managed_path(app)?;
    let dir = dest.parent().ok_or("Bad ffmpeg path")?.to_path_buf();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    // Download the archive (~80 MB) into memory, then write it next to the dest.
    let resp = reqwest::get(FFMPEG_URL)
        .await
        .map_err(|e| format!("Download failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Download failed: HTTP {}", resp.status()));
    }
    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Download failed: {e}"))?;

    let zip_path = dir.join("ffmpeg-download.zip");
    std::fs::write(&zip_path, &bytes).map_err(|e| e.to_string())?;

    // Extract ffmpeg.exe (sync zip work off the async runtime).
    let dest2 = dest.clone();
    let zip2 = zip_path.clone();
    let result = tokio::task::spawn_blocking(move || extract_ffmpeg(&zip2, &dest2))
        .await
        .map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&zip_path);
    result?;

    Ok(dest.to_string_lossy().to_string())
}

/// Pull the first `*/bin/ffmpeg.exe` out of the archive into `dest`.
fn extract_ffmpeg(zip_path: &Path, dest: &Path) -> Result<(), String> {
    let file = std::fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().replace('\\', "/");
        if name.ends_with("bin/ffmpeg.exe") || name.ends_with("/ffmpeg") {
            let mut out = std::fs::File::create(dest).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    Err("ffmpeg.exe not found inside the downloaded archive.".into())
}
