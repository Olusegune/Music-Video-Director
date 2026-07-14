//! File dialog and disk project persistence operations.
//! Provides file picker dialogs for Open, Save, Save As, and recent files tracking.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const MAX_RECENT: usize = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentFile {
    pub path: String,
    pub name: String,
    pub opened_at: String,
}

/// Track a file in the recent files list.
pub fn add_recent_file(path: &str, name: &str) -> Result<(), String> {
    let mut recent = load_recent_files()?;

    // Remove if already present
    recent.retain(|f| f.path != path);

    // Add to front
    recent.insert(
        0,
        RecentFile {
            path: path.to_string(),
            name: name.to_string(),
            opened_at: chrono::Utc::now().to_rfc3339(),
        },
    );

    // Keep only max recent
    recent.truncate(MAX_RECENT);

    save_recent_files(&recent)
}

/// Load recent files from app preferences.
pub fn load_recent_files() -> Result<Vec<RecentFile>, String> {
    match fs::read_to_string(get_recent_files_path()) {
        Ok(data) => serde_json::from_str(&data).map_err(|e| e.to_string()),
        Err(_) => Ok(vec![]),
    }
}

/// Save recent files list.
fn save_recent_files(files: &[RecentFile]) -> Result<(), String> {
    let path = get_recent_files_path();
    let json = serde_json::to_string_pretty(files)
        .map_err(|e| format!("Failed to serialize recent files: {e}"))?;

    fs::create_dir_all(path.parent().unwrap_or(&PathBuf::from(".")))
        .map_err(|e| format!("Failed to create app data dir: {e}"))?;
    fs::write(&path, json)
        .map_err(|e| format!("Failed to write recent files: {e}"))
}

/// Get the path to the recent files metadata file.
fn get_recent_files_path() -> PathBuf {
    let app_data = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    app_data
        .join("MotionForgeAI")
        .join("recent-projects.json")
}

/// Write project data to disk as .mf JSON file.
pub fn write_project_file(path: &str, data: &str) -> Result<(), String> {
    let path = PathBuf::from(path);
    fs::create_dir_all(path.parent().unwrap_or(&PathBuf::from(".")))
        .map_err(|e| format!("Failed to create directory: {e}"))?;
    fs::write(&path, data).map_err(|e| format!("Failed to write file: {e}"))
}

/// Read project data from disk.
pub fn read_project_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("Failed to read file: {e}"))
}
