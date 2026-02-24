use tauri::State;

use crate::error::AppError;
use crate::git::repository::TagInfo;
use crate::state::AppState;

#[tauri::command]
pub async fn get_tags(state: State<'_, AppState>) -> Result<Vec<TagInfo>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.tags()
}

#[tauri::command]
pub async fn create_tag(
    name: String,
    message: Option<String>,
    commit: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.create_tag(&name, message.as_deref(), commit.as_deref()).await
}

#[tauri::command]
pub async fn delete_tag(name: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.delete_tag(&name).await
}

#[tauri::command]
pub async fn push_tag(
    remote: String,
    tag: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.push_tag(&remote, &tag).await
}

#[tauri::command]
pub async fn push_all_tags(
    remote: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.push_all_tags(&remote).await
}
