use std::path::Path;
use std::process::Command;

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
