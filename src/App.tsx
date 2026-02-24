import { type Component, createSignal, Show, Switch, Match } from "solid-js";
import { useTheme, useShortcuts } from "@/hooks";
import type { ThemeMode } from "@/hooks";
import { WorkspaceView, HistoryView, BranchesView, WelcomeView } from "@/views";
import Sidebar from "@/components/layout/Sidebar";
import styles from "@/components/layout/AppLayout.module.css";

export type ViewId = "workspace" | "history" | "branches";

const App: Component = () => {
  /** 当前是否打开了仓库 */
  const [repoOpen, setRepoOpen] = createSignal(false);
  /** 当前激活的视图 */
  const [activeView, setActiveView] = createSignal<ViewId>("workspace");
  /** 侧边栏折叠状态 */
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
  /** 主题模式（后续可接入 settings store） */
  const [theme] = createSignal<ThemeMode>("system");

  // 初始化主题
  useTheme(() => theme());

  // 注册全局快捷键
  useShortcuts({
    onSwitchWorkspace: () => setActiveView("workspace"),
    onSwitchHistory: () => setActiveView("history"),
    onSwitchBranches: () => setActiveView("branches"),
    onCommit: () => {
      // 只在工作区视图时触发提交
      if (activeView() === "workspace") {
        // TODO: 触发 WorkspaceView 的提交逻辑
        console.log("[App] Ctrl/Cmd+Enter: commit shortcut");
      }
    },
  });

  /** 打开仓库回调 */
  const handleOpenRepo = (path: string) => {
    // TODO: 调用 git service 打开仓库，成功后切换到主界面
    console.log("[App] open repo:", path);
    setRepoOpen(true);
    setActiveView("workspace");
  };

  /** 克隆仓库回调 */
  const handleCloneRepo = () => {
    // TODO: 弹出克隆仓库对话框
    console.log("[App] clone repo");
  };

  /** 初始化仓库回调 */
  const handleInitRepo = () => {
    // TODO: 弹出初始化仓库对话框
    console.log("[App] init repo");
  };

  return (
    <Show
      when={repoOpen()}
      fallback={
        <WelcomeView
          onOpenRepo={handleOpenRepo}
          onCloneRepo={handleCloneRepo}
          onInitRepo={handleInitRepo}
        />
      }
    >
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

        {/* 工具栏（占位，后续可添加 Toolbar 组件） */}
        <div class={styles.toolbarArea} />

        {/* 主内容区 */}
        <div class={styles.mainArea}>
          <Switch>
            <Match when={activeView() === "workspace"}>
              <WorkspaceView />
            </Match>
            <Match when={activeView() === "history"}>
              <HistoryView />
            </Match>
            <Match when={activeView() === "branches"}>
              <BranchesView />
            </Match>
          </Switch>
        </div>

        {/* 状态栏（占位，后续可添加 StatusBar 组件） */}
        <div class={styles.statusBarArea} />
      </div>
    </Show>
  );
};

export default App;
