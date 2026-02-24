import { type Component, createSignal, Show, Switch, Match } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { useTheme, useShortcuts } from "@/hooks";
import type { ThemeMode } from "@/hooks";
import { WorkspaceView, HistoryView, BranchesView, WelcomeView } from "@/views";
import Sidebar from "@/components/layout/Sidebar";
import Toolbar from "@/components/layout/Toolbar";
import StatusBar from "@/components/layout/StatusBar";
import CloneDialog from "@/components/CloneDialog";
import { RepoContext, createRepoStore } from "@/stores/repo";
import { initRepo } from "@/services/git";
import styles from "@/components/layout/AppLayout.module.css";

export type ViewId = "workspace" | "history" | "branches";

const App: Component = () => {
  const [state, actions] = createRepoStore();

  /** 当前激活的视图 */
  const [activeView, setActiveView] = createSignal<ViewId>("workspace");
  /** 侧边栏折叠状态 */
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
  /** 主题模式 */
  const [theme] = createSignal<ThemeMode>("system");
  /** 同步中状态 */
  const [syncing, setSyncing] = createSignal(false);
  /** 克隆对话框 */
  const [cloneDialogOpen, setCloneDialogOpen] = createSignal(false);

  // 初始化主题
  useTheme(() => theme());

  // 注册全局快捷键
  useShortcuts({
    onSwitchWorkspace: () => setActiveView("workspace"),
    onSwitchHistory: () => setActiveView("history"),
    onSwitchBranches: () => setActiveView("branches"),
    onCommit: () => {
      if (activeView() === "workspace") {
        console.log("[App] Ctrl/Cmd+Enter: commit shortcut");
      }
    },
  });

  // ==================== 仓库操作 ====================

  const handleOpenRepo = async (path: string) => {
    try {
      await actions.openRepo(path);
      setActiveView("workspace");
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
    setCloneDialogOpen(true);
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

  const handleFetch = () => wrapSync(() => actions.fetchRemote());
  const handlePull = () => wrapSync(() => actions.pullRemote());
  const handlePush = () => wrapSync(() => actions.pushRemote());
  const handleSync = () => wrapSync(() => actions.syncRemote());
  const handlePullRebase = () => wrapSync(() => actions.pullRebase());

  // ==================== 派生状态 ====================

  const isRepoOpen = () => !!state.currentRepo;

  const currentBranchInfo = () => {
    const branches = state.branches;
    return branches.find((b) => b.is_head);
  };

  const aheadCount = () => currentBranchInfo()?.ahead ?? 0;
  const behindCount = () => currentBranchInfo()?.behind ?? 0;
  const dirtyCount = () => state.fileStatuses.length;

  return (
    <RepoContext.Provider value={[state, actions]}>
      <div class={styles.appLayout}>
        {/* 侧边栏 */}
        <div class={styles.sidebarArea}>
          <Sidebar
            collapsed={sidebarCollapsed()}
            onToggle={() => setSidebarCollapsed((prev) => !prev)}
            activeView={activeView()}
            onViewChange={(view) => setActiveView(view as ViewId)}
          />
        </div>

        {/* 工具栏 — 始终可见 */}
        <div class={styles.toolbarArea}>
          <Toolbar
            repoName={state.currentRepo?.name}
            branchName={state.currentBranch || undefined}
            onFetch={isRepoOpen() ? handleFetch : undefined}
            onPull={isRepoOpen() ? handlePull : undefined}
            onPush={isRepoOpen() ? handlePush : undefined}
            onSync={isRepoOpen() ? handleSync : undefined}
            onPullRebase={isRepoOpen() ? handlePullRebase : undefined}
            syncing={syncing()}
          />
        </div>

        {/* 主内容区 */}
        <div class={styles.mainArea}>
          <Show
            when={isRepoOpen()}
            fallback={
              <WelcomeView
                onOpenRepo={handleWelcomeOpenRepo}
                onCloneRepo={handleCloneRepo}
                onInitRepo={handleInitRepo}
              />
            }
          >
            <Switch>
              <Match when={activeView() === "workspace"}>
                <WorkspaceView
                  files={state.fileStatuses}
                  repoState={state.repoState}
                  stashes={state.stashes}
                  onRefresh={() => actions.refreshAll()}
                  onStageFiles={(paths) => actions.stageFiles(paths)}
                  onUnstageFiles={(paths) => actions.unstageFiles(paths)}
                  onCommit={(msg, amend) => actions.createCommit(msg, amend)}
                  onDiscardChanges={(paths) => actions.discardChanges(paths)}
                  onDiscardAll={() => actions.discardAllChanges()}
                  onUndoCommit={(soft) => actions.undoLastCommit(soft)}
                  onStashSave={(msg) => actions.stashSave(msg)}
                  onStashPop={(idx) => actions.stashPop(idx)}
                  onStashApply={(idx) => actions.stashApply(idx)}
                  onStashDrop={(idx) => actions.stashDrop(idx)}
                  onMergeAbort={() => actions.mergeAbort()}
                  onMergeContinue={() => actions.mergeContinue()}
                  onRebaseAbort={() => actions.rebaseAbort()}
                  onRebaseContinue={() => actions.rebaseContinue()}
                  onRebaseSkip={() => actions.rebaseSkip()}
                />
              </Match>
              <Match when={activeView() === "history"}>
                <HistoryView
                  onCherryPick={(id) => actions.cherryPick(id)}
                  onRevert={(id) => actions.revertCommit(id)}
                  onResetToCommit={(id, mode) => actions.resetToCommit(id, mode)}
                />
              </Match>
              <Match when={activeView() === "branches"}>
                <BranchesView
                  branches={state.branches}
                  tags={state.tags}
                  currentBranch={state.currentBranch}
                  onCreateBranch={(name) => actions.createBranch(name)}
                  onCheckoutBranch={(name) => actions.checkoutBranch(name)}
                  onDeleteBranch={(name) => actions.deleteBranch(name)}
                  onRenameBranch={(old, nw) => actions.renameBranch(old, nw)}
                  onMergeBranch={(branch, noFf) => actions.mergeBranch(branch, noFf)}
                  onRebaseOnto={(onto) => actions.rebaseOnto(onto)}
                  onCreateTag={(name, msg) => actions.createTag(name, msg)}
                  onDeleteTag={(name) => actions.deleteTag(name)}
                  onFetch={() => actions.fetchRemote()}
                  onPull={() => actions.pullRemote()}
                  onPush={() => actions.pushRemote()}
                  onPullRebase={() => actions.pullRebase()}
                />
              </Match>
            </Switch>
          </Show>
        </div>

        {/* 状态栏 — 始终可见 */}
        <div class={styles.statusBarArea}>
          <StatusBar
            branchName={state.currentBranch || undefined}
            ahead={aheadCount()}
            behind={behindCount()}
            dirtyCount={dirtyCount()}
            repoState={state.repoState}
            aiStatus="offline"
            onBranchClick={() => setActiveView("branches")}
            onSyncClick={isRepoOpen() ? handleSync : undefined}
          />
        </div>
      </div>

      {/* 克隆对话框 */}
      <CloneDialog
        open={cloneDialogOpen()}
        onClose={() => setCloneDialogOpen(false)}
        onCloneComplete={handleCloneComplete}
      />
    </RepoContext.Provider>
  );
};

export default App;
