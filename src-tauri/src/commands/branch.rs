use tauri::State;

use crate::error::AppError;
use crate::git::repository::BranchInfo;
use crate::state::AppState;

#[tauri::command]
pub async fn get_branches(state: State<'_, AppState>) -> Result<Vec<BranchInfo>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.branches()
}

#[tauri::command]
pub async fn get_current_branch(state: State<'_, AppState>) -> Result<String, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.current_branch()
}

#[tauri::command]
pub async fn create_branch(name: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.create_branch(&name).await
}

#[tauri::command]
pub async fn checkout_branch(name: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.checkout_branch(&name).await
}

#[tauri::command]
pub async fn delete_branch(name: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.delete_branch(&name).await
}
