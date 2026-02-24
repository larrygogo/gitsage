import { type Component, type JSX, Show, For, createSignal } from "solid-js";
import LayoutGrid from 'lucide-solid/icons/layout-grid';
import History from 'lucide-solid/icons/history';
import GitBranch from 'lucide-solid/icons/git-branch';
import PanelLeftOpen from 'lucide-solid/icons/panel-left-open';
import PanelLeftClose from 'lucide-solid/icons/panel-left-close';
import Folder from 'lucide-solid/icons/folder';
import Settings from 'lucide-solid/icons/settings';
import styles from "./Sidebar.module.css";

export interface SidebarRepo {
  id: string;
  name: string;
}

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  repos?: SidebarRepo[];
  activeRepoId?: string;
  onRepoSelect?: (id: string) => void;
  activeView?: string;
  onViewChange?: (view: string) => void;
  onSettingsClick?: () => void;
}

const quickActions = [
  { id: "workspace" as const, icon: LayoutGrid, label: "工作区" },
  { id: "history" as const, icon: History, label: "历史记录" },
  { id: "branches" as const, icon: GitBranch, label: "分支" },
];

const Sidebar: Component<SidebarProps> = (props) => {
  const isCollapsed = () => props.collapsed;
  const repos = () => props.repos ?? [];
  const activeView = () => props.activeView ?? "workspace";

  return (
    <aside
      class={`${styles.sidebar} ${isCollapsed() ? styles.collapsed : styles.expanded}`}
    >
      {/* Toggle button */}
      <button
        class={styles.toggleBtn}
        onClick={props.onToggle}
        title={isCollapsed() ? "\u5C55\u5F00\u4FA7\u8FB9\u680F" : "\u6536\u8D77\u4FA7\u8FB9\u680F"}
      >
        {isCollapsed() ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {/* Quick actions */}
      <nav class={styles.quickActions}>
        <For each={quickActions}>
          {(action) => (
            <button
              class={`${styles.actionBtn} ${activeView() === action.id ? styles.active : ""}`}
              onClick={() => props.onViewChange?.(action.id)}
              title={action.label}
            >
              <span class={styles.actionIcon}><action.icon size={16} /></span>
              <Show when={!isCollapsed()}>
                <span class={styles.actionLabel}>{action.label}</span>
              </Show>
            </button>
          )}
        </For>
      </nav>

      {/* Repo list */}
      <div class={styles.repoSection}>
        <Show when={!isCollapsed()}>
          <div class={styles.repoSectionTitle}>{"\u4ED3\u5E93"}</div>
        </Show>
        <div class={styles.repoList}>
          <For each={repos()}>
            {(repo) => (
              <button
                class={`${styles.repoItem} ${props.activeRepoId === repo.id ? styles.active : ""}`}
                onClick={() => props.onRepoSelect?.(repo.id)}
                title={repo.name}
              >
                <span class={styles.repoIcon}><Folder size={14} /></span>
                <Show when={!isCollapsed()}>
                  <span class={styles.repoName}>{repo.name}</span>
                </Show>
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Settings button */}
      <div class={styles.bottomSection}>
        <button
          class={styles.settingsBtn}
          onClick={props.onSettingsClick}
          title={"\u8BBE\u7F6E"}
        >
          <span class={styles.settingsIcon}><Settings size={16} /></span>
          <Show when={!isCollapsed()}>
            <span class={styles.settingsLabel}>{"\u8BBE\u7F6E"}</span>
          </Show>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
