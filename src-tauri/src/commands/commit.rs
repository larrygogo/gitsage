use tauri::State;

use crate::error::AppError;
use crate::git::diff::DiffOutput;
use crate::git::repository::CommitInfo;
use crate::state::AppState;

#[tauri::command]
pub async fn create_commit(
    message: String,
    amend: bool,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.commit(&message, amend).await
}

#[tauri::command]
pub async fn get_commit_log(
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<CommitInfo>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.log(limit.unwrap_or(50))
}

// ==================== Phase 1: Amend & Undo ====================

#[tauri::command]
pub async fn amend_commit(
    message: String,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.commit(&message, true).await
}

#[tauri::command]
pub async fn undo_last_commit(
    soft: bool,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.undo_last_commit(soft).await
}

// ==================== Phase 1: Reset ====================

#[tauri::command]
pub async fn reset_to_commit(
    commit_id: String,
    mode: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.reset(&commit_id, &mode).await
}

// ==================== Phase 4: Commit diff & History & Search ====================

#[tauri::command]
pub async fn get_commit_diff(
    commit_id: String,
    state: State<'_, AppState>,
) -> Result<DiffOutput, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.commit_diff(&commit_id)
}

#[tauri::command]
pub async fn get_file_history(
    path: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<CommitInfo>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.file_log(&path, limit.unwrap_or(50))
}

#[tauri::command]
pub async fn search_commits(
    query: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<CommitInfo>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.search_commits(&query, limit.unwrap_or(50))
}

#[tauri::command]
pub async fn get_commit_log_paged(
    max_count: usize,
    skip: usize,
    state: State<'_, AppState>,
) -> Result<Vec<CommitInfo>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.log_paged(max_count, skip)
}

#[tauri::command]
pub async fn get_branch_log(
    branch: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<CommitInfo>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.log_branch(&branch, limit.unwrap_or(200))
}
