use tauri::State;

use crate::error::AppError;
use crate::git::diff::DiffOutput;
use crate::git::repository::FileStatus;
use crate::state::AppState;

#[tauri::command]
pub async fn get_status(state: State<'_, AppState>) -> Result<Vec<FileStatus>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.status()
}

#[tauri::command]
pub async fn stage_files(paths: Vec<String>, state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.stage(&paths).await
}

#[tauri::command]
pub async fn unstage_files(
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.unstage(&paths).await
}

#[tauri::command]
pub async fn get_diff(
    path: String,
    staged: bool,
    state: State<'_, AppState>,
) -> Result<DiffOutput, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.diff_file(&path, staged)
}

#[tauri::command]
pub async fn get_staged_diff(state: State<'_, AppState>) -> Result<DiffOutput, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.diff_staged()
}
