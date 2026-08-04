use tauri::{AppHandle, State};
use tauri_plugin_updater::UpdaterExt;

use super::models::UpdateMetadata;
use super::state::PendingUpdate;

fn update_error(stage: &str, error: impl std::fmt::Display) -> String {
    let detail = error.to_string();
    log::error!(
        target: "rig::updater",
        "Update {stage} failed (app version {}): {detail}",
        env!("CARGO_PKG_VERSION")
    );
    format!("Update {stage} failed: {detail}")
}

#[tauri::command]
pub async fn fetch_update(
    app: AppHandle,
    pending_update: State<'_, PendingUpdate>,
) -> Result<Option<UpdateMetadata>, String> {
    log::info!(
        target: "rig::updater",
        "Checking for updates (app version {})",
        env!("CARGO_PKG_VERSION")
    );

    let updater = app
        .updater_builder()
        .build()
        .map_err(|error| update_error("setup", error))?;
    let update = updater
        .check()
        .await
        .map_err(|error| update_error("check", error))?;

    match update.as_ref() {
        Some(next) => log::info!(
            target: "rig::updater",
            "Update available: {} -> {}",
            next.current_version,
            next.version
        ),
        None => log::info!(
            target: "rig::updater",
            "Update check completed; app is current"
        ),
    }

    let update_metadata = update.as_ref().map(|update| UpdateMetadata {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
    });

    let mut guard = pending_update
        .0
        .lock()
        .map_err(|_| update_error("state", "Pending update state poisoned"))?;
    *guard = update;

    Ok(update_metadata)
}

#[tauri::command]
pub async fn install_update(
    app: AppHandle,
    pending_update: State<'_, PendingUpdate>,
) -> Result<(), String> {
    let update = {
        let mut guard = pending_update
            .0
            .lock()
            .map_err(|_| update_error("state", "Pending update state poisoned"))?;
        guard.take().ok_or_else(|| {
            update_error("install", "No pending update. Run check for updates first.")
        })?
    };

    log::info!(
        target: "rig::updater",
        "Installing update: {} -> {}",
        update.current_version,
        update.version
    );

    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|error| update_error("install", error))?;

    log::info!(target: "rig::updater", "Update installed; restarting app");

    app.restart();
}

#[cfg(test)]
mod tests {
    use super::update_error;

    #[test]
    fn keeps_the_updater_cause_in_command_errors() {
        let message = update_error("check", "HTTP 404 from update endpoint");

        assert_eq!(
            message,
            "Update check failed: HTTP 404 from update endpoint"
        );
    }
}
