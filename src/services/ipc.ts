import { invoke } from '@tauri-apps/api/core';
import type {
  FileStatus,
  BranchInfo,
  CommitInfo,
  DiffOutput,
  RepoEntry,
  ProviderConfig,
  AiConfig,
  StashEntry,
  RepoOperationState,
  TagInfo,
  RemoteInfo,
  ConflictFile,
  ConflictVersions,
  BlameLine,
  LineChange,
  SubmoduleInfo,
} from '../types';

/**
 * 统一的 IPC 调用封装，提供错误处理和类型安全
 */
async function ipcInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[IPC] 调用 ${command} 失败:`, message);
    throw new Error(`IPC 调用失败 (${command}): ${message}`);
  }
}

// ==================== 仓库操作 ====================

export function openRepo(path: string): Promise<string> {
  return ipcInvoke<string>('open_repo', { path });
}

export function initRepo(path: string): Promise<string> {
  return ipcInvoke<string>('init_repo', { path });
}

export function closeRepo(): Promise<void> {
  return ipcInvoke<void>('close_repo');
}

export function getRecentRepos(): Promise<RepoEntry[]> {
  return ipcInvoke<RepoEntry[]>('get_recent_repos');
}

export function cloneRepo(url: string, destPath: string): Promise<void> {
  return ipcInvoke<void>('clone_repo', { url, destPath });
}

// ==================== 文件状态 ====================

export function getStatus(): Promise<FileStatus[]> {
  return ipcInvoke<FileStatus[]>('get_status');
}

export function stageFiles(paths: string[]): Promise<void> {
  return ipcInvoke<void>('stage_files', { paths });
}

export function unstageFiles(paths: string[]): Promise<void> {
  return ipcInvoke<void>('unstage_files', { paths });
}

export function discardChanges(paths: string[]): Promise<void> {
  return ipcInvoke<void>('discard_changes', { paths });
}

export function discardAllChanges(): Promise<void> {
  return ipcInvoke<void>('discard_all_changes');
}

// ==================== Diff ====================

export function getDiff(path: string, staged: boolean = false): Promise<DiffOutput> {
  return ipcInvoke<DiffOutput>('get_diff', { path, staged });
}

export function getStagedDiff(): Promise<DiffOutput> {
  return ipcInvoke<DiffOutput>('get_staged_diff');
}

// ==================== Hunk 操作 ====================

export function stageHunk(path: string, hunkIndex: number): Promise<void> {
  return ipcInvoke<void>('stage_hunk', { path, hunkIndex });
}

export function unstageHunk(path: string, hunkIndex: number): Promise<void> {
  return ipcInvoke<void>('unstage_hunk', { path, hunkIndex });
}

export function stageLines(path: string, hunkIndex: number, lineIndices: number[]): Promise<void> {
  return ipcInvoke<void>('stage_lines', { path, hunkIndex, lineIndices });
}

export function discardHunk(path: string, hunkIndex: number): Promise<void> {
  return ipcInvoke<void>('discard_hunk', { path, hunkIndex });
}

// ==================== 提交 ====================

export function createCommit(message: string, amend: boolean = false): Promise<string> {
  return ipcInvoke<string>('create_commit', { message, amend });
}

export function amendCommit(message: string): Promise<string> {
  return ipcInvoke<string>('amend_commit', { message });
}

export function undoLastCommit(soft: boolean = true): Promise<void> {
  return ipcInvoke<void>('undo_last_commit', { soft });
}

export function getCommitLog(limit?: number): Promise<CommitInfo[]> {
  return ipcInvoke<CommitInfo[]>('get_commit_log', { limit: limit ?? 50 });
}

export function getCommitLogPaged(maxCount: number, skip: number): Promise<CommitInfo[]> {
  return ipcInvoke<CommitInfo[]>('get_commit_log_paged', { maxCount, skip });
}

export function getBranchLog(branch: string, limit?: number): Promise<CommitInfo[]> {
  return ipcInvoke<CommitInfo[]>('get_branch_log', { branch, limit });
}

export function resetToCommit(commitId: string, mode: string): Promise<void> {
  return ipcInvoke<void>('reset_to_commit', { commitId, mode });
}

export function getCommitDiff(commitId: string): Promise<DiffOutput> {
  return ipcInvoke<DiffOutput>('get_commit_diff', { commitId });
}

export function getFileHistory(path: string, limit?: number): Promise<CommitInfo[]> {
  return ipcInvoke<CommitInfo[]>('get_file_history', { path, limit });
}

export function searchCommits(query: string, limit?: number): Promise<CommitInfo[]> {
  return ipcInvoke<CommitInfo[]>('search_commits', { query, limit });
}

// ==================== 分支操作 ====================

export function getBranches(): Promise<BranchInfo[]> {
  return ipcInvoke<BranchInfo[]>('get_branches');
}

export function getCurrentBranch(): Promise<string> {
  return ipcInvoke<string>('get_current_branch');
}

export function createBranch(name: string): Promise<void> {
  return ipcInvoke<void>('create_branch', { name });
}

export function checkoutBranch(name: string): Promise<void> {
  return ipcInvoke<void>('checkout_branch', { name });
}

export function deleteBranch(name: string): Promise<void> {
  return ipcInvoke<void>('delete_branch', { name });
}

export function renameBranch(oldName: string, newName: string): Promise<void> {
  return ipcInvoke<void>('rename_branch', { oldName, newName });
}

// ==================== 远程操作 ====================

export function fetchRemote(remote?: string): Promise<void> {
  return ipcInvoke<void>('fetch_remote', { remote: remote ?? 'origin' });
}

export function pullRemote(remote?: string, branch?: string): Promise<void> {
  return ipcInvoke<void>('pull_remote', { remote: remote ?? 'origin', branch: branch ?? '' });
}

export function pushRemote(remote?: string, branch?: string): Promise<void> {
  return ipcInvoke<void>('push_remote', { remote: remote ?? 'origin', branch: branch ?? '' });
}

export function getRemotes(): Promise<RemoteInfo[]> {
  return ipcInvoke<RemoteInfo[]>('get_remotes');
}

export function addRemote(name: string, url: string): Promise<void> {
  return ipcInvoke<void>('add_remote', { name, url });
}

export function removeRemote(name: string): Promise<void> {
  return ipcInvoke<void>('remove_remote', { name });
}

export function renameRemote(oldName: string, newName: string): Promise<void> {
  return ipcInvoke<void>('rename_remote', { oldName, newName });
}

export function fetchPrune(remote: string): Promise<void> {
  return ipcInvoke<void>('fetch_prune', { remote });
}

export function pushSetUpstream(remote: string, branch: string): Promise<void> {
  return ipcInvoke<void>('push_set_upstream', { remote, branch });
}

export function pullRebase(remote?: string, branch?: string): Promise<void> {
  return ipcInvoke<void>('pull_rebase', { remote: remote ?? 'origin', branch: branch ?? '' });
}

export function syncRemote(remote?: string, branch?: string): Promise<void> {
  return ipcInvoke<void>('sync_remote', { remote: remote ?? 'origin', branch: branch ?? '' });
}

// ==================== Stash ====================

export function stashSave(message?: string, includeUntracked: boolean = false): Promise<void> {
  return ipcInvoke<void>('stash_save', { message, includeUntracked });
}

export function stashPop(index?: number): Promise<void> {
  return ipcInvoke<void>('stash_pop', { index });
}

export function stashApply(index?: number): Promise<void> {
  return ipcInvoke<void>('stash_apply', { index });
}

export function stashDrop(index?: number): Promise<void> {
  return ipcInvoke<void>('stash_drop', { index });
}

export function stashList(): Promise<StashEntry[]> {
  return ipcInvoke<StashEntry[]>('stash_list');
}

export function stashClear(): Promise<void> {
  return ipcInvoke<void>('stash_clear');
}

// ==================== Merge / Cherry-pick / Revert / Rebase ====================

export function mergeBranch(branch: string, noFf: boolean = false): Promise<string> {
  return ipcInvoke<string>('merge_branch', { branch, noFf });
}

export function mergeAbort(): Promise<void> {
  return ipcInvoke<void>('merge_abort');
}

export function mergeContinue(): Promise<void> {
  return ipcInvoke<void>('merge_continue');
}

export function getRepoState(): Promise<RepoOperationState> {
  return ipcInvoke<RepoOperationState>('get_repo_state');
}

export function cherryPick(commitId: string): Promise<void> {
  return ipcInvoke<void>('cherry_pick', { commitId });
}

export function cherryPickAbort(): Promise<void> {
  return ipcInvoke<void>('cherry_pick_abort');
}

export function cherryPickContinue(): Promise<void> {
  return ipcInvoke<void>('cherry_pick_continue');
}

export function revertCommit(commitId: string): Promise<void> {
  return ipcInvoke<void>('revert_commit', { commitId });
}

export function revertAbort(): Promise<void> {
  return ipcInvoke<void>('revert_abort');
}

export function revertContinue(): Promise<void> {
  return ipcInvoke<void>('revert_continue');
}

export function rebaseOnto(onto: string): Promise<void> {
  return ipcInvoke<void>('rebase_onto', { onto });
}

export function rebaseAbort(): Promise<void> {
  return ipcInvoke<void>('rebase_abort');
}

export function rebaseContinue(): Promise<void> {
  return ipcInvoke<void>('rebase_continue');
}

export function rebaseSkip(): Promise<void> {
  return ipcInvoke<void>('rebase_skip');
}

// ==================== Tag ====================

export function getTags(): Promise<TagInfo[]> {
  return ipcInvoke<TagInfo[]>('get_tags');
}

export function createTag(name: string, message?: string, commit?: string): Promise<void> {
  return ipcInvoke<void>('create_tag', { name, message, commit });
}

export function deleteTag(name: string): Promise<void> {
  return ipcInvoke<void>('delete_tag', { name });
}

export function pushTag(remote: string, tag: string): Promise<void> {
  return ipcInvoke<void>('push_tag', { remote, tag });
}

export function pushAllTags(remote: string): Promise<void> {
  return ipcInvoke<void>('push_all_tags', { remote });
}

// ==================== Conflict ====================

export function getConflictFiles(): Promise<ConflictFile[]> {
  return ipcInvoke<ConflictFile[]>('get_conflict_files');
}

export function getConflictVersions(path: string): Promise<ConflictVersions> {
  return ipcInvoke<ConflictVersions>('get_conflict_versions', { path });
}

export function markResolved(path: string): Promise<void> {
  return ipcInvoke<void>('mark_resolved', { path });
}

export function writeMergeResult(path: string, content: string): Promise<void> {
  return ipcInvoke<void>('write_merge_result', { path, content });
}

// ==================== Blame ====================

export function getBlame(path: string): Promise<BlameLine[]> {
  return ipcInvoke<BlameLine[]>('get_blame', { path });
}

// ==================== Line Changes ====================

export function getLineChanges(path: string): Promise<LineChange[]> {
  return ipcInvoke<LineChange[]>('get_line_changes', { path });
}

// ==================== Gitignore ====================

export function addToGitignore(pattern: string): Promise<void> {
  return ipcInvoke<void>('add_to_gitignore', { pattern });
}

// ==================== Submodule ====================

export function getSubmodules(): Promise<SubmoduleInfo[]> {
  return ipcInvoke<SubmoduleInfo[]>('get_submodules');
}

export function submoduleInit(): Promise<void> {
  return ipcInvoke<void>('submodule_init');
}

export function submoduleUpdate(recursive: boolean = false): Promise<void> {
  return ipcInvoke<void>('submodule_update', { recursive });
}

export function submoduleAdd(url: string, path: string): Promise<void> {
  return ipcInvoke<void>('submodule_add', { url, path });
}

// ==================== Worktree ====================

export function worktreeAdd(path: string, branch: string): Promise<void> {
  return ipcInvoke<void>('worktree_add', { path, branch });
}

export function worktreeRemove(path: string): Promise<void> {
  return ipcInvoke<void>('worktree_remove', { path });
}

export function worktreeList(): Promise<string> {
  return ipcInvoke<string>('worktree_list');
}

// ==================== AI ====================

export function generateCommitMessage(diff: string): Promise<string> {
  return ipcInvoke<string>('generate_commit_message', { diff });
}

export function generateChangeSummary(diff: string): Promise<string> {
  return ipcInvoke<string>('generate_change_summary', { diff });
}

export function getAiProviders(): Promise<ProviderConfig[]> {
  return ipcInvoke<ProviderConfig[]>('get_ai_providers');
}

export function updateAiConfig(config: AiConfig): Promise<void> {
  return ipcInvoke<void>('update_ai_config', { config });
}

export function setAiApiKey(provider: string, apiKey: string): Promise<void> {
  return ipcInvoke<void>('set_ai_api_key', { provider, apiKey });
}
