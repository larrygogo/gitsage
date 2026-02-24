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
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            // Repository
            commands::repo::open_repo,
            commands::repo::init_repo,
            commands::repo::get_recent_repos,
            commands::repo::close_repo,
            commands::repo::clone_repo,
            // Workspace
            commands::workspace::get_status,
            commands::workspace::stage_files,
            commands::workspace::unstage_files,
            commands::workspace::get_diff,
            commands::workspace::get_staged_diff,
            commands::workspace::discard_changes,
            commands::workspace::discard_all_changes,
            commands::workspace::stage_hunk,
            commands::workspace::unstage_hunk,
            commands::workspace::stage_lines,
            commands::workspace::discard_hunk,
            commands::workspace::get_conflict_files,
            commands::workspace::get_conflict_versions,
            commands::workspace::mark_resolved,
            commands::workspace::write_merge_result,
            commands::workspace::get_blame,
            commands::workspace::get_line_changes,
            commands::workspace::add_to_gitignore,
            // Commit
            commands::commit::create_commit,
            commands::commit::get_commit_log,
            commands::commit::amend_commit,
            commands::commit::undo_last_commit,
            commands::commit::reset_to_commit,
            commands::commit::get_commit_diff,
            commands::commit::get_file_history,
            commands::commit::search_commits,
            commands::commit::get_commit_log_paged,
            commands::commit::get_branch_log,
            // Branch
            commands::branch::get_branches,
            commands::branch::get_current_branch,
            commands::branch::create_branch,
            commands::branch::checkout_branch,
            commands::branch::delete_branch,
            commands::branch::rename_branch,
            // Remote
            commands::remote::fetch_remote,
            commands::remote::pull_remote,
            commands::remote::push_remote,
            commands::remote::get_remotes,
            commands::remote::add_remote,
            commands::remote::remove_remote,
            commands::remote::rename_remote,
            commands::remote::fetch_prune,
            commands::remote::push_set_upstream,
            commands::remote::pull_rebase,
            commands::remote::sync_remote,
            // Stash
            commands::stash::stash_save,
            commands::stash::stash_pop,
            commands::stash::stash_apply,
            commands::stash::stash_drop,
            commands::stash::stash_list,
            commands::stash::stash_clear,
            // Merge / Cherry-pick / Revert / Rebase
            commands::merge::merge_branch,
            commands::merge::merge_abort,
            commands::merge::merge_continue,
            commands::merge::get_repo_state,
            commands::merge::cherry_pick,
            commands::merge::cherry_pick_abort,
            commands::merge::cherry_pick_continue,
            commands::merge::revert_commit,
            commands::merge::revert_abort,
            commands::merge::revert_continue,
            commands::merge::rebase_onto,
            commands::merge::rebase_abort,
            commands::merge::rebase_continue,
            commands::merge::rebase_skip,
            // Tag
            commands::tag::get_tags,
            commands::tag::create_tag,
            commands::tag::delete_tag,
            commands::tag::push_tag,
            commands::tag::push_all_tags,
            // Submodule
            commands::submodule::get_submodules,
            commands::submodule::submodule_init,
            commands::submodule::submodule_update,
            commands::submodule::submodule_add,
            // Worktree
            commands::worktree::worktree_add,
            commands::worktree::worktree_remove,
            commands::worktree::worktree_list,
            // AI
            commands::ai::generate_commit_message,
            commands::ai::generate_change_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
