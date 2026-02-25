import { type Component, type JSX, createSignal } from "solid-js";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";
import styles from "./AppLayout.module.css";

export interface AppLayoutProps {
  children?: JSX.Element;

  /** Sidebar */
  activeView?: string;
  onViewChange?: (view: string) => void;
  repoName?: string;
  branchName?: string;

  /** Toolbar */
  menus?: import("./Toolbar").MenuGroup[];
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
          activeView={props.activeView}
          onViewChange={props.onViewChange}
        />
      </div>

      {/* Toolbar */}
      <div class={styles.toolbarArea}>
        <Toolbar
          menus={props.menus}
        />
      </div>

      {/* Main content */}
      <main class={styles.mainArea}>
        {props.children}
      </main>
    </div>
  );
};

export default AppLayout;
