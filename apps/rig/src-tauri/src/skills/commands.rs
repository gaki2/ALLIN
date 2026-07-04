use std::fs;
use std::path::{Component, Path};

use super::models::{
    BucketType, Skill, SkillCopyError, SkillCopyErrorCode, SkillDeletionError,
    SkillDeletionErrorCode, SkillListingError, SkillProvider, SkillRoot, SkillRootDefinition,
    SkillRootImportError, SkillRootKind, SkillScopeKind, SkillUsage, SkillUsageError,
    SkillUsageEvent, SkillUsageSeries, WindowType,
};
use super::root_store::{
    import_skill_root_from_path, list_imported_skill_roots, remove_imported_skill_root,
};
use super::scanner::list_skills_from_root;
use super::usage::{
    list_skill_usage_events_from_log, list_skill_usage_tendencies_from_log,
    list_skill_usages_from_log,
};
use crate::skills::fs::expand_path;
use crate::skills::models::SkillListingErrorCode;

const SKILL_USAGE_LOG_PATH: &str = "~/.rig/usage.jsonl";

pub const SKILL_ROOT_DEFINITIONS: &[SkillRootDefinition] = &[
    SkillRootDefinition {
        id: "global-agents",
        path: "~/.agents/skills",
        label: "Agents",
        provider: SkillProvider::Agents,
        scope_id: "global",
        scope_label: "Global",
        scope_kind: SkillScopeKind::Global,
    },
    SkillRootDefinition {
        id: "global-opencode",
        path: "~/.config/opencode/skills",
        label: "OpenCode",
        provider: SkillProvider::OpenCode,
        scope_id: "global",
        scope_label: "Global",
        scope_kind: SkillScopeKind::Global,
    },
    SkillRootDefinition {
        id: "global-claude",
        path: "~/.claude/skills",
        label: "Claude",
        provider: SkillProvider::Claude,
        scope_id: "global",
        scope_label: "Global",
        scope_kind: SkillScopeKind::Global,
    },
    SkillRootDefinition {
        id: "global-hermes",
        path: "~/.hermes/skills",
        label: "Hermes",
        provider: SkillProvider::Hermes,
        scope_id: "global",
        scope_label: "Global",
        scope_kind: SkillScopeKind::Global,
    },
    SkillRootDefinition {
        id: "global-cursor",
        path: "~/.cursor/skills",
        label: "Cursor",
        provider: SkillProvider::Cursor,
        scope_id: "global",
        scope_label: "Global",
        scope_kind: SkillScopeKind::Global,
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
                provider: definition.provider.clone(),
                scope_id: definition.scope_id.to_string(),
                scope_label: definition.scope_label.to_string(),
                scope_kind: definition.scope_kind.clone(),
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
pub fn list_skills(root: SkillRoot) -> Result<Vec<Skill>, SkillListingError> {
    let path = expand_path(root.path.as_str());

    if !path.exists() {
        return Err(SkillListingError {
            code: SkillListingErrorCode::PathNotFound,
            message: format!("Skill root path does not exist: {}", root.path),
        });
    }

    if !path.is_dir() {
        return Err(SkillListingError {
            code: SkillListingErrorCode::NotDirectory,
            message: format!("Skill root path is not a directory: {}", root.path),
        });
    }

    let root = SkillRoot {
        path: path.to_string_lossy().to_string(),
        ..root
    };

    return list_skills_from_root(&root);
}

fn is_invalid_relative_path(path: &Path) -> bool {
    path.as_os_str().is_empty()
        || path.is_absolute()
        || path
            .components()
            .any(|component| matches!(component, Component::ParentDir | Component::Prefix(_)))
}

fn copy_directory(source: &Path, target: &Path) -> std::io::Result<()> {
    fs::create_dir_all(target)?;

    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());

        if source_path.is_dir() {
            copy_directory(&source_path, &target_path)?;
        } else {
            fs::copy(&source_path, &target_path)?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn copy_skill(
    source_root_path: String,
    source_relative_path: String,
    target_root_path: String,
    target_relative_path: String,
) -> Result<(), SkillCopyError> {
    let source_root_path = expand_path(source_root_path.as_str())
        .canonicalize()
        .map_err(|error| SkillCopyError {
            code: SkillCopyErrorCode::PathNotFound,
            message: format!("Source skill root path does not exist: {}", error),
        })?;

    if !source_root_path.is_dir() {
        return Err(SkillCopyError {
            code: SkillCopyErrorCode::NotDirectory,
            message: "Source skill root path is not a directory.".to_string(),
        });
    }

    let source_relative_path = Path::new(source_relative_path.as_str());
    let target_relative_path = Path::new(target_relative_path.as_str());

    if is_invalid_relative_path(source_relative_path)
        || is_invalid_relative_path(target_relative_path)
    {
        return Err(SkillCopyError {
            code: SkillCopyErrorCode::OutsideRoot,
            message: "Skill paths must stay inside their selected roots.".to_string(),
        });
    }

    let source_skill_dir = source_root_path
        .join(source_relative_path)
        .canonicalize()
        .map_err(|error| SkillCopyError {
            code: SkillCopyErrorCode::PathNotFound,
            message: format!("Source skill path does not exist: {}", error),
        })?;

    if !source_skill_dir.starts_with(&source_root_path) || source_skill_dir == source_root_path {
        return Err(SkillCopyError {
            code: SkillCopyErrorCode::OutsideRoot,
            message: "Source skill path must stay inside the selected root.".to_string(),
        });
    }

    if !source_skill_dir.is_dir() {
        return Err(SkillCopyError {
            code: SkillCopyErrorCode::NotDirectory,
            message: "Source skill path is not a directory.".to_string(),
        });
    }

    if !source_skill_dir.join("SKILL.md").is_file() {
        return Err(SkillCopyError {
            code: SkillCopyErrorCode::MissingSkillFile,
            message: "Source skill directory does not contain SKILL.md.".to_string(),
        });
    }

    let target_root_path = expand_path(target_root_path.as_str());
    fs::create_dir_all(&target_root_path).map_err(|error| SkillCopyError {
        code: SkillCopyErrorCode::CopyFailed,
        message: format!("Failed to create target skill root: {}", error),
    })?;

    let target_root_path = target_root_path
        .canonicalize()
        .map_err(|error| SkillCopyError {
            code: SkillCopyErrorCode::PathNotFound,
            message: format!("Target skill root path does not exist: {}", error),
        })?;

    if !target_root_path.is_dir() {
        return Err(SkillCopyError {
            code: SkillCopyErrorCode::NotDirectory,
            message: "Target skill root path is not a directory.".to_string(),
        });
    }

    let target_skill_dir = target_root_path.join(target_relative_path);

    if target_skill_dir.exists() {
        return Err(SkillCopyError {
            code: SkillCopyErrorCode::TargetExists,
            message: "Target skill already exists.".to_string(),
        });
    }

    if let Some(target_parent) = target_skill_dir.parent() {
        fs::create_dir_all(target_parent).map_err(|error| SkillCopyError {
            code: SkillCopyErrorCode::CopyFailed,
            message: format!("Failed to create target skill parent directory: {}", error),
        })?;
    }

    copy_directory(&source_skill_dir, &target_skill_dir).map_err(|error| SkillCopyError {
        code: SkillCopyErrorCode::CopyFailed,
        message: format!("Failed to copy skill: {}", error),
    })
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_roots_include_hermes_global_provider_root() {
        let hermes_root = SKILL_ROOT_DEFINITIONS
            .iter()
            .find(|definition| definition.id == "global-hermes")
            .expect("Hermes global root should be registered");

        assert_eq!(hermes_root.path, "~/.hermes/skills");
        assert_eq!(hermes_root.label, "Hermes");
        assert_eq!(hermes_root.provider, SkillProvider::Hermes);
        assert_eq!(hermes_root.scope_id, "global");
        assert_eq!(hermes_root.scope_label, "Global");
        assert_eq!(hermes_root.scope_kind, SkillScopeKind::Global);
    }

    #[test]
    fn copy_skill_copies_directory_into_target_root() {
        let sandbox = make_test_sandbox("copy-success");
        let source_root = sandbox.join("agents");
        let target_root = sandbox.join("hermes");
        let source_skill = source_root.join("test-skill");
        fs::create_dir_all(source_skill.join("references")).unwrap();
        fs::write(
            source_skill.join("SKILL.md"),
            "---\nname: test-skill\ndescription: Test skill\n---\n",
        )
        .unwrap();
        fs::write(source_skill.join("references/details.md"), "details").unwrap();

        copy_skill(
            source_root.to_string_lossy().to_string(),
            "test-skill".to_string(),
            target_root.to_string_lossy().to_string(),
            "test-skill".to_string(),
        )
        .unwrap();

        assert!(target_root.join("test-skill/SKILL.md").is_file());
        assert_eq!(
            fs::read_to_string(target_root.join("test-skill/references/details.md")).unwrap(),
            "details"
        );

        let _ = fs::remove_dir_all(sandbox);
    }

    #[test]
    fn copy_skill_rejects_parent_directory_escape() {
        let sandbox = make_test_sandbox("copy-escape");
        let source_root = sandbox.join("agents");
        let target_root = sandbox.join("hermes");
        fs::create_dir_all(source_root.join("test-skill")).unwrap();
        fs::write(source_root.join("test-skill/SKILL.md"), "skill").unwrap();

        let error = copy_skill(
            source_root.to_string_lossy().to_string(),
            "../test-skill".to_string(),
            target_root.to_string_lossy().to_string(),
            "test-skill".to_string(),
        )
        .unwrap_err();

        assert_eq!(error.code, SkillCopyErrorCode::OutsideRoot);

        let _ = fs::remove_dir_all(sandbox);
    }

    #[test]
    fn copy_skill_rejects_existing_target() {
        let sandbox = make_test_sandbox("copy-existing-target");
        let source_root = sandbox.join("agents");
        let target_root = sandbox.join("hermes");
        fs::create_dir_all(source_root.join("test-skill")).unwrap();
        fs::write(source_root.join("test-skill/SKILL.md"), "source").unwrap();
        fs::create_dir_all(target_root.join("test-skill")).unwrap();
        fs::write(target_root.join("test-skill/SKILL.md"), "target").unwrap();

        let error = copy_skill(
            source_root.to_string_lossy().to_string(),
            "test-skill".to_string(),
            target_root.to_string_lossy().to_string(),
            "test-skill".to_string(),
        )
        .unwrap_err();

        assert_eq!(error.code, SkillCopyErrorCode::TargetExists);
        assert_eq!(
            fs::read_to_string(target_root.join("test-skill/SKILL.md")).unwrap(),
            "target"
        );

        let _ = fs::remove_dir_all(sandbox);
    }

    fn make_test_sandbox(name: &str) -> std::path::PathBuf {
        let sandbox =
            std::env::temp_dir().join(format!("rig-skill-copy-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&sandbox);
        fs::create_dir_all(&sandbox).unwrap();
        sandbox
    }
}
