use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::AppResult;
use crate::git::diff::DiffOutput;
use crate::git::libgit::LibGitOps;

// ==================== 基础类型 ====================

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

// ==================== Phase 1 类型 ====================

/// Stash entry
#[derive(Debug, Clone, Serialize)]
pub struct StashEntry {
    pub index: usize,
    pub message: String,
    pub timestamp: i64,
}

/// Repository operation state
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum RepoOperationState {
    Normal,
    Merging,
    Rebasing,
    CherryPicking,
    Reverting,
}

// ==================== Phase 2 类型 ====================

/// Tag information
#[derive(Debug, Clone, Serialize)]
pub struct TagInfo {
    pub name: String,
    pub target_id: String,
    pub message: Option<String>,
    pub tagger: Option<String>,
    pub timestamp: Option<i64>,
    pub is_lightweight: bool,
}

/// Remote information
#[derive(Debug, Clone, Serialize)]
pub struct RemoteInfo {
    pub name: String,
    pub url: String,
    pub fetch_url: Option<String>,
}

// ==================== Phase 3 类型 ====================

/// Conflict file entry
#[derive(Debug, Clone, Serialize)]
pub struct ConflictFile {
    pub path: String,
    pub has_base: bool,
    pub has_ours: bool,
    pub has_theirs: bool,
}

/// Conflict file versions (base/ours/theirs content)
#[derive(Debug, Clone, Serialize)]
pub struct ConflictVersions {
    pub base: Option<String>,
    pub ours: Option<String>,
    pub theirs: Option<String>,
}

// ==================== Phase 4 类型 ====================

/// Blame line annotation
#[derive(Debug, Clone, Serialize)]
pub struct BlameLine {
    pub line_no: u32,
    pub commit_id: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub content: String,
}

// ==================== Phase 5 类型 ====================

/// Line change type for gutter indicators
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum ChangeType {
    Added,
    Modified,
    Deleted,
}

/// Line change information for gutter indicators
#[derive(Debug, Clone, Serialize)]
pub struct LineChange {
    pub start_line: u32,
    pub end_line: u32,
    pub change_type: ChangeType,
}

/// Submodule information
#[derive(Debug, Clone, Serialize)]
pub struct SubmoduleInfo {
    pub name: String,
    pub path: String,
    pub url: String,
    pub head_id: Option<String>,
    pub is_initialized: bool,
}

/// Worktree information
#[derive(Debug, Clone, Serialize)]
pub struct WorktreeInfo {
    pub path: String,
    pub branch: String,
    pub head_id: String,
    pub is_main: bool,
}

// ==================== GitRepository ====================

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

    // ==================== Read operations (via git2-rs) ====================

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

    // Phase 1 reads

    /// Get stash list
    pub fn stash_list(&self) -> AppResult<Vec<StashEntry>> {
        self.libgit.stash_list()
    }

    /// Get repository operation state
    pub fn repo_state(&self) -> AppResult<RepoOperationState> {
        self.libgit.repo_state()
    }

    // Phase 2 reads

    /// Get tags
    pub fn tags(&self) -> AppResult<Vec<TagInfo>> {
        self.libgit.tags()
    }

    /// Get remotes
    pub fn remotes(&self) -> AppResult<Vec<RemoteInfo>> {
        self.libgit.remotes()
    }

    // Phase 3 reads

    /// Get conflict files
    pub fn conflict_files(&self) -> AppResult<Vec<ConflictFile>> {
        self.libgit.conflict_files()
    }

    /// Read conflict file versions
    pub fn read_conflict_versions(&self, path: &str) -> AppResult<ConflictVersions> {
        self.libgit.read_conflict_versions(path)
    }

    // Phase 4 reads

    /// Get diff for a specific commit
    pub fn commit_diff(&self, commit_id: &str) -> AppResult<DiffOutput> {
        self.libgit.commit_diff(commit_id)
    }

    /// Get file history
    pub fn file_log(&self, path: &str, max_count: usize) -> AppResult<Vec<CommitInfo>> {
        self.libgit.file_log(path, max_count)
    }

    /// Get blame for a file
    pub fn blame(&self, path: &str) -> AppResult<Vec<BlameLine>> {
        self.libgit.blame(path)
    }

    /// Search commits by message
    pub fn search_commits(&self, query: &str, max_count: usize) -> AppResult<Vec<CommitInfo>> {
        self.libgit.search_commits(query, max_count)
    }

    /// Get commit log with pagination
    pub fn log_paged(&self, max_count: usize, skip: usize) -> AppResult<Vec<CommitInfo>> {
        self.libgit.log_paged(max_count, skip)
    }

    /// Get commit log for a specific branch
    pub fn log_branch(&self, branch: &str, max_count: usize) -> AppResult<Vec<CommitInfo>> {
        self.libgit.log_branch(branch, max_count)
    }

    // Phase 5 reads

    /// Get line changes for gutter indicators
    pub fn line_changes(&self, path: &str) -> AppResult<Vec<LineChange>> {
        self.libgit.line_changes(path)
    }

    /// Get submodules
    pub fn submodules(&self) -> AppResult<Vec<SubmoduleInfo>> {
        self.libgit.submodules()
    }

    // ==================== Write operations (via git CLI) ====================

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

    // Phase 1 writes

    /// Discard changes for specific files
    pub async fn discard_files(&self, paths: &[String]) -> AppResult<()> {
        crate::git::cli::discard_files(&self.path, paths).await
    }

    /// Discard all changes
    pub async fn discard_all(&self) -> AppResult<()> {
        crate::git::cli::discard_all(&self.path).await
    }

    /// Undo last commit
    pub async fn undo_last_commit(&self, soft: bool) -> AppResult<()> {
        crate::git::cli::undo_last_commit(&self.path, soft).await
    }

    /// Stash push
    pub async fn stash_push(&self, message: Option<&str>, include_untracked: bool) -> AppResult<()> {
        crate::git::cli::stash_push(&self.path, message, include_untracked).await
    }

    /// Stash pop
    pub async fn stash_pop(&self, index: Option<usize>) -> AppResult<()> {
        crate::git::cli::stash_pop(&self.path, index).await
    }

    /// Stash apply
    pub async fn stash_apply(&self, index: Option<usize>) -> AppResult<()> {
        crate::git::cli::stash_apply(&self.path, index).await
    }

    /// Stash drop
    pub async fn stash_drop(&self, index: Option<usize>) -> AppResult<()> {
        crate::git::cli::stash_drop(&self.path, index).await
    }

    /// Stash clear
    pub async fn stash_clear(&self) -> AppResult<()> {
        crate::git::cli::stash_clear(&self.path).await
    }

    /// Merge branch
    pub async fn merge(&self, branch: &str, no_ff: bool) -> AppResult<String> {
        crate::git::cli::merge(&self.path, branch, no_ff).await
    }

    /// Abort merge
    pub async fn merge_abort(&self) -> AppResult<()> {
        crate::git::cli::merge_abort(&self.path).await
    }

    /// Continue merge
    pub async fn merge_continue(&self) -> AppResult<()> {
        crate::git::cli::merge_continue(&self.path).await
    }

    /// Reset to commit
    pub async fn reset(&self, commit: &str, mode: &str) -> AppResult<()> {
        crate::git::cli::reset(&self.path, commit, mode).await
    }

    // Phase 2 writes

    /// Rename branch
    pub async fn rename_branch(&self, old_name: &str, new_name: &str) -> AppResult<()> {
        crate::git::cli::rename_branch(&self.path, old_name, new_name).await
    }

    /// Create tag
    pub async fn create_tag(&self, name: &str, message: Option<&str>, commit: Option<&str>) -> AppResult<()> {
        crate::git::cli::create_tag(&self.path, name, message, commit).await
    }

    /// Delete tag
    pub async fn delete_tag(&self, name: &str) -> AppResult<()> {
        crate::git::cli::delete_tag(&self.path, name).await
    }

    /// Push tag
    pub async fn push_tag(&self, remote: &str, tag: &str) -> AppResult<()> {
        crate::git::cli::push_tag(&self.path, remote, tag).await
    }

    /// Push all tags
    pub async fn push_all_tags(&self, remote: &str) -> AppResult<()> {
        crate::git::cli::push_all_tags(&self.path, remote).await
    }

    /// Cherry-pick
    pub async fn cherry_pick(&self, commit_id: &str) -> AppResult<()> {
        crate::git::cli::cherry_pick(&self.path, commit_id).await
    }

    /// Cherry-pick abort
    pub async fn cherry_pick_abort(&self) -> AppResult<()> {
        crate::git::cli::cherry_pick_abort(&self.path).await
    }

    /// Cherry-pick continue
    pub async fn cherry_pick_continue(&self) -> AppResult<()> {
        crate::git::cli::cherry_pick_continue(&self.path).await
    }

    /// Revert commit
    pub async fn revert(&self, commit_id: &str) -> AppResult<()> {
        crate::git::cli::revert(&self.path, commit_id).await
    }

    /// Revert abort
    pub async fn revert_abort(&self) -> AppResult<()> {
        crate::git::cli::revert_abort(&self.path).await
    }

    /// Revert continue
    pub async fn revert_continue(&self) -> AppResult<()> {
        crate::git::cli::revert_continue(&self.path).await
    }

    /// Rebase onto branch
    pub async fn rebase(&self, onto: &str) -> AppResult<()> {
        crate::git::cli::rebase(&self.path, onto).await
    }

    /// Rebase abort
    pub async fn rebase_abort(&self) -> AppResult<()> {
        crate::git::cli::rebase_abort(&self.path).await
    }

    /// Rebase continue
    pub async fn rebase_continue(&self) -> AppResult<()> {
        crate::git::cli::rebase_continue(&self.path).await
    }

    /// Rebase skip
    pub async fn rebase_skip(&self) -> AppResult<()> {
        crate::git::cli::rebase_skip(&self.path).await
    }

    /// Pull with rebase
    pub async fn pull_rebase(&self, remote: &str, branch: &str) -> AppResult<()> {
        crate::git::cli::pull_rebase(&self.path, remote, branch).await
    }

    /// Add remote
    pub async fn add_remote(&self, name: &str, url: &str) -> AppResult<()> {
        crate::git::cli::add_remote(&self.path, name, url).await
    }

    /// Remove remote
    pub async fn remove_remote(&self, name: &str) -> AppResult<()> {
        crate::git::cli::remove_remote(&self.path, name).await
    }

    /// Rename remote
    pub async fn rename_remote(&self, old: &str, new: &str) -> AppResult<()> {
        crate::git::cli::rename_remote(&self.path, old, new).await
    }

    /// Fetch with prune
    pub async fn fetch_prune(&self, remote: &str) -> AppResult<()> {
        crate::git::cli::fetch_prune(&self.path, remote).await
    }

    /// Push with set upstream
    pub async fn push_set_upstream(&self, remote: &str, branch: &str) -> AppResult<()> {
        crate::git::cli::push_set_upstream(&self.path, remote, branch).await
    }

    /// Sync (pull then push)
    pub async fn sync(&self, remote: &str, branch: &str) -> AppResult<()> {
        crate::git::cli::sync(&self.path, remote, branch).await
    }

    // Phase 3 writes

    /// Apply a patch
    pub async fn apply_patch(&self, patch: &str, cached: bool, reverse: bool) -> AppResult<()> {
        crate::git::cli::apply_patch(&self.path, patch, cached, reverse).await
    }

    /// Mark conflict as resolved
    pub async fn mark_resolved(&self, path: &str) -> AppResult<()> {
        crate::git::cli::mark_resolved(&self.path, path).await
    }

    /// Write merge result and mark resolved
    pub async fn write_merge_result(&self, path: &str, content: &str) -> AppResult<()> {
        crate::git::cli::write_merge_result(&self.path, path, content).await
    }

    // Phase 5 writes

    /// Add pattern to .gitignore
    pub async fn add_to_gitignore(&self, pattern: &str) -> AppResult<()> {
        crate::git::cli::add_to_gitignore(&self.path, pattern).await
    }

    /// Initialize submodules
    pub async fn submodule_init(&self) -> AppResult<()> {
        crate::git::cli::submodule_init(&self.path).await
    }

    /// Update submodules
    pub async fn submodule_update(&self, recursive: bool) -> AppResult<()> {
        crate::git::cli::submodule_update(&self.path, recursive).await
    }

    /// Add submodule
    pub async fn submodule_add(&self, url: &str, path: &str) -> AppResult<()> {
        crate::git::cli::submodule_add(&self.path, url, path).await
    }

    /// Add worktree
    pub async fn worktree_add(&self, path: &str, branch: &str) -> AppResult<()> {
        crate::git::cli::worktree_add(&self.path, path, branch).await
    }

    /// Remove worktree
    pub async fn worktree_remove(&self, path: &str) -> AppResult<()> {
        crate::git::cli::worktree_remove(&self.path, path).await
    }

    /// List worktrees
    pub async fn worktree_list(&self) -> AppResult<String> {
        crate::git::cli::worktree_list(&self.path).await
    }
}
