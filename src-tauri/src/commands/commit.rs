use tauri::State;

use crate::error::AppError;
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
