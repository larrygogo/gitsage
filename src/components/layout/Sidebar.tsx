import { type Component, createMemo, Show, For } from "solid-js";
import GitCommitHorizontal from 'lucide-solid/icons/git-commit-horizontal';
import History from 'lucide-solid/icons/history';
import GitBranch from 'lucide-solid/icons/git-branch';
import GitPullRequest from 'lucide-solid/icons/git-pull-request';
import Settings from 'lucide-solid/icons/settings';
import { useI18n } from "@/i18n";
import styles from "./Sidebar.module.css";

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeView?: string;
  onViewChange?: (view: string) => void;
}

const Sidebar: Component<SidebarProps> = (props) => {
  const { t } = useI18n();
  const isCollapsed = () => props.collapsed;
  const activeView = () => props.activeView ?? "workspace";

  const navItems = createMemo(() => [
    { id: "workspace" as const, icon: GitCommitHorizontal, label: t("sidebar.workspace") },
    { id: "history" as const, icon: History, label: t("sidebar.history") },
    { id: "branches" as const, icon: GitBranch, label: t("sidebar.branches") },
    { id: "pulls" as const, icon: GitPullRequest, label: t("sidebar.pulls") },
  ]);

  return (
    <aside
      class={`${styles.sidebar} ${isCollapsed() ? styles.collapsed : styles.expanded}`}
    >
      {/* Top: Navigation */}
      <div class={styles.sidebarTop}>
        <nav class={styles.navSection}>
          <For each={navItems()}>
            {(item) => (
              <button
                class={`${styles.navItem} ${activeView() === item.id ? styles.active : ""}`}
                onClick={() => props.onViewChange?.(item.id)}
                title={item.label}
              >
                <span class={styles.navIcon}><item.icon size={18} /></span>
                <Show when={!isCollapsed()}>
                  <span class={styles.navLabel}>{item.label}</span>
                </Show>
              </button>
            )}
          </For>

          <div class={styles.navDivider} />

          <button
            class={`${styles.navItem} ${activeView() === "settings" ? styles.active : ""}`}
            onClick={() => props.onViewChange?.("settings")}
            title={t("sidebar.settings")}
          >
            <span class={styles.navIcon}><Settings size={18} /></span>
            <Show when={!isCollapsed()}>
              <span class={styles.navLabel}>{t("sidebar.settings")}</span>
            </Show>
          </button>
        </nav>
      </div>

    </aside>
  );
};

export default Sidebar;
