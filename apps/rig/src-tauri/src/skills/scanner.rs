use std::fs;
use std::path::{Path, PathBuf};

use walkdir::{DirEntry, WalkDir};

use super::models::{
    Skill, SkillListingError, SkillListingErrorCode, SkillRoot, SkillValidationError,
    SkillValidationErrorCode,
};
use super::parser::parse_skill_file_content;

const IGNORED_DIRECTORY_NAMES: &[&str] = &[".archive", ".backups", ".git", "node_modules"];

pub fn list_skills_from_root(root: &SkillRoot) -> Result<Vec<Skill>, SkillListingError> {
    let root_path = Path::new(root.path.as_str());
    let skill_files = collect_skill_files(root_path)?;

    Ok(skill_files
        .iter()
        .map(|skill_file_path| build_skill_from_file(root, root_path, skill_file_path))
        .collect())
}

fn collect_skill_files(root_path: &Path) -> Result<Vec<PathBuf>, SkillListingError> {
    WalkDir::new(root_path)
        .into_iter()
        .filter_entry(should_visit_entry)
        .filter_map(|entry| match entry {
            Ok(entry) if is_skill_file(&entry) => Some(Ok(entry.path().to_path_buf())),
            Ok(_) => None,
            Err(error) => Some(Err(SkillListingError {
                code: SkillListingErrorCode::ReadFailed,
                message: format!("Failed to read skill file: {}", error),
            })),
        })
        .collect()
}

fn should_visit_entry(entry: &DirEntry) -> bool {
    if !entry.file_type().is_dir() {
        return true;
    }

    let Some(name) = entry.file_name().to_str() else {
        return true;
    };

    !IGNORED_DIRECTORY_NAMES.contains(&name)
}

fn is_skill_file(entry: &DirEntry) -> bool {
    entry.file_type().is_file() && entry.file_name() == "SKILL.md"
}

fn build_skill_from_file(root: &SkillRoot, root_path: &Path, skill_file_path: &Path) -> Skill {
    let skill_dir = skill_file_path.parent().unwrap_or(root_path);
    let relative_path = skill_dir
        .strip_prefix(root_path)
        .unwrap_or(skill_dir)
        .to_string_lossy()
        .to_string();
    let fallback_name = skill_dir
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unknown-skill")
        .to_string();
    let updated_at = skill_file_path
        .metadata()
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .map(|modified| {
            let datetime: chrono::DateTime<chrono::Utc> = modified.into();
            datetime.to_rfc3339()
        });

    match fs::read_to_string(skill_file_path) {
        Ok(file_content) => match parse_skill_file_content(&file_content) {
            Ok(parsed) => Skill {
                id: relative_path.clone(),
                name: parsed.name,
                root_path: root_path.to_string_lossy().to_string(),
                relative_path,
                content: parsed.content,
                description: parsed.description,
                is_valid: true,
                validation_error: None,
                updated_at,
                provider: root.provider.clone(),
                scope_id: root.scope_id.clone(),
                scope_label: root.scope_label.clone(),
                scope_kind: root.scope_kind.clone(),
                root_id: root.id.clone(),
                root_label: root.label.clone(),
            },
            Err(validation_error) => Skill {
                id: relative_path.clone(),
                name: fallback_name,
                root_path: root_path.to_string_lossy().to_string(),
                relative_path,
                content: file_content,
                description: None,
                is_valid: false,
                validation_error: Some(validation_error),
                updated_at,
                provider: root.provider.clone(),
                scope_id: root.scope_id.clone(),
                scope_label: root.scope_label.clone(),
                scope_kind: root.scope_kind.clone(),
                root_id: root.id.clone(),
                root_label: root.label.clone(),
            },
        },
        Err(error) => Skill {
            id: relative_path.clone(),
            name: fallback_name,
            root_path: root_path.to_string_lossy().to_string(),
            relative_path,
            content: String::new(),
            description: None,
            is_valid: false,
            validation_error: Some(SkillValidationError {
                code: SkillValidationErrorCode::ReadFailed,
                message: format!("Failed to read SKILL.md: {}", error),
            }),
            updated_at,
            provider: root.provider.clone(),
            scope_id: root.scope_id.clone(),
            scope_label: root.scope_label.clone(),
            scope_kind: root.scope_kind.clone(),
            root_id: root.id.clone(),
            root_label: root.label.clone(),
        },
    }
}
