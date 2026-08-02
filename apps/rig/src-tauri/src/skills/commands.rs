use std::fs;
use std::path::{Component, Path};

use super::archive::{
    archive_skill_at_path, list_archived_skills_from_root, restore_skill_at_path,
};
use super::history::{
    list_skill_versions_at_path, read_skill_version_at_path, restore_skill_version_at_path,
    update_global_skill, SkillHistoryError, SkillUpdateResult, SkillVersionDetail,
    SkillVersionSummary,
};
use super::models::{
    BucketType, Skill, SkillArchiveError, SkillDeletionError, SkillDeletionErrorCode,
    SkillListingError, SkillRoot, SkillRootDefinition, SkillRootImportError, SkillRootKind,
    SkillUsage, SkillUsageError, SkillUsageEvent, SkillUsageSeries, WindowType,
};
use super::root_store::{
    import_skill_root_from_path, list_imported_skill_roots, remove_imported_skill_root,
};
use super::scanner::list_skills_from_root;
use super::updates::{check_global_skill_updates, SkillUpdateStatus};
use super::usage::{
    list_skill_usage_events_from_log, list_skill_usage_tendencies_from_log,
    list_skill_usages_from_log,
};
use crate::skills::fs::expand_path;
use crate::skills::models::SkillListingErrorCode;

const SKILL_USAGE_LOG_PATH: &str = "~/.rig/usage.jsonl";

#[tauri::command]
pub async fn check_skill_updates() -> Vec<SkillUpdateStatus> {
    check_global_skill_updates().await
}

#[tauri::command]
pub async fn update_skill(name: String) -> Result<SkillUpdateResult, SkillHistoryError> {
    update_global_skill(name).await
}

#[tauri::command]
pub fn list_skill_versions(
    root_path: String,
    relative_path: String,
) -> Result<Vec<SkillVersionSummary>, SkillHistoryError> {
    list_skill_versions_at_path(&root_path, &relative_path)
}

#[tauri::command]
pub fn read_skill_version(
    root_path: String,
    relative_path: String,
    version_id: String,
) -> Result<SkillVersionDetail, SkillHistoryError> {
    read_skill_version_at_path(&root_path, &relative_path, &version_id)
}

#[tauri::command]
pub fn restore_skill_version(
    root_path: String,
    relative_path: String,
    version_id: String,
) -> Result<SkillVersionSummary, SkillHistoryError> {
    restore_skill_version_at_path(&root_path, &relative_path, &version_id)
}

pub const SKILL_ROOT_DEFINITIONS: &[SkillRootDefinition] = &[
    SkillRootDefinition {
        id: "agents-global",
        path: "~/.agents/skills",
        label: "Codex Personal Skills",
    },
    SkillRootDefinition {
        id: "opencode-global",
        path: "~/.config/opencode/skills",
        label: "OpenCode Global Skills",
    },
    SkillRootDefinition {
        id: "claude-global",
        path: "~/.claude/skills",
        label: "Claude Global Skills",
    },
];

#[tauri::command]
pub fn list_skill_roots(app: tauri::AppHandle) -> Vec<SkillRoot> {
    let mut roots = SKILL_ROOT_DEFINITIONS
        .iter()
        .map(|definition| {
            let path = expand_path(definition.path);

            SkillRoot {
                id: definition.id.to_string(),
                path: path.to_string_lossy().to_string(),
                label: definition.label.to_string(),
                exists: path.exists(),
                kind: SkillRootKind::Default,
            }
        })
        .collect::<Vec<_>>();

    roots.extend(list_imported_skill_roots(&app));
    roots
}

#[tauri::command]
pub fn import_skill_root(
    app: tauri::AppHandle,
    path: String,
) -> Result<SkillRoot, SkillRootImportError> {
    import_skill_root_from_path(&app, expand_path(path.as_str()))
}

#[tauri::command]
pub fn remove_skill_root(
    app: tauri::AppHandle,
    root_id: String,
) -> Result<(), SkillRootImportError> {
    remove_imported_skill_root(&app, root_id)
}

#[tauri::command]
pub fn list_skills(root_path: String) -> Result<Vec<Skill>, SkillListingError> {
    let path = expand_path(root_path.as_str());

    if !path.exists() {
        return Err(SkillListingError {
            code: SkillListingErrorCode::PathNotFound,
            message: format!("Skill root path does not exist: {}", root_path),
        });
    }

    if !path.is_dir() {
        return Err(SkillListingError {
            code: SkillListingErrorCode::NotDirectory,
            message: format!("Skill root path is not a directory: {}", root_path),
        });
    }

    return list_skills_from_root(&path);
}

#[tauri::command]
pub fn list_archived_skills(root_path: String) -> Result<Vec<Skill>, SkillListingError> {
    let path = expand_path(root_path.as_str());

    if !path.exists() {
        return Err(SkillListingError {
            code: SkillListingErrorCode::PathNotFound,
            message: format!("Skill root path does not exist: {}", root_path),
        });
    }

    if !path.is_dir() {
        return Err(SkillListingError {
            code: SkillListingErrorCode::NotDirectory,
            message: format!("Skill root path is not a directory: {}", root_path),
        });
    }

    list_archived_skills_from_root(&path)
}

#[tauri::command]
pub fn archive_skill(root_path: String, relative_path: String) -> Result<(), SkillArchiveError> {
    archive_skill_at_path(
        &expand_path(root_path.as_str()),
        Path::new(relative_path.as_str()),
    )
}

#[tauri::command]
pub fn restore_skill(root_path: String, relative_path: String) -> Result<(), SkillArchiveError> {
    restore_skill_at_path(
        &expand_path(root_path.as_str()),
        Path::new(relative_path.as_str()),
    )
}

#[tauri::command]
pub fn remove_skill(root_path: String, relative_path: String) -> Result<(), SkillDeletionError> {
    let root_path = expand_path(root_path.as_str());

    if relative_path.is_empty() {
        return Err(SkillDeletionError {
            code: SkillDeletionErrorCode::OutsideRoot,
            message: "Refusing to remove the skill root itself.".to_string(),
        });
    }

    let relative_path = Path::new(relative_path.as_str());

    if relative_path.is_absolute()
        || relative_path
            .components()
            .any(|component| matches!(component, Component::ParentDir | Component::Prefix(_)))
    {
        return Err(SkillDeletionError {
            code: SkillDeletionErrorCode::OutsideRoot,
            message: "Skill path must stay inside the selected root.".to_string(),
        });
    }

    let root_path = root_path
        .canonicalize()
        .map_err(|error| SkillDeletionError {
            code: SkillDeletionErrorCode::PathNotFound,
            message: format!("Skill root path does not exist: {}", error),
        })?;

    if !root_path.is_dir() {
        return Err(SkillDeletionError {
            code: SkillDeletionErrorCode::NotDirectory,
            message: "Skill root path is not a directory.".to_string(),
        });
    }

    let skill_dir = root_path
        .join(relative_path)
        .canonicalize()
        .map_err(|error| SkillDeletionError {
            code: SkillDeletionErrorCode::PathNotFound,
            message: format!("Skill path does not exist: {}", error),
        })?;

    if !skill_dir.starts_with(&root_path) || skill_dir == root_path {
        return Err(SkillDeletionError {
            code: SkillDeletionErrorCode::OutsideRoot,
            message: "Skill path must stay inside the selected root.".to_string(),
        });
    }

    if !skill_dir.is_dir() {
        return Err(SkillDeletionError {
            code: SkillDeletionErrorCode::NotDirectory,
            message: "Skill path is not a directory.".to_string(),
        });
    }

    if !skill_dir.join("SKILL.md").is_file() {
        return Err(SkillDeletionError {
            code: SkillDeletionErrorCode::MissingSkillFile,
            message: "Skill directory does not contain SKILL.md.".to_string(),
        });
    }

    fs::remove_dir_all(&skill_dir).map_err(|error| SkillDeletionError {
        code: SkillDeletionErrorCode::DeleteFailed,
        message: format!("Failed to remove skill: {}", error),
    })
}

#[tauri::command]
pub fn list_skill_usages(window: Option<WindowType>) -> Result<Vec<SkillUsage>, SkillUsageError> {
    let path = expand_path(SKILL_USAGE_LOG_PATH);

    list_skill_usages_from_log(&path, window.unwrap_or(WindowType::Day))
}

#[tauri::command]
pub fn list_skill_usage_events(
    skill_name: String,
    limit: Option<usize>,
) -> Result<Vec<SkillUsageEvent>, SkillUsageError> {
    let path = expand_path(SKILL_USAGE_LOG_PATH);

    list_skill_usage_events_from_log(&path, skill_name.as_str(), limit.unwrap_or(20))
}

#[tauri::command]
pub fn list_skill_usages_tendency(
    window: Option<WindowType>,
    bucket_type: Option<BucketType>,
) -> Result<Vec<SkillUsageSeries>, SkillUsageError> {
    let path = expand_path(SKILL_USAGE_LOG_PATH);

    list_skill_usage_tendencies_from_log(
        &path,
        window.unwrap_or(WindowType::Week),
        bucket_type.unwrap_or(BucketType::Hour),
    )
}
