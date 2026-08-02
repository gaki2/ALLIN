use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::Command;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use uuid::Uuid;
use walkdir::{DirEntry, WalkDir};

use super::fs::expand_path;
use super::parser::parse_skill_file_content;
use super::updates::{
    clear_update_cache, global_skill_directory, global_skill_lock_path, read_global_skill_lock,
};

const HISTORY_ROOT_PATH: &str = "~/.rig/history";
const MAX_SNAPSHOT_BYTES: u64 = 20 * 1024 * 1024;
const MAX_SNAPSHOT_FILES: usize = 1_000;
const MAX_VERSIONS_PER_SKILL: usize = 30;
const IGNORED_DIRECTORIES: &[&str] = &[".git", "node_modules", "target"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillVersionAction {
    BeforeUpdate,
    Updated,
    BeforeRestore,
    Restored,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillVersionSummary {
    pub id: String,
    pub skill_name: String,
    pub created_at: String,
    pub action: SkillVersionAction,
    pub label: String,
    pub content_hash: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillVersionDetail {
    #[serde(flatten)]
    pub summary: SkillVersionSummary,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillUpdateResult {
    pub version: SkillVersionSummary,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillHistoryErrorCode {
    InvalidPath,
    NotTracked,
    SnapshotFailed,
    UpdateFailed,
    ValidationFailed,
    VersionNotFound,
    RestoreFailed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillHistoryError {
    pub code: SkillHistoryErrorCode,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SkillVersionMetadata {
    #[serde(flatten)]
    summary: SkillVersionSummary,
    skill_path: String,
    #[serde(default)]
    lock_entry: Option<Value>,
}

pub fn list_skill_versions_at_path(
    root_path: &str,
    relative_path: &str,
) -> Result<Vec<SkillVersionSummary>, SkillHistoryError> {
    let skill_dir = resolve_skill_directory(root_path, relative_path)?;
    list_versions(&history_root(), &skill_dir)
}

pub fn read_skill_version_at_path(
    root_path: &str,
    relative_path: &str,
    version_id: &str,
) -> Result<SkillVersionDetail, SkillHistoryError> {
    let skill_dir = resolve_skill_directory(root_path, relative_path)?;
    read_version(&history_root(), &skill_dir, version_id)
}

pub fn restore_skill_version_at_path(
    root_path: &str,
    relative_path: &str,
    version_id: &str,
) -> Result<SkillVersionSummary, SkillHistoryError> {
    let skill_dir = resolve_skill_directory(root_path, relative_path)?;
    restore_version(&history_root(), &skill_dir, version_id)
}

pub async fn update_global_skill(name: String) -> Result<SkillUpdateResult, SkillHistoryError> {
    validate_segment(&name)?;
    let lock = read_global_skill_lock().ok_or_else(|| SkillHistoryError {
        code: SkillHistoryErrorCode::NotTracked,
        message: "This skill is not tracked by the global Skills lockfile.".to_string(),
    })?;
    let lock_entry = lock
        .skills
        .get(&name)
        .cloned()
        .ok_or_else(|| SkillHistoryError {
            code: SkillHistoryErrorCode::NotTracked,
            message: "This skill is not tracked by the global Skills lockfile.".to_string(),
        })?;
    let skill_dir = global_skill_directory(&name)
        .canonicalize()
        .map_err(|error| invalid_path(format!("Could not find the installed skill: {error}")))?;
    validate_skill_directory(&skill_dir)?;

    let history_root = history_root();
    let before = create_snapshot(
        &history_root,
        &skill_dir,
        &name,
        SkillVersionAction::BeforeUpdate,
        "Before update",
        Some(serde_json::to_value(&lock_entry).map_err(snapshot_error)?),
    )?;
    let lock_path = global_skill_lock_path();
    let previous_lock = fs::read(&lock_path).map_err(snapshot_error)?;

    let command_name = name.clone();
    let output = tokio::task::spawn_blocking(move || {
        Command::new("npx")
            .args(["--yes", "skills", "update", &command_name, "-g", "-y"])
            .env("DISABLE_TELEMETRY", "1")
            .output()
    })
    .await
    .map_err(|error| update_error(format!("The update task could not start: {error}")))?
    .map_err(|error| update_error(format!("Could not start the Skills CLI: {error}")))?;

    if !output.status.success() {
        rollback_update(
            &history_root,
            &skill_dir,
            &before.id,
            &lock_path,
            &previous_lock,
        )?;
        let stderr = String::from_utf8_lossy(&output.stderr);
        let detail = stderr
            .lines()
            .last()
            .unwrap_or("The Skills CLI returned an error.");
        return Err(update_error(format!(
            "Update failed. Your current files were restored. {detail}"
        )));
    }

    let updated_content = match fs::read_to_string(skill_dir.join("SKILL.md")) {
        Ok(content) => content,
        Err(error) => {
            rollback_update(
                &history_root,
                &skill_dir,
                &before.id,
                &lock_path,
                &previous_lock,
            )?;
            return Err(validation_error(format!(
                "Could not read the updated SKILL.md, so Rig restored your previous files: {error}"
            )));
        }
    };
    if let Err(error) = parse_skill_file_content(&updated_content) {
        rollback_update(
            &history_root,
            &skill_dir,
            &before.id,
            &lock_path,
            &previous_lock,
        )?;
        return Err(validation_error(format!(
            "The update produced an invalid SKILL.md, so Rig restored your previous files: {}",
            error.message
        )));
    }

    let updated_lock_entry = read_global_skill_lock()
        .and_then(|lock| lock.skills.get(&name).cloned())
        .and_then(|entry| serde_json::to_value(entry).ok());
    let version = match create_snapshot(
        &history_root,
        &skill_dir,
        &name,
        SkillVersionAction::Updated,
        "Updated with Skills CLI",
        updated_lock_entry,
    ) {
        Ok(version) => version,
        Err(error) => {
            rollback_update(
                &history_root,
                &skill_dir,
                &before.id,
                &lock_path,
                &previous_lock,
            )?;
            return Err(SkillHistoryError {
                code: error.code,
                message: format!(
                    "Rig could not save the updated version, so your previous files were restored. {}",
                    error.message
                ),
            });
        }
    };
    clear_update_cache().await;

    Ok(SkillUpdateResult { version })
}

fn history_root() -> PathBuf {
    expand_path(HISTORY_ROOT_PATH)
}

fn resolve_skill_directory(
    root_path: &str,
    relative_path: &str,
) -> Result<PathBuf, SkillHistoryError> {
    let relative = Path::new(relative_path);
    if relative.as_os_str().is_empty()
        || relative.is_absolute()
        || relative.components().any(|component| {
            matches!(
                component,
                Component::ParentDir | Component::Prefix(_) | Component::RootDir
            )
        })
    {
        return Err(invalid_path(
            "Skill path must stay inside its library root.",
        ));
    }

    let root = expand_path(root_path)
        .canonicalize()
        .map_err(|error| invalid_path(format!("Could not find the skill root: {error}")))?;
    let skill_dir = root
        .join(relative)
        .canonicalize()
        .map_err(|error| invalid_path(format!("Could not find the skill: {error}")))?;
    if skill_dir == root || !skill_dir.starts_with(&root) {
        return Err(invalid_path(
            "Skill path must stay inside its library root.",
        ));
    }
    validate_skill_directory(&skill_dir)?;
    Ok(skill_dir)
}

fn validate_skill_directory(skill_dir: &Path) -> Result<(), SkillHistoryError> {
    if !skill_dir.is_dir() || !skill_dir.join("SKILL.md").is_file() {
        return Err(invalid_path(
            "The selected directory does not contain SKILL.md.",
        ));
    }
    Ok(())
}

fn create_snapshot(
    root: &Path,
    skill_dir: &Path,
    skill_name: &str,
    action: SkillVersionAction,
    label: &str,
    lock_entry: Option<Value>,
) -> Result<SkillVersionSummary, SkillHistoryError> {
    let content = fs::read_to_string(skill_dir.join("SKILL.md")).map_err(snapshot_error)?;
    let id = Uuid::new_v4().to_string();
    let bucket = history_bucket(root, skill_dir);
    let version_dir = bucket.join(&id);
    let snapshot_dir = version_dir.join("files");
    fs::create_dir_all(&version_dir).map_err(snapshot_error)?;

    if let Err(error) = copy_skill_directory(skill_dir, &snapshot_dir) {
        let _ = fs::remove_dir_all(&version_dir);
        return Err(error);
    }

    let summary = SkillVersionSummary {
        id,
        skill_name: skill_name.to_string(),
        created_at: Utc::now().to_rfc3339(),
        action,
        label: label.to_string(),
        content_hash: content_hash(&content),
    };
    let metadata = SkillVersionMetadata {
        summary: summary.clone(),
        skill_path: skill_dir.join("SKILL.md").to_string_lossy().to_string(),
        lock_entry,
    };
    fs::write(
        version_dir.join("metadata.json"),
        serde_json::to_vec_pretty(&metadata).map_err(snapshot_error)?,
    )
    .map_err(snapshot_error)?;
    prune_versions(&bucket)?;
    Ok(summary)
}

fn list_versions(
    root: &Path,
    skill_dir: &Path,
) -> Result<Vec<SkillVersionSummary>, SkillHistoryError> {
    let bucket = history_bucket(root, skill_dir);
    if !bucket.exists() {
        return Ok(Vec::new());
    }

    let mut versions = fs::read_dir(bucket)
        .map_err(snapshot_error)?
        .filter_map(Result::ok)
        .filter_map(|entry| read_metadata(&entry.path()).ok())
        .map(|metadata| metadata.summary)
        .collect::<Vec<_>>();
    versions.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    Ok(versions)
}

fn read_version(
    root: &Path,
    skill_dir: &Path,
    version_id: &str,
) -> Result<SkillVersionDetail, SkillHistoryError> {
    validate_segment(version_id)?;
    let version_dir = history_bucket(root, skill_dir).join(version_id);
    let metadata = read_metadata(&version_dir)?;
    let file_content =
        fs::read_to_string(version_dir.join("files/SKILL.md")).map_err(|_| version_not_found())?;
    let content = parse_skill_file_content(&file_content)
        .map(|parsed| parsed.content)
        .unwrap_or(file_content);
    Ok(SkillVersionDetail {
        summary: metadata.summary,
        content,
    })
}

fn restore_version(
    root: &Path,
    skill_dir: &Path,
    version_id: &str,
) -> Result<SkillVersionSummary, SkillHistoryError> {
    validate_segment(version_id)?;
    let version_dir = history_bucket(root, skill_dir).join(version_id);
    let target = read_metadata(&version_dir)?;
    let current_content = fs::read_to_string(skill_dir.join("SKILL.md")).map_err(snapshot_error)?;
    let current_name = parse_skill_file_content(&current_content)
        .map(|parsed| parsed.name)
        .unwrap_or_else(|_| target.summary.skill_name.clone());
    let current_lock_entry = lock_entry_for(&current_name);
    let recovery = create_snapshot(
        root,
        skill_dir,
        &current_name,
        SkillVersionAction::BeforeRestore,
        "Before restore",
        current_lock_entry,
    )?;

    if let Err(error) = replace_directory(&version_dir.join("files"), skill_dir) {
        return Err(error);
    }
    if let Some(lock_entry) = target.lock_entry {
        if let Err(error) = write_lock_entry(&target.summary.skill_name, lock_entry) {
            let _ = replace_directory(
                &history_bucket(root, skill_dir)
                    .join(&recovery.id)
                    .join("files"),
                skill_dir,
            );
            return Err(error);
        }
    }

    create_snapshot(
        root,
        skill_dir,
        &target.summary.skill_name,
        SkillVersionAction::Restored,
        "Restored previous version",
        lock_entry_for(&target.summary.skill_name),
    )
}

fn rollback_update(
    root: &Path,
    skill_dir: &Path,
    version_id: &str,
    lock_path: &Path,
    previous_lock: &[u8],
) -> Result<(), SkillHistoryError> {
    replace_directory(
        &history_bucket(root, skill_dir)
            .join(version_id)
            .join("files"),
        skill_dir,
    )?;
    atomic_write(lock_path, previous_lock).map_err(|error| {
        update_error(format!(
            "Rig restored the skill files but could not restore the lockfile: {error}"
        ))
    })
}

fn replace_directory(snapshot: &Path, destination: &Path) -> Result<(), SkillHistoryError> {
    if !snapshot.is_dir() || !destination.is_dir() {
        return Err(restore_error("The saved version is incomplete."));
    }
    let parent = destination
        .parent()
        .ok_or_else(|| restore_error("Could not resolve the skill directory."))?;
    let temp = parent.join(format!(".rig-restore-{}", Uuid::new_v4()));
    let backup = parent.join(format!(".rig-backup-{}", Uuid::new_v4()));
    copy_skill_directory(snapshot, &temp)?;
    fs::rename(destination, &backup).map_err(restore_error)?;
    if let Err(error) = fs::rename(&temp, destination) {
        let _ = fs::rename(&backup, destination);
        let _ = fs::remove_dir_all(&temp);
        return Err(restore_error(error));
    }
    let _ = fs::remove_dir_all(backup);
    Ok(())
}

fn copy_skill_directory(source: &Path, destination: &Path) -> Result<(), SkillHistoryError> {
    let mut bytes = 0_u64;
    let mut files = 0_usize;
    fs::create_dir_all(destination).map_err(snapshot_error)?;

    for entry in WalkDir::new(source)
        .follow_links(false)
        .into_iter()
        .filter_entry(should_copy_entry)
    {
        let entry = entry.map_err(snapshot_error)?;
        let relative = entry.path().strip_prefix(source).map_err(snapshot_error)?;
        if relative.as_os_str().is_empty() {
            continue;
        }
        let target = destination.join(relative);
        if entry.file_type().is_dir() {
            fs::create_dir_all(target).map_err(snapshot_error)?;
        } else if entry.file_type().is_file() {
            files += 1;
            bytes += entry.metadata().map_err(snapshot_error)?.len();
            if files > MAX_SNAPSHOT_FILES || bytes > MAX_SNAPSHOT_BYTES {
                return Err(SkillHistoryError {
                    code: SkillHistoryErrorCode::SnapshotFailed,
                    message:
                        "This skill is too large to snapshot safely (limit: 1,000 files or 20 MB)."
                            .to_string(),
                });
            }
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent).map_err(snapshot_error)?;
            }
            fs::copy(entry.path(), target).map_err(snapshot_error)?;
        }
    }
    Ok(())
}

fn should_copy_entry(entry: &DirEntry) -> bool {
    entry.depth() == 0
        || !entry.file_type().is_dir()
        || entry
            .file_name()
            .to_str()
            .map(|name| !IGNORED_DIRECTORIES.contains(&name))
            .unwrap_or(true)
}

fn history_bucket(root: &Path, skill_dir: &Path) -> PathBuf {
    let path = skill_dir.join("SKILL.md").to_string_lossy().to_string();
    root.join(content_hash(&path))
}

fn content_hash(content: &str) -> String {
    format!("{:x}", Sha256::digest(content.as_bytes()))
}

fn read_metadata(version_dir: &Path) -> Result<SkillVersionMetadata, SkillHistoryError> {
    let contents = fs::read(version_dir.join("metadata.json")).map_err(|_| version_not_found())?;
    serde_json::from_slice(&contents).map_err(|_| version_not_found())
}

fn prune_versions(bucket: &Path) -> Result<(), SkillHistoryError> {
    let mut versions = fs::read_dir(bucket)
        .map_err(snapshot_error)?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            read_metadata(&entry.path())
                .ok()
                .map(|metadata| (entry.path(), metadata.summary.created_at))
        })
        .collect::<Vec<_>>();
    versions.sort_by(|left, right| right.1.cmp(&left.1));
    for (path, _) in versions.into_iter().skip(MAX_VERSIONS_PER_SKILL) {
        fs::remove_dir_all(path).map_err(snapshot_error)?;
    }
    Ok(())
}

fn lock_entry_for(name: &str) -> Option<Value> {
    read_global_skill_lock()
        .and_then(|lock| lock.skills.get(name).cloned())
        .and_then(|entry| serde_json::to_value(entry).ok())
}

fn write_lock_entry(name: &str, entry: Value) -> Result<(), SkillHistoryError> {
    let lock_path = global_skill_lock_path();
    let mut value: Value = serde_json::from_slice(&fs::read(&lock_path).map_err(restore_error)?)
        .map_err(restore_error)?;
    let skills = value
        .get_mut("skills")
        .and_then(Value::as_object_mut)
        .ok_or_else(|| restore_error("The Skills lockfile is missing its skills map."))?;
    skills.insert(name.to_string(), entry);
    atomic_write(
        &lock_path,
        &serde_json::to_vec_pretty(&value).map_err(restore_error)?,
    )
    .map_err(restore_error)
}

fn atomic_write(path: &Path, contents: &[u8]) -> std::io::Result<()> {
    let parent = path.parent().ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::InvalidInput, "Path has no parent")
    })?;
    let temp = parent.join(format!(".rig-write-{}", Uuid::new_v4()));
    fs::write(&temp, contents)?;
    fs::rename(temp, path)
}

fn validate_segment(value: &str) -> Result<(), SkillHistoryError> {
    if value.is_empty()
        || value == "."
        || value == ".."
        || value.contains('/')
        || value.contains('\\')
    {
        return Err(invalid_path("The skill or version identifier is invalid."));
    }
    Ok(())
}

fn invalid_path(message: impl ToString) -> SkillHistoryError {
    SkillHistoryError {
        code: SkillHistoryErrorCode::InvalidPath,
        message: message.to_string(),
    }
}

fn snapshot_error(error: impl ToString) -> SkillHistoryError {
    SkillHistoryError {
        code: SkillHistoryErrorCode::SnapshotFailed,
        message: format!("Could not save a recovery version: {}", error.to_string()),
    }
}

fn update_error(message: impl ToString) -> SkillHistoryError {
    SkillHistoryError {
        code: SkillHistoryErrorCode::UpdateFailed,
        message: message.to_string(),
    }
}

fn validation_error(message: impl ToString) -> SkillHistoryError {
    SkillHistoryError {
        code: SkillHistoryErrorCode::ValidationFailed,
        message: message.to_string(),
    }
}

fn version_not_found() -> SkillHistoryError {
    SkillHistoryError {
        code: SkillHistoryErrorCode::VersionNotFound,
        message: "The selected saved version could not be found.".to_string(),
    }
}

fn restore_error(error: impl ToString) -> SkillHistoryError {
    SkillHistoryError {
        code: SkillHistoryErrorCode::RestoreFailed,
        message: format!("Could not restore the saved version: {}", error.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn skill_fixture(root: &Path, body: &str) -> PathBuf {
        let skill = root.join("skills/example");
        fs::create_dir_all(&skill).unwrap();
        fs::write(
            skill.join("SKILL.md"),
            format!("---\nname: example\ndescription: Test skill\n---\n\n{body}\n"),
        )
        .unwrap();
        skill
    }

    #[test]
    fn snapshots_and_reads_markdown_versions() {
        let temp = std::env::temp_dir().join(format!("rig-history-test-{}", Uuid::new_v4()));
        let skill = skill_fixture(&temp, "First");
        let history = temp.join("history");
        let version = create_snapshot(
            &history,
            &skill,
            "example",
            SkillVersionAction::BeforeUpdate,
            "Before update",
            None,
        )
        .unwrap();

        fs::write(skill.join("SKILL.md"), "changed").unwrap();
        let detail = read_version(&history, &skill, &version.id).unwrap();

        assert!(detail.content.contains("First"));
        assert_eq!(list_versions(&history, &skill).unwrap().len(), 1);
        fs::remove_dir_all(temp).unwrap();
    }

    #[test]
    fn restoring_creates_a_recovery_version() {
        let temp = std::env::temp_dir().join(format!("rig-restore-test-{}", Uuid::new_v4()));
        let skill = skill_fixture(&temp, "First");
        let history = temp.join("history");
        let version = create_snapshot(
            &history,
            &skill,
            "example",
            SkillVersionAction::Updated,
            "Updated",
            None,
        )
        .unwrap();
        fs::write(
            skill.join("SKILL.md"),
            "---\nname: example\ndescription: Test skill\n---\n\nSecond\n",
        )
        .unwrap();

        restore_version(&history, &skill, &version.id).unwrap();

        assert!(fs::read_to_string(skill.join("SKILL.md"))
            .unwrap()
            .contains("First"));
        let actions = list_versions(&history, &skill).unwrap();
        assert_eq!(actions.len(), 3);
        fs::remove_dir_all(temp).unwrap();
    }

    #[test]
    fn rejects_paths_that_escape_the_root() {
        let temp = std::env::temp_dir().join(format!("rig-path-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&temp).unwrap();
        let result = resolve_skill_directory(temp.to_str().unwrap(), "../outside");
        assert!(matches!(
            result.unwrap_err().code,
            SkillHistoryErrorCode::InvalidPath
        ));
        fs::remove_dir_all(temp).unwrap();
    }
}
