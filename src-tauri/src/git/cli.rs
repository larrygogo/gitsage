use std::path::Path;
use std::process::{Command, Stdio};
use std::io::Write as IoWrite;

use crate::error::{AppError, AppResult};

/// Execute a git CLI command and return stdout
fn run_git(repo_path: &Path, args: &[&str]) -> AppResult<String> {
    let output = Command::new("git")
        .current_dir(repo_path)
        .args(args)
        .output()
        .map_err(|e| AppError::GitCli(format!("Failed to execute git: {}", e)))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(AppError::GitCli(stderr))
    }
}

// ---------------------------------------------------------------------------
// Existing functions
// ---------------------------------------------------------------------------

/// Stage files
pub async fn stage(repo_path: &Path, paths: &[String]) -> AppResult<()> {
    let path_refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    let mut args = vec!["add", "--"];
    args.extend(path_refs);
    run_git(repo_path, &args)?;
    Ok(())
}

/// Unstage files
pub async fn unstage(repo_path: &Path, paths: &[String]) -> AppResult<()> {
    let path_refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    let mut args = vec!["restore", "--staged", "--"];
    args.extend(path_refs);
    run_git(repo_path, &args)?;
    Ok(())
}

/// Create a commit
pub async fn commit(repo_path: &Path, message: &str, amend: bool) -> AppResult<String> {
    let mut args = vec!["commit", "-m", message];
    if amend {
        args.push("--amend");
    }
    let output = run_git(repo_path, &args)?;
    Ok(output)
}

/// Create a new branch
pub async fn create_branch(repo_path: &Path, name: &str) -> AppResult<()> {
    run_git(repo_path, &["branch", name])?;
    Ok(())
}

/// Switch to a branch
pub async fn checkout_branch(repo_path: &Path, name: &str) -> AppResult<()> {
    run_git(repo_path, &["checkout", name])?;
    Ok(())
}

/// Delete a branch
pub async fn delete_branch(repo_path: &Path, name: &str) -> AppResult<()> {
    run_git(repo_path, &["branch", "-d", name])?;
    Ok(())
}

/// Fetch from remote
pub async fn fetch(repo_path: &Path, remote: &str) -> AppResult<()> {
    run_git(repo_path, &["fetch", remote])?;
    Ok(())
}

/// Pull from remote
pub async fn pull(repo_path: &Path, remote: &str, branch: &str) -> AppResult<()> {
    run_git(repo_path, &["pull", remote, branch])?;
    Ok(())
}

/// Push to remote
pub async fn push(repo_path: &Path, remote: &str, branch: &str) -> AppResult<()> {
    run_git(repo_path, &["push", remote, branch])?;
    Ok(())
}

/// Clone a repository
pub async fn clone_repo(url: &str, dest: &Path) -> AppResult<()> {
    let output = Command::new("git")
        .args(["clone", url, &dest.to_string_lossy()])
        .output()
        .map_err(|e| AppError::GitCli(format!("Failed to execute git clone: {}", e)))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(AppError::GitCli(stderr))
    }
}

// ---------------------------------------------------------------------------
// Phase 1: Discard, undo, stash, merge, reset
// ---------------------------------------------------------------------------

/// Discard changes for specific files (tracked: checkout, untracked: clean)
pub async fn discard_files(repo_path: &Path, paths: &[String]) -> AppResult<()> {
    let path_refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();

    // Restore tracked file changes
    let mut checkout_args = vec!["checkout", "--"];
    checkout_args.extend(path_refs.iter());
    // Ignore errors for checkout (file might be untracked)
    let _ = run_git(repo_path, &checkout_args);

    // Remove untracked files
    let mut clean_args = vec!["clean", "-f", "--"];
    clean_args.extend(path_refs.iter());
    // Ignore errors for clean (file might be tracked)
    let _ = run_git(repo_path, &clean_args);

    Ok(())
}

/// Discard all changes (tracked and untracked)
pub async fn discard_all(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["checkout", "--", "."])?;
    run_git(repo_path, &["clean", "-fd"])?;
    Ok(())
}

/// Undo the last commit (soft: keep changes staged, mixed: keep changes unstaged)
pub async fn undo_last_commit(repo_path: &Path, soft: bool) -> AppResult<()> {
    if soft {
        run_git(repo_path, &["reset", "--soft", "HEAD~1"])?;
    } else {
        run_git(repo_path, &["reset", "HEAD~1"])?;
    }
    Ok(())
}

/// Push changes to stash
pub async fn stash_push(
    repo_path: &Path,
    message: Option<&str>,
    include_untracked: bool,
) -> AppResult<()> {
    let mut args = vec!["stash", "push"];
    if let Some(msg) = message {
        args.push("-m");
        args.push(msg);
    }
    if include_untracked {
        args.push("-u");
    }
    run_git(repo_path, &args)?;
    Ok(())
}

/// Pop a stash entry
pub async fn stash_pop(repo_path: &Path, index: Option<usize>) -> AppResult<()> {
    let stash_ref = index.map(|i| format!("stash@{{{}}}", i));
    let mut args = vec!["stash", "pop"];
    if let Some(ref r) = stash_ref {
        args.push(r.as_str());
    }
    run_git(repo_path, &args)?;
    Ok(())
}

/// Apply a stash entry without removing it
pub async fn stash_apply(repo_path: &Path, index: Option<usize>) -> AppResult<()> {
    let stash_ref = index.map(|i| format!("stash@{{{}}}", i));
    let mut args = vec!["stash", "apply"];
    if let Some(ref r) = stash_ref {
        args.push(r.as_str());
    }
    run_git(repo_path, &args)?;
    Ok(())
}

/// Drop a stash entry
pub async fn stash_drop(repo_path: &Path, index: Option<usize>) -> AppResult<()> {
    let stash_ref = index.map(|i| format!("stash@{{{}}}", i));
    let mut args = vec!["stash", "drop"];
    if let Some(ref r) = stash_ref {
        args.push(r.as_str());
    }
    run_git(repo_path, &args)?;
    Ok(())
}

/// Clear all stash entries
pub async fn stash_clear(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["stash", "clear"])?;
    Ok(())
}

/// Merge a branch into the current branch
pub async fn merge(repo_path: &Path, branch: &str, no_ff: bool) -> AppResult<String> {
    let mut args = vec!["merge"];
    if no_ff {
        args.push("--no-ff");
    }
    args.push(branch);
    let output = run_git(repo_path, &args)?;
    Ok(output)
}

/// Abort an in-progress merge
pub async fn merge_abort(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["merge", "--abort"])?;
    Ok(())
}

/// Continue an in-progress merge
pub async fn merge_continue(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["merge", "--continue"])?;
    Ok(())
}

/// Reset the current HEAD to a specific commit
pub async fn reset(repo_path: &Path, commit: &str, mode: &str) -> AppResult<()> {
    let mode_flag = format!("--{}", mode);
    run_git(repo_path, &["reset", &mode_flag, commit])?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Phase 2: Branch, tag, cherry-pick, revert, rebase, remote operations
// ---------------------------------------------------------------------------

/// Rename a branch
pub async fn rename_branch(repo_path: &Path, old_name: &str, new_name: &str) -> AppResult<()> {
    run_git(repo_path, &["branch", "-m", old_name, new_name])?;
    Ok(())
}

/// Create a tag (lightweight or annotated)
pub async fn create_tag(
    repo_path: &Path,
    name: &str,
    message: Option<&str>,
    commit: Option<&str>,
) -> AppResult<()> {
    let mut args = vec!["tag"];
    if let Some(msg) = message {
        args.push("-a");
        args.push("-m");
        args.push(msg);
    }
    args.push(name);
    if let Some(c) = commit {
        args.push(c);
    }
    run_git(repo_path, &args)?;
    Ok(())
}

/// Delete a tag
pub async fn delete_tag(repo_path: &Path, name: &str) -> AppResult<()> {
    run_git(repo_path, &["tag", "-d", name])?;
    Ok(())
}

/// Push a single tag to remote
pub async fn push_tag(repo_path: &Path, remote: &str, tag: &str) -> AppResult<()> {
    run_git(repo_path, &["push", remote, tag])?;
    Ok(())
}

/// Push all tags to remote
pub async fn push_all_tags(repo_path: &Path, remote: &str) -> AppResult<()> {
    run_git(repo_path, &["push", remote, "--tags"])?;
    Ok(())
}

/// Cherry-pick a commit
pub async fn cherry_pick(repo_path: &Path, commit_id: &str) -> AppResult<()> {
    run_git(repo_path, &["cherry-pick", commit_id])?;
    Ok(())
}

/// Abort an in-progress cherry-pick
pub async fn cherry_pick_abort(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["cherry-pick", "--abort"])?;
    Ok(())
}

/// Continue an in-progress cherry-pick
pub async fn cherry_pick_continue(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["cherry-pick", "--continue"])?;
    Ok(())
}

/// Revert a commit
pub async fn revert(repo_path: &Path, commit_id: &str) -> AppResult<()> {
    run_git(repo_path, &["revert", commit_id])?;
    Ok(())
}

/// Abort an in-progress revert
pub async fn revert_abort(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["revert", "--abort"])?;
    Ok(())
}

/// Continue an in-progress revert
pub async fn revert_continue(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["revert", "--continue"])?;
    Ok(())
}

/// Rebase onto a target branch or commit
pub async fn rebase(repo_path: &Path, onto: &str) -> AppResult<()> {
    run_git(repo_path, &["rebase", onto])?;
    Ok(())
}

/// Abort an in-progress rebase
pub async fn rebase_abort(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["rebase", "--abort"])?;
    Ok(())
}

/// Continue an in-progress rebase
pub async fn rebase_continue(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["rebase", "--continue"])?;
    Ok(())
}

/// Skip the current patch during a rebase
pub async fn rebase_skip(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["rebase", "--skip"])?;
    Ok(())
}

/// Pull with rebase strategy
pub async fn pull_rebase(repo_path: &Path, remote: &str, branch: &str) -> AppResult<()> {
    run_git(repo_path, &["pull", "--rebase", remote, branch])?;
    Ok(())
}

/// Add a remote
pub async fn add_remote(repo_path: &Path, name: &str, url: &str) -> AppResult<()> {
    run_git(repo_path, &["remote", "add", name, url])?;
    Ok(())
}

/// Remove a remote
pub async fn remove_remote(repo_path: &Path, name: &str) -> AppResult<()> {
    run_git(repo_path, &["remote", "remove", name])?;
    Ok(())
}

/// Rename a remote
pub async fn rename_remote(repo_path: &Path, old: &str, new: &str) -> AppResult<()> {
    run_git(repo_path, &["remote", "rename", old, new])?;
    Ok(())
}

/// Fetch from remote with pruning of deleted remote branches
pub async fn fetch_prune(repo_path: &Path, remote: &str) -> AppResult<()> {
    run_git(repo_path, &["fetch", "--prune", remote])?;
    Ok(())
}

/// Push and set upstream tracking branch
pub async fn push_set_upstream(repo_path: &Path, remote: &str, branch: &str) -> AppResult<()> {
    run_git(repo_path, &["push", "-u", remote, branch])?;
    Ok(())
}

/// Sync: pull then push (convenience wrapper)
pub async fn sync(repo_path: &Path, remote: &str, branch: &str) -> AppResult<()> {
    run_git(repo_path, &["pull", remote, branch])?;
    run_git(repo_path, &["push", remote, branch])?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Phase 3: Patch application, conflict resolution
// ---------------------------------------------------------------------------

/// Apply a patch from string content via stdin
pub async fn apply_patch(
    repo_path: &Path,
    patch: &str,
    cached: bool,
    reverse: bool,
) -> AppResult<()> {
    let mut args = vec!["apply"];
    if cached {
        args.push("--cached");
    }
    if reverse {
        args.push("--reverse");
    }
    args.push("-");

    let mut child = Command::new("git")
        .current_dir(repo_path)
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| AppError::GitCli(format!("Failed to execute git apply: {}", e)))?;

    if let Some(ref mut stdin) = child.stdin {
        stdin
            .write_all(patch.as_bytes())
            .map_err(|e| AppError::GitCli(format!("Failed to write patch to stdin: {}", e)))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| AppError::GitCli(format!("Failed to wait for git apply: {}", e)))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(AppError::GitCli(stderr))
    }
}

/// Mark a conflicted file as resolved by staging it
pub async fn mark_resolved(repo_path: &Path, path: &str) -> AppResult<()> {
    run_git(repo_path, &["add", path])?;
    Ok(())
}

/// Write merge result content to a file and stage it
pub async fn write_merge_result(
    repo_path: &Path,
    path: &str,
    content: &str,
) -> AppResult<()> {
    let file_path = repo_path.join(path);

    // Validate that the resolved path stays within the repository directory
    let canonical_repo = repo_path.canonicalize().map_err(|e| {
        AppError::PathValidation(format!("Failed to resolve repo path: {}", e))
    })?;
    let canonical_file = file_path.canonicalize().unwrap_or_else(|_| {
        // File may not exist yet; canonicalize parent then append filename
        if let Some(parent) = file_path.parent() {
            if let Ok(canonical_parent) = parent.canonicalize() {
                if let Some(name) = file_path.file_name() {
                    return canonical_parent.join(name);
                }
            }
        }
        file_path.clone()
    });
    if !canonical_file.starts_with(&canonical_repo) {
        return Err(AppError::PathValidation(format!(
            "Path '{}' escapes repository directory",
            path
        )));
    }

    std::fs::write(&file_path, content).map_err(|e| {
        AppError::GitCli(format!("Failed to write merge result to {}: {}", path, e))
    })?;
    run_git(repo_path, &["add", path])?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Phase 5: Gitignore, submodule, worktree
// ---------------------------------------------------------------------------

/// Append a pattern to .gitignore
pub async fn add_to_gitignore(repo_path: &Path, pattern: &str) -> AppResult<()> {
    use std::fs::OpenOptions;

    let gitignore_path = repo_path.join(".gitignore");

    // Read existing content to check if we need a newline prefix
    let needs_newline = if gitignore_path.exists() {
        let content = std::fs::read_to_string(&gitignore_path).map_err(|e| {
            AppError::GitCli(format!("Failed to read .gitignore: {}", e))
        })?;
        !content.is_empty() && !content.ends_with('\n')
    } else {
        false
    };

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&gitignore_path)
        .map_err(|e| AppError::GitCli(format!("Failed to open .gitignore: {}", e)))?;

    let line = if needs_newline {
        format!("\n{}\n", pattern)
    } else {
        format!("{}\n", pattern)
    };

    file.write_all(line.as_bytes()).map_err(|e| {
        AppError::GitCli(format!("Failed to write to .gitignore: {}", e))
    })?;

    Ok(())
}

/// Initialize submodules
pub async fn submodule_init(repo_path: &Path) -> AppResult<()> {
    run_git(repo_path, &["submodule", "init"])?;
    Ok(())
}

/// Update submodules
pub async fn submodule_update(repo_path: &Path, recursive: bool) -> AppResult<()> {
    let mut args = vec!["submodule", "update"];
    if recursive {
        args.push("--recursive");
    }
    run_git(repo_path, &args)?;
    Ok(())
}

/// Add a submodule
pub async fn submodule_add(repo_path: &Path, url: &str, path: &str) -> AppResult<()> {
    run_git(repo_path, &["submodule", "add", url, path])?;
    Ok(())
}

/// Add a worktree
pub async fn worktree_add(repo_path: &Path, path: &str, branch: &str) -> AppResult<()> {
    run_git(repo_path, &["worktree", "add", path, branch])?;
    Ok(())
}

/// Remove a worktree
pub async fn worktree_remove(repo_path: &Path, path: &str) -> AppResult<()> {
    run_git(repo_path, &["worktree", "remove", path])?;
    Ok(())
}

/// List all worktrees
pub async fn worktree_list(repo_path: &Path) -> AppResult<String> {
    let output = run_git(repo_path, &["worktree", "list", "--porcelain"])?;
    Ok(output)
}
