import { createContext, useContext } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import type { FileStatus, BranchInfo } from '../types';
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
  isLoading: boolean;
  error: string | null;
}

export interface RepoActions {
  openRepo: (path: string) => Promise<void>;
  closeRepo: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  stageFiles: (paths: string[]) => Promise<void>;
  unstageFiles: (paths: string[]) => Promise<void>;
  createCommit: (message: string) => Promise<string>;
  createBranch: (name: string, startPoint?: string) => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  deleteBranch: (name: string, force?: boolean) => Promise<void>;
  fetchRemote: (remote?: string) => Promise<void>;
  pullRemote: (remote?: string, branch?: string) => Promise<void>;
  pushRemote: (remote?: string, branch?: string) => Promise<void>;
  clearError: () => void;
}

export type RepoStore = [RepoState, RepoActions];

// ==================== 初始状态 ====================

const initialState: RepoState = {
  currentRepo: null,
  fileStatuses: [],
  currentBranch: '',
  branches: [],
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
    async openRepo(path: string) {
      setState('isLoading', true);
      setState('error', null);
      try {
        const repoName = await gitService.openRepo(path);
        setState('currentRepo', { name: repoName, path });

        // 打开后自动刷新状态和分支
        await Promise.all([
          actions.refreshStatus(),
          actions.refreshBranches(),
        ]);
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

    async createCommit(message: string) {
      try {
        const commitId = await gitService.createCommit(message);
        await actions.refreshStatus();
        return commitId;
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async createBranch(name: string, startPoint?: string) {
      try {
        await gitService.createBranch(name, startPoint);
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

    async deleteBranch(name: string, force?: boolean) {
      try {
        await gitService.deleteBranch(name, force);
        await actions.refreshBranches();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

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

    clearError() {
      setState('error', null);
    },
  };

  return [state, actions];
}
