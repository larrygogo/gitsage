import { type Component, Show } from "solid-js";
import GitBranch from "lucide-solid/icons/git-branch";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import ArrowDown from "lucide-solid/icons/arrow-down";
import ArrowUp from "lucide-solid/icons/arrow-up";
import ArrowUpDown from "lucide-solid/icons/arrow-up-down";
import styles from "./Toolbar.module.css";

export interface ToolbarProps {
  repoName?: string;
  branchName?: string;
  onFetch?: () => void;
  onPull?: () => void;
  onPush?: () => void;
  onSync?: () => void;
  onPullRebase?: () => void;
  syncing?: boolean;
}

const Toolbar: Component<ToolbarProps> = (props) => {
  const repoName = () => props.repoName ?? "GitSage";
  const branchName = () => props.branchName;
  const isSyncing = () => props.syncing ?? false;
  const hasRepo = () => !!props.repoName;

  return (
    <header class={styles.toolbar}>
      {/* Repo + branch info */}
      <div class={styles.repoInfo}>
        <span class={styles.repoName}>{repoName()}</span>
        <Show when={branchName()}>
          <span class={styles.separator}>/</span>
          <span class={styles.branchBadge}>
            <span class={styles.branchIcon}><GitBranch size={12} /></span>
            {branchName()}
          </span>
        </Show>
      </div>

      <div class={styles.spacer} />

      {/* Sync actions — 仅在打开仓库后显示 */}
      <Show when={hasRepo()}>
        <div class={styles.syncActions}>
          <button
            class={styles.syncBtn}
            onClick={props.onFetch}
            disabled={isSyncing()}
            title="Fetch - 获取远程更新"
          >
            <span class={styles.syncIcon}><RefreshCw size={14} /></span>
            <span class={styles.syncLabel}>Fetch</span>
          </button>

          <button
            class={styles.syncBtn}
            onClick={props.onPull}
            disabled={isSyncing()}
            title="Pull - 拉取远程变更"
          >
            <span class={styles.syncIcon}><ArrowDown size={14} /></span>
            <span class={styles.syncLabel}>Pull</span>
          </button>

          <button
            class={styles.syncBtn}
            onClick={props.onPush}
            disabled={isSyncing()}
            title="Push - 推送本地变更"
          >
            <span class={styles.syncIcon}><ArrowUp size={14} /></span>
            <span class={styles.syncLabel}>Push</span>
          </button>

          <button
            class={styles.syncBtn}
            onClick={props.onPullRebase}
            disabled={isSyncing()}
            title="Pull (Rebase) - 变基拉取"
          >
            <span class={styles.syncIcon}><RefreshCw size={14} /></span>
            <span class={styles.syncLabel}>Pull Rebase</span>
          </button>

          <button
            class={styles.syncBtn}
            onClick={props.onSync}
            disabled={isSyncing()}
            title="Sync - 同步 (Pull + Push)"
          >
            <span class={styles.syncIcon}><ArrowUpDown size={14} /></span>
            <span class={styles.syncLabel}>Sync</span>
          </button>
        </div>
      </Show>
    </header>
  );
};

export default Toolbar;
