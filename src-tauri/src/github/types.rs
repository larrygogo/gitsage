use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubRepoInfo {
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub clone_url: String,
    pub updated_at: String,
    pub private: bool,
    pub fork: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SearchReposResponse {
    pub items: Vec<GitHubRepoInfo>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OrgInfo {
    pub login: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubRepo {
    pub owner: String,
    pub repo: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthStatus {
    pub authenticated: bool,
    pub source: Option<String>,
    pub gh_cli_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub login: String,
    pub avatar_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabelInfo {
    pub id: u64,
    pub name: String,
    pub color: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrBranchRef {
    #[serde(rename = "ref")]
    pub ref_name: String,
    pub sha: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestSummary {
    pub number: u64,
    pub title: String,
    pub state: String,
    pub user: UserInfo,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub draft: bool,
    #[serde(default)]
    pub labels: Vec<LabelInfo>,
    pub head: PrBranchRef,
    pub base: PrBranchRef,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullRequestDetail {
    pub number: u64,
    pub title: String,
    pub state: String,
    pub user: UserInfo,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub draft: bool,
    #[serde(default)]
    pub labels: Vec<LabelInfo>,
    pub head: PrBranchRef,
    pub base: PrBranchRef,
    pub body: Option<String>,
    pub merged_at: Option<String>,
    pub mergeable: Option<bool>,
    #[serde(default)]
    pub additions: u64,
    #[serde(default)]
    pub deletions: u64,
    #[serde(default)]
    pub changed_files: u64,
    #[serde(default)]
    pub commits: u64,
    #[serde(default)]
    pub assignees: Vec<UserInfo>,
    #[serde(default)]
    pub requested_reviewers: Vec<UserInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrComment {
    pub id: u64,
    pub body: String,
    pub user: UserInfo,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrReview {
    pub id: u64,
    pub user: UserInfo,
    pub state: String,
    pub body: Option<String>,
    pub submitted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewComment {
    pub id: u64,
    pub body: String,
    pub user: UserInfo,
    pub path: String,
    pub line: Option<u64>,
    pub side: Option<String>,
    pub diff_hunk: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrFile {
    pub filename: String,
    pub status: String,
    #[serde(default)]
    pub additions: u64,
    #[serde(default)]
    pub deletions: u64,
    pub patch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePrRequest {
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    pub head: String,
    pub base: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub draft: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergePrRequest {
    pub merge_method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReviewRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    pub event: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comments: Option<Vec<ReviewCommentRequest>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewCommentRequest {
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub side: Option<String>,
    pub body: String,
}
