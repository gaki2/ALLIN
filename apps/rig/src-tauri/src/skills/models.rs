pub struct SkillRootDefinition {
    pub id: &'static str,
    pub path: &'static str,
    pub label: &'static str,
    pub provider: SkillProvider,
    pub scope_id: &'static str,
    pub scope_label: &'static str,
    pub scope_kind: SkillScopeKind,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillProvider {
    Agents,
    Claude,
    OpenCode,
    Hermes,
    Cursor,
    Repository,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillScopeKind {
    Global,
    Repository,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillRootKind {
    Default,
    Repository,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillRoot {
    pub id: String,
    pub path: String,
    pub label: String,
    pub exists: bool,
    pub kind: SkillRootKind,
    pub provider: SkillProvider,
    pub scope_id: String,
    pub scope_label: String,
    pub scope_kind: SkillScopeKind,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedSkillRoot {
    pub id: String,
    pub path: String,
    pub label: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillRootImportErrorCode {
    PathNotFound,
    NotDirectory,
    DuplicateId,
    NotFound,
    ReadFailed,
    WriteFailed,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillRootImportError {
    pub code: SkillRootImportErrorCode,
    pub message: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub root_path: String,
    pub relative_path: String,
    pub content: String,
    pub description: Option<String>,
    pub is_valid: bool,
    pub validation_error: Option<SkillValidationError>,
    pub updated_at: Option<String>,
    pub provider: SkillProvider,
    pub scope_id: String,
    pub scope_label: String,
    pub scope_kind: SkillScopeKind,
    pub root_id: String,
    pub root_label: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillValidationErrorCode {
    MissingSkillFile,
    EmptySkillFile,
    EmptyContent,
    InvalidUtf8,
    ReadFailed,
    NotDirectory,
    OutsideRoot,
    MissingFrontMatter,
    InvalidFrontMatter,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillValidationError {
    pub code: SkillValidationErrorCode,
    pub message: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillListingErrorCode {
    PathNotFound,
    NotDirectory,
    ReadFailed,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillListingError {
    pub code: SkillListingErrorCode,
    pub message: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillDeletionErrorCode {
    PathNotFound,
    NotDirectory,
    OutsideRoot,
    MissingSkillFile,
    DeleteFailed,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillDeletionError {
    pub code: SkillDeletionErrorCode,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillCopyErrorCode {
    PathNotFound,
    NotDirectory,
    OutsideRoot,
    MissingSkillFile,
    TargetExists,
    CopyFailed,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillCopyError {
    pub code: SkillCopyErrorCode,
    pub message: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillUsageLogSchema {
    pub source: String,
    pub skill_name: String,
    pub used_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillUsageEvent {
    pub name: String,
    pub source: String,
    pub used_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WindowType {
    Day,
    Week,
    Month,
    ThreeMonths,
    Year,
    All,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BucketType {
    Hour,
    Day,
    Month,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillUsageErrorCode {
    ReadFailed,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillUsage {
    pub name: String,
    pub count: u32,
    pub last_used_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillUsageSeries {
    pub name: String,
    pub series: Vec<u32>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillUsageError {
    pub code: SkillUsageErrorCode,
    pub message: String,
}
