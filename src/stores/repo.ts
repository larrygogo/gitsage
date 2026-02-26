import { createContext, useContext } from "solid-js";
import { createStore, produce } from "solid-js/store";
import type {
  FileStatus,
  BranchInfo,
  StashEntry,
  RepoOperationState,
  TagInfo,
  RemoteInfo,
} from "../types";
import * as gitService from "../services/git";

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
  openRepo: (path: string) => Promise<void>;
  closeRepo: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshStashes: () => Promise<void>;
  refreshRepoState: () => Promise<void>;
  refreshTags: () => Promise<void>;
  refreshRemotes: () => Promise<void>;
  refreshAll: () => Promise<void>;
  stageFiles: (paths: string[]) => Promise<void>;
  unstageFiles: (paths: string[]) => Promise<void>;
  discardChanges: (paths: string[]) => Promise<void>;
  discardAllChanges: () => Promise<void>;
  createCommit: (message: string, amend?: boolean) => Promise<string>;
  amendCommit: (message: string) => Promise<string>;
  undoLastCommit: (soft?: boolean) => Promise<void>;
  resetToCommit: (commitId: string, mode: string) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  deleteBranch: (name: string) => Promise<void>;
  renameBranch: (oldName: string, newName: string) => Promise<void>;
  fetchRemote: (remote?: string) => Promise<void>;
  pullRemote: (remote?: string, branch?: string) => Promise<void>;
  pushRemote: (remote?: string, branch?: string) => Promise<void>;
  pullRebase: (remote?: string, branch?: string) => Promise<void>;
  syncRemote: (remote?: string, branch?: string) => Promise<void>;
  addRemote: (name: string, url: string) => Promise<void>;
  removeRemote: (name: string) => Promise<void>;
  renameRemote: (oldName: string, newName: string) => Promise<void>;
  stashSave: (message?: string, includeUntracked?: boolean) => Promise<void>;
  stashPop: (index?: number) => Promise<void>;
  stashApply: (index?: number) => Promise<void>;
  stashDrop: (index?: number) => Promise<void>;
  stashClear: () => Promise<void>;
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
  createTag: (name: string, message?: string, commit?: string) => Promise<void>;
  deleteTag: (name: string) => Promise<void>;
  clearError: () => void;
}

export type RepoStore = [RepoState, RepoActions];

// ==================== 初始状态 ====================

const initialState: RepoState = {
  currentRepo: null,
  fileStatuses: [],
  currentBranch: "",
  branches: [],
  stashes: [],
  repoState: "Normal",
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
    throw new Error("useRepo 必须在 RepoProvider 内部使用");
  }
  return context;
}

// ==================== Store 工厂函数 ====================

export function createRepoStore(): RepoStore {
  const [state, setState] = createStore<RepoState>({ ...initialState });

  /** 通用操作包装器：捕获异常并设置 error 状态 */
  async function wrapAction<T>(
    fn: () => Promise<T>,
    opts?: { loading?: boolean; rethrow?: boolean },
  ): Promise<T> {
    const { loading = false, rethrow = true } = opts ?? {};
    if (loading) setState("isLoading", true);
    try {
      return await fn();
    } catch (error) {
      setState("error", error instanceof Error ? error.message : String(error));
      if (rethrow) throw error;
      return undefined as T;
    } finally {
      if (loading) setState("isLoading", false);
    }
  }

  /** 执行操作后刷新指定数据 */
  async function actionThenRefresh(
    fn: () => Promise<unknown>,
    refreshes: Array<() => Promise<void>>,
    opts?: { loading?: boolean },
  ): Promise<void> {
    await wrapAction(async () => {
      await fn();
      await Promise.all(refreshes.map((r) => r()));
    }, opts);
  }

  const actions: RepoActions = {
    // ==================== 仓库管理 ====================

    async openRepo(path: string) {
      await wrapAction(
        async () => {
          const repoName = await gitService.openRepo(path);
          setState("currentRepo", { name: repoName, path });
          await actions.refreshAll();
        },
        { loading: true },
      );
    },

    async closeRepo() {
      await wrapAction(async () => {
        await gitService.closeRepo();
        setState(
          produce((s) => {
            s.currentRepo = null;
            s.fileStatuses = [];
            s.currentBranch = "";
            s.branches = [];
            s.stashes = [];
            s.repoState = "Normal";
            s.tags = [];
            s.remotes = [];
            s.error = null;
          }),
        );
      });
    },

    async refreshStatus() {
      await wrapAction(
        async () => {
          const statuses = await gitService.getStatus();
          setState("fileStatuses", statuses);
        },
        { rethrow: false },
      );
    },

    async refreshBranches() {
      await wrapAction(
        async () => {
          const [branches, currentBranch] = await Promise.all([
            gitService.getBranches(),
            gitService.getCurrentBranch(),
          ]);
          setState("branches", branches);
          setState("currentBranch", currentBranch);
        },
        { rethrow: false },
      );
    },

    async refreshStashes() {
      await wrapAction(
        async () => {
          const stashes = await gitService.stashList();
          setState("stashes", stashes);
        },
        { rethrow: false },
      );
    },

    async refreshRepoState() {
      await wrapAction(
        async () => {
          const repoState = await gitService.getRepoState();
          setState("repoState", repoState);
        },
        { rethrow: false },
      );
    },

    async refreshTags() {
      await wrapAction(
        async () => {
          const tags = await gitService.getTags();
          setState("tags", tags);
        },
        { rethrow: false },
      );
    },

    async refreshRemotes() {
      await wrapAction(
        async () => {
          const remotes = await gitService.getRemotes();
          setState("remotes", remotes);
        },
        { rethrow: false },
      );
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

    stageFiles: (paths) =>
      actionThenRefresh(() => gitService.stageFiles(paths), [actions.refreshStatus]),

    unstageFiles: (paths) =>
      actionThenRefresh(() => gitService.unstageFiles(paths), [actions.refreshStatus]),

    discardChanges: (paths) =>
      actionThenRefresh(() => gitService.discardChanges(paths), [actions.refreshStatus]),

    discardAllChanges: () =>
      actionThenRefresh(() => gitService.discardAllChanges(), [actions.refreshStatus]),

    // ==================== 提交 ====================

    async createCommit(message, amend) {
      return wrapAction(async () => {
        const commitId = await gitService.createCommit(message, amend);
        await actions.refreshStatus();
        return commitId;
      });
    },

    async amendCommit(message) {
      return wrapAction(async () => {
        const commitId = await gitService.amendCommit(message);
        await actions.refreshStatus();
        return commitId;
      });
    },

    undoLastCommit: (soft) =>
      actionThenRefresh(() => gitService.undoLastCommit(soft ?? true), [actions.refreshStatus]),

    resetToCommit: (commitId, mode) =>
      actionThenRefresh(
        () => gitService.resetToCommit(commitId, mode),
        [actions.refreshStatus, actions.refreshBranches],
      ),

    // ==================== 分支 ====================

    createBranch: (name) =>
      actionThenRefresh(() => gitService.createBranch(name), [actions.refreshBranches]),

    checkoutBranch: (name) =>
      actionThenRefresh(
        () => gitService.checkoutBranch(name),
        [actions.refreshStatus, actions.refreshBranches],
      ),

    deleteBranch: (name) =>
      actionThenRefresh(() => gitService.deleteBranch(name), [actions.refreshBranches]),

    renameBranch: (oldName, newName) =>
      actionThenRefresh(() => gitService.renameBranch(oldName, newName), [actions.refreshBranches]),

    // ==================== 远程 ====================

    fetchRemote: (remote) =>
      actionThenRefresh(() => gitService.fetchRemote(remote), [actions.refreshBranches], {
        loading: true,
      }),

    pullRemote: (remote, branch) =>
      actionThenRefresh(
        () => gitService.pullRemote(remote, branch),
        [actions.refreshStatus, actions.refreshBranches, actions.refreshRepoState],
        { loading: true },
      ),

    pushRemote: (remote, branch) =>
      actionThenRefresh(() => gitService.pushRemote(remote, branch), [actions.refreshBranches], {
        loading: true,
      }),

    pullRebase: (remote, branch) =>
      actionThenRefresh(
        () => gitService.pullRebase(remote, branch),
        [actions.refreshStatus, actions.refreshBranches, actions.refreshRepoState],
        { loading: true },
      ),

    syncRemote: (remote, branch) =>
      actionThenRefresh(() => gitService.syncRemote(remote, branch), [actions.refreshBranches], {
        loading: true,
      }),

    addRemote: (name, url) =>
      actionThenRefresh(() => gitService.addRemote(name, url), [actions.refreshRemotes]),

    removeRemote: (name) =>
      actionThenRefresh(() => gitService.removeRemote(name), [actions.refreshRemotes]),

    renameRemote: (oldName, newName) =>
      actionThenRefresh(() => gitService.renameRemote(oldName, newName), [actions.refreshRemotes]),

    // ==================== Stash ====================

    stashSave: (message, includeUntracked) =>
      actionThenRefresh(
        () => gitService.stashSave(message, includeUntracked),
        [actions.refreshStatus, actions.refreshStashes],
      ),

    stashPop: (index) =>
      actionThenRefresh(
        () => gitService.stashPop(index),
        [actions.refreshStatus, actions.refreshStashes],
      ),

    stashApply: (index) =>
      actionThenRefresh(
        () => gitService.stashApply(index),
        [actions.refreshStatus, actions.refreshStashes],
      ),

    stashDrop: (index) =>
      actionThenRefresh(() => gitService.stashDrop(index), [actions.refreshStashes]),

    async stashClear() {
      await wrapAction(async () => {
        await gitService.stashClear();
        setState("stashes", []);
      });
    },

    // ==================== Merge / Cherry-pick / Revert / Rebase ====================

    mergeBranch: (branch, noFf) =>
      actionThenRefresh(
        () => gitService.mergeBranch(branch, noFf),
        [actions.refreshStatus, actions.refreshBranches, actions.refreshRepoState],
      ),

    mergeAbort: () =>
      actionThenRefresh(
        () => gitService.mergeAbort(),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    mergeContinue: () =>
      actionThenRefresh(
        () => gitService.mergeContinue(),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    cherryPick: (commitId) =>
      actionThenRefresh(
        () => gitService.cherryPick(commitId),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    cherryPickAbort: () =>
      actionThenRefresh(
        () => gitService.cherryPickAbort(),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    cherryPickContinue: () =>
      actionThenRefresh(
        () => gitService.cherryPickContinue(),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    revertCommit: (commitId) =>
      actionThenRefresh(
        () => gitService.revertCommit(commitId),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    revertAbort: () =>
      actionThenRefresh(
        () => gitService.revertAbort(),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    revertContinue: () =>
      actionThenRefresh(
        () => gitService.revertContinue(),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    rebaseOnto: (onto) =>
      actionThenRefresh(
        () => gitService.rebaseOnto(onto),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    rebaseAbort: () =>
      actionThenRefresh(
        () => gitService.rebaseAbort(),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    rebaseContinue: () =>
      actionThenRefresh(
        () => gitService.rebaseContinue(),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    rebaseSkip: () =>
      actionThenRefresh(
        () => gitService.rebaseSkip(),
        [actions.refreshStatus, actions.refreshRepoState],
      ),

    // ==================== Tag ====================

    createTag: (name, message, commit) =>
      actionThenRefresh(() => gitService.createTag(name, message, commit), [actions.refreshTags]),

    deleteTag: (name) => actionThenRefresh(() => gitService.deleteTag(name), [actions.refreshTags]),

    // ==================== 错误 ====================

    clearError() {
      setState("error", null);
    },
  };

  return [state, actions];
}
