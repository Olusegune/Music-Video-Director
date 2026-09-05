mod appmenu;
mod commands;
mod connectivity;
mod db;
mod export;
mod ffmpeg;
mod file_ops;
pub mod models;
mod paths;
pub mod providers;
mod render;
pub mod secrets;

use db::Db;
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Open (or create) the local SQLite database in the writable base dir
            // (per-user app data, or <exe>/data when running portable).
            let handle = app.handle().clone();
            let dir = paths::base_dir(&handle)
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            std::fs::create_dir_all(&dir)?;
            // Allow generated images/videos to load through the asset protocol in
            // EVERY mode. The static `$APPDATA/**` scope in tauri.conf.json is
            // unreliable across installs, so explicitly whitelist the real assets
            // directory we write to. Without this, <img src=asset://…> is blocked.
            let _ = app
                .asset_protocol_scope()
                .allow_directory(dir.join("assets"), true);
            let conn = Connection::open(dir.join("motionforge.db"))?;
            db::init(&conn)?;
            app.manage(Db(Mutex::new(conn)));
            appmenu::install(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_projects,
            commands::create_project,
            commands::delete_project,
            commands::get_provider_key_statuses,
            commands::set_provider_key,
            commands::clear_provider_key,
            commands::generate_prompt_pack,
            commands::generate_structured_text,
            commands::get_latest_pack,
            commands::save_pack,
            commands::generate_shot_image,
            commands::import_shot_image,
            commands::generate_shot_video,
            commands::generate_voiceover,
            commands::export_project,
            commands::list_brand_kits,
            commands::save_brand_kit,
            commands::delete_brand_kit,
            commands::list_characters,
            commands::save_character,
            commands::delete_character,
            commands::generate_character_portrait,
            commands::list_environments,
            commands::save_environment,
            commands::delete_environment,
            commands::generate_environment_image,
            commands::list_props,
            commands::save_prop,
            commands::delete_prop,
            commands::generate_prop_image,
            commands::generate_motion_test,
            commands::generate_mv_shot_video,
            commands::generate_mv_audio,
            commands::import_song_audio,
            commands::slice_song_audio,
            commands::render_music_video,
            commands::check_ffmpeg,
            commands::install_ffmpeg,
            commands::generate_image_pro,
            commands::export_bible,
            commands::read_asset_data_url,
            commands::test_provider_connection,
            commands::get_recent_projects,
            commands::add_recent_project,
            commands::write_project_to_disk,
            commands::read_project_from_disk,
            commands::record_usage,
            commands::list_usage,
            commands::check_provider_balance,
            commands::doc_get_all,
            commands::doc_set,
            commands::doc_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
