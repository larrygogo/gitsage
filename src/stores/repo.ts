import { createContext, useContext } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import type {
  FileStatus, BranchInfo, StashEntry, RepoOperationState,
  TagInfo, RemoteInfo,
} from '../types';
import * as gitService from '../services/git';

// ==================== 类型定义 ====================

export interface RepoState {
  currentRepo: {
    name: string;
    path: string;
  } | null;
  fileStatuses: FileStatus[];
  currentBranch: string;
  branches: BranchInfo[];
  stashes: StashEntry[];
  repoState: RepoOperationState;
  tags: TagInfo[];
  remotes: RemoteInfo[];
  isLoading: boolean;
  error: string | null;
}

export interface RepoActions {
  // 仓库管理
  openRepo: (path: string) => Promise<void>;
  closeRepo: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshStashes: () => Promise<void>;
  refreshRepoState: () => Promise<void>;
  refreshTags: () => Promise<void>;
  refreshRemotes: () => Promise<void>;
  refreshAll: () => Promise<void>;
  // 文件操作
  stageFiles: (paths: string[]) => Promise<void>;
  unstageFiles: (paths: string[]) => Promise<void>;
  discardChanges: (paths: string[]) => Promise<void>;
  discardAllChanges: () => Promise<void>;
  // 提交
  createCommit: (message: string, amend?: boolean) => Promise<string>;
  amendCommit: (message: string) => Promise<string>;
  undoLastCommit: (soft?: boolean) => Promise<void>;
  resetToCommit: (commitId: string, mode: string) => Promise<void>;
  // 分支
  createBranch: (name: string) => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  deleteBranch: (name: string) => Promise<void>;
  renameBranch: (oldName: string, newName: string) => Promise<void>;
  // 远程
  fetchRemote: (remote?: string) => Promise<void>;
  pullRemote: (remote?: string, branch?: string) => Promise<void>;
  pushRemote: (remote?: string, branch?: string) => Promise<void>;
  pullRebase: (remote?: string, branch?: string) => Promise<void>;
  syncRemote: (remote?: string, branch?: string) => Promise<void>;
  addRemote: (name: string, url: string) => Promise<void>;
  removeRemote: (name: string) => Promise<void>;
  renameRemote: (oldName: string, newName: string) => Promise<void>;
  // Stash
  stashSave: (message?: string, includeUntracked?: boolean) => Promise<void>;
  stashPop: (index?: number) => Promise<void>;
  stashApply: (index?: number) => Promise<void>;
  stashDrop: (index?: number) => Promise<void>;
  stashClear: () => Promise<void>;
  // Merge / Cherry-pick / Revert / Rebase
  mergeBranch: (branch: string, noFf?: boolean) => Promise<void>;
  mergeAbort: () => Promise<void>;
  mergeContinue: () => Promise<void>;
  cherryPick: (commitId: string) => Promise<void>;
  cherryPickAbort: () => Promise<void>;
  cherryPickContinue: () => Promise<void>;
  revertCommit: (commitId: string) => Promise<void>;
  revertAbort: () => Promise<void>;
  revertContinue: () => Promise<void>;
  rebaseOnto: (onto: string) => Promise<void>;
  rebaseAbort: () => Promise<void>;
  rebaseContinue: () => Promise<void>;
  rebaseSkip: () => Promise<void>;
  // Tag
  createTag: (name: string, message?: string, commit?: string) => Promise<void>;
  deleteTag: (name: string) => Promise<void>;
  // 错误
  clearError: () => void;
}

export type RepoStore = [RepoState, RepoActions];

// ==================== 初始状态 ====================

const initialState: RepoState = {
  currentRepo: null,
  fileStatuses: [],
  currentBranch: '',
  branches: [],
  stashes: [],
  repoState: 'Normal',
  tags: [],
  remotes: [],
  isLoading: false,
  error: null,
};

// ==================== Context ====================

export const RepoContext = createContext<RepoStore>();

export function useRepo(): RepoStore {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error('useRepo 必须在 RepoProvider 内部使用');
  }
  return context;
}

// ==================== Store 工厂函数 ====================

export function createRepoStore(): RepoStore {
  const [state, setState] = createStore<RepoState>({ ...initialState });

  const actions: RepoActions = {
    // ==================== 仓库管理 ====================

    async openRepo(path: string) {
      setState('isLoading', true);
      setState('error', null);
      try {
        const repoName = await gitService.openRepo(path);
        setState('currentRepo', { name: repoName, path });
        await actions.refreshAll();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setState('isLoading', false);
      }
    },

    async closeRepo() {
      try {
        await gitService.closeRepo();
        setState(produce((s) => {
          s.currentRepo = null;
          s.fileStatuses = [];
          s.currentBranch = '';
          s.branches = [];
          s.stashes = [];
          s.repoState = 'Normal';
          s.tags = [];
          s.remotes = [];
          s.error = null;
        }));
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async refreshStatus() {
      try {
        const statuses = await gitService.getStatus();
        setState('fileStatuses', statuses);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      }
    },

    async refreshBranches() {
      try {
        const [branches, currentBranch] = await Promise.all([
          gitService.getBranches(),
          gitService.getCurrentBranch(),
        ]);
        setState('branches', branches);
        setState('currentBranch', currentBranch);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      }
    },

    async refreshStashes() {
      try {
        const stashes = await gitService.stashList();
        setState('stashes', stashes);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      }
    },

    async refreshRepoState() {
      try {
        const repoState = await gitService.getRepoState();
        setState('repoState', repoState);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      }
    },

    async refreshTags() {
      try {
        const tags = await gitService.getTags();
        setState('tags', tags);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      }
    },

    async refreshRemotes() {
      try {
        const remotes = await gitService.getRemotes();
        setState('remotes', remotes);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      }
    },

    async refreshAll() {
      await Promise.all([
        actions.refreshStatus(),
        actions.refreshBranches(),
        actions.refreshStashes(),
        actions.refreshRepoState(),
        actions.refreshTags(),
        actions.refreshRemotes(),
      ]);
    },

    // ==================== 文件操作 ====================

    async stageFiles(paths: string[]) {
      try {
        await gitService.stageFiles(paths);
        await actions.refreshStatus();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async unstageFiles(paths: string[]) {
      try {
        await gitService.unstageFiles(paths);
        await actions.refreshStatus();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async discardChanges(paths: string[]) {
      try {
        await gitService.discardChanges(paths);
        await actions.refreshStatus();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async discardAllChanges() {
      try {
        await gitService.discardAllChanges();
        await actions.refreshStatus();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    // ==================== 提交 ====================

    async createCommit(message: string, amend?: boolean) {
      try {
        const commitId = await gitService.createCommit(message, amend);
        await actions.refreshStatus();
        return commitId;
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async amendCommit(message: string) {
      try {
        const commitId = await gitService.amendCommit(message);
        await actions.refreshStatus();
        return commitId;
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async undoLastCommit(soft?: boolean) {
      try {
        await gitService.undoLastCommit(soft ?? true);
        await actions.refreshStatus();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async resetToCommit(commitId: string, mode: string) {
      try {
        await gitService.resetToCommit(commitId, mode);
        await Promise.all([actions.refreshStatus(), actions.refreshBranches()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    // ==================== 分支 ====================

    async createBranch(name: string) {
      try {
        await gitService.createBranch(name);
        await actions.refreshBranches();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async checkoutBranch(name: string) {
      try {
        await gitService.checkoutBranch(name);
        await Promise.all([
          actions.refreshStatus(),
          actions.refreshBranches(),
        ]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async deleteBranch(name: string) {
      try {
        await gitService.deleteBranch(name);
        await actions.refreshBranches();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async renameBranch(oldName: string, newName: string) {
      try {
        await gitService.renameBranch(oldName, newName);
        await actions.refreshBranches();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    // ==================== 远程 ====================

    async fetchRemote(remote?: string) {
      setState('isLoading', true);
      try {
        await gitService.fetchRemote(remote);
        await actions.refreshBranches();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setState('isLoading', false);
      }
    },

    async pullRemote(remote?: string, branch?: string) {
      setState('isLoading', true);
      try {
        await gitService.pullRemote(remote, branch);
        await Promise.all([
          actions.refreshStatus(),
          actions.refreshBranches(),
          actions.refreshRepoState(),
        ]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setState('isLoading', false);
      }
    },

    async pushRemote(remote?: string, branch?: string) {
      setState('isLoading', true);
      try {
        await gitService.pushRemote(remote, branch);
        await actions.refreshBranches();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setState('isLoading', false);
      }
    },

    async pullRebase(remote?: string, branch?: string) {
      setState('isLoading', true);
      try {
        await gitService.pullRebase(remote, branch);
        await Promise.all([
          actions.refreshStatus(),
          actions.refreshBranches(),
          actions.refreshRepoState(),
        ]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setState('isLoading', false);
      }
    },

    async syncRemote(remote?: string, branch?: string) {
      setState('isLoading', true);
      try {
        await gitService.syncRemote(remote, branch);
        await actions.refreshBranches();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setState('isLoading', false);
      }
    },

    async addRemote(name: string, url: string) {
      try {
        await gitService.addRemote(name, url);
        await actions.refreshRemotes();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async removeRemote(name: string) {
      try {
        await gitService.removeRemote(name);
        await actions.refreshRemotes();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async renameRemote(oldName: string, newName: string) {
      try {
        await gitService.renameRemote(oldName, newName);
        await actions.refreshRemotes();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    // ==================== Stash ====================

    async stashSave(message?: string, includeUntracked?: boolean) {
      try {
        await gitService.stashSave(message, includeUntracked);
        await Promise.all([actions.refreshStatus(), actions.refreshStashes()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async stashPop(index?: number) {
      try {
        await gitService.stashPop(index);
        await Promise.all([actions.refreshStatus(), actions.refreshStashes()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async stashApply(index?: number) {
      try {
        await gitService.stashApply(index);
        await Promise.all([actions.refreshStatus(), actions.refreshStashes()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async stashDrop(index?: number) {
      try {
        await gitService.stashDrop(index);
        await actions.refreshStashes();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async stashClear() {
      try {
        await gitService.stashClear();
        setState('stashes', []);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    // ==================== Merge / Cherry-pick / Revert / Rebase ====================

    async mergeBranch(branch: string, noFf?: boolean) {
      try {
        await gitService.mergeBranch(branch, noFf);
        await Promise.all([
          actions.refreshStatus(),
          actions.refreshBranches(),
          actions.refreshRepoState(),
        ]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async mergeAbort() {
      try {
        await gitService.mergeAbort();
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async mergeContinue() {
      try {
        await gitService.mergeContinue();
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async cherryPick(commitId: string) {
      try {
        await gitService.cherryPick(commitId);
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async cherryPickAbort() {
      try {
        await gitService.cherryPickAbort();
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async cherryPickContinue() {
      try {
        await gitService.cherryPickContinue();
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async revertCommit(commitId: string) {
      try {
        await gitService.revertCommit(commitId);
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async revertAbort() {
      try {
        await gitService.revertAbort();
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async revertContinue() {
      try {
        await gitService.revertContinue();
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async rebaseOnto(onto: string) {
      try {
        await gitService.rebaseOnto(onto);
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async rebaseAbort() {
      try {
        await gitService.rebaseAbort();
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async rebaseContinue() {
      try {
        await gitService.rebaseContinue();
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async rebaseSkip() {
      try {
        await gitService.rebaseSkip();
        await Promise.all([actions.refreshStatus(), actions.refreshRepoState()]);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    // ==================== Tag ====================

    async createTag(name: string, message?: string, commit?: string) {
      try {
        await gitService.createTag(name, message, commit);
        await actions.refreshTags();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async deleteTag(name: string) {
      try {
        await gitService.deleteTag(name);
        await actions.refreshTags();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    // ==================== 错误 ====================

    clearError() {
      setState('error', null);
    },
  };

  return [state, actions];
}
