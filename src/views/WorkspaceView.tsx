import { type Component, createSignal, createEffect, Show, For } from "solid-js";
import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronRight from "lucide-solid/icons/chevron-right";
import { Button } from "@/components/ui";
import SplitPane from "@/components/ui/SplitPane";
import type { FileStatus, FileStatusKind, DiffOutput, StashEntry, RepoOperationState } from "@/types";
import * as gitService from "@/services/git";
import styles from "./WorkspaceView.module.css";

/** 文件状态缩写映射 */
const STATUS_LABEL: Record<FileStatusKind, string> = {
  New: "N",
  Modified: "M",
  Deleted: "D",
  Renamed: "R",
  Typechange: "T",
  Conflicted: "C",
};

/** 文件状态 CSS 类映射 */
const STATUS_CLASS: Record<FileStatusKind, string> = {
  New: styles.new,
  Modified: styles.modified,
  Deleted: styles.deleted,
  Renamed: styles.renamed,
  Typechange: styles.modified,
  Conflicted: styles.conflicted,
};

export interface WorkspaceViewProps {
  files?: FileStatus[];
  repoState?: RepoOperationState;
  stashes?: StashEntry[];
  onRefresh?: () => void;
  onStageFiles?: (paths: string[]) => Promise<void>;
  onUnstageFiles?: (paths: string[]) => Promise<void>;
  onCommit?: (message: string, amend?: boolean) => Promise<string>;
  onDiscardChanges?: (paths: string[]) => Promise<void>;
  onDiscardAll?: () => Promise<void>;
  onUndoCommit?: (soft?: boolean) => Promise<void>;
  onStashSave?: (message?: string) => Promise<void>;
  onStashPop?: (index?: number) => Promise<void>;
  onStashApply?: (index?: number) => Promise<void>;
  onStashDrop?: (index?: number) => Promise<void>;
  onMergeAbort?: () => Promise<void>;
  onMergeContinue?: () => Promise<void>;
  onRebaseAbort?: () => Promise<void>;
  onRebaseContinue?: () => Promise<void>;
  onRebaseSkip?: () => Promise<void>;
}

const WorkspaceView: Component<WorkspaceViewProps> = (props) => {
  const [files, setFiles] = createSignal<FileStatus[]>([]);
  const [selectedFile, setSelectedFile] = createSignal<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = createSignal(false);
  const [commitMessage, setCommitMessage] = createSignal("");
  const [isCommitting, setIsCommitting] = createSignal(false);
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [amendMode, setAmendMode] = createSignal(false);
  const [diffData, setDiffData] = createSignal<DiffOutput | null>(null);
  const [stashesOpen, setStashesOpen] = createSignal(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = createSignal(false);
  const [discardTarget, setDiscardTarget] = createSignal<string[] | null>(null);

  // Sync files from props
  createEffect(() => {
    if (props.files) {
      setFiles(props.files);
    }
  });

  const stagedFiles = () => files().filter((f) => f.staged);
  const unstagedFiles = () => files().filter((f) => !f.staged);
  const repoState = () => props.repoState ?? "Normal";
  const stashes = () => props.stashes ?? [];
  const isInOperation = () => repoState() !== "Normal";

  const operationLabel = (): string => {
    switch (repoState()) {
      case "Merging": return "合并中";
      case "Rebasing": return "变基中";
      case "CherryPicking": return "Cherry-pick 中";
      case "Reverting": return "Revert 中";
      default: return "";
    }
  };

  // Load diff when file selection changes
  createEffect(async () => {
    const file = selectedFile();
    if (!file) {
      setDiffData(null);
      return;
    }
    try {
      const diff = await gitService.getDiff(file, selectedFileStaged());
      setDiffData(diff);
    } catch (err) {
      console.error("[WorkspaceView] 加载 diff 失败:", err);
      setDiffData(null);
    }
  });

  const handleCommit = async () => {
    const msg = commitMessage().trim();
    if (!msg) return;
    setIsCommitting(true);
    try {
      if (props.onCommit) {
        await props.onCommit(msg, amendMode());
      }
      setCommitMessage("");
      setAmendMode(false);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleAiGenerate = async () => {
    setIsGenerating(true);
    try {
      // TODO: 调用 AI service 生成 commit message
      console.log("[WorkspaceView] AI generate commit message");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStageAll = () => {
    const paths = unstagedFiles().map((f) => f.path);
    if (paths.length > 0) props.onStageFiles?.(paths);
  };

  const handleUnstageAll = () => {
    const paths = stagedFiles().map((f) => f.path);
    if (paths.length > 0) props.onUnstageFiles?.(paths);
  };

  const handleStageFile = (path: string) => {
    props.onStageFiles?.([path]);
  };

  const handleUnstageFile = (path: string) => {
    props.onUnstageFiles?.([path]);
  };

  const handleDiscardFile = (path: string) => {
    setDiscardTarget([path]);
    setShowDiscardConfirm(true);
  };

  const handleDiscardAll = () => {
    setDiscardTarget(null);
    setShowDiscardConfirm(true);
  };

  const confirmDiscard = async () => {
    const target = discardTarget();
    if (target) {
      await props.onDiscardChanges?.(target);
    } else {
      await props.onDiscardAll?.();
    }
    setShowDiscardConfirm(false);
    setDiscardTarget(null);
  };

  const handleSelectFile = (path: string, staged: boolean) => {
    setSelectedFile(path);
    setSelectedFileStaged(staged);
  };

  return (
    <div class={styles.workspace}>
      {/* 操作状态横幅 */}
      <Show when={isInOperation()}>
        <div style={{
          display: "flex",
          "align-items": "center",
          gap: "8px",
          padding: "8px 12px",
          "background-color": "var(--gs-warning-bg, #fef3cd)",
          "border-bottom": "1px solid var(--gs-warning-text, #856404)",
          "font-size": "13px",
        }}>
          <span style={{ "font-weight": "600" }}>{operationLabel()}</span>
          <span style={{ flex: "1" }}>请解决冲突后继续操作</span>
          <Show when={repoState() === "Merging"}>
            <Button variant="ghost" size="sm" onClick={() => props.onMergeAbort?.()}>
              中止合并
            </Button>
            <Button variant="primary" size="sm" onClick={() => props.onMergeContinue?.()}>
              继续合并
            </Button>
          </Show>
          <Show when={repoState() === "Rebasing"}>
            <Button variant="ghost" size="sm" onClick={() => props.onRebaseAbort?.()}>
              中止变基
            </Button>
            <Button variant="ghost" size="sm" onClick={() => props.onRebaseSkip?.()}>
              跳过
            </Button>
            <Button variant="primary" size="sm" onClick={() => props.onRebaseContinue?.()}>
              继续变基
            </Button>
          </Show>
          <Show when={repoState() === "CherryPicking" || repoState() === "Reverting"}>
            <Button variant="ghost" size="sm" onClick={() => {
              if (repoState() === "CherryPicking") {
                // cherry-pick abort via merge commands context
              }
            }}>
              中止
            </Button>
            <Button variant="primary" size="sm" onClick={() => props.onMergeContinue?.()}>
              继续
            </Button>
          </Show>
        </div>
      </Show>

      {/* 主内容区：左侧文件列表 + 右侧 Diff */}
      <div class={styles.content}>
        <SplitPane direction="horizontal" initialSizes={[30, 70]} minSize={200}>
          {/* 左侧：文件状态列表 */}
          <div class={styles.filePanel}>
            {/* 暂存区 */}
            <div class={styles.fileGroup}>
              <div class={styles.groupHeader}>
                <span class={styles.groupTitle}>
                  暂存区
                  <span class={styles.groupCount}>{stagedFiles().length}</span>
                </span>
                <Show when={stagedFiles().length > 0}>
                  <button class={styles.groupAction} onClick={handleUnstageAll}>
                    取消全部
                  </button>
                </Show>
              </div>
              <div class={styles.fileList}>
                <Show
                  when={stagedFiles().length > 0}
                  fallback={
                    <div class={styles.emptyState}>暂存区为空</div>
                  }
                >
                  <For each={stagedFiles()}>
                    {(file) => (
                      <div
                        class={`${styles.fileItem} ${selectedFile() === file.path && selectedFileStaged() ? styles.selected : ""}`}
                        style={{ display: "flex", "align-items": "center" }}
                      >
                        <button
                          style={{ flex: "1", display: "flex", "align-items": "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: "inherit", "text-align": "left", padding: "0" }}
                          onClick={() => handleSelectFile(file.path, true)}
                        >
                          <span class={`${styles.fileStatusBadge} ${STATUS_CLASS[file.status]}`}>
                            {STATUS_LABEL[file.status]}
                          </span>
                          <span class={styles.fileName}>{file.path}</span>
                        </button>
                        <button
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gs-text-muted)", "font-size": "12px", padding: "2px 4px", "border-radius": "3px" }}
                          onClick={() => handleUnstageFile(file.path)}
                          title="取消暂存"
                        >{"\u2212"}</button>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </div>

            {/* 未暂存区 */}
            <div class={styles.fileGroup}>
              <div class={styles.groupHeader}>
                <span class={styles.groupTitle}>
                  未暂存
                  <span class={styles.groupCount}>{unstagedFiles().length}</span>
                </span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <Show when={unstagedFiles().length > 0}>
                    <button class={styles.groupAction} onClick={handleDiscardAll}>
                      丢弃全部
                    </button>
                    <button class={styles.groupAction} onClick={handleStageAll}>
                      暂存全部
                    </button>
                  </Show>
                </div>
              </div>
              <div class={styles.fileList}>
                <Show
                  when={unstagedFiles().length > 0}
                  fallback={
                    <div class={styles.emptyState}>没有文件变更</div>
                  }
                >
                  <For each={unstagedFiles()}>
                    {(file) => (
                      <div
                        class={`${styles.fileItem} ${selectedFile() === file.path && !selectedFileStaged() ? styles.selected : ""}`}
                        style={{ display: "flex", "align-items": "center" }}
                      >
                        <button
                          style={{ flex: "1", display: "flex", "align-items": "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: "inherit", "text-align": "left", padding: "0" }}
                          onClick={() => handleSelectFile(file.path, false)}
                        >
                          <span class={`${styles.fileStatusBadge} ${STATUS_CLASS[file.status]}`}>
                            {STATUS_LABEL[file.status]}
                          </span>
                          <span class={styles.fileName}>{file.path}</span>
                        </button>
                        <button
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gs-text-muted)", "font-size": "12px", padding: "2px 4px", "border-radius": "3px" }}
                          onClick={() => handleDiscardFile(file.path)}
                          title="丢弃变更"
                        >{"\u2715"}</button>
                        <button
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gs-text-muted)", "font-size": "12px", padding: "2px 4px", "border-radius": "3px" }}
                          onClick={() => handleStageFile(file.path)}
                          title="暂存"
                        >{"\u002B"}</button>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </div>

            {/* Stash 折叠面板 */}
            <div class={styles.fileGroup}>
              <div class={styles.groupHeader}>
                <button
                  style={{ display: "flex", "align-items": "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
                  onClick={() => setStashesOpen(!stashesOpen())}
                >
                  {stashesOpen() ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <span class={styles.groupTitle}>
                    Stash
                    <span class={styles.groupCount}>{stashes().length}</span>
                  </span>
                </button>
                <button
                  class={styles.groupAction}
                  onClick={() => props.onStashSave?.()}
                >
                  储藏
                </button>
              </div>
              <Show when={stashesOpen() && stashes().length > 0}>
                <div class={styles.fileList}>
                  <For each={stashes()}>
                    {(stash) => (
                      <div class={styles.fileItem} style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                        <span style={{ flex: "1", "font-size": "13px", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                          {stash.message || `stash@{${stash.index}}`}
                        </span>
                        <button
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gs-text-muted)", "font-size": "11px", padding: "2px 6px" }}
                          onClick={() => props.onStashApply?.(stash.index)}
                          title="应用"
                        >应用</button>
                        <button
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gs-text-muted)", "font-size": "11px", padding: "2px 6px" }}
                          onClick={() => props.onStashPop?.(stash.index)}
                          title="弹出"
                        >弹出</button>
                        <button
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gs-error-text, #dc3545)", "font-size": "11px", padding: "2px 6px" }}
                          onClick={() => props.onStashDrop?.(stash.index)}
                          title="删除"
                        >{"\u2715"}</button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>

          {/* 右侧：Diff 面板 */}
          <div class={styles.diffPanel}>
            <Show
              when={selectedFile()}
              fallback={
                <div class={styles.diffPlaceholder}>
                  选择一个文件以查看差异
                </div>
              }
            >
              <div class={styles.diffHeader}>{selectedFile()}</div>
              <div class={styles.diffContent}>
                <Show
                  when={diffData()}
                  fallback={<p style={{ color: "var(--gs-text-muted)" }}>加载 Diff...</p>}
                >
                  {(diff) => (
                    <For each={diff().files}>
                      {(file) => (
                        <div>
                          <For each={file.hunks}>
                            {(hunk) => (
                              <div style={{ "margin-bottom": "8px" }}>
                                <div style={{
                                  padding: "4px 12px",
                                  "background-color": "var(--gs-bg-tertiary, #f0f0f0)",
                                  "font-family": "monospace",
                                  "font-size": "12px",
                                  color: "var(--gs-text-muted)",
                                }}>
                                  {hunk.header}
                                </div>
                                <For each={hunk.lines}>
                                  {(line) => (
                                    <div style={{
                                      padding: "0 12px",
                                      "font-family": "monospace",
                                      "font-size": "12px",
                                      "line-height": "1.6",
                                      "white-space": "pre-wrap",
                                      "background-color":
                                        line.origin === "Addition" ? "var(--gs-diff-added-bg, #e6ffec)" :
                                        line.origin === "Deletion" ? "var(--gs-diff-deleted-bg, #ffebe9)" :
                                        "transparent",
                                      color:
                                        line.origin === "Addition" ? "var(--gs-diff-added-text, #1a7f37)" :
                                        line.origin === "Deletion" ? "var(--gs-diff-deleted-text, #cf222e)" :
                                        "var(--gs-text-primary)",
                                    }}>
                                      <span style={{ display: "inline-block", width: "40px", "text-align": "right", "margin-right": "8px", color: "var(--gs-text-muted)", "user-select": "none" }}>
                                        {line.old_lineno ?? ""}
                                      </span>
                                      <span style={{ display: "inline-block", width: "40px", "text-align": "right", "margin-right": "8px", color: "var(--gs-text-muted)", "user-select": "none" }}>
                                        {line.new_lineno ?? ""}
                                      </span>
                                      <span>
                                        {line.origin === "Addition" ? "+" : line.origin === "Deletion" ? "-" : " "}
                                        {line.content}
                                      </span>
                                    </div>
                                  )}
                                </For>
                              </div>
                            )}
                          </For>
                        </div>
                      )}
                    </For>
                  )}
                </Show>
              </div>
            </Show>
          </div>
        </SplitPane>
      </div>

      {/* 底部：提交区域 */}
      <div class={styles.commitArea}>
        <textarea
          class={styles.commitInput}
          placeholder="输入提交信息..."
          value={commitMessage()}
          onInput={(e) => setCommitMessage(e.currentTarget.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleCommit();
            }
          }}
        />
        <div class={styles.commitActions}>
          <label style={{ display: "flex", "align-items": "center", gap: "4px", "font-size": "12px", color: "var(--gs-text-secondary)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={amendMode()}
              onChange={(e) => setAmendMode(e.currentTarget.checked)}
            />
            修订上次提交
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => props.onUndoCommit?.(true)}
          >
            撤销提交
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAiGenerate}
            loading={isGenerating()}
            disabled={isGenerating()}
          >
            AI 生成
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCommit}
            loading={isCommitting()}
            disabled={!commitMessage().trim() || isCommitting()}
          >
            {amendMode() ? "修订提交" : "提交"}
          </Button>
        </div>
      </div>

      {/* 丢弃确认对话框 */}
      <Show when={showDiscardConfirm()}>
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
            "min-width": "300px",
          }}>
            <h3 style={{ margin: "0 0 12px", "font-size": "14px" }}>确认丢弃</h3>
            <p style={{ margin: "0 0 16px", "font-size": "13px", color: "var(--gs-text-secondary)" }}>
              {discardTarget() ? `确定要丢弃 ${discardTarget()!.join(", ")} 的变更吗？` : "确定要丢弃所有未暂存的变更吗？"}
              此操作不可撤销。
            </p>
            <div style={{ display: "flex", gap: "8px", "justify-content": "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setShowDiscardConfirm(false)}>
                取消
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDiscard}>
                丢弃
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default WorkspaceView;
