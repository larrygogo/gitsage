import { type Component, Show } from "solid-js";
import styles from "./Toolbar.module.css";

export interface ToolbarProps {
  repoName?: string;
  branchName?: string;
  onFetch?: () => void;
  onPull?: () => void;
  onPush?: () => void;
  syncing?: boolean;
}

const Toolbar: Component<ToolbarProps> = (props) => {
  const repoName = () => props.repoName ?? "\u672A\u9009\u62E9\u4ED3\u5E93";
  const branchName = () => props.branchName ?? "main";
  const isSyncing = () => props.syncing ?? false;

  return (
    <header class={styles.toolbar}>
      {/* Repo + branch info */}
      <div class={styles.repoInfo}>
        <span class={styles.repoName}>{repoName()}</span>
        <span class={styles.separator}>/</span>
        <span class={styles.branchBadge}>
          <span class={styles.branchIcon}>{"\u2442"}</span>
          {branchName()}
        </span>
      </div>

      <div class={styles.spacer} />

      {/* Sync actions */}
      <div class={styles.syncActions}>
        <button
          class={styles.syncBtn}
          onClick={props.onFetch}
          disabled={isSyncing()}
          title="Fetch"
        >
          <span class={styles.syncIcon}>{"\u21BB"}</span>
          <span class={styles.syncLabel}>Fetch</span>
        </button>

        <button
          class={styles.syncBtn}
          onClick={props.onPull}
          disabled={isSyncing()}
          title="Pull"
        >
          <span class={styles.syncIcon}>{"\u2193"}</span>
          <span class={styles.syncLabel}>Pull</span>
        </button>

        <button
          class={styles.syncBtn}
          onClick={props.onPush}
          disabled={isSyncing()}
          title="Push"
        >
          <span class={styles.syncIcon}>{"\u2191"}</span>
          <span class={styles.syncLabel}>Push</span>
        </button>
      </div>
    </header>
  );
};

export default Toolbar;
