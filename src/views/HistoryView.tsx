import { type Component, createSignal, Show, For, onMount } from "solid-js";
import type { CommitInfo } from "@/types";
import styles from "./HistoryView.module.css";

/**
 * 将 Unix 时间戳格式化为相对时间或日期字符串
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return "刚刚";
}

/**
 * 截取 commit hash 前 7 位
 */
function shortHash(id: string): string {
  return id.slice(0, 7);
}

const HistoryView: Component = () => {
  const [commits, setCommits] = createSignal<CommitInfo[]>([]);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      // TODO: 从 store 或 service 获取提交历史
      // const log = await gitService.getCommitLog();
      // setCommits(log);
      setCommits([]);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class={styles.history}>
      {/* 顶部标题栏 */}
      <div class={styles.header}>
        <span class={styles.title}>提交历史</span>
        <Show when={!loading()}>
          <span class={styles.commitCount}>{commits().length} 条提交</span>
        </Show>
      </div>

      {/* 内容区 */}
      <Show when={!loading()} fallback={<div class={styles.loading}>加载中...</div>}>
        <Show
          when={commits().length > 0}
          fallback={
            <div class={styles.emptyState}>
              <span class={styles.emptyIcon}>{"\u29D6"}</span>
              <span class={styles.emptyText}>暂无提交记录</span>
            </div>
          }
        >
          <div class={styles.commitList}>
            <For each={commits()}>
              {(commit) => (
                <div class={styles.commitItem}>
                  <div class={styles.commitTopRow}>
                    <span class={styles.commitHash}>{shortHash(commit.id)}</span>
                    <span class={styles.commitSummary}>{commit.summary}</span>
                  </div>
                  <div class={styles.commitBottomRow}>
                    <span class={styles.commitAuthor}>{commit.author_name}</span>
                    <span class={styles.commitTime}>{formatTime(commit.timestamp)}</span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
};

export default HistoryView;
