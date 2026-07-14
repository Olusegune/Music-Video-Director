//! Native OS menu bar (File / Edit / View / Settings / Help).
//!
//! Menu clicks are forwarded to the frontend as `menu:<action>` events (see
//! `src/platform/lib/useMenuBridge.ts`), except for a handful of window-level
//! actions (reload, fullscreen, zoom) that are cheaper to handle directly here
//! since they don't need any React state.

use std::sync::Mutex;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{App, Emitter, Manager};

/// Tracks the webview zoom factor so Zoom In/Out/Reset can increment it.
pub struct ZoomLevel(pub Mutex<f64>);

const ZOOM_STEP: f64 = 0.1;
const ZOOM_MIN: f64 = 0.5;
const ZOOM_MAX: f64 = 2.0;

pub fn install(app: &mut App) -> tauri::Result<()> {
    app.manage(ZoomLevel(Mutex::new(1.0)));

    let new_project = MenuItemBuilder::with_id("new_project", "New Project")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let open_project = MenuItemBuilder::with_id("open_project", "Open Project…")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let save_project = MenuItemBuilder::with_id("save_project", "Save Project")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let save_project_as = MenuItemBuilder::with_id("save_project_as", "Save Project As…")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;
    let close_project = MenuItemBuilder::with_id("close_project", "Close Project")
        .accelerator("CmdOrCtrl+W")
        .build(app)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_project)
        .item(&open_project)
        .separator()
        .item(&save_project)
        .item(&save_project_as)
        .separator()
        .item(&close_project)
        .separator()
        .item(&PredefinedMenuItem::quit(app, Some("Exit"))?)
        .build()?;

    // Undo/Redo/Find intentionally have NO accelerator here: this app already
    // owns Ctrl+Z/Shift+Z/K globally via a JS keydown handler
    // (useGlobalShortcuts.ts) for its own cross-view time-machine and command
    // palette. Registering the same accelerator natively too would risk a
    // double-fire per keypress (e.g. two undos for one Ctrl+Z) depending on
    // whether WebView2 or the native menu sees the key first. The menu items
    // stay mouse-clickable and call the identical JS action either way.
    let undo = MenuItemBuilder::with_id("undo", "Undo").build(app)?;
    let redo = MenuItemBuilder::with_id("redo", "Redo").build(app)?;
    let find = MenuItemBuilder::with_id("find", "Find…").build(app)?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&undo)
        .item(&redo)
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .separator()
        .item(&find)
        .build()?;

    let reload = MenuItemBuilder::with_id("reload", "Reload")
        .accelerator("CmdOrCtrl+R")
        .build(app)?;
    let fullscreen = MenuItemBuilder::with_id("toggle_fullscreen", "Toggle Full Screen")
        .accelerator("F11")
        .build(app)?;
    let zoom_in = MenuItemBuilder::with_id("zoom_in", "Zoom In")
        .accelerator("CmdOrCtrl+=")
        .build(app)?;
    let zoom_out = MenuItemBuilder::with_id("zoom_out", "Zoom Out")
        .accelerator("CmdOrCtrl+-")
        .build(app)?;
    let zoom_reset = MenuItemBuilder::with_id("zoom_reset", "Actual Size")
        .accelerator("CmdOrCtrl+0")
        .build(app)?;
    let toggle_sidebar = MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar")
        .accelerator("CmdOrCtrl+B")
        .build(app)?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&reload)
        .separator()
        .item(&toggle_sidebar)
        .separator()
        .item(&zoom_in)
        .item(&zoom_out)
        .item(&zoom_reset)
        .separator()
        .item(&fullscreen)
        .build()?;

    let settings_item = MenuItemBuilder::with_id("settings", "Settings…")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let api_keys = MenuItemBuilder::with_id("api_keys", "API Keys…").build(app)?;
    let ai_models = MenuItemBuilder::with_id("ai_models", "AI Models…").build(app)?;
    let brand_kits = MenuItemBuilder::with_id("brand_kits", "Brand Kits…").build(app)?;

    let settings_menu = SubmenuBuilder::new(app, "Settings")
        .item(&settings_item)
        .separator()
        .item(&api_keys)
        .item(&ai_models)
        .item(&brand_kits)
        .build()?;

    let help_center = MenuItemBuilder::with_id("help", "Help Center")
        .accelerator("F1")
        .build(app)?;
    let shortcuts = MenuItemBuilder::with_id("shortcuts", "Keyboard Shortcuts").build(app)?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&help_center)
        .item(&shortcuts)
        .separator()
        .item(&PredefinedMenuItem::about(
            app,
            Some("About MotionForge AI"),
            Some(tauri::menu::AboutMetadata {
                name: Some("MotionForge AI".into()),
                version: Some(app.package_info().version.to_string()),
                copyright: Some("© Wheelbarrow".into()),
                ..Default::default()
            }),
        )?)
        .build()?;

    let menu = MenuBuilder::new(app)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&settings_menu)
        .item(&help_menu)
        .build()?;

    app.set_menu(menu)?;

    app.on_menu_event(move |app_handle, event| {
        let id = event.id().0.as_str();

        // Window-level actions handled directly — no round-trip to the frontend.
        if let Some(window) = app_handle.get_webview_window("main") {
            match id {
                "reload" => {
                    let _ = window.eval("window.location.reload()");
                    return;
                }
                "toggle_fullscreen" => {
                    let is_fs = window.is_fullscreen().unwrap_or(false);
                    let _ = window.set_fullscreen(!is_fs);
                    return;
                }
                "zoom_in" | "zoom_out" | "zoom_reset" => {
                    let state = app_handle.state::<ZoomLevel>();
                    let mut level = state.0.lock().unwrap();
                    *level = match id {
                        "zoom_in" => (*level + ZOOM_STEP).min(ZOOM_MAX),
                        "zoom_out" => (*level - ZOOM_STEP).max(ZOOM_MIN),
                        _ => 1.0,
                    };
                    let _ = window.set_zoom(*level);
                    return;
                }
                _ => {}
            }
        }

        // Everything else is app/React state — forward to the frontend.
        let event_name = format!("menu:{}", id.replace('_', "-"));
        let _ = app_handle.emit(&event_name, ());
    });

    Ok(())
}
