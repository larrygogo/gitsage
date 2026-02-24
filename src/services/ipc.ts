import { invoke } from '@tauri-apps/api/core';
import type {
  FileStatus,
  BranchInfo,
  CommitInfo,
  DiffOutput,
  RepoEntry,
  ProviderConfig,
  AiConfig,
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

// ==================== Diff ====================

export function getDiff(path: string): Promise<DiffOutput> {
  return ipcInvoke<DiffOutput>('get_diff', { path });
}

export function getStagedDiff(): Promise<DiffOutput> {
  return ipcInvoke<DiffOutput>('get_staged_diff');
}

// ==================== 提交 ====================

export function createCommit(message: string): Promise<string> {
  return ipcInvoke<string>('create_commit', { message });
}

export function getCommitLog(limit?: number): Promise<CommitInfo[]> {
  return ipcInvoke<CommitInfo[]>('get_commit_log', { limit: limit ?? 50 });
}

// ==================== 分支操作 ====================

export function getBranches(): Promise<BranchInfo[]> {
  return ipcInvoke<BranchInfo[]>('get_branches');
}

export function getCurrentBranch(): Promise<string> {
  return ipcInvoke<string>('get_current_branch');
}

export function createBranch(name: string, startPoint?: string): Promise<void> {
  return ipcInvoke<void>('create_branch', { name, startPoint });
}

export function checkoutBranch(name: string): Promise<void> {
  return ipcInvoke<void>('checkout_branch', { name });
}

export function deleteBranch(name: string, force?: boolean): Promise<void> {
  return ipcInvoke<void>('delete_branch', { name, force: force ?? false });
}

// ==================== 远程操作 ====================

export function fetchRemote(remote?: string): Promise<void> {
  return ipcInvoke<void>('fetch_remote', { remote: remote ?? 'origin' });
}

export function pullRemote(remote?: string, branch?: string): Promise<void> {
  return ipcInvoke<void>('pull_remote', { remote: remote ?? 'origin', branch });
}

export function pushRemote(remote?: string, branch?: string): Promise<void> {
  return ipcInvoke<void>('push_remote', { remote: remote ?? 'origin', branch });
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
