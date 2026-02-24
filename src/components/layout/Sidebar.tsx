import { type Component, type JSX, Show, For, createSignal } from "solid-js";
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
  { id: "workspace", icon: "\u25A3", label: "\u5DE5\u4F5C\u533A" },
  { id: "history", icon: "\u29D6", label: "\u5386\u53F2\u8BB0\u5F55" },
  { id: "branches", icon: "\u2442", label: "\u5206\u652F" },
] as const;

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
        {isCollapsed() ? "\u25B6" : "\u25C0"}
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
              <span class={styles.actionIcon}>{action.icon}</span>
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
                <span class={styles.repoIcon}>{"\uD83D\uDCC1"}</span>
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
          <span class={styles.settingsIcon}>{"\u2699"}</span>
          <Show when={!isCollapsed()}>
            <span class={styles.settingsLabel}>{"\u8BBE\u7F6E"}</span>
          </Show>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
