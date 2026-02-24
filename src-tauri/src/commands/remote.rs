use tauri::State;

use crate::error::AppError;
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
