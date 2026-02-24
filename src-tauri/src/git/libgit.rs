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
}
