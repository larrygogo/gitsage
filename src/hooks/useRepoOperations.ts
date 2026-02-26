import { createSignal } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { logger } from "@/utils/logger";
import { initRepo, getRecentRepos, cloneRepo } from "@/services/git";
import type { RepoActions } from "@/stores/repo";
import type { UiActions } from "@/stores/ui";
import type { RepoEntry } from "@/types";

export interface RepoOperationsResult {
  syncing: () => boolean;
  recentRepos: () => RepoEntry[];
  cloneDialogOpen: () => boolean;
  setCloneDialogOpen: (v: boolean) => void;
  repoPickerOpen: () => boolean;
  setRepoPickerOpen: (v: boolean) => void;
  repoPickerRemoteOnly: () => boolean;
  setRepoPickerRemoteOnly: (v: boolean) => void;
  handleOpenRepo: (path: string) => Promise<void>;
  handlePickAndOpenRepo: () => Promise<void>;
  handleWelcomeOpenRepo: (path: string) => Promise<void>;
  handleCloneRepo: () => void;
  handleCloneComplete: (destPath: string) => Promise<void>;
  handleInitRepo: () => Promise<void>;
  handleFetch: () => void;
  handlePull: () => void;
  handlePush: () => void;
  handleSync: () => void;
  handlePullRebase: () => void;
  handleNewWindow: () => void;
  refreshRecentRepos: () => Promise<void>;
  handleCloneFromPicker: (cloneUrl: string) => Promise<void>;
}

export function useRepoOperations(
  repoActions: RepoActions,
  uiActions: UiActions,
): RepoOperationsResult {
  const [syncing, setSyncing] = createSignal(false);
  const [cloneDialogOpen, setCloneDialogOpen] = createSignal(false);
  const [repoPickerOpen, setRepoPickerOpen] = createSignal(false);
  const [repoPickerRemoteOnly, setRepoPickerRemoteOnly] = createSignal(false);
  const [recentRepos, setRecentRepos] = createSignal<RepoEntry[]>([]);

  const refreshRecentRepos = async () => {
    try {
      const repos = await getRecentRepos();
      setRecentRepos(repos);
    } catch (err) {
      logger.warn("RepoOps", "加载最近仓库列表失败:", err);
    }
  };

  const handleOpenRepo = async (path: string) => {
    try {
      await repoActions.openRepo(path);
      uiActions.setLastRepoPath(path);
      uiActions.setActiveView("workspace");
      await refreshRecentRepos();
    } catch (err) {
      logger.error("RepoOps", "打开仓库失败:", err);
    }
  };

  const handlePickAndOpenRepo = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        await handleOpenRepo(selected as string);
      }
    } catch (err) {
      logger.error("RepoOps", "选择文件夹失败:", err);
    }
  };

  const handleWelcomeOpenRepo = async (path: string) => {
    if (path) {
      await handleOpenRepo(path);
    } else {
      await handlePickAndOpenRepo();
    }
  };

  const handleCloneRepo = () => {
    setRepoPickerRemoteOnly(true);
    setRepoPickerOpen(true);
  };

  const handleCloneComplete = async (destPath: string) => {
    await handleOpenRepo(destPath);
  };

  const handleInitRepo = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        await initRepo(selected as string);
        await handleOpenRepo(selected as string);
      }
    } catch (err) {
      logger.error("RepoOps", "初始化仓库失败:", err);
    }
  };

  const wrapSync = async (fn: () => Promise<void>) => {
    setSyncing(true);
    try {
      await fn();
    } finally {
      setSyncing(false);
    }
  };

  const handleFetch = () => wrapSync(() => repoActions.fetchRemote());
  const handlePull = () => wrapSync(() => repoActions.pullRemote());
  const handlePush = () => wrapSync(() => repoActions.pushRemote());
  const handleSync = () => wrapSync(() => repoActions.syncRemote());
  const handlePullRebase = () => wrapSync(() => repoActions.pullRebase());

  const handleNewWindow = () => {
    const label = `main-${Date.now()}`;
    new WebviewWindow(label, {
      url: "/?fresh=1",
      title: "GitSage",
      width: 1280,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      decorations: false,
    });
  };

  const handleCloneFromPicker = async (cloneUrl: string) => {
    setRepoPickerOpen(false);
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        const repoName =
          cloneUrl
            .split("/")
            .pop()
            ?.replace(/\.git$/, "") || "repo";
        const destPath = `${selected}/${repoName}`;
        await cloneRepo(cloneUrl, destPath);
        await handleOpenRepo(destPath);
      }
    } catch (err) {
      logger.error("RepoOps", "克隆 GitHub 仓库失败:", err);
    }
  };

  return {
    syncing,
    recentRepos,
    cloneDialogOpen,
    setCloneDialogOpen,
    repoPickerOpen,
    setRepoPickerOpen,
    repoPickerRemoteOnly,
    setRepoPickerRemoteOnly,
    handleOpenRepo,
    handlePickAndOpenRepo,
    handleWelcomeOpenRepo,
    handleCloneRepo,
    handleCloneComplete,
    handleInitRepo,
    handleFetch,
    handlePull,
    handlePush,
    handleSync,
    handlePullRebase,
    handleNewWindow,
    refreshRecentRepos,
    handleCloneFromPicker,
  };
}
