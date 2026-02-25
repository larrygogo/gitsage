import { type Component, createSignal, createMemo, onMount, Show, Switch, Match } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useTheme } from "@/hooks";
import { WorkspaceView, HistoryView, BranchesView, WelcomeView, SettingsView, PullsView } from "@/views";
import Sidebar from "@/components/layout/Sidebar";
import Toolbar from "@/components/layout/Toolbar";
import type { MenuGroup, MenuItem } from "@/components/layout/Toolbar";
import FolderOpen from "lucide-solid/icons/folder-open";
import GitFork from "lucide-solid/icons/git-fork";
import FolderPlus from "lucide-solid/icons/folder-plus";
import Settings from "lucide-solid/icons/settings";
import Download from "lucide-solid/icons/download";
import Upload from "lucide-solid/icons/upload";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import GitBranch from "lucide-solid/icons/git-branch";
import Info from "lucide-solid/icons/info";
import Code from "lucide-solid/icons/code";
import AppWindow from "lucide-solid/icons/app-window";
import History from "lucide-solid/icons/history";
import Folder from "lucide-solid/icons/folder";

import CloneDialog from "@/components/CloneDialog";
import RepoPickerDialog from "@/components/RepoPickerDialog";
import { RepoContext, createRepoStore } from "@/stores/repo";
import { GitHubContext, createGitHubStore } from "@/stores/github";
import { SettingsContext, createSettingsStore } from "@/stores/settings";
import { UiContext, createUiStore } from "@/stores/ui";
import { I18nContext, createI18n } from "@/i18n";
import type { ActiveView } from "@/stores/ui";
import { useShortcuts } from "@/hooks";
import { initRepo, getRecentRepos, cloneRepo } from "@/services/git";
import type { RepoEntry } from "@/types";
import styles from "@/components/layout/AppLayout.module.css";

const App: Component = () => {
  const [repoState, repoActions] = createRepoStore();
  const [ghState, ghActions] = createGitHubStore();
  const [settingsState, settingsActions] = createSettingsStore();
  const [uiState, uiActions] = createUiStore();

  /** 同步中状态 */
  const [syncing, setSyncing] = createSignal(false);
  /** 克隆对话框 */
  const [cloneDialogOpen, setCloneDialogOpen] = createSignal(false);
  /** 仓库选择器对话框 */
  const [repoPickerOpen, setRepoPickerOpen] = createSignal(false);
  /** 仓库选择器：仅显示远程 */
  const [repoPickerRemoteOnly, setRepoPickerRemoteOnly] = createSignal(false);
  /** 最近打开的仓库列表（菜单用） */
  const [recentRepos, setRecentRepos] = createSignal<RepoEntry[]>([]);

  // 初始化主题（从 settings store 读取）
  useTheme(() => settingsState.theme);

  // 初始化 i18n
  const i18n = createI18n(() => settingsState.locale);

  // 注册全局快捷键
  useShortcuts({
    onSwitchWorkspace: () => uiActions.setActiveView("workspace"),
    onSwitchHistory: () => uiActions.setActiveView("history"),
    onSwitchBranches: () => uiActions.setActiveView("branches"),
    onCommit: () => {
      if (uiState.activeView === "workspace") {
        console.log("[App] Ctrl/Cmd+Enter: commit shortcut");
      }
    },
  });

  // ==================== 启动时恢复上次仓库 ====================

  onMount(async () => {
    // 禁用浏览器默认右键菜单
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // 自动检测 GitHub 认证状态
    ghActions.checkAuth().catch((err) => {
      console.warn("[App] GitHub 认证检测失败:", err);
    });

    // 加载最近仓库列表
    try {
      const repos = await getRecentRepos();
      setRecentRepos(repos);
    } catch (err) {
      console.warn("[App] 加载最近仓库列表失败:", err);
    }

    // 新建窗口（?fresh=1）不恢复上次仓库，直接显示主页
    const isFreshWindow = new URLSearchParams(window.location.search).has("fresh");
    if (isFreshWindow) {
      uiActions.setActiveView("workspace");
      return;
    }

    // 恢复上次打开的仓库
    const lastPath = uiState.lastRepoPath;
    if (lastPath) {
      try {
        await repoActions.openRepo(lastPath);
      } catch (err) {
        console.warn("[App] 恢复上次仓库失败，已清除记录:", err);
        uiActions.setLastRepoPath(null);
      }
    }
  });

  // ==================== 仓库操作 ====================

  const handleOpenRepo = async (path: string) => {
    try {
      await repoActions.openRepo(path);
      uiActions.setLastRepoPath(path);
      uiActions.setActiveView("workspace");
      // 刷新最近仓库列表
      const repos = await getRecentRepos();
      setRecentRepos(repos);
    } catch (err) {
      console.error("[App] 打开仓库失败:", err);
    }
  };

  const handlePickAndOpenRepo = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        await handleOpenRepo(selected as string);
      }
    } catch (err) {
      console.error("[App] 选择文件夹失败:", err);
    }
  };

  /** WelcomeView 回调：空路径打开对话框，非空路径直接打开 */
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
      console.error("[App] 初始化仓库失败:", err);
    }
  };

  // ==================== 同步操作 ====================

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

  // ==================== 新建窗口 ====================

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

  // ==================== 菜单配置 ====================

  const recentRepoMenuItems = createMemo((): MenuItem[] => {
    const repos = recentRepos();
    if (repos.length === 0) {
      return [{ label: i18n.t("toolbar.noRecentRepos"), disabled: true }];
    }
    return repos.slice(0, 10).map((repo) => ({
      label: repo.name,
      icon: Folder,
      action: () => handleOpenRepo(repo.path),
    }));
  });

  const toolbarMenus = createMemo((): MenuGroup[] => [
    {
      label: i18n.t("toolbar.file"),
      items: [
        { label: i18n.t("toolbar.newWindow"), icon: AppWindow, shortcut: "Ctrl+Shift+N", action: handleNewWindow },
        { separator: true, label: "" },
        { label: i18n.t("toolbar.openRepo"), icon: FolderOpen, shortcut: "Ctrl+O", action: handlePickAndOpenRepo },
        { label: i18n.t("toolbar.cloneRepo"), icon: GitFork, shortcut: "Ctrl+Shift+C", action: handleCloneRepo },
        { label: i18n.t("toolbar.initRepo"), icon: FolderPlus, action: handleInitRepo },
        { separator: true, label: "" },
        { label: i18n.t("toolbar.openRecent"), icon: History, children: recentRepoMenuItems() },
        { separator: true, label: "" },
        { label: i18n.t("toolbar.settings"), icon: Settings, shortcut: "Ctrl+,", action: () => uiActions.setActiveView("settings") },
      ],
    },
    {
      label: i18n.t("toolbar.git"),
      items: [
        { label: i18n.t("toolbar.fetch"), icon: Download, action: handleFetch },
        { label: i18n.t("toolbar.pull"), icon: Download, shortcut: "Ctrl+Shift+P", action: handlePull },
        { label: i18n.t("toolbar.push"), icon: Upload, shortcut: "Ctrl+Shift+U", action: handlePush },
        { separator: true, label: "" },
        { label: i18n.t("toolbar.pullRebase"), icon: GitBranch, action: handlePullRebase },
        { label: i18n.t("toolbar.sync"), icon: RefreshCw, action: handleSync },
      ],
    },
    {
      label: i18n.t("toolbar.about"),
      items: [
        { label: i18n.t("toolbar.version"), icon: Info, disabled: true },
        { separator: true, label: "" },
        { label: i18n.t("toolbar.description"), icon: Code, disabled: true },
      ],
    },
  ]);

  // ==================== 派生状态 ====================

  const isRepoOpen = () => !!repoState.currentRepo;

  const currentBranchInfo = () => {
    const branches = repoState.branches;
    return branches.find((b) => b.is_head);
  };

  const aheadCount = () => currentBranchInfo()?.ahead ?? 0;
  const behindCount = () => currentBranchInfo()?.behind ?? 0;
  const dirtyCount = () => repoState.fileStatuses.length;

  return (
    <SettingsContext.Provider value={[settingsState, settingsActions]}>
    <I18nContext.Provider value={i18n}>
    <UiContext.Provider value={[uiState, uiActions]}>
    <RepoContext.Provider value={[repoState, repoActions]}>
    <GitHubContext.Provider value={[ghState, ghActions]}>
      <div class={styles.appLayout}>
        {/* 侧边栏 — 仅在仓库打开时显示 */}
        <Show when={isRepoOpen()}>
          <div class={styles.sidebarArea}>
            <Sidebar
              collapsed={uiState.sidebarCollapsed}
              onToggle={() => uiActions.toggleSidebar()}
              activeView={uiState.activeView}
              onViewChange={(view) => uiActions.setActiveView(view as ActiveView)}
            />
          </div>
        </Show>

        {/* 工具栏 — 始终可见 */}
        <div class={styles.toolbarArea}>
          <Toolbar
            menus={toolbarMenus()}
            repoName={repoState.currentRepo?.name}
            branchName={repoState.currentBranch || undefined}
          />
        </div>

        {/* 主内容区 */}
        <div class={styles.mainArea}>
          <Switch>
            <Match when={uiState.activeView === "settings"}>
              <SettingsView onClose={() => uiActions.setActiveView("workspace")} />
            </Match>
            <Match when={!isRepoOpen()}>
              <WelcomeView
                onOpenRepo={handleWelcomeOpenRepo}
                onCloneRepo={handleCloneRepo}
                onInitRepo={handleInitRepo}
                onViewAll={() => setRepoPickerOpen(true)}
              />
            </Match>
            <Match when={uiState.activeView === "workspace"}>
              <WorkspaceView
                files={repoState.fileStatuses}
                repoState={repoState.repoState}
                stashes={repoState.stashes}
                onRefresh={() => repoActions.refreshAll()}
                onStageFiles={(paths) => repoActions.stageFiles(paths)}
                onUnstageFiles={(paths) => repoActions.unstageFiles(paths)}
                onCommit={(msg, amend) => repoActions.createCommit(msg, amend)}
                onDiscardChanges={(paths) => repoActions.discardChanges(paths)}
                onDiscardAll={() => repoActions.discardAllChanges()}
                onUndoCommit={(soft) => repoActions.undoLastCommit(soft)}
                onStashSave={(msg) => repoActions.stashSave(msg)}
                onStashPop={(idx) => repoActions.stashPop(idx)}
                onStashApply={(idx) => repoActions.stashApply(idx)}
                onStashDrop={(idx) => repoActions.stashDrop(idx)}
                onMergeAbort={() => repoActions.mergeAbort()}
                onMergeContinue={() => repoActions.mergeContinue()}
                onRebaseAbort={() => repoActions.rebaseAbort()}
                onRebaseContinue={() => repoActions.rebaseContinue()}
                onRebaseSkip={() => repoActions.rebaseSkip()}
              />
            </Match>
            <Match when={uiState.activeView === "history"}>
              <HistoryView
                onCherryPick={(id) => repoActions.cherryPick(id)}
                onRevert={(id) => repoActions.revertCommit(id)}
                onResetToCommit={(id, mode) => repoActions.resetToCommit(id, mode)}
              />
            </Match>
            <Match when={uiState.activeView === "pulls"}>
              <PullsView />
            </Match>
            <Match when={uiState.activeView === "branches"}>
              <BranchesView
                branches={repoState.branches}
                tags={repoState.tags}
                currentBranch={repoState.currentBranch}
                onCreateBranch={(name) => repoActions.createBranch(name)}
                onCheckoutBranch={(name) => repoActions.checkoutBranch(name)}
                onDeleteBranch={(name) => repoActions.deleteBranch(name)}
                onRenameBranch={(old, nw) => repoActions.renameBranch(old, nw)}
                onMergeBranch={(branch, noFf) => repoActions.mergeBranch(branch, noFf)}
                onRebaseOnto={(onto) => repoActions.rebaseOnto(onto)}
                onCreateTag={(name, msg) => repoActions.createTag(name, msg)}
                onDeleteTag={(name) => repoActions.deleteTag(name)}
              />
            </Match>
          </Switch>
        </div>

      </div>

      {/* 仓库选择器对话框 */}
      <RepoPickerDialog
        open={repoPickerOpen()}
        remoteOnly={repoPickerRemoteOnly()}
        onClose={() => { setRepoPickerOpen(false); setRepoPickerRemoteOnly(false); }}
        onOpenRepo={handleOpenRepo}
        onCloneRepo={async (cloneUrl) => {
          setRepoPickerOpen(false);
          try {
            const selected = await open({ directory: true, multiple: false });
            if (selected) {
              // 从 clone_url 提取仓库名，拼接为子目录
              const repoName = cloneUrl.split("/").pop()?.replace(/\.git$/, "") || "repo";
              const destPath = `${selected}/${repoName}`;
              await cloneRepo(cloneUrl, destPath);
              await handleOpenRepo(destPath);
            }
          } catch (err) {
            console.error("[App] 克隆 GitHub 仓库失败:", err);
          }
        }}
      />

      {/* 克隆对话框 */}
      <CloneDialog
        open={cloneDialogOpen()}
        onClose={() => setCloneDialogOpen(false)}
        onCloneComplete={handleCloneComplete}
      />
    </GitHubContext.Provider>
    </RepoContext.Provider>
    </UiContext.Provider>
    </I18nContext.Provider>
    </SettingsContext.Provider>
  );
};

export default App;
