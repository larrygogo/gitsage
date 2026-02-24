import { type Component, createSignal, Show, For } from "solid-js";
import { Button } from "@/components/ui";
import SplitPane from "@/components/ui/SplitPane";
import type { FileStatus, FileStatusKind } from "@/types";
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

// TODO: 接入真实的 store 数据，当前使用模拟数据演示结构
const mockFiles: FileStatus[] = [];

const WorkspaceView: Component = () => {
  const [files] = createSignal<FileStatus[]>(mockFiles);
  const [selectedFile, setSelectedFile] = createSignal<string | null>(null);
  const [commitMessage, setCommitMessage] = createSignal("");
  const [isCommitting, setIsCommitting] = createSignal(false);
  const [isGenerating, setIsGenerating] = createSignal(false);

  const stagedFiles = () => files().filter((f) => f.staged);
  const unstagedFiles = () => files().filter((f) => !f.staged);

  const handleCommit = async () => {
    const msg = commitMessage().trim();
    if (!msg) return;
    setIsCommitting(true);
    try {
      // TODO: 调用 git service 提交
      console.log("[WorkspaceView] commit:", msg);
      setCommitMessage("");
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
    // TODO: 调用 git service 暂存全部
    console.log("[WorkspaceView] stage all");
  };

  const handleUnstageAll = () => {
    // TODO: 调用 git service 取消全部暂存
    console.log("[WorkspaceView] unstage all");
  };

  return (
    <div class={styles.workspace}>
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
                      <button
                        class={`${styles.fileItem} ${selectedFile() === file.path ? styles.selected : ""}`}
                        onClick={() => setSelectedFile(file.path)}
                      >
                        <span class={`${styles.fileStatusBadge} ${STATUS_CLASS[file.status]}`}>
                          {STATUS_LABEL[file.status]}
                        </span>
                        <span class={styles.fileName}>{file.path}</span>
                      </button>
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
                <Show when={unstagedFiles().length > 0}>
                  <button class={styles.groupAction} onClick={handleStageAll}>
                    暂存全部
                  </button>
                </Show>
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
                      <button
                        class={`${styles.fileItem} ${selectedFile() === file.path ? styles.selected : ""}`}
                        onClick={() => setSelectedFile(file.path)}
                      >
                        <span class={`${styles.fileStatusBadge} ${STATUS_CLASS[file.status]}`}>
                          {STATUS_LABEL[file.status]}
                        </span>
                        <span class={styles.fileName}>{file.path}</span>
                      </button>
                    )}
                  </For>
                </Show>
              </div>
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
                {/* TODO: 渲染真实的 Diff 内容 */}
                <p style={{ color: "var(--gs-text-muted)" }}>
                  Diff 内容将在此处显示...
                </p>
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
            提交
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceView;
