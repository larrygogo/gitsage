use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

/// Placeholder for AI commit message generation
/// Full implementation will come in Phase 1 W7-8
#[tauri::command]
pub async fn generate_commit_message(
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let repo = state.current_repo.lock().await;
    let _repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;

    // TODO: Get staged diff, build prompt, call AI provider
    Err(AppError::AiProvider("AI provider not configured yet".into()))
}

/// Placeholder for change summary generation
#[tauri::command]
pub async fn generate_change_summary(
    state: State<'_, AppState>,
) -> Result<String, AppError> {
    let repo = state.current_repo.lock().await;
    let _repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;

    // TODO: Get staged diff, build prompt, call AI provider
    Err(AppError::AiProvider("AI provider not configured yet".into()))
}
