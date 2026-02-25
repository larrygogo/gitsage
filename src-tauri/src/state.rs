use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::git::repository::GitRepository;
use crate::github::client::GitHubClient;

/// Application state shared across commands
pub struct AppState {
    /// Currently opened repository
    pub current_repo: Mutex<Option<Arc<GitRepository>>>,
    /// Recent repositories list
    pub recent_repos: Mutex<Vec<RepoEntry>>,
    /// Cached GitHub API client (authenticated)
    pub github_client: Mutex<Option<GitHubClient>>,
    /// Application data directory (for persisting JSON files)
    pub app_data_dir: PathBuf,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RepoEntry {
    pub path: PathBuf,
    pub name: String,
    pub last_opened: chrono::DateTime<chrono::Utc>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            current_repo: Mutex::new(None),
            recent_repos: Mutex::new(Vec::new()),
            github_client: Mutex::new(None),
            app_data_dir: PathBuf::new(),
        }
    }

    pub fn new_with_data(app_data_dir: PathBuf, recent_repos: Vec<RepoEntry>) -> Self {
        Self {
            current_repo: Mutex::new(None),
            recent_repos: Mutex::new(recent_repos),
            github_client: Mutex::new(None),
            app_data_dir,
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
