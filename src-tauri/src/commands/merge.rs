use tauri::State;

use crate::error::AppError;
use crate::git::repository::RepoOperationState;
use crate::state::AppState;

// ==================== Merge ====================

#[tauri::command]
pub async fn merge_branch(
    branch: String,
    no_ff: bool,
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.merge(&branch, no_ff).await
}

#[tauri::command]
pub async fn merge_abort(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.merge_abort().await
}

#[tauri::command]
pub async fn merge_continue(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.merge_continue().await
}

#[tauri::command]
pub async fn get_repo_state(state: State<'_, AppState>) -> Result<RepoOperationState, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.repo_state().await
}

// ==================== Cherry-pick ====================

#[tauri::command]
pub async fn cherry_pick(
    commit_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.cherry_pick(&commit_id).await
}

#[tauri::command]
pub async fn cherry_pick_abort(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.cherry_pick_abort().await
}

#[tauri::command]
pub async fn cherry_pick_continue(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.cherry_pick_continue().await
}

// ==================== Revert ====================

#[tauri::command]
pub async fn revert_commit(
    commit_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.revert(&commit_id).await
}

#[tauri::command]
pub async fn revert_abort(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.revert_abort().await
}

#[tauri::command]
pub async fn revert_continue(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.revert_continue().await
}

// ==================== Rebase ====================

#[tauri::command]
pub async fn rebase_onto(
    onto: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.rebase(&onto).await
}

#[tauri::command]
pub async fn rebase_abort(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.rebase_abort().await
}

#[tauri::command]
pub async fn rebase_continue(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.rebase_continue().await
}

#[tauri::command]
pub async fn rebase_skip(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.rebase_skip().await
}
