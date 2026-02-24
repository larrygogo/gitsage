import { type Component, type JSX, createSignal } from "solid-js";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import StatusBar from "./StatusBar";
import styles from "./AppLayout.module.css";

import type { SidebarRepo } from "./Sidebar";
import type { AiStatus } from "./StatusBar";

export interface AppLayoutProps {
  children?: JSX.Element;

  /** Sidebar */
  repos?: SidebarRepo[];
  activeRepoId?: string;
  onRepoSelect?: (id: string) => void;
  activeView?: string;
  onViewChange?: (view: string) => void;
  onSettingsClick?: () => void;

  /** Toolbar */
  repoName?: string;
  branchName?: string;
  onFetch?: () => void;
  onPull?: () => void;
  onPush?: () => void;
  syncing?: boolean;

  /** StatusBar */
  ahead?: number;
  behind?: number;
  aiStatus?: AiStatus;
  aiStatusText?: string;
}

const AppLayout: Component<AppLayoutProps> = (props) => {
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div class={styles.appLayout}>
      {/* Sidebar */}
      <div class={styles.sidebarArea}>
        <Sidebar
          collapsed={sidebarCollapsed()}
          onToggle={toggleSidebar}
          repos={props.repos}
          activeRepoId={props.activeRepoId}
          onRepoSelect={props.onRepoSelect}
          activeView={props.activeView}
          onViewChange={props.onViewChange}
          onSettingsClick={props.onSettingsClick}
        />
      </div>

      {/* Toolbar */}
      <div class={styles.toolbarArea}>
        <Toolbar
          repoName={props.repoName}
          branchName={props.branchName}
          onFetch={props.onFetch}
          onPull={props.onPull}
          onPush={props.onPush}
          syncing={props.syncing}
        />
      </div>

      {/* Main content */}
      <main class={styles.mainArea}>
        {props.children}
      </main>

      {/* Status bar */}
      <div class={styles.statusBarArea}>
        <StatusBar
          branchName={props.branchName}
          ahead={props.ahead}
          behind={props.behind}
          aiStatus={props.aiStatus}
          aiStatusText={props.aiStatusText}
        />
      </div>
    </div>
  );
};

export default AppLayout;
