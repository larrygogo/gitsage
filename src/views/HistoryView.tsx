import { type Component, createSignal, createEffect, Show, For, onMount } from "solid-js";
import History from "lucide-solid/icons/history";
import { Button } from "@/components/ui";
import type { CommitInfo, DiffOutput } from "@/types";
import * as gitService from "@/services/git";
import styles from "./HistoryView.module.css";

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

function shortHash(id: string): string {
  return id.slice(0, 7);
}

export interface HistoryViewProps {
  onCherryPick?: (commitId: string) => Promise<void>;
  onRevert?: (commitId: string) => Promise<void>;
  onResetToCommit?: (commitId: string, mode: string) => Promise<void>;
}

const HistoryView: Component<HistoryViewProps> = (props) => {
  const [commits, setCommits] = createSignal<CommitInfo[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedCommit, setSelectedCommit] = createSignal<CommitInfo | null>(null);
  const [commitDiff, setCommitDiff] = createSignal<DiffOutput | null>(null);
  const [showResetDialog, setShowResetDialog] = createSignal(false);
  const [resetTargetId, setResetTargetId] = createSignal("");
  const [resetMode, setResetMode] = createSignal("mixed");
  const [contextMenu, setContextMenu] = createSignal<{ x: number; y: number; commit: CommitInfo } | null>(null);

  const loadCommits = async () => {
    setLoading(true);
    try {
      const log = await gitService.getCommitLog(200);
      setCommits(log);
    } catch (err) {
      console.error("[HistoryView] 加载提交历史失败:", err);
      setCommits([]);
    } finally {
      setLoading(false);
    }
  };

  onMount(loadCommits);

  const handleSearch = async () => {
    const query = searchQuery().trim();
    if (!query) {
      await loadCommits();
      return;
    }
    setLoading(true);
    try {
      const results = await gitService.searchCommits(query, 200);
      setCommits(results);
    } catch (err) {
      console.error("[HistoryView] 搜索失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCommit = async (commit: CommitInfo) => {
    setSelectedCommit(commit);
    try {
      const diff = await gitService.getCommitDiff(commit.id);
      setCommitDiff(diff);
    } catch (err) {
      console.error("[HistoryView] 加载提交 diff 失败:", err);
      setCommitDiff(null);
    }
  };

  const handleContextMenu = (e: MouseEvent, commit: CommitInfo) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, commit });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleResetOpen = (commitId: string) => {
    setResetTargetId(commitId);
    setShowResetDialog(true);
    closeContextMenu();
  };

  const handleResetConfirm = async () => {
    await props.onResetToCommit?.(resetTargetId(), resetMode());
    setShowResetDialog(false);
    await loadCommits();
  };

  return (
    <div class={styles.history} onClick={closeContextMenu}>
      {/* 顶部标题栏 */}
      <div class={styles.header}>
        <span class={styles.title}>提交历史</span>
        <Show when={!loading()}>
          <span class={styles.commitCount}>{commits().length} 条提交</span>
        </Show>
      </div>

      {/* 搜索栏 */}
      <div style={{
        display: "flex",
        gap: "8px",
        padding: "8px 16px",
        "border-bottom": "1px solid var(--gs-border-secondary)",
      }}>
        <input
          style={{
            flex: "1",
            height: "30px",
            padding: "0 10px",
            "background-color": "var(--gs-bg-primary)",
            border: "1px solid var(--gs-border-primary)",
            "border-radius": "4px",
            color: "var(--gs-text-primary)",
            "font-size": "13px",
            outline: "none",
          }}
          placeholder="搜索提交信息..."
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <Button variant="ghost" size="sm" onClick={handleSearch}>搜索</Button>
      </div>

      {/* 内容区 */}
      <Show when={!loading()} fallback={<div class={styles.loading}>加载中...</div>}>
        <Show
          when={commits().length > 0}
          fallback={
            <div class={styles.emptyState}>
              <span class={styles.emptyIcon}><History size={36} /></span>
              <span class={styles.emptyText}>暂无提交记录</span>
            </div>
          }
        >
          <div style={{ display: "flex", flex: "1", overflow: "hidden" }}>
            {/* 提交列表 */}
            <div class={styles.commitList} style={{ flex: selectedCommit() ? "0 0 50%" : "1" }}>
              <For each={commits()}>
                {(commit) => (
                  <div
                    class={styles.commitItem}
                    style={{
                      "background-color": selectedCommit()?.id === commit.id ? "var(--gs-accent-subtle)" : undefined,
                    }}
                    onClick={() => handleSelectCommit(commit)}
                    onContextMenu={(e) => handleContextMenu(e, commit)}
                  >
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

            {/* 提交详情侧面板 */}
            <Show when={selectedCommit()}>
              {(commit) => (
                <div style={{
                  flex: "0 0 50%",
                  "border-left": "1px solid var(--gs-border-secondary)",
                  overflow: "auto",
                  padding: "12px 16px",
                }}>
                  <div style={{ display: "flex", "justify-content": "space-between", "margin-bottom": "12px" }}>
                    <span style={{ "font-weight": "600", "font-size": "14px" }}>提交详情</span>
                    <button
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gs-text-muted)" }}
                      onClick={() => { setSelectedCommit(null); setCommitDiff(null); }}
                    >{"\u2715"}</button>
                  </div>
                  <div style={{ "font-size": "12px", "margin-bottom": "8px" }}>
                    <div><strong>Hash:</strong> <code>{commit().id}</code></div>
                    <div><strong>作者:</strong> {commit().author_name} &lt;{commit().author_email}&gt;</div>
                    <div><strong>日期:</strong> {new Date(commit().timestamp * 1000).toLocaleString("zh-CN")}</div>
                  </div>
                  <pre style={{
                    "font-size": "13px",
                    "white-space": "pre-wrap",
                    "margin-bottom": "12px",
                    padding: "8px",
                    "background-color": "var(--gs-bg-secondary)",
                    "border-radius": "4px",
                  }}>
                    {commit().message}
                  </pre>
                  <Show when={commitDiff()}>
                    {(diff) => (
                      <div>
                        <div style={{ "font-size": "12px", color: "var(--gs-text-muted)", "margin-bottom": "8px" }}>
                          {diff().stats.files_changed} 个文件更改, +{diff().stats.insertions} -{diff().stats.deletions}
                        </div>
                        <For each={diff().files}>
                          {(file) => (
                            <div style={{ "margin-bottom": "8px" }}>
                              <div style={{ "font-size": "12px", "font-weight": "500", "margin-bottom": "4px" }}>
                                {file.new_path ?? file.old_path}
                              </div>
                              <For each={file.hunks}>
                                {(hunk) => (
                                  <div style={{ "font-family": "monospace", "font-size": "11px" }}>
                                    <div style={{ color: "var(--gs-text-muted)", "background-color": "var(--gs-bg-tertiary)", padding: "2px 8px" }}>
                                      {hunk.header}
                                    </div>
                                    <For each={hunk.lines}>
                                      {(line) => (
                                        <div style={{
                                          padding: "0 8px",
                                          "white-space": "pre-wrap",
                                          "background-color":
                                            line.origin === "Addition" ? "var(--gs-diff-added-bg, #e6ffec)" :
                                            line.origin === "Deletion" ? "var(--gs-diff-deleted-bg, #ffebe9)" :
                                            "transparent",
                                        }}>
                                          {line.origin === "Addition" ? "+" : line.origin === "Deletion" ? "-" : " "}{line.content}
                                        </div>
                                      )}
                                    </For>
                                  </div>
                                )}
                              </For>
                            </div>
                          )}
                        </For>
                      </div>
                    )}
                  </Show>
                </div>
              )}
            </Show>
          </div>
        </Show>
      </Show>

      {/* 右键菜单 */}
      <Show when={contextMenu()}>
        {(menu) => (
          <div
            style={{
              position: "fixed",
              left: `${menu().x}px`,
              top: `${menu().y}px`,
              "background-color": "var(--gs-bg-primary, #fff)",
              border: "1px solid var(--gs-border-primary)",
              "border-radius": "6px",
              "box-shadow": "0 4px 12px rgba(0,0,0,0.15)",
              "z-index": "1000",
              "min-width": "160px",
              padding: "4px 0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{ display: "block", width: "100%", padding: "6px 16px", background: "none", border: "none", cursor: "pointer", "font-size": "13px", "text-align": "left", color: "var(--gs-text-primary)" }}
              onClick={() => { props.onCherryPick?.(menu().commit.id); closeContextMenu(); }}
            >Cherry-pick</button>
            <button
              style={{ display: "block", width: "100%", padding: "6px 16px", background: "none", border: "none", cursor: "pointer", "font-size": "13px", "text-align": "left", color: "var(--gs-text-primary)" }}
              onClick={() => { props.onRevert?.(menu().commit.id); closeContextMenu(); }}
            >Revert</button>
            <div style={{ height: "1px", "background-color": "var(--gs-border-secondary)", margin: "4px 0" }} />
            <button
              style={{ display: "block", width: "100%", padding: "6px 16px", background: "none", border: "none", cursor: "pointer", "font-size": "13px", "text-align": "left", color: "var(--gs-error-text, #dc3545)" }}
              onClick={() => handleResetOpen(menu().commit.id)}
            >重置到此提交...</button>
          </div>
        )}
      </Show>

      {/* Reset 对话框 */}
      <Show when={showResetDialog()}>
        <div style={{
          position: "fixed",
          inset: "0",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "background-color": "rgba(0,0,0,0.5)",
          "z-index": "1000",
        }}>
          <div style={{
            padding: "20px",
            "background-color": "var(--gs-bg-primary, #fff)",
            "border-radius": "8px",
            "box-shadow": "0 4px 12px rgba(0,0,0,0.2)",
            "min-width": "320px",
          }}>
            <h3 style={{ margin: "0 0 12px", "font-size": "14px" }}>重置到提交</h3>
            <p style={{ margin: "0 0 8px", "font-size": "12px", color: "var(--gs-text-muted)" }}>
              目标: {shortHash(resetTargetId())}
            </p>
            <div style={{ display: "flex", "flex-direction": "column", gap: "8px", "margin-bottom": "16px" }}>
              <label style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "13px", cursor: "pointer" }}>
                <input type="radio" name="resetMode" value="soft" checked={resetMode() === "soft"} onChange={() => setResetMode("soft")} />
                Soft - 保留暂存区和工作区
              </label>
              <label style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "13px", cursor: "pointer" }}>
                <input type="radio" name="resetMode" value="mixed" checked={resetMode() === "mixed"} onChange={() => setResetMode("mixed")} />
                Mixed - 保留工作区，清空暂存区
              </label>
              <label style={{ display: "flex", "align-items": "center", gap: "8px", "font-size": "13px", cursor: "pointer" }}>
                <input type="radio" name="resetMode" value="hard" checked={resetMode() === "hard"} onChange={() => setResetMode("hard")} />
                Hard - 丢弃所有变更（不可恢复）
              </label>
            </div>
            <div style={{ display: "flex", gap: "8px", "justify-content": "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setShowResetDialog(false)}>取消</Button>
              <Button variant="danger" size="sm" onClick={handleResetConfirm}>重置</Button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default HistoryView;
