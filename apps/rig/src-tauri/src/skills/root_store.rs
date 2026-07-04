use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use super::models::{
    ImportedSkillRoot, SkillProvider, SkillRoot, SkillRootImportError, SkillRootImportErrorCode,
    SkillRootKind, SkillScopeKind,
};

const SKILL_ROOTS_FILE_NAME: &str = "skill-roots.json";

pub fn list_imported_skill_roots(app: &AppHandle) -> Vec<SkillRoot> {
    load_imported_skill_roots(app)
        .unwrap_or_default()
        .into_iter()
        .flat_map(repository_provider_roots)
        .collect()
}

pub fn import_skill_root_from_path(
    app: &AppHandle,
    path: PathBuf,
) -> Result<SkillRoot, SkillRootImportError> {
    if !path.exists() {
        return Err(SkillRootImportError {
            code: SkillRootImportErrorCode::PathNotFound,
            message: format!("Skill root path does not exist: {}", path.display()),
        });
    }

    if !path.is_dir() {
        return Err(SkillRootImportError {
            code: SkillRootImportErrorCode::NotDirectory,
            message: format!("Skill root path is not a directory: {}", path.display()),
        });
    }

    let path = path.canonicalize().map_err(|error| SkillRootImportError {
        code: SkillRootImportErrorCode::ReadFailed,
        message: format!("Failed to resolve skill root path: {}", error),
    })?;

    let label = path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());
    let path = path.to_string_lossy().to_string();

    let mut imported_roots = load_imported_skill_roots(app)?;

    if let Some(existing) = imported_roots.iter().find(|root| root.path == path) {
        return Ok(repository_provider_root(existing.clone()));
    }

    if imported_roots.iter().any(|root| root.id == label) {
        return Err(SkillRootImportError {
            code: SkillRootImportErrorCode::DuplicateId,
            message: format!("A skill root with id '{}' already exists", label),
        });
    }

    let imported = ImportedSkillRoot {
        id: label.clone(),
        path,
        label,
    };

    imported_roots.push(imported.clone());
    save_imported_skill_roots(app, &imported_roots)?;

    Ok(repository_provider_root(imported))
}

pub fn remove_imported_skill_root(
    app: &AppHandle,
    root_id: String,
) -> Result<(), SkillRootImportError> {
    let mut imported_roots = load_imported_skill_roots(app)?;
    let root_count = imported_roots.len();

    imported_roots.retain(|root| root.id != root_id);

    if imported_roots.len() == root_count {
        return Err(SkillRootImportError {
            code: SkillRootImportErrorCode::NotFound,
            message: format!("Imported skill root not found: {}", root_id),
        });
    }

    save_imported_skill_roots(app, &imported_roots)
}

fn load_imported_skill_roots(
    app: &AppHandle,
) -> Result<Vec<ImportedSkillRoot>, SkillRootImportError> {
    let path = skill_roots_file_path(app)?;

    if !path.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&path).map_err(|error| SkillRootImportError {
        code: SkillRootImportErrorCode::ReadFailed,
        message: format!("Failed to read imported skill roots: {}", error),
    })?;

    serde_json::from_str(&content).map_err(|error| SkillRootImportError {
        code: SkillRootImportErrorCode::ReadFailed,
        message: format!("Failed to parse imported skill roots: {}", error),
    })
}

fn save_imported_skill_roots(
    app: &AppHandle,
    roots: &[ImportedSkillRoot],
) -> Result<(), SkillRootImportError> {
    let path = skill_roots_file_path(app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| SkillRootImportError {
            code: SkillRootImportErrorCode::WriteFailed,
            message: format!("Failed to create skill roots directory: {}", error),
        })?;
    }

    let content = serde_json::to_string_pretty(roots).map_err(|error| SkillRootImportError {
        code: SkillRootImportErrorCode::WriteFailed,
        message: format!("Failed to serialize imported skill roots: {}", error),
    })?;

    fs::write(path, content).map_err(|error| SkillRootImportError {
        code: SkillRootImportErrorCode::WriteFailed,
        message: format!("Failed to write imported skill roots: {}", error),
    })
}

fn skill_roots_file_path(app: &AppHandle) -> Result<PathBuf, SkillRootImportError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| SkillRootImportError {
            code: SkillRootImportErrorCode::ReadFailed,
            message: format!("Failed to resolve app data directory: {}", error),
        })?;

    Ok(app_data_dir.join(SKILL_ROOTS_FILE_NAME))
}

struct ProviderRootTemplate {
    provider: SkillProvider,
    id_suffix: &'static str,
    label: &'static str,
    relative_path: &'static str,
}

const PROVIDER_ROOT_TEMPLATES: &[ProviderRootTemplate] = &[
    ProviderRootTemplate {
        provider: SkillProvider::Agents,
        id_suffix: "agents",
        label: "Agents",
        relative_path: ".agents/skills",
    },
    ProviderRootTemplate {
        provider: SkillProvider::Claude,
        id_suffix: "claude",
        label: "Claude",
        relative_path: ".claude/skills",
    },
    ProviderRootTemplate {
        provider: SkillProvider::OpenCode,
        id_suffix: "opencode",
        label: "OpenCode",
        relative_path: ".opencode/skills",
    },
    ProviderRootTemplate {
        provider: SkillProvider::Hermes,
        id_suffix: "hermes",
        label: "Hermes",
        relative_path: ".hermes/skills",
    },
    ProviderRootTemplate {
        provider: SkillProvider::Cursor,
        id_suffix: "cursor",
        label: "Cursor",
        relative_path: ".cursor/skills",
    },
];

fn repository_provider_root(root: ImportedSkillRoot) -> SkillRoot {
    repository_provider_roots(root)
        .into_iter()
        .next()
        .expect("repository provider templates should not be empty")
}

fn repository_provider_roots(root: ImportedSkillRoot) -> Vec<SkillRoot> {
    let repo_path = PathBuf::from(&root.path);
    let scope_label = repo_path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| root.label.clone());

    PROVIDER_ROOT_TEMPLATES
        .iter()
        .map(|template| {
            let path = repo_path.join(template.relative_path);

            SkillRoot {
                id: format!("repo-{}-{}", root.id, template.id_suffix),
                path: path.to_string_lossy().to_string(),
                label: template.label.to_string(),
                exists: path.exists(),
                kind: SkillRootKind::Repository,
                provider: template.provider.clone(),
                scope_id: root.path.clone(),
                scope_label: scope_label.clone(),
                scope_kind: SkillScopeKind::Repository,
            }
        })
        .collect()
}
