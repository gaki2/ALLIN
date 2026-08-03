use std::fs;
use std::path::{Component, Path, PathBuf};

use super::models::{
    Skill, SkillArchiveError, SkillArchiveErrorCode, SkillListingError, SkillProvider, SkillRoot,
    SkillRootKind, SkillScopeKind,
};
use super::scanner::list_skills_from_root;

const ARCHIVE_DIRECTORY_NAME: &str = ".archive";

pub fn list_archived_skills_from_root(root_path: &Path) -> Result<Vec<Skill>, SkillListingError> {
    let archive_path = root_path.join(ARCHIVE_DIRECTORY_NAME);

    if !archive_path.exists() {
        return Ok(Vec::new());
    }

    let archive_root = SkillRoot {
        id: "archive".to_string(),
        path: archive_path.to_string_lossy().to_string(),
        label: "Archived".to_string(),
        exists: true,
        kind: SkillRootKind::Repository,
        provider: SkillProvider::Repository,
        scope_id: root_path.to_string_lossy().to_string(),
        scope_label: root_path
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_else(|| "Archived".to_string()),
        scope_kind: SkillScopeKind::Repository,
    };
    let mut skills = list_skills_from_root(&archive_root)?;
    let root_path = root_path.to_string_lossy().to_string();

    for skill in &mut skills {
        skill.root_path.clone_from(&root_path);
        skill.is_archived = true;
    }

    Ok(skills)
}

pub fn archive_skill_at_path(
    root_path: &Path,
    relative_path: &Path,
) -> Result<(), SkillArchiveError> {
    let root_path = canonical_skill_root(root_path)?;
    let relative_path = validate_relative_skill_path(relative_path)?;
    let source = canonical_skill_directory(&root_path, &relative_path)?;
    let archive_root =
        prepare_directory_inside_root(&root_path, Path::new(ARCHIVE_DIRECTORY_NAME))?;
    let destination = prepare_destination(&archive_root, &relative_path)?;

    move_skill_directory(&source, &destination, "archive")
}

pub fn restore_skill_at_path(
    root_path: &Path,
    relative_path: &Path,
) -> Result<(), SkillArchiveError> {
    let root_path = canonical_skill_root(root_path)?;
    let relative_path = validate_relative_skill_path(relative_path)?;
    let archive_root = root_path
        .join(ARCHIVE_DIRECTORY_NAME)
        .canonicalize()
        .map_err(|error| SkillArchiveError {
            code: SkillArchiveErrorCode::PathNotFound,
            message: format!("Skill archive does not exist: {}", error),
        })?;

    if !archive_root.starts_with(&root_path) || archive_root == root_path {
        return Err(outside_root_error());
    }

    let source = canonical_skill_directory(&archive_root, &relative_path)?;
    let destination = prepare_destination(&root_path, &relative_path)?;

    move_skill_directory(&source, &destination, "restore")
}

fn validate_relative_skill_path(relative_path: &Path) -> Result<PathBuf, SkillArchiveError> {
    if relative_path.as_os_str().is_empty()
        || relative_path.is_absolute()
        || relative_path.components().any(|component| {
            matches!(
                component,
                Component::ParentDir | Component::Prefix(_) | Component::RootDir
            )
        })
    {
        return Err(outside_root_error());
    }

    Ok(relative_path.to_path_buf())
}

fn canonical_skill_root(root_path: &Path) -> Result<PathBuf, SkillArchiveError> {
    let root_path = root_path
        .canonicalize()
        .map_err(|error| SkillArchiveError {
            code: SkillArchiveErrorCode::PathNotFound,
            message: format!("Skill root path does not exist: {}", error),
        })?;

    if !root_path.is_dir() {
        return Err(SkillArchiveError {
            code: SkillArchiveErrorCode::NotDirectory,
            message: "Skill root path is not a directory.".to_string(),
        });
    }

    Ok(root_path)
}

fn canonical_skill_directory(
    containing_root: &Path,
    relative_path: &Path,
) -> Result<PathBuf, SkillArchiveError> {
    let skill_directory = containing_root
        .join(relative_path)
        .canonicalize()
        .map_err(|error| SkillArchiveError {
            code: SkillArchiveErrorCode::PathNotFound,
            message: format!("Skill path does not exist: {}", error),
        })?;

    if !skill_directory.starts_with(containing_root) || skill_directory == containing_root {
        return Err(outside_root_error());
    }

    if !skill_directory.is_dir() {
        return Err(SkillArchiveError {
            code: SkillArchiveErrorCode::NotDirectory,
            message: "Skill path is not a directory.".to_string(),
        });
    }

    if !skill_directory.join("SKILL.md").is_file() {
        return Err(SkillArchiveError {
            code: SkillArchiveErrorCode::MissingSkillFile,
            message: "Skill directory does not contain SKILL.md.".to_string(),
        });
    }

    Ok(skill_directory)
}

fn prepare_directory_inside_root(
    containing_root: &Path,
    relative_path: &Path,
) -> Result<PathBuf, SkillArchiveError> {
    let path = containing_root.join(relative_path);
    fs::create_dir_all(&path).map_err(|error| SkillArchiveError {
        code: SkillArchiveErrorCode::MoveFailed,
        message: format!("Failed to create archive directory: {}", error),
    })?;

    let canonical_path = path.canonicalize().map_err(|error| SkillArchiveError {
        code: SkillArchiveErrorCode::MoveFailed,
        message: format!("Failed to read archive directory: {}", error),
    })?;

    if !canonical_path.starts_with(containing_root) || canonical_path == containing_root {
        return Err(outside_root_error());
    }

    Ok(canonical_path)
}

fn prepare_destination(
    containing_root: &Path,
    relative_path: &Path,
) -> Result<PathBuf, SkillArchiveError> {
    let destination = containing_root.join(relative_path);

    if destination.exists() {
        return Err(SkillArchiveError {
            code: SkillArchiveErrorCode::AlreadyExists,
            message: "A skill already exists at the destination path.".to_string(),
        });
    }

    let parent_relative_path = relative_path.parent().unwrap_or_else(|| Path::new(""));
    let parent = if parent_relative_path.as_os_str().is_empty() {
        containing_root.to_path_buf()
    } else {
        prepare_directory_inside_root(containing_root, parent_relative_path)?
    };
    let name = relative_path.file_name().ok_or_else(outside_root_error)?;

    Ok(parent.join(name))
}

fn move_skill_directory(
    source: &Path,
    destination: &Path,
    action: &str,
) -> Result<(), SkillArchiveError> {
    fs::rename(source, destination).map_err(|error| SkillArchiveError {
        code: SkillArchiveErrorCode::MoveFailed,
        message: format!("Failed to {} skill: {}", action, error),
    })
}

fn outside_root_error() -> SkillArchiveError {
    SkillArchiveError {
        code: SkillArchiveErrorCode::OutsideRoot,
        message: "Skill path must stay inside the selected root.".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    static TEST_ROOT_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    struct TestRoot {
        path: PathBuf,
    }

    impl TestRoot {
        fn new() -> Self {
            let nonce = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock should be after epoch")
                .as_nanos();
            let sequence = TEST_ROOT_SEQUENCE.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "rig-skill-archive-{}-{}-{}",
                std::process::id(),
                nonce,
                sequence
            ));
            fs::create_dir_all(&path).expect("test root should be created");
            Self { path }
        }

        fn add_skill(&self, relative_path: &str) {
            let directory = self.path.join(relative_path);
            fs::create_dir_all(&directory).expect("skill directory should be created");
            fs::write(
                directory.join("SKILL.md"),
                "---\nname: test-skill\ndescription: Test\n---\nInstructions",
            )
            .expect("skill should be written");
        }
    }

    impl Drop for TestRoot {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn archives_and_restores_a_skill_without_deleting_it() {
        let root = TestRoot::new();
        root.add_skill("group/test-skill");

        archive_skill_at_path(&root.path, Path::new("group/test-skill"))
            .expect("skill should archive");

        assert!(!root.path.join("group/test-skill").exists());
        assert!(root
            .path
            .join(".archive/group/test-skill/SKILL.md")
            .is_file());

        let archived =
            list_archived_skills_from_root(&root.path).expect("archived skills should list");
        assert_eq!(archived.len(), 1);
        assert!(archived[0].is_archived);
        assert_eq!(archived[0].relative_path, "group/test-skill");

        restore_skill_at_path(&root.path, Path::new("group/test-skill"))
            .expect("skill should restore");

        assert!(root.path.join("group/test-skill/SKILL.md").is_file());
        assert!(!root
            .path
            .join(".archive/group/test-skill/SKILL.md")
            .exists());
    }

    #[test]
    fn refuses_to_restore_over_an_existing_skill() {
        let root = TestRoot::new();
        root.add_skill("test-skill");
        archive_skill_at_path(&root.path, Path::new("test-skill")).expect("skill should archive");
        root.add_skill("test-skill");

        let error = restore_skill_at_path(&root.path, Path::new("test-skill"))
            .expect_err("restore should not overwrite");

        assert!(matches!(error.code, SkillArchiveErrorCode::AlreadyExists));
        assert!(root.path.join("test-skill/SKILL.md").is_file());
        assert!(root.path.join(".archive/test-skill/SKILL.md").is_file());
    }

    #[test]
    fn rejects_paths_outside_the_skill_root() {
        let root = TestRoot::new();

        let error = archive_skill_at_path(&root.path, Path::new("../outside"))
            .expect_err("parent traversal should fail");

        assert!(matches!(error.code, SkillArchiveErrorCode::OutsideRoot));
    }
}
