import type { FileStatus, BranchInfo, CommitInfo, DiffOutput, RepoEntry } from '../types';
import * as ipc from './ipc';

/**
 * Git 操作 Service
 * 封装所有 Git 相关的 IPC 调用，供 stores 和组件使用
 */

// ==================== 仓库管理 ====================

/** 打开一个已有的 Git 仓库 */
export async function openRepo(path: string): Promise<string> {
  return ipc.openRepo(path);
}

/** 在指定路径初始化新的 Git 仓库 */
export async function initRepo(path: string): Promise<string> {
  return ipc.initRepo(path);
}

/** 关闭当前打开的仓库 */
export async function closeRepo(): Promise<void> {
  return ipc.closeRepo();
}

/** 获取最近打开的仓库列表 */
export async function getRecentRepos(): Promise<RepoEntry[]> {
  return ipc.getRecentRepos();
}

// ==================== 文件状态 ====================

/** 获取工作区文件状态列表 */
export async function getStatus(): Promise<FileStatus[]> {
  return ipc.getStatus();
}

/** 将指定文件暂存（stage） */
export async function stageFiles(paths: string[]): Promise<void> {
  return ipc.stageFiles(paths);
}

/** 取消暂存指定文件 */
export async function unstageFiles(paths: string[]): Promise<void> {
  return ipc.unstageFiles(paths);
}

// ==================== Diff ====================

/** 获取指定文件的 diff（工作区变更） */
export async function getDiff(path: string): Promise<DiffOutput> {
  return ipc.getDiff(path);
}

/** 获取已暂存文件的 diff */
export async function getStagedDiff(): Promise<DiffOutput> {
  return ipc.getStagedDiff();
}

// ==================== 提交 ====================

/** 创建一个新的提交 */
export async function createCommit(message: string): Promise<string> {
  return ipc.createCommit(message);
}

/** 获取提交历史 */
export async function getCommitLog(limit?: number): Promise<CommitInfo[]> {
  return ipc.getCommitLog(limit);
}

// ==================== 分支操作 ====================

/** 获取所有分支列表 */
export async function getBranches(): Promise<BranchInfo[]> {
  return ipc.getBranches();
}

/** 获取当前分支名称 */
export async function getCurrentBranch(): Promise<string> {
  return ipc.getCurrentBranch();
}

/** 创建新分支 */
export async function createBranch(name: string, startPoint?: string): Promise<void> {
  return ipc.createBranch(name, startPoint);
}

/** 切换到指定分支 */
export async function checkoutBranch(name: string): Promise<void> {
  return ipc.checkoutBranch(name);
}

/** 删除指定分支 */
export async function deleteBranch(name: string, force?: boolean): Promise<void> {
  return ipc.deleteBranch(name, force);
}

// ==================== 远程操作 ====================

/** 从远程仓库获取更新（fetch） */
export async function fetchRemote(remote?: string): Promise<void> {
  return ipc.fetchRemote(remote);
}

/** 从远程仓库拉取并合并（pull） */
export async function pullRemote(remote?: string, branch?: string): Promise<void> {
  return ipc.pullRemote(remote, branch);
}

/** 推送到远程仓库 */
export async function pushRemote(remote?: string, branch?: string): Promise<void> {
  return ipc.pushRemote(remote, branch);
}
