use tauri::State;

use crate::error::AppError;
use crate::git::diff::DiffOutput;
use crate::git::repository::{
    BlameLine, ConflictFile, ConflictVersions, FileStatus, LineChange,
};
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

// ==================== Phase 1: Discard ====================

#[tauri::command]
pub async fn discard_changes(
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.discard_files(&paths).await
}

#[tauri::command]
pub async fn discard_all_changes(state: State<'_, AppState>) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.discard_all().await
}

// ==================== Phase 3: Hunk stage/unstage ====================

#[tauri::command]
pub async fn stage_hunk(
    path: String,
    hunk_index: usize,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;

    let diff = repo.diff_file(&path, false)?;
    let file = diff.files.first().ok_or(AppError::General("No diff found for file".into()))?;
    let hunk = file.hunks.get(hunk_index).ok_or(AppError::General("Hunk index out of range".into()))?;

    let patch = crate::git::patch::generate_hunk_patch(&path, hunk, false);
    repo.apply_patch(&patch, true, false).await
}

#[tauri::command]
pub async fn unstage_hunk(
    path: String,
    hunk_index: usize,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;

    let diff = repo.diff_file(&path, true)?;
    let file = diff.files.first().ok_or(AppError::General("No diff found for file".into()))?;
    let hunk = file.hunks.get(hunk_index).ok_or(AppError::General("Hunk index out of range".into()))?;

    let patch = crate::git::patch::generate_hunk_patch(&path, hunk, true);
    repo.apply_patch(&patch, true, true).await
}

#[tauri::command]
pub async fn stage_lines(
    path: String,
    hunk_index: usize,
    line_indices: Vec<usize>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;

    let diff = repo.diff_file(&path, false)?;
    let file = diff.files.first().ok_or(AppError::General("No diff found for file".into()))?;
    let hunk = file.hunks.get(hunk_index).ok_or(AppError::General("Hunk index out of range".into()))?;

    let patch = crate::git::patch::generate_line_patch(&path, hunk, &line_indices, false);
    repo.apply_patch(&patch, true, false).await
}

#[tauri::command]
pub async fn discard_hunk(
    path: String,
    hunk_index: usize,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;

    let diff = repo.diff_file(&path, false)?;
    let file = diff.files.first().ok_or(AppError::General("No diff found for file".into()))?;
    let hunk = file.hunks.get(hunk_index).ok_or(AppError::General("Hunk index out of range".into()))?;

    let patch = crate::git::patch::generate_hunk_patch(&path, hunk, true);
    repo.apply_patch(&patch, false, true).await
}

// ==================== Phase 3: Conflict resolution ====================

#[tauri::command]
pub async fn get_conflict_files(
    state: State<'_, AppState>,
) -> Result<Vec<ConflictFile>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.conflict_files()
}

#[tauri::command]
pub async fn get_conflict_versions(
    path: String,
    state: State<'_, AppState>,
) -> Result<ConflictVersions, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.read_conflict_versions(&path)
}

#[tauri::command]
pub async fn mark_resolved(
    path: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.mark_resolved(&path).await
}

#[tauri::command]
pub async fn write_merge_result(
    path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.write_merge_result(&path, &content).await
}

// ==================== Phase 4: Blame ====================

#[tauri::command]
pub async fn get_blame(
    path: String,
    state: State<'_, AppState>,
) -> Result<Vec<BlameLine>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.blame(&path)
}

// ==================== Phase 5: Line changes & Gitignore ====================

#[tauri::command]
pub async fn get_line_changes(
    path: String,
    state: State<'_, AppState>,
) -> Result<Vec<LineChange>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.line_changes(&path)
}

#[tauri::command]
pub async fn add_to_gitignore(
    pattern: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let repo = state.current_repo.lock().await;
    let repo = repo.as_ref().ok_or(AppError::General("No repository opened".into()))?;
    repo.add_to_gitignore(&pattern).await
}
