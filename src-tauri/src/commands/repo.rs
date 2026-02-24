use std::path::PathBuf;
use std::sync::Arc;

use tauri::State;

use crate::error::AppError;
use crate::git::repository::GitRepository;
use crate::state::{AppState, RepoEntry};

#[tauri::command]
pub async fn open_repo(path: String, state: State<'_, AppState>) -> Result<String, AppError> {
    let repo_path = PathBuf::from(&path);
    if !repo_path.exists() {
        return Err(AppError::RepoNotFound(path));
    }

    let repo = GitRepository::open(&repo_path)?;
    let name = repo.name();

    // Update recent repos
    {
        let mut recent = state.recent_repos.lock().await;
        recent.retain(|r| r.path != repo_path);
        recent.insert(
            0,
            RepoEntry {
                path: repo_path,
                name: name.clone(),
                last_opened: chrono::Utc::now(),
            },
        );
        if recent.len() > 20 {
            recent.truncate(20);
        }
    }

    *state.current_repo.lock().await = Some(Arc::new(repo));
    Ok(name)
}

#[tauri::command]
pub async fn init_repo(path: String, state: State<'_, AppState>) -> Result<String, AppError> {
    let repo_path = PathBuf::from(&path);
    let repo = GitRepository::init(&repo_path)?;
    let name = repo.name();

    *state.current_repo.lock().await = Some(Arc::new(repo));
    Ok(name)
}

#[tauri::command]
pub async fn get_recent_repos(state: State<'_, AppState>) -> Result<Vec<RepoEntry>, AppError> {
    let recent = state.recent_repos.lock().await;
    Ok(recent.clone())
}

#[tauri::command]
pub async fn close_repo(state: State<'_, AppState>) -> Result<(), AppError> {
    *state.current_repo.lock().await = None;
    Ok(())
}

// ==================== Phase 2: Clone ====================

#[tauri::command]
pub async fn clone_repo(
    url: String,
    dest_path: String,
) -> Result<(), AppError> {
    let dest = PathBuf::from(&dest_path);
    crate::git::cli::clone_repo(&url, &dest).await
}
