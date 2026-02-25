import { type Component, Show } from "solid-js";
import GitBranch from "lucide-solid/icons/git-branch";
import ArrowUp from "lucide-solid/icons/arrow-up";
import ArrowDown from "lucide-solid/icons/arrow-down";
import Check from "lucide-solid/icons/check";
import type { RepoOperationState } from "@/types";
import styles from "./StatusBar.module.css";

export type AiStatus = "ready" | "busy" | "error" | "offline";

export interface StatusBarProps {
  branchName?: string;
  ahead?: number;
  behind?: number;
  dirtyCount?: number;
  repoState?: RepoOperationState;
  aiStatus?: AiStatus;
  aiStatusText?: string;
  onBranchClick?: () => void;
  onSyncClick?: () => void;
}

const aiStatusLabels: Record<AiStatus, string> = {
  ready: "AI \u5C31\u7EEA",
  busy: "AI \u5904\u7406\u4E2D\u2026",
  error: "AI \u9519\u8BEF",
  offline: "AI \u79BB\u7EBF",
};

const operationLabels: Record<string, string> = {
  Merging: "\u5408\u5E76\u4E2D",
  Rebasing: "\u53D8\u57FA\u4E2D",
  CherryPicking: "Cherry-pick \u4E2D",
  Reverting: "Revert \u4E2D",
};

const StatusBar: Component<StatusBarProps> = (props) => {
  const branchName = () => props.branchName ?? "\u672A\u6253\u5F00\u4ED3\u5E93";
  const ahead = () => props.ahead ?? 0;
  const behind = () => props.behind ?? 0;
  const dirtyCount = () => props.dirtyCount ?? 0;
  const repoState = () => props.repoState ?? "Normal";
  const aiStatus = () => props.aiStatus ?? "offline";
  const aiLabel = () => props.aiStatusText ?? aiStatusLabels[aiStatus()];

  return (
    <footer class={styles.statusBar}>
      {/* Branch name - clickable */}
      <div
        class={styles.branchInfo}
        style={{ cursor: props.onBranchClick ? "pointer" : "default" }}
        onClick={props.onBranchClick}
        title="点击切换分支"
      >
        <span class={styles.branchIcon}><GitBranch size={12} /></span>
        <span class={styles.branchName}>{branchName()}</span>
      </div>

      {/* Operation state indicator */}
      <Show when={repoState() !== "Normal"}>
        <span style={{
          padding: "0 6px",
          "background-color": "var(--gs-warning-bg, #fef3cd)",
          color: "var(--gs-warning-text, #856404)",
          "border-radius": "3px",
          "font-size": "10px",
          "font-weight": "600",
        }}>
          {operationLabels[repoState()] ?? repoState()}
        </span>
      </Show>

      {/* Dirty file count */}
      <Show when={dirtyCount() > 0}>
        <span style={{
          display: "inline-flex",
          "align-items": "center",
          gap: "2px",
          color: "var(--gs-text-secondary)",
        }}>
          <span style={{ "font-size": "10px" }}>{"\u25CF"}</span>
          <span>{dirtyCount()} 个变更</span>
        </span>
      </Show>

      {/* Sync status - clickable */}
      <div
        class={styles.syncStatus}
        style={{ cursor: props.onSyncClick ? "pointer" : "default" }}
        onClick={props.onSyncClick}
        title="点击同步"
      >
        <Show when={ahead() > 0}>
          <span class={`${styles.syncIndicator} ${styles.ahead}`}>
            <span class={styles.syncArrow}><ArrowUp size={10} /></span>
            <span class={styles.syncCount}>{ahead()}</span>
          </span>
        </Show>
        <Show when={behind() > 0}>
          <span class={`${styles.syncIndicator} ${styles.behind}`}>
            <span class={styles.syncArrow}><ArrowDown size={10} /></span>
            <span class={styles.syncCount}>{behind()}</span>
          </span>
        </Show>
        <Show when={ahead() === 0 && behind() === 0}>
          <span style={{ display: "inline-flex", "align-items": "center", gap: "4px" }}><Check size={10} /> 已同步</span>
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
