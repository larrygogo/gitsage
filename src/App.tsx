import { type Component, createMemo, onMount, Show, Switch, Match } from "solid-js";
import { useTheme } from "@/hooks";
import {
  WorkspaceView,
  HistoryView,
  BranchesView,
  WelcomeView,
  SettingsView,
  PullsView,
} from "@/views";
import Sidebar from "@/components/layout/Sidebar";
import Toolbar from "@/components/layout/Toolbar";

import { logger } from "@/utils/logger";
import AppErrorBoundary from "@/components/ErrorBoundary";
import CloneDialog from "@/components/CloneDialog";
import RepoPickerDialog from "@/components/RepoPickerDialog";
import UpdateDialog from "@/components/UpdateDialog";
import { createRepoStore } from "@/stores/repo";
import { createGitHubStore } from "@/stores/github";
import { createSettingsStore } from "@/stores/settings";
import { createUiStore } from "@/stores/ui";
import { createUpdaterStore } from "@/stores/updater";
import { createI18n } from "@/i18n";
import type { ActiveView } from "@/stores/ui";
import AppProviders from "@/providers/AppProviders";
import { useShortcuts } from "@/hooks";
import { useRepoOperations } from "@/hooks/useRepoOperations";
import { buildToolbarMenus } from "@/config/toolbarMenus";
import styles from "@/components/layout/AppLayout.module.css";

const App: Component = () => {
  const [repoState, repoActions] = createRepoStore();
  const [ghState, ghActions] = createGitHubStore();
  const [settingsState, settingsActions] = createSettingsStore();
  const [uiState, uiActions] = createUiStore();
  const [updaterState, updaterActions] = createUpdaterStore();

  // 仓库操作 hook
  const ops = useRepoOperations(repoActions, uiActions);

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
        logger.debug("App", "Ctrl/Cmd+Enter: commit shortcut");
      }
    },
  });

  // ==================== 启动时恢复上次仓库 ====================

  onMount(async () => {
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    ghActions.checkAuth().catch((err) => {
      logger.warn("App", "GitHub 认证检测失败:", err);
    });

    await ops.refreshRecentRepos();

    setTimeout(() => {
      updaterActions.checkUpdate(true).catch((err) => {
        logger.warn("App", "自动检查更新失败:", err);
      });
    }, 3000);

    const isFreshWindow = new URLSearchParams(window.location.search).has("fresh");
    if (isFreshWindow) {
      uiActions.setActiveView("workspace");
      return;
    }

    const lastPath = uiState.lastRepoPath;
    if (lastPath) {
      try {
        await repoActions.openRepo(lastPath);
      } catch (err) {
        logger.warn("App", "恢复上次仓库失败，已清除记录:", err);
        uiActions.setLastRepoPath(null);
      }
    }
  });

  // ==================== 菜单配置 ====================

  const toolbarMenus = createMemo(() =>
    buildToolbarMenus(i18n, ops.recentRepos(), {
      onNewWindow: ops.handleNewWindow,
      onOpenRepo: ops.handlePickAndOpenRepo,
      onCloneRepo: ops.handleCloneRepo,
      onInitRepo: ops.handleInitRepo,
      onOpenRepoByPath: ops.handleOpenRepo,
      onSettings: () => uiActions.setActiveView("settings"),
      onFetch: ops.handleFetch,
      onPull: ops.handlePull,
      onPush: ops.handlePush,
      onPullRebase: ops.handlePullRebase,
      onSync: ops.handleSync,
      onCheckUpdate: () => updaterActions.checkUpdate(),
    }),
  );

  // ==================== 派生状态 ====================

  const isRepoOpen = () => !!repoState.currentRepo;

  return (
    <AppProviders
      settings={[settingsState, settingsActions]}
      i18n={i18n}
      ui={[uiState, uiActions]}
      updater={[updaterState, updaterActions]}
      repo={[repoState, repoActions]}
      github={[ghState, ghActions]}
    >
      <div class={styles.appLayout}>
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

        <div class={styles.toolbarArea}>
          <Toolbar
            menus={toolbarMenus()}
            repoName={repoState.currentRepo?.name}
            branchName={repoState.currentBranch || undefined}
          />
        </div>

        <div class={styles.mainArea}>
          <AppErrorBoundary>
            <Switch>
              <Match when={uiState.activeView === "settings"}>
                <SettingsView onClose={() => uiActions.setActiveView("workspace")} />
              </Match>
              <Match when={!isRepoOpen()}>
                <WelcomeView
                  onOpenRepo={ops.handleWelcomeOpenRepo}
                  onCloneRepo={ops.handleCloneRepo}
                  onInitRepo={ops.handleInitRepo}
                  onViewAll={() => ops.setRepoPickerOpen(true)}
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
          </AppErrorBoundary>
        </div>
      </div>

      <RepoPickerDialog
        open={ops.repoPickerOpen()}
        remoteOnly={ops.repoPickerRemoteOnly()}
        onClose={() => {
          ops.setRepoPickerOpen(false);
          ops.setRepoPickerRemoteOnly(false);
        }}
        onOpenRepo={ops.handleOpenRepo}
        onCloneRepo={ops.handleCloneFromPicker}
      />

      <CloneDialog
        open={ops.cloneDialogOpen()}
        onClose={() => ops.setCloneDialogOpen(false)}
        onCloneComplete={ops.handleCloneComplete}
      />

      <UpdateDialog />
    </AppProviders>
  );
};

export default App;
