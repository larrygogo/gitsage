use tauri::State;

use crate::error::AppError;
use crate::git::repository::RemoteInfo;
use crate::state::AppState;

#[tauri::command]
pub async fn fetch_remote(
    remote: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.fetch(&remote).await
}

#[tauri::command]
pub async fn pull_remote(
    remote: String,
    branch: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.pull(&remote, &branch).await
}

#[tauri::command]
pub async fn push_remote(
    remote: String,
    branch: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.push(&remote, &branch).await
}

// ==================== Phase 2: Remote management ====================

#[tauri::command]
pub async fn get_remotes(state: State<'_, AppState>) -> Result<Vec<RemoteInfo>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.remotes().await
}

#[tauri::command]
pub async fn add_remote(
    name: String,
    url: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.add_remote(&name, &url).await
}

#[tauri::command]
pub async fn remove_remote(
    name: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.remove_remote(&name).await
}

#[tauri::command]
pub async fn rename_remote(
    old_name: String,
    new_name: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.rename_remote(&old_name, &new_name).await
}

#[tauri::command]
pub async fn fetch_prune(
    remote: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.fetch_prune(&remote).await
}

#[tauri::command]
pub async fn push_set_upstream(
    remote: String,
    branch: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.push_set_upstream(&remote, &branch).await
}

#[tauri::command]
pub async fn pull_rebase(
    remote: String,
    branch: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.pull_rebase(&remote, &branch).await
}

#[tauri::command]
pub async fn sync_remote(
    remote: String,
    branch: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.sync(&remote, &branch).await
}
