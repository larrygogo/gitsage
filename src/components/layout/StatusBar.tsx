import { type Component, Show } from "solid-js";
import styles from "./StatusBar.module.css";

export type AiStatus = "ready" | "busy" | "error" | "offline";

export interface StatusBarProps {
  branchName?: string;
  ahead?: number;
  behind?: number;
  aiStatus?: AiStatus;
  aiStatusText?: string;
}

const aiStatusLabels: Record<AiStatus, string> = {
  ready: "AI \u5C31\u7EEA",
  busy: "AI \u5904\u7406\u4E2D\u2026",
  error: "AI \u9519\u8BEF",
  offline: "AI \u79BB\u7EBF",
};

const StatusBar: Component<StatusBarProps> = (props) => {
  const branchName = () => props.branchName ?? "main";
  const ahead = () => props.ahead ?? 0;
  const behind = () => props.behind ?? 0;
  const aiStatus = () => props.aiStatus ?? "offline";
  const aiLabel = () => props.aiStatusText ?? aiStatusLabels[aiStatus()];

  return (
    <footer class={styles.statusBar}>
      {/* Branch name */}
      <div class={styles.branchInfo}>
        <span class={styles.branchIcon}>{"\u2442"}</span>
        <span class={styles.branchName}>{branchName()}</span>
      </div>

      {/* Sync status */}
      <div class={styles.syncStatus}>
        <Show when={ahead() > 0}>
          <span class={`${styles.syncIndicator} ${styles.ahead}`}>
            <span class={styles.syncArrow}>{"\u2191"}</span>
            <span class={styles.syncCount}>{ahead()}</span>
          </span>
        </Show>
        <Show when={behind() > 0}>
          <span class={`${styles.syncIndicator} ${styles.behind}`}>
            <span class={styles.syncArrow}>{"\u2193"}</span>
            <span class={styles.syncCount}>{behind()}</span>
          </span>
        </Show>
        <Show when={ahead() === 0 && behind() === 0}>
          <span>{"\u2713 \u5DF2\u540C\u6B65"}</span>
        </Show>
      </div>

      <div class={styles.spacer} />

      {/* AI status */}
      <div class={styles.aiStatus}>
        <span
          class={`${styles.aiDot} ${styles[aiStatus()]}`}
        />
        <span class={styles.aiLabel}>{aiLabel()}</span>
      </div>
    </footer>
  );
};

export default StatusBar;
