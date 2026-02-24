import { type Component, createSignal, Show, For, onMount } from "solid-js";
import type { RepoEntry } from "@/types";
import styles from "./WelcomeView.module.css";

export interface WelcomeViewProps {
  onOpenRepo?: (path: string) => void;
  onCloneRepo?: () => void;
  onInitRepo?: () => void;
}

const WelcomeView: Component<WelcomeViewProps> = (props) => {
  const [recentRepos, setRecentRepos] = createSignal<RepoEntry[]>([]);

  onMount(async () => {
    try {
      // TODO: 从 service 获取最近打开的仓库列表
      // const repos = await gitService.getRecentRepos();
      // setRecentRepos(repos);
      setRecentRepos([]);
    } catch (err) {
      console.error("[WelcomeView] 获取最近仓库失败:", err);
    }
  });

  const handleOpenRepo = () => {
    props.onOpenRepo?.("");
  };

  const handleCloneRepo = () => {
    props.onCloneRepo?.();
  };

  const handleInitRepo = () => {
    props.onInitRepo?.();
  };

  const handleRecentClick = (entry: RepoEntry) => {
    props.onOpenRepo?.(entry.path);
  };

  return (
    <div class={styles.welcome}>
      {/* 品牌区域 */}
      <div class={styles.brand}>
        <div class={styles.logo}>
          <span class={styles.logoText}>G</span>
        </div>
        <h1 class={styles.appName}>GitSage</h1>
        <p class={styles.subtitle}>智能 Git 可视化管理工具</p>
      </div>

      {/* 操作按钮 */}
      <div class={styles.actions}>
        <button class={styles.actionBtn} onClick={handleOpenRepo}>
          <span class={styles.actionIcon}>{"\uD83D\uDCC2"}</span>
          <div class={styles.actionInfo}>
            <span class={styles.actionLabel}>打开仓库</span>
            <span class={styles.actionDesc}>打开本地已有的 Git 仓库</span>
          </div>
        </button>

        <button class={styles.actionBtn} onClick={handleCloneRepo}>
          <span class={styles.actionIcon}>{"\u2B07"}</span>
          <div class={styles.actionInfo}>
            <span class={styles.actionLabel}>克隆仓库</span>
            <span class={styles.actionDesc}>从远程 URL 克隆仓库到本地</span>
          </div>
        </button>

        <button class={styles.actionBtn} onClick={handleInitRepo}>
          <span class={styles.actionIcon}>{"\u2795"}</span>
          <div class={styles.actionInfo}>
            <span class={styles.actionLabel}>初始化仓库</span>
            <span class={styles.actionDesc}>在本地文件夹中创建新的 Git 仓库</span>
          </div>
        </button>
      </div>

      {/* 最近打开 */}
      <div class={styles.recentSection}>
        <div class={styles.recentTitle}>最近打开</div>
        <Show
          when={recentRepos().length > 0}
          fallback={
            <div class={styles.emptyRecent}>暂无最近打开的仓库</div>
          }
        >
          <div class={styles.recentList}>
            <For each={recentRepos()}>
              {(entry) => (
                <button
                  class={styles.recentItem}
                  onClick={() => handleRecentClick(entry)}
                >
                  <span class={styles.recentIcon}>{"\uD83D\uDCC1"}</span>
                  <div class={styles.recentInfo}>
                    <span class={styles.recentName}>{entry.name}</span>
                    <span class={styles.recentPath}>{entry.path}</span>
                  </div>
                </button>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default WelcomeView;
