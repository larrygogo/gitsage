use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::git::repository::GitRepository;

/// Application state shared across commands
pub struct AppState {
    /// Currently opened repository
    pub current_repo: Mutex<Option<Arc<GitRepository>>>,
    /// Recent repositories list
    pub recent_repos: Mutex<Vec<RepoEntry>>,
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
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
