use std::path::Path;
use std::sync::Mutex;

use git2::{DiffOptions, Repository, StatusOptions};

use crate::error::{AppError, AppResult};
use crate::git::diff::*;
use crate::git::repository::*;

/// Git operations implemented via git2-rs (libgit2)
/// Used for read-only operations for best performance
pub struct LibGitOps {
    repo: Mutex<Repository>,
}

// SAFETY: git2::Repository is not Send/Sync due to raw pointers, but we
// always access it through std::sync::Mutex which provides exclusive access.
unsafe impl Send for LibGitOps {}
unsafe impl Sync for LibGitOps {}

impl LibGitOps {
    pub fn open(path: &Path) -> AppResult<Self> {
        let repo = Repository::open(path)?;
        Ok(Self {
            repo: Mutex::new(repo),
        })
    }

    pub fn init(path: &Path) -> AppResult<Self> {
        let repo = Repository::init(path)?;
        Ok(Self {
            repo: Mutex::new(repo),
        })
    }

    fn lock_repo(&self) -> AppResult<std::sync::MutexGuard<'_, Repository>> {
        self.repo
            .lock()
            .map_err(|e| AppError::General(format!("Failed to lock repository: {}", e)))
    }

    pub fn current_branch(&self) -> AppResult<String> {
        let repo = self.lock_repo()?;
        let head = repo.head()?;
        let name = head
            .shorthand()
            .unwrap_or("HEAD (detached)")
            .to_string();
        Ok(name)
    }

    pub fn status(&self) -> AppResult<Vec<FileStatus>> {
        let repo = self.lock_repo()?;
        let mut opts = StatusOptions::new();
        opts.include_untracked(true)
            .recurse_untracked_dirs(true)
            .include_unmodified(false);

        let statuses = repo.statuses(Some(&mut opts))?;
        let mut result = Vec::new();

        for entry in statuses.iter() {
            let path = entry.path().unwrap_or("").to_string();
            let s = entry.status();

            // Index (staged) statuses
            if s.is_index_new() {
                result.push(FileStatus {
                    path: path.clone(),
                    status: FileStatusKind::New,
                    staged: true,
                });
            } else if s.is_index_modified() {
                result.push(FileStatus {
                    path: path.clone(),
                    status: FileStatusKind::Modified,
                    staged: true,
                });
            } else if s.is_index_deleted() {
                result.push(FileStatus {
                    path: path.clone(),
                    status: FileStatusKind::Deleted,
                    staged: true,
                });
            } else if s.is_index_renamed() {
                result.push(FileStatus {
                    path: path.clone(),
                    status: FileStatusKind::Renamed,
                    staged: true,
                });
            } else if s.is_index_typechange() {
                result.push(FileStatus {
                    path: path.clone(),
                    status: FileStatusKind::Typechange,
                    staged: true,
                });
            }

            // Workdir (unstaged) statuses
            if s.is_wt_new() {
                result.push(FileStatus {
                    path: path.clone(),
                    status: FileStatusKind::New,
                    staged: false,
                });
            } else if s.is_wt_modified() {
                result.push(FileStatus {
                    path: path.clone(),
                    status: FileStatusKind::Modified,
                    staged: false,
                });
            } else if s.is_wt_deleted() {
                result.push(FileStatus {
                    path: path.clone(),
                    status: FileStatusKind::Deleted,
                    staged: false,
                });
            } else if s.is_wt_renamed() {
                result.push(FileStatus {
                    path: path.clone(),
                    status: FileStatusKind::Renamed,
                    staged: false,
                });
            } else if s.is_wt_typechange() {
                result.push(FileStatus {
                    path: path.clone(),
                    status: FileStatusKind::Typechange,
                    staged: false,
                });
            }

            if s.is_conflicted() {
                result.push(FileStatus {
                    path,
                    status: FileStatusKind::Conflicted,
                    staged: false,
                });
            }
        }

        Ok(result)
    }

    pub fn diff_file(&self, path: &str, staged: bool) -> AppResult<DiffOutput> {
        let repo = self.lock_repo()?;
        let mut opts = DiffOptions::new();
        opts.pathspec(path);

        let diff = if staged {
            let head_tree = repo
                .head()
                .ok()
                .and_then(|h| h.peel_to_tree().ok());
            repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut opts))?
        } else {
            repo.diff_index_to_workdir(None, Some(&mut opts))?
        };

        Self::parse_diff(&diff)
    }

    pub fn diff_staged(&self) -> AppResult<DiffOutput> {
        let repo = self.lock_repo()?;
        let head_tree = repo
            .head()
            .ok()
            .and_then(|h| h.peel_to_tree().ok());

        let diff = repo.diff_tree_to_index(head_tree.as_ref(), None, None)?;

        Self::parse_diff(&diff)
    }

    fn parse_diff(diff: &git2::Diff) -> AppResult<DiffOutput> {
        let stats = diff.stats()?;
        let mut files = Vec::new();

        for (delta_idx, delta) in diff.deltas().enumerate() {
            let old_path = delta
                .old_file()
                .path()
                .map(|p| p.to_string_lossy().to_string());
            let new_path = delta
                .new_file()
                .path()
                .map(|p| p.to_string_lossy().to_string());
            let is_binary = delta.old_file().is_binary() || delta.new_file().is_binary();

            let mut hunks = Vec::new();
            let patch = git2::Patch::from_diff(diff, delta_idx)?;

            if let Some(patch) = patch {
                for hunk_idx in 0..patch.num_hunks() {
                    let (hunk, _) = patch.hunk(hunk_idx)?;
                    let mut lines = Vec::new();

                    for line_idx in 0..patch.num_lines_in_hunk(hunk_idx)? {
                        let line = patch.line_in_hunk(hunk_idx, line_idx)?;
                        let origin = match line.origin() {
                            '+' => DiffLineType::Addition,
                            '-' => DiffLineType::Deletion,
                            _ => DiffLineType::Context,
                        };

                        lines.push(DiffLine {
                            origin,
                            content: String::from_utf8_lossy(line.content()).to_string(),
                            old_lineno: line.old_lineno(),
                            new_lineno: line.new_lineno(),
                        });
                    }

                    hunks.push(DiffHunk {
                        old_start: hunk.old_start(),
                        old_lines: hunk.old_lines(),
                        new_start: hunk.new_start(),
                        new_lines: hunk.new_lines(),
                        header: String::from_utf8_lossy(hunk.header()).to_string(),
                        lines,
                    });
                }
            }

            files.push(DiffFile {
                old_path,
                new_path,
                hunks,
                is_binary,
            });
        }

        Ok(DiffOutput {
            files,
            stats: DiffStats {
                files_changed: stats.files_changed(),
                insertions: stats.insertions(),
                deletions: stats.deletions(),
            },
        })
    }

    pub fn branches(&self) -> AppResult<Vec<BranchInfo>> {
        let repo = self.lock_repo()?;
        let mut result = Vec::new();
        let branches = repo.branches(None)?;

        for branch in branches {
            let (branch, branch_type) = branch?;
            let name = branch.name()?.unwrap_or("").to_string();
            let is_head = branch.is_head();
            let is_remote = branch_type == git2::BranchType::Remote;

            let upstream = branch
                .upstream()
                .ok()
                .and_then(|u| u.name().ok().flatten().map(|n| n.to_string()));

            let (ahead, behind) = if let (Some(local_oid), Ok(upstream_branch)) =
                (branch.get().target(), branch.upstream())
            {
                if let Some(remote_oid) = upstream_branch.get().target() {
                    repo.graph_ahead_behind(local_oid, remote_oid)
                        .unwrap_or((0, 0))
                } else {
                    (0, 0)
                }
            } else {
                (0, 0)
            };

            result.push(BranchInfo {
                name,
                is_head,
                is_remote,
                upstream,
                ahead: ahead as u32,
                behind: behind as u32,
            });
        }

        Ok(result)
    }

    pub fn log(&self, max_count: usize) -> AppResult<Vec<CommitInfo>> {
        let repo = self.lock_repo()?;
        let mut revwalk = repo.revwalk()?;
        revwalk.push_head()?;
        revwalk.set_sorting(git2::Sort::TIME)?;

        let mut commits = Vec::new();
        for (i, oid) in revwalk.enumerate() {
            if i >= max_count {
                break;
            }
            let oid = oid?;
            let commit = repo.find_commit(oid)?;

            commits.push(CommitInfo {
                id: oid.to_string(),
                summary: commit.summary().unwrap_or("").to_string(),
                message: commit.message().unwrap_or("").to_string(),
                author_name: commit.author().name().unwrap_or("").to_string(),
                author_email: commit.author().email().unwrap_or("").to_string(),
                timestamp: commit.time().seconds(),
                parent_ids: commit.parent_ids().map(|id| id.to_string()).collect(),
            });
        }

        Ok(commits)
    }

    // ========================================================================
    // Phase 1: Stash & Repo State
    // ========================================================================

    /// List all stash entries in the repository.
    pub fn stash_list(&self) -> AppResult<Vec<StashEntry>> {
        let mut repo = self.lock_repo()?;
        let mut stashes = Vec::new();

        repo.stash_foreach(|index, message, _oid| {
            stashes.push(StashEntry {
                index,
                message: message.to_string(),
                timestamp: 0, // Will be filled below if possible
            });
            true
        })?;

        // Resolve timestamps by reading the stash commit objects
        for stash in &mut stashes {
            let refname = format!("stash@{{{}}}", stash.index);
            if let Ok(reference) = repo.revparse_single(&refname) {
                if let Ok(commit) = reference.peel_to_commit() {
                    stash.timestamp = commit.time().seconds();
                }
            }
        }

        Ok(stashes)
    }

    /// Get the current repository operation state (e.g., merging, rebasing).
    pub fn repo_state(&self) -> AppResult<RepoOperationState> {
        let repo = self.lock_repo()?;
        let state = repo.state();

        let op_state = match state {
            git2::RepositoryState::Clean => RepoOperationState::Normal,
            git2::RepositoryState::Merge => RepoOperationState::Merging,
            git2::RepositoryState::Revert
            | git2::RepositoryState::RevertSequence => RepoOperationState::Reverting,
            git2::RepositoryState::CherryPick
            | git2::RepositoryState::CherryPickSequence => RepoOperationState::CherryPicking,
            git2::RepositoryState::Bisect => RepoOperationState::Normal,
            git2::RepositoryState::Rebase
            | git2::RepositoryState::RebaseInteractive
            | git2::RepositoryState::RebaseMerge => RepoOperationState::Rebasing,
            git2::RepositoryState::ApplyMailbox
            | git2::RepositoryState::ApplyMailboxOrRebase => RepoOperationState::Normal,
        };

        Ok(op_state)
    }

    // ========================================================================
    // Phase 2: Tags & Remotes
    // ========================================================================

    /// List all tags in the repository.
    pub fn tags(&self) -> AppResult<Vec<TagInfo>> {
        let repo = self.lock_repo()?;
        let tag_names = repo.tag_names(None)?;
        let mut result = Vec::new();

        for name in tag_names.iter() {
            let name = match name {
                Some(n) => n,
                None => continue,
            };

            let refname = format!("refs/tags/{}", name);
            let reference = match repo.find_reference(&refname) {
                Ok(r) => r,
                Err(_) => continue,
            };

            // Try to peel to a tag object (annotated tag)
            let resolved = reference.resolve()?;
            let target_oid = resolved.target().unwrap_or_else(|| git2::Oid::zero());

            match reference.peel(git2::ObjectType::Tag) {
                Ok(tag_obj) => {
                    // Annotated tag
                    let tag = tag_obj
                        .as_tag()
                        .ok_or_else(|| AppError::General("Failed to read tag object".to_string()))?;
                    let message = tag.message().map(|m| m.to_string());
                    let tagger = tag.tagger().and_then(|t| t.name().map(|n| n.to_string()));
                    let timestamp = tag.tagger().map(|t| t.when().seconds());
                    let target_id = tag.target_id().to_string();

                    result.push(TagInfo {
                        name: name.to_string(),
                        target_id,
                        message,
                        tagger,
                        timestamp,
                        is_lightweight: false,
                    });
                }
                Err(_) => {
                    // Lightweight tag - points directly to a commit
                    result.push(TagInfo {
                        name: name.to_string(),
                        target_id: target_oid.to_string(),
                        message: None,
                        tagger: None,
                        timestamp: None,
                        is_lightweight: true,
                    });
                }
            }
        }

        Ok(result)
    }

    /// List all remotes in the repository.
    pub fn remotes(&self) -> AppResult<Vec<RemoteInfo>> {
        let repo = self.lock_repo()?;
        let remote_names = repo.remotes()?;
        let mut result = Vec::new();

        for name in remote_names.iter() {
            let name = match name {
                Some(n) => n,
                None => continue,
            };

            let remote = repo.find_remote(name)?;
            let url = remote.url().unwrap_or("").to_string();
            let fetch_url = remote.pushurl().map(|u| u.to_string());

            result.push(RemoteInfo {
                name: name.to_string(),
                url,
                fetch_url,
            });
        }

        Ok(result)
    }

    // ========================================================================
    // Phase 3: Conflict Detection & Resolution Support
    // ========================================================================

    /// List all conflicted files in the repository index.
    pub fn conflict_files(&self) -> AppResult<Vec<ConflictFile>> {
        let repo = self.lock_repo()?;
        let index = repo.index()?;
        let conflicts = index.conflicts()?;
        let mut result = Vec::new();

        for conflict in conflicts {
            let conflict = conflict?;

            let path = conflict
                .our
                .as_ref()
                .or(conflict.their.as_ref())
                .or(conflict.ancestor.as_ref())
                .and_then(|entry| {
                    std::str::from_utf8(&entry.path).ok().map(|s| s.to_string())
                })
                .unwrap_or_default();

            result.push(ConflictFile {
                path,
                has_base: conflict.ancestor.is_some(),
                has_ours: conflict.our.is_some(),
                has_theirs: conflict.their.is_some(),
            });
        }

        Ok(result)
    }

    /// Read the base, ours, and theirs versions of a conflicted file.
    pub fn read_conflict_versions(&self, path: &str) -> AppResult<ConflictVersions> {
        let repo = self.lock_repo()?;
        let index = repo.index()?;
        let conflicts = index.conflicts()?;

        for conflict in conflicts {
            let conflict = conflict?;

            // Check if this conflict entry matches the requested path
            let conflict_path = conflict
                .our
                .as_ref()
                .or(conflict.their.as_ref())
                .or(conflict.ancestor.as_ref())
                .and_then(|entry| {
                    std::str::from_utf8(&entry.path).ok().map(|s| s.to_string())
                })
                .unwrap_or_default();

            if conflict_path != path {
                continue;
            }

            let read_blob = |entry: &Option<git2::IndexEntry>| -> Option<String> {
                entry.as_ref().and_then(|e| {
                    repo.find_blob(e.id)
                        .ok()
                        .map(|blob| String::from_utf8_lossy(blob.content()).to_string())
                })
            };

            return Ok(ConflictVersions {
                base: read_blob(&conflict.ancestor),
                ours: read_blob(&conflict.our),
                theirs: read_blob(&conflict.their),
            });
        }

        Err(AppError::General(format!(
            "No conflict found for path: {}",
            path
        )))
    }

    // ========================================================================
    // Phase 4: Commit Diff, File Log, Blame, Search, Pagination
    // ========================================================================

    /// Get the diff introduced by a specific commit.
    pub fn commit_diff(&self, commit_id: &str) -> AppResult<DiffOutput> {
        let repo = self.lock_repo()?;
        let oid = git2::Oid::from_str(commit_id)
            .map_err(|e| AppError::General(format!("Invalid commit id '{}': {}", commit_id, e)))?;
        let commit = repo.find_commit(oid)?;
        let commit_tree = commit.tree()?;

        let diff = if commit.parent_count() > 0 {
            let parent = commit.parent(0)?;
            let parent_tree = parent.tree()?;
            repo.diff_tree_to_tree(Some(&parent_tree), Some(&commit_tree), None)?
        } else {
            // Initial commit: diff empty tree to commit tree
            repo.diff_tree_to_tree(None, Some(&commit_tree), None)?
        };

        Self::parse_diff(&diff)
    }

    /// Get the commit log for a specific file.
    pub fn file_log(&self, path: &str, max_count: usize) -> AppResult<Vec<CommitInfo>> {
        let repo = self.lock_repo()?;
        let mut revwalk = repo.revwalk()?;
        revwalk.push_head()?;
        revwalk.set_sorting(git2::Sort::TIME)?;

        let mut commits = Vec::new();

        for oid in revwalk {
            if commits.len() >= max_count {
                break;
            }
            let oid = oid?;
            let commit = repo.find_commit(oid)?;
            let commit_tree = commit.tree()?;

            // Check if the file exists in this commit's tree
            let current_entry = commit_tree.get_path(Path::new(path)).ok();

            // Compare with parent to see if the file was changed
            let file_changed = if commit.parent_count() == 0 {
                // Initial commit: file is "changed" if it exists
                current_entry.is_some()
            } else {
                let parent = commit.parent(0)?;
                let parent_tree = parent.tree()?;
                let parent_entry = parent_tree.get_path(Path::new(path)).ok();

                match (&current_entry, &parent_entry) {
                    (Some(cur), Some(par)) => cur.id() != par.id(),
                    (Some(_), None) => true,  // File was added
                    (None, Some(_)) => true,  // File was deleted
                    (None, None) => false,     // File doesn't exist in either
                }
            };

            if file_changed {
                commits.push(CommitInfo {
                    id: oid.to_string(),
                    summary: commit.summary().unwrap_or("").to_string(),
                    message: commit.message().unwrap_or("").to_string(),
                    author_name: commit.author().name().unwrap_or("").to_string(),
                    author_email: commit.author().email().unwrap_or("").to_string(),
                    timestamp: commit.time().seconds(),
                    parent_ids: commit.parent_ids().map(|id| id.to_string()).collect(),
                });
            }
        }

        Ok(commits)
    }

    /// Get blame information for a file.
    pub fn blame(&self, path: &str) -> AppResult<Vec<BlameLine>> {
        let repo = self.lock_repo()?;
        let blame = repo.blame_file(Path::new(path), None)?;

        // Read file content from working directory for line contents
        let workdir = repo
            .workdir()
            .ok_or_else(|| AppError::General("Repository has no working directory".to_string()))?;
        let file_path = workdir.join(path);
        let content = std::fs::read_to_string(&file_path).map_err(|e| {
            AppError::General(format!("Failed to read file '{}': {}", path, e))
        })?;
        let file_lines: Vec<&str> = content.lines().collect();

        let mut result = Vec::new();

        for hunk_idx in 0..blame.len() {
            let hunk = blame
                .get_index(hunk_idx)
                .ok_or_else(|| AppError::General("Failed to get blame hunk".to_string()))?;

            let start_line = hunk.final_start_line();
            let num_lines = hunk.lines_in_hunk();
            let sig = hunk.final_signature();
            let commit_id = hunk.final_commit_id().to_string();
            let author_name = sig.name().unwrap_or("").to_string();
            let author_email = sig.email().unwrap_or("").to_string();
            let timestamp = sig.when().seconds();

            for i in 0..num_lines {
                let line_no = (start_line + i) as u32;
                let content_line = if (line_no as usize) <= file_lines.len() {
                    file_lines[(line_no as usize) - 1].to_string()
                } else {
                    String::new()
                };

                result.push(BlameLine {
                    line_no,
                    commit_id: commit_id.clone(),
                    author_name: author_name.clone(),
                    author_email: author_email.clone(),
                    timestamp,
                    content: content_line,
                });
            }

        }

        Ok(result)
    }

    /// Search commits by message content (case-insensitive).
    pub fn search_commits(&self, query: &str, max_count: usize) -> AppResult<Vec<CommitInfo>> {
        let repo = self.lock_repo()?;
        let mut revwalk = repo.revwalk()?;
        revwalk.push_head()?;
        revwalk.set_sorting(git2::Sort::TIME)?;

        let query_lower = query.to_lowercase();
        let mut commits = Vec::new();

        for oid in revwalk {
            if commits.len() >= max_count {
                break;
            }
            let oid = oid?;
            let commit = repo.find_commit(oid)?;
            let message = commit.message().unwrap_or("");

            if message.to_lowercase().contains(&query_lower) {
                commits.push(CommitInfo {
                    id: oid.to_string(),
                    summary: commit.summary().unwrap_or("").to_string(),
                    message: message.to_string(),
                    author_name: commit.author().name().unwrap_or("").to_string(),
                    author_email: commit.author().email().unwrap_or("").to_string(),
                    timestamp: commit.time().seconds(),
                    parent_ids: commit.parent_ids().map(|id| id.to_string()).collect(),
                });
            }
        }

        Ok(commits)
    }

    /// Get commit log with pagination (skip and limit).
    pub fn log_paged(&self, max_count: usize, skip: usize) -> AppResult<Vec<CommitInfo>> {
        let repo = self.lock_repo()?;
        let mut revwalk = repo.revwalk()?;
        revwalk.push_head()?;
        revwalk.set_sorting(git2::Sort::TIME)?;

        let mut commits = Vec::new();
        for (i, oid) in revwalk.enumerate() {
            if i < skip {
                // Consume the oid to check for errors, but skip it
                let _oid = oid?;
                continue;
            }
            if commits.len() >= max_count {
                break;
            }
            let oid = oid?;
            let commit = repo.find_commit(oid)?;

            commits.push(CommitInfo {
                id: oid.to_string(),
                summary: commit.summary().unwrap_or("").to_string(),
                message: commit.message().unwrap_or("").to_string(),
                author_name: commit.author().name().unwrap_or("").to_string(),
                author_email: commit.author().email().unwrap_or("").to_string(),
                timestamp: commit.time().seconds(),
                parent_ids: commit.parent_ids().map(|id| id.to_string()).collect(),
            });
        }

        Ok(commits)
    }

    /// Get commit log for a specific branch.
    pub fn log_branch(&self, branch: &str, max_count: usize) -> AppResult<Vec<CommitInfo>> {
        let repo = self.lock_repo()?;
        let mut revwalk = repo.revwalk()?;

        // Try to resolve the branch reference
        let reference = repo
            .find_branch(branch, git2::BranchType::Local)
            .or_else(|_| repo.find_branch(branch, git2::BranchType::Remote))
            .map_err(|e| AppError::General(format!("Branch '{}' not found: {}", branch, e)))?;

        let oid = reference
            .get()
            .target()
            .ok_or_else(|| AppError::General(format!("Branch '{}' has no target", branch)))?;

        revwalk.push(oid)?;
        revwalk.set_sorting(git2::Sort::TIME)?;

        let mut commits = Vec::new();
        for (i, oid) in revwalk.enumerate() {
            if i >= max_count {
                break;
            }
            let oid = oid?;
            let commit = repo.find_commit(oid)?;

            commits.push(CommitInfo {
                id: oid.to_string(),
                summary: commit.summary().unwrap_or("").to_string(),
                message: commit.message().unwrap_or("").to_string(),
                author_name: commit.author().name().unwrap_or("").to_string(),
                author_email: commit.author().email().unwrap_or("").to_string(),
                timestamp: commit.time().seconds(),
                parent_ids: commit.parent_ids().map(|id| id.to_string()).collect(),
            });
        }

        Ok(commits)
    }

    // ========================================================================
    // Phase 5: Line Changes & Submodules
    // ========================================================================

    /// Get line-level change information for a file (HEAD vs working directory).
    pub fn line_changes(&self, path: &str) -> AppResult<Vec<LineChange>> {
        let repo = self.lock_repo()?;
        let mut opts = DiffOptions::new();
        opts.pathspec(path);

        // Diff HEAD tree to workdir to capture both staged and unstaged changes
        let head_tree = repo
            .head()
            .ok()
            .and_then(|h| h.peel_to_tree().ok());
        let diff = repo.diff_tree_to_workdir_with_index(head_tree.as_ref(), Some(&mut opts))?;

        let mut changes = Vec::new();

        for (delta_idx, _delta) in diff.deltas().enumerate() {
            let patch = git2::Patch::from_diff(&diff, delta_idx)?;
            if let Some(patch) = patch {
                for hunk_idx in 0..patch.num_hunks() {
                    let (_hunk, _) = patch.hunk(hunk_idx)?;
                    let mut line_idx = 0;
                    let num_lines = patch.num_lines_in_hunk(hunk_idx)?;

                    while line_idx < num_lines {
                        let line = patch.line_in_hunk(hunk_idx, line_idx)?;

                        match line.origin() {
                            '+' => {
                                // Addition: collect consecutive added lines
                                let start = line.new_lineno().unwrap_or(1);
                                let mut end = start;
                                let mut next = line_idx + 1;
                                while next < num_lines {
                                    let next_line = patch.line_in_hunk(hunk_idx, next)?;
                                    if next_line.origin() == '+' {
                                        end = next_line.new_lineno().unwrap_or(end);
                                        next += 1;
                                    } else {
                                        break;
                                    }
                                }
                                changes.push(LineChange {
                                    start_line: start,
                                    end_line: end,
                                    change_type: ChangeType::Added,
                                });
                                line_idx = next;
                            }
                            '-' => {
                                // Deletion: collect consecutive deleted lines
                                let start = line.old_lineno().unwrap_or(1);
                                let mut end = start;
                                let mut next = line_idx + 1;

                                // Check if followed by additions (modification)
                                let mut has_additions = false;
                                while next < num_lines {
                                    let next_line = patch.line_in_hunk(hunk_idx, next)?;
                                    if next_line.origin() == '-' {
                                        end = next_line.old_lineno().unwrap_or(end);
                                        next += 1;
                                    } else {
                                        if next_line.origin() == '+' {
                                            has_additions = true;
                                        }
                                        break;
                                    }
                                }

                                if has_additions {
                                    // This is a modification (deletions followed by additions)
                                    let mod_start = start;
                                    // Consume the additions too
                                    let mut mod_end = end;
                                    while next < num_lines {
                                        let next_line = patch.line_in_hunk(hunk_idx, next)?;
                                        if next_line.origin() == '+' {
                                            if let Some(ln) = next_line.new_lineno() {
                                                mod_end = ln;
                                            }
                                            next += 1;
                                        } else {
                                            break;
                                        }
                                    }
                                    changes.push(LineChange {
                                        start_line: mod_start,
                                        end_line: mod_end,
                                        change_type: ChangeType::Modified,
                                    });
                                } else {
                                    changes.push(LineChange {
                                        start_line: start,
                                        end_line: end,
                                        change_type: ChangeType::Deleted,
                                    });
                                }
                                line_idx = next;
                            }
                            _ => {
                                // Context line, skip
                                line_idx += 1;
                            }
                        }
                    }
                }
            }
        }

        Ok(changes)
    }

    /// List all submodules in the repository.
    pub fn submodules(&self) -> AppResult<Vec<SubmoduleInfo>> {
        let repo = self.lock_repo()?;
        let submodules = repo.submodules()?;
        let mut result = Vec::new();

        for submodule in &submodules {
            let name = submodule.name().unwrap_or("").to_string();
            let path = submodule.path().to_string_lossy().to_string();
            let url = submodule.url().unwrap_or("").to_string();
            let head_id = submodule.head_id().map(|oid| oid.to_string());

            // A submodule is considered initialized if it has a working directory
            let is_initialized = submodule.open().is_ok();

            result.push(SubmoduleInfo {
                name,
                path,
                url,
                head_id,
                is_initialized,
            });
        }

        Ok(result)
    }
}
