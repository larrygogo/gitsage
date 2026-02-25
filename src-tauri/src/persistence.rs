use std::path::Path;

use crate::error::AppResult;
use crate::state::RepoEntry;

#[derive(serde::Serialize, serde::Deserialize)]
struct RecentReposFile {
    version: u32,
    repos: Vec<RepoEntry>,
}

const RECENT_REPOS_FILE: &str = "recent_repos.json";

pub fn load_recent_repos(app_data_dir: &Path) -> AppResult<Vec<RepoEntry>> {
    let path = app_data_dir.join(RECENT_REPOS_FILE);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = std::fs::read_to_string(&path)?;
    let file: RecentReposFile = serde_json::from_str(&content)?;
    Ok(file.repos)
}

pub fn save_recent_repos(app_data_dir: &Path, repos: &[RepoEntry]) -> AppResult<()> {
    std::fs::create_dir_all(app_data_dir)?;
    let file = RecentReposFile {
        version: 1,
        repos: repos.to_vec(),
    };
    let content = serde_json::to_string_pretty(&file)?;
    std::fs::write(app_data_dir.join(RECENT_REPOS_FILE), content)?;
    Ok(())
}
