use tauri::State;

use crate::error::AppError;
use crate::git::repository::SubmoduleInfo;
use crate::state::AppState;

#[tauri::command]
pub async fn get_submodules(state: State<'_, AppState>) -> Result<Vec<SubmoduleInfo>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.submodules().await
}

#[tauri::command]
pub async fn submodule_init(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.submodule_init().await
}

#[tauri::command]
pub async fn submodule_update(
    recursive: bool,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.submodule_update(recursive).await
}

#[tauri::command]
pub async fn submodule_add(
    url: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.submodule_add(&url, &path).await
}
