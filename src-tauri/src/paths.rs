//! Writable-base-directory resolution, with portable-mode support.
//!
//! Normal install → per-user OS app data dir (`%APPDATA%\ai.wheelbarrow.motionforge`).
//! Portable → if a `portable.txt` marker sits next to the executable, all data
//! (SQLite DB, generated assets, exports) lives in `<exe_dir>\data` so the whole
//! thing travels on a USB stick with no install and no machine-bound state.

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// True when a `portable.txt` marker file sits next to the running executable.
pub fn is_portable() -> bool {
    std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|d| d.join("portable.txt").exists()))
        .unwrap_or(false)
}

/// The app's writable base directory for this run.
pub fn base_dir(app: &AppHandle) -> Result<PathBuf, String> {
    if is_portable() {
        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                return Ok(dir.join("data"));
            }
        }
    }
    app.path().app_data_dir().map_err(|e| e.to_string())
}
