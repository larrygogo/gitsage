import type {
  FileStatus, BranchInfo, CommitInfo, DiffOutput, RepoEntry,
  StashEntry, RepoOperationState, TagInfo, RemoteInfo,
  ConflictFile, ConflictVersions, BlameLine, LineChange, SubmoduleInfo,
} from '../types';
import * as ipc from './ipc';

/**
 * Git 操作 Service
 * 封装所有 Git 相关的 IPC 调用，供 stores 和组件使用
 */

// ==================== 仓库管理 ====================

export async function openRepo(path: string): Promise<string> {
  return ipc.openRepo(path);
}

export async function initRepo(path: string): Promise<string> {
  return ipc.initRepo(path);
}

export async function closeRepo(): Promise<void> {
  return ipc.closeRepo();
}

export async function getRecentRepos(): Promise<RepoEntry[]> {
  return ipc.getRecentRepos();
}

export async function cloneRepo(url: string, destPath: string): Promise<void> {
  return ipc.cloneRepo(url, destPath);
}

// ==================== 文件状态 ====================

export async function getStatus(): Promise<FileStatus[]> {
  return ipc.getStatus();
}

export async function stageFiles(paths: string[]): Promise<void> {
  return ipc.stageFiles(paths);
}

export async function unstageFiles(paths: string[]): Promise<void> {
  return ipc.unstageFiles(paths);
}

export async function discardChanges(paths: string[]): Promise<void> {
  return ipc.discardChanges(paths);
}

export async function discardAllChanges(): Promise<void> {
  return ipc.discardAllChanges();
}

// ==================== Diff ====================

export async function getDiff(path: string, staged: boolean = false): Promise<DiffOutput> {
  return ipc.getDiff(path, staged);
}

export async function getStagedDiff(): Promise<DiffOutput> {
  return ipc.getStagedDiff();
}

// ==================== Hunk 操作 ====================

export async function stageHunk(path: string, hunkIndex: number): Promise<void> {
  return ipc.stageHunk(path, hunkIndex);
}

export async function unstageHunk(path: string, hunkIndex: number): Promise<void> {
  return ipc.unstageHunk(path, hunkIndex);
}

export async function stageLines(path: string, hunkIndex: number, lineIndices: number[]): Promise<void> {
  return ipc.stageLines(path, hunkIndex, lineIndices);
}

export async function discardHunk(path: string, hunkIndex: number): Promise<void> {
  return ipc.discardHunk(path, hunkIndex);
}

// ==================== 提交 ====================

export async function createCommit(message: string, amend: boolean = false): Promise<string> {
  return ipc.createCommit(message, amend);
}

export async function amendCommit(message: string): Promise<string> {
  return ipc.amendCommit(message);
}

export async function undoLastCommit(soft: boolean = true): Promise<void> {
  return ipc.undoLastCommit(soft);
}

export async function getCommitLog(limit?: number, all?: boolean): Promise<CommitInfo[]> {
  return ipc.getCommitLog(limit, all);
}

export async function getCommitLogPaged(maxCount: number, skip: number): Promise<CommitInfo[]> {
  return ipc.getCommitLogPaged(maxCount, skip);
}

export async function getBranchLog(branch: string, limit?: number, firstParent?: boolean): Promise<CommitInfo[]> {
  return ipc.getBranchLog(branch, limit, firstParent);
}

export async function resetToCommit(commitId: string, mode: string): Promise<void> {
  return ipc.resetToCommit(commitId, mode);
}

export async function getCommitDiff(commitId: string): Promise<DiffOutput> {
  return ipc.getCommitDiff(commitId);
}

export async function getFileHistory(path: string, limit?: number): Promise<CommitInfo[]> {
  return ipc.getFileHistory(path, limit);
}

export async function searchCommits(query: string, limit?: number): Promise<CommitInfo[]> {
  return ipc.searchCommits(query, limit);
}

// ==================== 分支操作 ====================

export async function getBranches(): Promise<BranchInfo[]> {
  return ipc.getBranches();
}

export async function getCurrentBranch(): Promise<string> {
  return ipc.getCurrentBranch();
}

export async function createBranch(name: string): Promise<void> {
  return ipc.createBranch(name);
}

export async function checkoutBranch(name: string): Promise<void> {
  return ipc.checkoutBranch(name);
}

export async function deleteBranch(name: string): Promise<void> {
  return ipc.deleteBranch(name);
}

export async function renameBranch(oldName: string, newName: string): Promise<void> {
  return ipc.renameBranch(oldName, newName);
}

export async function getBranchTips(): Promise<Record<string, string[]>> {
  return ipc.getBranchTips();
}

// ==================== 远程操作 ====================

export async function fetchRemote(remote?: string): Promise<void> {
  return ipc.fetchRemote(remote);
}

export async function pullRemote(remote?: string, branch?: string): Promise<void> {
  return ipc.pullRemote(remote, branch);
}

export async function pushRemote(remote?: string, branch?: string): Promise<void> {
  return ipc.pushRemote(remote, branch);
}

export async function getRemotes(): Promise<RemoteInfo[]> {
  return ipc.getRemotes();
}

export async function addRemote(name: string, url: string): Promise<void> {
  return ipc.addRemote(name, url);
}

export async function removeRemote(name: string): Promise<void> {
  return ipc.removeRemote(name);
}

export async function renameRemote(oldName: string, newName: string): Promise<void> {
  return ipc.renameRemote(oldName, newName);
}

export async function fetchPrune(remote: string): Promise<void> {
  return ipc.fetchPrune(remote);
}

export async function pushSetUpstream(remote: string, branch: string): Promise<void> {
  return ipc.pushSetUpstream(remote, branch);
}

export async function pullRebase(remote?: string, branch?: string): Promise<void> {
  return ipc.pullRebase(remote, branch);
}

export async function syncRemote(remote?: string, branch?: string): Promise<void> {
  return ipc.syncRemote(remote, branch);
}

// ==================== Stash ====================

export async function stashSave(message?: string, includeUntracked?: boolean): Promise<void> {
  return ipc.stashSave(message, includeUntracked);
}

export async function stashPop(index?: number): Promise<void> {
  return ipc.stashPop(index);
}

export async function stashApply(index?: number): Promise<void> {
  return ipc.stashApply(index);
}

export async function stashDrop(index?: number): Promise<void> {
  return ipc.stashDrop(index);
}

export async function stashList(): Promise<StashEntry[]> {
  return ipc.stashList();
}

export async function stashClear(): Promise<void> {
  return ipc.stashClear();
}

// ==================== Merge / Cherry-pick / Revert / Rebase ====================

export async function mergeBranch(branch: string, noFf?: boolean): Promise<string> {
  return ipc.mergeBranch(branch, noFf);
}

export async function mergeAbort(): Promise<void> {
  return ipc.mergeAbort();
}

export async function mergeContinue(): Promise<void> {
  return ipc.mergeContinue();
}

export async function getRepoState(): Promise<RepoOperationState> {
  return ipc.getRepoState();
}

export async function cherryPick(commitId: string): Promise<void> {
  return ipc.cherryPick(commitId);
}

export async function cherryPickAbort(): Promise<void> {
  return ipc.cherryPickAbort();
}

export async function cherryPickContinue(): Promise<void> {
  return ipc.cherryPickContinue();
}

export async function revertCommit(commitId: string): Promise<void> {
  return ipc.revertCommit(commitId);
}

export async function revertAbort(): Promise<void> {
  return ipc.revertAbort();
}

export async function revertContinue(): Promise<void> {
  return ipc.revertContinue();
}

export async function rebaseOnto(onto: string): Promise<void> {
  return ipc.rebaseOnto(onto);
}

export async function rebaseAbort(): Promise<void> {
  return ipc.rebaseAbort();
}

export async function rebaseContinue(): Promise<void> {
  return ipc.rebaseContinue();
}

export async function rebaseSkip(): Promise<void> {
  return ipc.rebaseSkip();
}

// ==================== Tag ====================

export async function getTags(): Promise<TagInfo[]> {
  return ipc.getTags();
}

export async function createTag(name: string, message?: string, commit?: string): Promise<void> {
  return ipc.createTag(name, message, commit);
}

export async function deleteTag(name: string): Promise<void> {
  return ipc.deleteTag(name);
}

export async function pushTag(remote: string, tag: string): Promise<void> {
  return ipc.pushTag(remote, tag);
}

export async function pushAllTags(remote: string): Promise<void> {
  return ipc.pushAllTags(remote);
}

// ==================== Conflict ====================

export async function getConflictFiles(): Promise<ConflictFile[]> {
  return ipc.getConflictFiles();
}

export async function getConflictVersions(path: string): Promise<ConflictVersions> {
  return ipc.getConflictVersions(path);
}

export async function markResolved(path: string): Promise<void> {
  return ipc.markResolved(path);
}

export async function writeMergeResult(path: string, content: string): Promise<void> {
  return ipc.writeMergeResult(path, content);
}

// ==================== Blame ====================

export async function getBlame(path: string): Promise<BlameLine[]> {
  return ipc.getBlame(path);
}

// ==================== Line Changes & Gitignore ====================

export async function getLineChanges(path: string): Promise<LineChange[]> {
  return ipc.getLineChanges(path);
}

export async function addToGitignore(pattern: string): Promise<void> {
  return ipc.addToGitignore(pattern);
}

// ==================== Submodule ====================

export async function getSubmodules(): Promise<SubmoduleInfo[]> {
  return ipc.getSubmodules();
}

export async function submoduleInit(): Promise<void> {
  return ipc.submoduleInit();
}

export async function submoduleUpdate(recursive?: boolean): Promise<void> {
  return ipc.submoduleUpdate(recursive);
}

export async function submoduleAdd(url: string, path: string): Promise<void> {
  return ipc.submoduleAdd(url, path);
}

// ==================== Worktree ====================

export async function worktreeAdd(path: string, branch: string): Promise<void> {
  return ipc.worktreeAdd(path, branch);
}

export async function worktreeRemove(path: string): Promise<void> {
  return ipc.worktreeRemove(path);
}

export async function worktreeList(): Promise<string> {
  return ipc.worktreeList();
}
