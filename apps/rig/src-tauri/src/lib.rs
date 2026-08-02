use std::sync::Mutex;
use tauri::{Emitter, Manager, RunEvent, WindowEvent};
mod plugins;
mod skills;
mod update;

const OPEN_APP_UPDATE_EVENT: &str = "open-app-update";
const CHECK_FOR_UPDATES_MENU_ID: &str = "check-for-updates";

#[cfg(target_os = "macos")]
fn setup_macos_menu(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{AboutMetadata, MenuBuilder, SubmenuBuilder};

    let app_menu = SubmenuBuilder::new(app, "Rig")
        .about(Some(AboutMetadata::default()))
        .separator()
        .text(CHECK_FOR_UPDATES_MENU_ID, "Check for Updates...")
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .fullscreen()
        .separator()
        .close_window()
        .build()?;

    let menu = MenuBuilder::new(app)
        .item(&app_menu)
        .item(&edit_menu)
        .item(&window_menu)
        .build()?;

    app.set_menu(menu)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // load environment variables from .env file
    dotenvy::dotenv().ok();

    let mut builder = tauri::Builder::default()
        .on_menu_event(|app, event| {
            if event.id() == CHECK_FOR_UPDATES_MENU_ID {
                let _ = app.emit(OPEN_APP_UPDATE_EVENT, ());
            }
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_keyring::init());

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_mcp_bridge::init());
    }

    let app = builder
        .setup(|app| {
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())
                .map_err(|e| e.to_string())?;
            app.manage(update::state::PendingUpdate(Mutex::new(None)));

            #[cfg(target_os = "macos")]
            setup_macos_menu(app)?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            update::commands::fetch_update,
            update::commands::install_update,
            plugins::commands::install_plugin_target,
            plugins::commands::list_plugin_targets,
            skills::commands::import_skill_root,
            skills::commands::archive_skill,
            skills::commands::check_skill_updates,
            skills::commands::list_archived_skills,
            skills::commands::list_skill_roots,
            skills::commands::list_skills,
            skills::commands::list_skill_usage_events,
            skills::commands::list_skill_usages,
            skills::commands::list_skill_usages_tendency,
            skills::commands::remove_skill,
            skills::commands::remove_skill_root,
            skills::commands::restore_skill,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| match event {
        RunEvent::WindowEvent {
            label,
            event: WindowEvent::CloseRequested { api, .. },
            ..
        } if label == "main" => {
            api.prevent_close();

            if let Some(window) = app_handle.get_webview_window(&label) {
                let _ = window.hide();
            }
        }
        #[cfg(target_os = "macos")]
        RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } => {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        _ => {}
    });
}
