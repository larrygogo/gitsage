pub mod ai;
pub mod commands;
pub mod config;
pub mod db;
pub mod error;
pub mod git;
pub mod state;
pub mod watcher;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "gitsage=info".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            // Repository
            commands::repo::open_repo,
            commands::repo::init_repo,
            commands::repo::get_recent_repos,
            commands::repo::close_repo,
            // Workspace
            commands::workspace::get_status,
            commands::workspace::stage_files,
            commands::workspace::unstage_files,
            commands::workspace::get_diff,
            commands::workspace::get_staged_diff,
            // Commit
            commands::commit::create_commit,
            // Branch
            commands::branch::get_branches,
            commands::branch::get_current_branch,
            commands::branch::create_branch,
            commands::branch::checkout_branch,
            commands::branch::delete_branch,
            // Remote
            commands::remote::fetch_remote,
            commands::remote::pull_remote,
            commands::remote::push_remote,
            // AI
            commands::ai::generate_commit_message,
            commands::ai::generate_change_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
