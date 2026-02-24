use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::AppResult;
use crate::git::diff::DiffOutput;
use crate::git::libgit::LibGitOps;

/// File status in the working tree
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum FileStatusKind {
    New,
    Modified,
    Deleted,
    Renamed,
    Typechange,
    Conflicted,
}

/// A file with its status
#[derive(Debug, Clone, Serialize)]
pub struct FileStatus {
    pub path: String,
    pub status: FileStatusKind,
    pub staged: bool,
}

/// Branch information
#[derive(Debug, Clone, Serialize)]
pub struct BranchInfo {
    pub name: String,
    pub is_head: bool,
    pub is_remote: bool,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
}

/// Commit information
#[derive(Debug, Clone, Serialize)]
pub struct CommitInfo {
    pub id: String,
    pub summary: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub parent_ids: Vec<String>,
}

/// Repository wrapper combining git2 (read) and CLI (write) operations
pub struct GitRepository {
    pub path: PathBuf,
    pub libgit: LibGitOps,
}

impl GitRepository {
    /// Open an existing repository
    pub fn open(path: &Path) -> AppResult<Self> {
        let libgit = LibGitOps::open(path)?;
        Ok(Self {
            path: path.to_path_buf(),
            libgit,
        })
    }

    /// Initialize a new repository
    pub fn init(path: &Path) -> AppResult<Self> {
        let libgit = LibGitOps::init(path)?;
        Ok(Self {
            path: path.to_path_buf(),
            libgit,
        })
    }

    /// Get the repository name (directory name)
    pub fn name(&self) -> String {
        self.path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string())
    }

    // --- Read operations (via git2-rs) ---

    /// Get current branch name
    pub fn current_branch(&self) -> AppResult<String> {
        self.libgit.current_branch()
    }

    /// Get file statuses
    pub fn status(&self) -> AppResult<Vec<FileStatus>> {
        self.libgit.status()
    }

    /// Get diff for a file
    pub fn diff_file(&self, path: &str, staged: bool) -> AppResult<DiffOutput> {
        self.libgit.diff_file(path, staged)
    }

    /// Get all staged changes diff
    pub fn diff_staged(&self) -> AppResult<DiffOutput> {
        self.libgit.diff_staged()
    }

    /// List branches
    pub fn branches(&self) -> AppResult<Vec<BranchInfo>> {
        self.libgit.branches()
    }

    /// Get commit log
    pub fn log(&self, max_count: usize) -> AppResult<Vec<CommitInfo>> {
        self.libgit.log(max_count)
    }

    // --- Write operations (via git CLI) ---

    /// Stage files
    pub async fn stage(&self, paths: &[String]) -> AppResult<()> {
        crate::git::cli::stage(&self.path, paths).await
    }

    /// Unstage files
    pub async fn unstage(&self, paths: &[String]) -> AppResult<()> {
        crate::git::cli::unstage(&self.path, paths).await
    }

    /// Create a commit
    pub async fn commit(&self, message: &str, amend: bool) -> AppResult<String> {
        crate::git::cli::commit(&self.path, message, amend).await
    }

    /// Create a branch
    pub async fn create_branch(&self, name: &str) -> AppResult<()> {
        crate::git::cli::create_branch(&self.path, name).await
    }

    /// Switch branch
    pub async fn checkout_branch(&self, name: &str) -> AppResult<()> {
        crate::git::cli::checkout_branch(&self.path, name).await
    }

    /// Delete a branch
    pub async fn delete_branch(&self, name: &str) -> AppResult<()> {
        crate::git::cli::delete_branch(&self.path, name).await
    }

    /// Fetch from remote
    pub async fn fetch(&self, remote: &str) -> AppResult<()> {
        crate::git::cli::fetch(&self.path, remote).await
    }

    /// Pull from remote
    pub async fn pull(&self, remote: &str, branch: &str) -> AppResult<()> {
        crate::git::cli::pull(&self.path, remote, branch).await
    }

    /// Push to remote
    pub async fn push(&self, remote: &str, branch: &str) -> AppResult<()> {
        crate::git::cli::push(&self.path, remote, branch).await
    }
}
