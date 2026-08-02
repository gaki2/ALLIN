use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::{Duration, Instant};

use chrono::Utc;
use futures::{stream, StreamExt};
use serde::{Deserialize, Serialize};

use super::fs::expand_path;

const GLOBAL_SKILL_LOCK_PATH: &str = "~/.agents/.skill-lock.json";
const MAX_CONCURRENT_REQUESTS: usize = 4;
const UPDATE_CACHE_TTL: Duration = Duration::from_secs(15 * 60);

static UPDATE_CACHE: OnceLock<tokio::sync::Mutex<Option<CachedUpdateCheck>>> = OnceLock::new();

#[derive(Debug)]
struct CachedUpdateCheck {
    created_at: Instant,
    statuses: Vec<SkillUpdateStatus>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillUpdateState {
    Current,
    UpdateAvailable,
    CheckUnavailable,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillUpdateStatus {
    pub name: String,
    pub source: String,
    pub source_url: Option<String>,
    pub install_path: String,
    pub state: SkillUpdateState,
    pub checked_at: String,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub(crate) struct SkillLock {
    #[serde(default)]
    pub(crate) skills: HashMap<String, LockedSkill>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LockedSkill {
    pub(crate) source: String,
    pub(crate) source_type: String,
    pub(crate) source_url: Option<String>,
    pub(crate) skill_path: String,
    pub(crate) skill_folder_hash: String,
    #[serde(default)]
    pub(crate) r#ref: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitTree {
    sha: String,
    #[serde(default)]
    tree: Vec<GitTreeEntry>,
}

#[derive(Debug, Deserialize)]
struct GitTreeEntry {
    path: String,
    sha: String,
    #[serde(rename = "type")]
    kind: String,
}

#[derive(Debug)]
struct SourceCheck {
    root_hash: String,
    folder_hashes: HashMap<String, String>,
}

pub async fn check_global_skill_updates(force: bool) -> Vec<SkillUpdateStatus> {
    let cache = UPDATE_CACHE.get_or_init(|| tokio::sync::Mutex::new(None));
    let mut cached_check = cache.lock().await;

    if !force {
        if let Some(cached_check) = cached_check.as_ref() {
            if cached_check.created_at.elapsed() < UPDATE_CACHE_TTL {
                return cached_check.statuses.clone();
            }
        }
    }

    let Some(lock) = read_global_skill_lock() else {
        return Vec::new();
    };

    let statuses = check_locked_skills(lock.skills).await;
    *cached_check = Some(CachedUpdateCheck {
        created_at: Instant::now(),
        statuses: statuses.clone(),
    });
    statuses
}

pub(crate) fn read_global_skill_lock() -> Option<SkillLock> {
    let lock_path = global_skill_lock_path();
    let contents = fs::read_to_string(lock_path).ok()?;
    serde_json::from_str(&contents).ok()
}

pub(crate) fn global_skill_lock_path() -> PathBuf {
    if let Some(state_home) = std::env::var_os("XDG_STATE_HOME") {
        let xdg_path = PathBuf::from(state_home)
            .join("skills")
            .join(".skill-lock.json");

        if xdg_path.is_file() {
            return xdg_path;
        }
    }

    expand_path(GLOBAL_SKILL_LOCK_PATH)
}

async fn check_locked_skills(skills: HashMap<String, LockedSkill>) -> Vec<SkillUpdateStatus> {
    let checked_at = Utc::now().to_rfc3339();
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .user_agent("rig-skill-update-check")
        .build()
    {
        Ok(client) => client,
        Err(error) => {
            return skills
                .into_iter()
                .map(|(name, skill)| {
                    unavailable_status(name, skill, &checked_at, error.to_string())
                })
                .collect();
        }
    };

    let mut github_sources: HashMap<(String, Option<String>), Vec<(String, LockedSkill)>> =
        HashMap::new();
    let mut statuses = Vec::new();

    for (name, skill) in skills {
        if skill.source_type == "github" {
            github_sources
                .entry((skill.source.clone(), skill.r#ref.clone()))
                .or_default()
                .push((name, skill));
        } else {
            statuses.push(unavailable_status(
                name,
                skill,
                &checked_at,
                "This source does not expose a GitHub tree to compare.".to_string(),
            ));
        }
    }

    let source_results = stream::iter(github_sources.into_iter().map(
        |((source, git_ref), skills)| {
            let client = client.clone();
            async move {
                let result = fetch_source_tree(&client, &source, git_ref.as_deref()).await;
                (skills, result)
            }
        },
    ))
    .buffer_unordered(MAX_CONCURRENT_REQUESTS)
    .collect::<Vec<_>>()
    .await;

    for (skills, source_result) in source_results {
        match source_result {
            Ok(source_check) => {
                statuses.extend(skills.into_iter().map(|(name, skill)| {
                    status_from_source_check(name, skill, &checked_at, &source_check)
                }));
            }
            Err(message) => {
                statuses.extend(skills.into_iter().map(|(name, skill)| {
                    unavailable_status(name, skill, &checked_at, message.clone())
                }));
            }
        }
    }

    statuses.sort_by(|left, right| left.name.cmp(&right.name));
    statuses
}

async fn fetch_source_tree(
    client: &reqwest::Client,
    source: &str,
    git_ref: Option<&str>,
) -> Result<SourceCheck, String> {
    let url = source_tree_url(source, git_ref)?;
    let response = client
        .get(url)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|error| format!("Could not reach GitHub: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "GitHub returned {} while checking this source.",
            response.status()
        ));
    }

    let tree = response
        .json::<GitTree>()
        .await
        .map_err(|error| format!("GitHub returned an unreadable tree: {error}"))?;

    Ok(SourceCheck {
        root_hash: tree.sha,
        folder_hashes: tree
            .tree
            .into_iter()
            .filter(|entry| entry.kind == "tree")
            .map(|entry| (entry.path, entry.sha))
            .collect(),
    })
}

fn source_tree_url(source: &str, git_ref: Option<&str>) -> Result<url::Url, String> {
    let git_ref = git_ref.unwrap_or("HEAD");
    let mut url = url::Url::parse(&format!("https://api.github.com/repos/{source}/git/trees"))
        .map_err(|error| format!("Could not build the GitHub request: {error}"))?;
    url.path_segments_mut()
        .map_err(|_| "Could not build the GitHub request.".to_string())?
        .push(git_ref);
    url.query_pairs_mut().append_pair("recursive", "1");
    Ok(url)
}

fn status_from_source_check(
    name: String,
    skill: LockedSkill,
    checked_at: &str,
    source_check: &SourceCheck,
) -> SkillUpdateStatus {
    let folder_path = skill_folder_path(&skill.skill_path);
    let latest_hash = if folder_path.is_empty() {
        Some(source_check.root_hash.as_str())
    } else {
        source_check
            .folder_hashes
            .get(folder_path)
            .map(String::as_str)
    };

    match latest_hash {
        Some(latest_hash) => SkillUpdateStatus {
            install_path: global_skill_file_path(&name).to_string_lossy().to_string(),
            name,
            source: skill.source,
            source_url: skill.source_url,
            state: if latest_hash == skill.skill_folder_hash {
                SkillUpdateState::Current
            } else {
                SkillUpdateState::UpdateAvailable
            },
            checked_at: checked_at.to_string(),
            message: None,
        },
        None => unavailable_status(
            name,
            skill,
            checked_at,
            "The installed skill path no longer exists in the remote repository.".to_string(),
        ),
    }
}

fn unavailable_status(
    name: String,
    skill: LockedSkill,
    checked_at: &str,
    message: String,
) -> SkillUpdateStatus {
    SkillUpdateStatus {
        install_path: global_skill_file_path(&name).to_string_lossy().to_string(),
        name,
        source: skill.source,
        source_url: skill.source_url,
        state: SkillUpdateState::CheckUnavailable,
        checked_at: checked_at.to_string(),
        message: Some(message),
    }
}

pub(crate) fn global_skill_directory(name: &str) -> PathBuf {
    expand_path("~/.agents/skills").join(name)
}

fn global_skill_file_path(name: &str) -> PathBuf {
    global_skill_directory(name).join("SKILL.md")
}

pub(crate) async fn clear_update_cache() {
    if let Some(cache) = UPDATE_CACHE.get() {
        *cache.lock().await = None;
    }
}

fn skill_folder_path(skill_path: &str) -> &str {
    skill_path
        .strip_suffix("/SKILL.md")
        .or_else(|| skill_path.strip_suffix("SKILL.md"))
        .unwrap_or(skill_path)
        .trim_end_matches('/')
}

#[cfg(test)]
mod tests {
    use super::*;

    fn locked_skill(hash: &str, path: &str) -> LockedSkill {
        LockedSkill {
            source: "example/skills".to_string(),
            source_type: "github".to_string(),
            source_url: Some("https://github.com/example/skills".to_string()),
            skill_path: path.to_string(),
            skill_folder_hash: hash.to_string(),
            r#ref: None,
        }
    }

    fn source_check() -> SourceCheck {
        SourceCheck {
            root_hash: "root-hash".to_string(),
            folder_hashes: HashMap::from([
                ("skills/current".to_string(), "same-hash".to_string()),
                ("skills/newer".to_string(), "new-hash".to_string()),
            ]),
        }
    }

    #[test]
    fn extracts_the_skill_directory_from_lock_paths() {
        assert_eq!(
            skill_folder_path("skills/example/SKILL.md"),
            "skills/example"
        );
        assert_eq!(skill_folder_path("SKILL.md"), "");
        assert_eq!(skill_folder_path("skills/example"), "skills/example");
    }

    #[test]
    fn reports_current_when_folder_hashes_match() {
        let status = status_from_source_check(
            "current".to_string(),
            locked_skill("same-hash", "skills/current/SKILL.md"),
            "2026-08-01T00:00:00Z",
            &source_check(),
        );

        assert!(matches!(status.state, SkillUpdateState::Current));
        assert!(status.message.is_none());
    }

    #[test]
    fn reports_an_update_when_folder_hashes_differ() {
        let status = status_from_source_check(
            "newer".to_string(),
            locked_skill("old-hash", "skills/newer/SKILL.md"),
            "2026-08-01T00:00:00Z",
            &source_check(),
        );

        assert!(matches!(status.state, SkillUpdateState::UpdateAvailable));
    }

    #[test]
    fn reports_unavailable_when_the_remote_path_is_missing() {
        let status = status_from_source_check(
            "missing".to_string(),
            locked_skill("old-hash", "skills/missing/SKILL.md"),
            "2026-08-01T00:00:00Z",
            &source_check(),
        );

        assert!(matches!(status.state, SkillUpdateState::CheckUnavailable));
        assert!(status.message.is_some());
    }

    #[test]
    fn checks_the_locked_ref_instead_of_always_using_head() {
        let url = source_tree_url("example/skills", Some("release/v2")).unwrap();

        assert_eq!(
            url.as_str(),
            "https://api.github.com/repos/example/skills/git/trees/release%2Fv2?recursive=1"
        );
    }
}
