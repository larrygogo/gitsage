use tauri::State;

use crate::error::AppError;
use crate::git::repository::StashEntry;
use crate::state::AppState;

#[tauri::command]
pub async fn stash_save(
    message: Option<String>,
    include_untracked: bool,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.stash_push(message.as_deref(), include_untracked).await
}

#[tauri::command]
pub async fn stash_pop(index: Option<usize>, state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.stash_pop(index).await
}

#[tauri::command]
pub async fn stash_apply(
    index: Option<usize>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.stash_apply(index).await
}

#[tauri::command]
pub async fn stash_drop(
    index: Option<usize>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.stash_drop(index).await
}

#[tauri::command]
pub async fn stash_list(state: State<'_, AppState>) -> Result<Vec<StashEntry>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.stash_list().await
}

#[tauri::command]
pub async fn stash_clear(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.stash_clear().await
}
