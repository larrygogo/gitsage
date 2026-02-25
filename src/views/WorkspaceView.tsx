import { type Component, createSignal, createEffect, createMemo, Show, For } from "solid-js";
import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronRight from "lucide-solid/icons/chevron-right";
import ListIcon from "lucide-solid/icons/list";
import FolderTree from "lucide-solid/icons/folder-tree";
import FolderIcon from "lucide-solid/icons/folder";
import FolderOpenIcon from "lucide-solid/icons/folder-open";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import Check from "lucide-solid/icons/check";
import Plus from "lucide-solid/icons/plus";
import Minus from "lucide-solid/icons/minus";
import X from "lucide-solid/icons/x";
import { Button } from "@/components/ui";
import SplitPane from "@/components/ui/SplitPane";
import { useI18n } from "@/i18n";
import type { FileStatus, FileStatusKind, DiffOutput, StashEntry, RepoOperationState } from "@/types";
import * as gitService from "@/services/git";
import styles from "./WorkspaceView.module.css";

/* ── 树形视图数据结构 ── */

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  file?: FileStatus;
  children: TreeNode[];
}

function buildFileTree(files: FileStatus[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");

      if (isFile) {
        current.push({ name, path, type: "file", file, children: [] });
      } else {
        let folder = current.find((n) => n.type === "folder" && n.name === name);
        if (!folder) {
          folder = { name, path, type: "folder", children: [] };
          current.push(folder);
        }
        current = folder.children;
      }
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.type === "folder") sortNodes(node.children);
    }
  };
  sortNodes(root);
  return root;
}

function countFiles(node: TreeNode): number {
  if (node.type === "file") return 1;
  return node.children.reduce((sum, child) => sum + countFiles(child), 0);
}

function collectFilePaths(node: TreeNode): string[] {
  if (node.type === "file") return [node.path];
  return node.children.flatMap(collectFilePaths);
}

/** 文件状态缩写映射 */
const STATUS_LABEL: Record<FileStatusKind, string> = {
  New: "A",
  Modified: "M",
  Deleted: "D",
  Renamed: "R",
  Typechange: "T",
  Conflicted: "C",
};

/** 文件状态 → 圆点 CSS 类 */
const DOT_CLASS: Record<FileStatusKind, string> = {
  New: styles.dotNew,
  Modified: styles.dotModified,
  Deleted: styles.dotDeleted,
  Renamed: styles.dotRenamed,
  Typechange: styles.dotModified,
  Conflicted: styles.dotConflicted,
};

/** 文件状态 → 标签 CSS 类 */
const STATUS_LABEL_CLASS: Record<FileStatusKind, string> = {
  New: styles.statusN,
  Modified: styles.statusM,
  Deleted: styles.statusD,
  Renamed: styles.statusR,
  Typechange: styles.statusM,
  Conflicted: styles.statusC,
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
  const { t } = useI18n();
  const [files, setFiles] = createSignal<FileStatus[]>([]);
  const [selectedFile, setSelectedFile] = createSignal<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = createSignal(false);
  const [commitMessage, setCommitMessage] = createSignal("");
  const [isCommitting, setIsCommitting] = createSignal(false);
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [amendMode, setAmendMode] = createSignal(false);
  const [diffData, setDiffData] = createSignal<DiffOutput | null>(null);
  const [stagedOpen, setStagedOpen] = createSignal(true);
  const [unstagedOpen, setUnstagedOpen] = createSignal(true);
  const [stashesOpen, setStashesOpen] = createSignal(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = createSignal(false);
  const [discardTarget, setDiscardTarget] = createSignal<string[] | null>(null);
  const [viewMode, setViewMode] = createSignal<"list" | "tree">("list");
  const [expandedDirs, setExpandedDirs] = createSignal<Set<string>>(new Set());
  const [showCommitPanel, setShowCommitPanel] = createSignal(false);

  // Sync files from props
  createEffect(() => {
    if (props.files) {
      setFiles(props.files);
    }
  });

  const stagedFiles = () => files().filter((f) => f.staged);
  const unstagedFiles = () => files().filter((f) => !f.staged);
  const totalChanges = () => files().length;
  const repoState = () => props.repoState ?? "Normal";
  const stashes = () => props.stashes ?? [];
  const isInOperation = () => repoState() !== "Normal";

  const stagedTree = createMemo(() => buildFileTree(stagedFiles()));
  const unstagedTree = createMemo(() => buildFileTree(unstagedFiles()));

  // Diff stats
  const diffStats = createMemo(() => {
    const diff = diffData();
    if (!diff) return { added: 0, deleted: 0 };
    let added = 0;
    let deleted = 0;
    for (const file of diff.files) {
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.origin === "Addition") added++;
          else if (line.origin === "Deletion") deleted++;
        }
      }
    }
    return { added, deleted };
  });

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleViewMode = () => {
    setViewMode((m) => (m === "list" ? "tree" : "list"));
  };

  const operationLabel = (): string => {
    switch (repoState()) {
      case "Merging": return t("workspace.operation.merging");
      case "Rebasing": return t("workspace.operation.rebasing");
      case "CherryPicking": return t("workspace.operation.cherryPicking");
      case "Reverting": return t("workspace.operation.reverting");
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
      setShowCommitPanel(false);
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

  /** 渲染单个文件项 */
  const renderFileItem = (file: FileStatus, isStaged: boolean, indent = 0) => (
    <div
      class={`${styles.fileItem} ${selectedFile() === file.path && selectedFileStaged() === isStaged ? styles.selected : ""}`}
      style={{ "padding-left": `${12 + indent * 16}px` }}
    >
      <button
        style={{ flex: "1", display: "flex", "align-items": "center", gap: "10px", background: "none", border: "none", cursor: "pointer", color: "inherit", "text-align": "left", padding: "0", overflow: "hidden" }}
        onClick={() => handleSelectFile(file.path, isStaged)}
      >
        <span class={`${styles.fileDot} ${DOT_CLASS[file.status]}`} />
        <span class={styles.fileName}>{file.path}</span>
      </button>
      <div class={styles.fileItemRight}>
        <div class={styles.fileItemActions}>
          {isStaged ? (
            <button
              class={styles.fileItemActionBtn}
              onClick={() => handleUnstageFile(file.path)}
              title={t("workspace.unstage")}
            ><Minus size={12} /></button>
          ) : (
            <>
              <button
                class={styles.fileItemActionBtn}
                onClick={() => handleDiscardFile(file.path)}
                title={t("workspace.discard")}
              ><X size={12} /></button>
              <button
                class={styles.fileItemActionBtn}
                onClick={() => handleStageFile(file.path)}
                title={t("workspace.stage")}
              ><Plus size={12} /></button>
            </>
          )}
        </div>
        <span class={`${styles.fileStatusLabel} ${STATUS_LABEL_CLASS[file.status]}`}>
          {STATUS_LABEL[file.status]}
        </span>
      </div>
    </div>
  );

  const renderTreeNodes = (nodes: TreeNode[], depth: number, isStaged: boolean) => (
    <For each={nodes}>
      {(node) => {
        const expanded = () => expandedDirs().has(node.path);
        return (
          <>
            {node.type === "folder" ? (
              <div
                class={`${styles.fileItem} ${styles.treeFolder}`}
                style={{ "padding-left": `${12 + depth * 16}px` }}
                onClick={() => toggleDir(node.path)}
              >
                <span class={styles.treeFolderChevron}>
                  {expanded() ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
                <span class={styles.treeFolderIcon}>
                  {expanded() ? <FolderOpenIcon size={14} /> : <FolderIcon size={14} />}
                </span>
                <span class={styles.fileName}>{node.name}</span>
                <span class={`${styles.fileStatusLabel} ${styles.statusM}`}>{countFiles(node)}</span>
                <div class={styles.fileItemActions}>
                  {isStaged ? (
                    <button
                      class={styles.fileItemActionBtn}
                      onClick={(e) => { e.stopPropagation(); props.onUnstageFiles?.(collectFilePaths(node)); }}
                      title={t("workspace.unstageFolderTitle")}
                    ><Minus size={12} /></button>
                  ) : (
                    <>
                      <button
                        class={styles.fileItemActionBtn}
                        onClick={(e) => { e.stopPropagation(); setDiscardTarget(collectFilePaths(node)); setShowDiscardConfirm(true); }}
                        title={t("workspace.discardFolderTitle")}
                      ><X size={12} /></button>
                      <button
                        class={styles.fileItemActionBtn}
                        onClick={(e) => { e.stopPropagation(); props.onStageFiles?.(collectFilePaths(node)); }}
                        title={t("workspace.stageFolderTitle")}
                      ><Plus size={12} /></button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              renderFileItem(node.file!, isStaged, depth)
            )}
            <Show when={node.type === "folder" && expanded()}>
              {renderTreeNodes(node.children, depth + 1, isStaged)}
            </Show>
          </>
        );
      }}
    </For>
  );

  return (
    <div class={styles.workspace}>
      {/* TopBar */}
      <div class={styles.topBar}>
        <div class={styles.topBarLeft}>
          <span class={styles.topBarTitle}>{t("workspace.title")}</span>
          <Show when={totalChanges() > 0}>
            <span class={styles.topBarBadge}>{totalChanges()}</span>
          </Show>
        </div>
        <div class={styles.topBarRight}>
          <button class={styles.topBarBtn} onClick={() => props.onRefresh?.()}>
            <RefreshCw size={14} />
            <span>{t("workspace.sync")}</span>
          </button>
          <button
            class={`${styles.topBarBtn} ${styles.topBarBtnPrimary}`}
            onClick={() => setShowCommitPanel(!showCommitPanel())}
          >
            <Check size={14} />
            <span>{t("workspace.commit")}</span>
          </button>
        </div>
      </div>

      {/* 操作状态横幅 */}
      <Show when={isInOperation()}>
        <div class={styles.operationBanner}>
          <span class={styles.operationLabel}>{operationLabel()}</span>
          <span class={styles.operationMessage}>{t("workspace.operation.resolveConflicts")}</span>
          <Show when={repoState() === "Merging"}>
            <Button variant="ghost" size="sm" onClick={() => props.onMergeAbort?.()}>
              {t("workspace.operation.abortMerge")}
            </Button>
            <Button variant="primary" size="sm" onClick={() => props.onMergeContinue?.()}>
              {t("workspace.operation.continueMerge")}
            </Button>
          </Show>
          <Show when={repoState() === "Rebasing"}>
            <Button variant="ghost" size="sm" onClick={() => props.onRebaseAbort?.()}>
              {t("workspace.operation.abortRebase")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => props.onRebaseSkip?.()}>
              {t("workspace.operation.skipRebase")}
            </Button>
            <Button variant="primary" size="sm" onClick={() => props.onRebaseContinue?.()}>
              {t("workspace.operation.continueRebase")}
            </Button>
          </Show>
          <Show when={repoState() === "CherryPicking" || repoState() === "Reverting"}>
            <Button variant="ghost" size="sm" onClick={() => {
              // cherry-pick / revert abort
            }}>
              {t("workspace.operation.abort")}
            </Button>
            <Button variant="primary" size="sm" onClick={() => props.onMergeContinue?.()}>
              {t("workspace.operation.continue")}
            </Button>
          </Show>
        </div>
      </Show>

      {/* Commit panel (展开在 TopBar 下方) */}
      <Show when={showCommitPanel()}>
        <div class={styles.commitOverlay}>
          <textarea
            class={styles.commitInput}
            placeholder={t("workspace.commitMessage")}
            value={commitMessage()}
            onInput={(e) => setCommitMessage(e.currentTarget.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleCommit();
              }
              if (e.key === "Escape") {
                setShowCommitPanel(false);
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
              {t("workspace.amendCommit")}
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => props.onUndoCommit?.(true)}
            >
              {t("workspace.undoCommit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAiGenerate}
              loading={isGenerating()}
              disabled={isGenerating()}
            >
              {t("workspace.aiGenerate")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCommit}
              loading={isCommitting()}
              disabled={!commitMessage().trim() || isCommitting()}
            >
              {amendMode() ? t("workspace.amendSubmit") : t("workspace.commit")}
            </Button>
          </div>
        </div>
      </Show>

      {/* Body: 文件面板 + Diff 面板 */}
      <div class={styles.body}>
        <SplitPane direction="horizontal" initialSizes={[30, 70]} minSize={200}>
          {/* 文件面板 */}
          <div class={styles.filePanel}>
            {/* STAGED 区 */}
            <div class={`${styles.fileGroup} ${stagedOpen() ? styles.fileGroupOpen : ""}`}>
              <div class={styles.groupHeader} onClick={() => setStagedOpen(!stagedOpen())}>
                <div class={styles.groupHeaderLeft}>
                  {stagedOpen() ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <span class={styles.groupTitle}>{t("workspace.staged")}</span>
                  <Show when={stagedFiles().length > 0}>
                    <span class={styles.groupCount}>{stagedFiles().length}</span>
                  </Show>
                </div>
                <div class={styles.groupActions}>
                  <button
                    class={styles.viewModeBtn}
                    onClick={(e) => { e.stopPropagation(); toggleViewMode(); }}
                    title={viewMode() === "list" ? t("workspace.switchToTree") : t("workspace.switchToList")}
                  >
                    {viewMode() === "list" ? <ListIcon size={14} /> : <FolderTree size={14} />}
                  </button>
                  <Show when={stagedFiles().length > 0}>
                    <button
                      class={styles.groupActionBtn}
                      onClick={(e) => { e.stopPropagation(); handleUnstageAll(); }}
                      title={t("workspace.unstageAll")}
                    ><Minus size={14} /></button>
                  </Show>
                </div>
              </div>
              <Show when={stagedOpen()}>
                <div class={styles.fileList}>
                  <Show
                    when={stagedFiles().length > 0}
                    fallback={<div class={styles.emptyState}>{t("workspace.stagedEmpty")}</div>}
                  >
                    <Show
                      when={viewMode() === "tree"}
                      fallback={
                        <For each={stagedFiles()}>
                          {(file) => renderFileItem(file, true)}
                        </For>
                      }
                    >
                      {renderTreeNodes(stagedTree(), 0, true)}
                    </Show>
                  </Show>
                </div>
              </Show>
            </div>

            {/* 分隔线 */}
            <div class={styles.groupDivider} />

            {/* UNSTAGED 区 */}
            <div class={`${styles.fileGroup} ${unstagedOpen() ? styles.fileGroupOpen : ""}`}>
              <div class={styles.groupHeader} onClick={() => setUnstagedOpen(!unstagedOpen())}>
                <div class={styles.groupHeaderLeft}>
                  {unstagedOpen() ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <span class={styles.groupTitle}>{t("workspace.unstaged")}</span>
                  <Show when={unstagedFiles().length > 0}>
                    <span class={styles.groupCount}>{unstagedFiles().length}</span>
                  </Show>
                </div>
                <div class={styles.groupActions}>
                  <button
                    class={styles.viewModeBtn}
                    onClick={(e) => { e.stopPropagation(); toggleViewMode(); }}
                    title={viewMode() === "list" ? t("workspace.switchToTree") : t("workspace.switchToList")}
                  >
                    {viewMode() === "list" ? <ListIcon size={14} /> : <FolderTree size={14} />}
                  </button>
                  <Show when={unstagedFiles().length > 0}>
                    <button
                      class={styles.groupActionBtn}
                      onClick={(e) => { e.stopPropagation(); handleDiscardAll(); }}
                      title={t("workspace.discardAll")}
                    ><X size={14} /></button>
                    <button
                      class={styles.groupActionBtn}
                      onClick={(e) => { e.stopPropagation(); handleStageAll(); }}
                      title={t("workspace.stageAll")}
                    ><Plus size={14} /></button>
                  </Show>
                </div>
              </div>
              <Show when={unstagedOpen()}>
                <div class={styles.fileList}>
                  <Show
                    when={unstagedFiles().length > 0}
                    fallback={<div class={styles.emptyState}>{t("workspace.noChanges")}</div>}
                  >
                    <Show
                      when={viewMode() === "tree"}
                      fallback={
                        <For each={unstagedFiles()}>
                          {(file) => renderFileItem(file, false)}
                        </For>
                      }
                    >
                      {renderTreeNodes(unstagedTree(), 0, false)}
                    </Show>
                  </Show>
                </div>
              </Show>
            </div>

            {/* Stash 折叠面板 */}
            <div class={styles.groupDivider} />
            <div class={`${styles.fileGroup} ${stashesOpen() ? styles.fileGroupOpen : ""}`}>
              <div class={styles.groupHeader} onClick={() => setStashesOpen(!stashesOpen())}>
                <div class={styles.groupHeaderLeft}>
                  {stashesOpen() ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <span class={styles.groupTitle}>{t("workspace.stash")}</span>
                  <Show when={stashes().length > 0}>
                    <span class={styles.groupCount}>{stashes().length}</span>
                  </Show>
                </div>
                <div class={styles.groupActions}>
                  <button
                    class={styles.groupActionBtn}
                    onClick={(e) => { e.stopPropagation(); props.onStashSave?.(); }}
                    title={t("workspace.stashSave")}
                  ><Plus size={14} /></button>
                </div>
              </div>
              <Show when={stashesOpen() && stashes().length > 0}>
                <div class={styles.fileList}>
                  <For each={stashes()}>
                    {(stash) => (
                      <div class={styles.stashItem}>
                        <span class={styles.stashMessage}>
                          {stash.message || `stash@{${stash.index}}`}
                        </span>
                        <button
                          class={styles.stashActionBtn}
                          onClick={() => props.onStashApply?.(stash.index)}
                          title={t("workspace.stashApply")}
                        >{t("workspace.stashApply")}</button>
                        <button
                          class={styles.stashActionBtn}
                          onClick={() => props.onStashPop?.(stash.index)}
                          title={t("workspace.stashPop")}
                        >{t("workspace.stashPop")}</button>
                        <button
                          class={`${styles.stashActionBtn} ${styles.stashActionBtnDanger}`}
                          onClick={() => props.onStashDrop?.(stash.index)}
                          title={t("workspace.stashDrop")}
                        ><X size={10} /></button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>

          {/* Diff 面板 */}
          <div class={styles.diffPanel}>
            <Show
              when={selectedFile()}
              fallback={
                <div class={styles.diffPlaceholder}>
                  {t("workspace.diffPlaceholder")}
                </div>
              }
            >
              <div class={styles.diffHeader}>
                <span class={styles.diffFilePath}>{selectedFile()}</span>
                <Show when={diffData()}>
                  <span class={styles.diffStatAdded}>+{diffStats().added}</span>
                  <span class={styles.diffStatDeleted}>-{diffStats().deleted}</span>
                </Show>
              </div>
              <div class={styles.diffContent}>
                <Show
                  when={diffData()}
                  fallback={<div class={styles.diffPlaceholder}>{t("workspace.loadingDiff")}</div>}
                >
                  {(diff) => (
                    <For each={diff().files}>
                      {(file) => (
                        <div>
                          <For each={file.hunks}>
                            {(hunk) => (
                              <div>
                                <div class={styles.diffHunkHeader}>
                                  {hunk.header}
                                </div>
                                <For each={hunk.lines}>
                                  {(line) => (
                                    <div class={`${styles.diffLine} ${
                                      line.origin === "Addition" ? styles.diffLineAddition :
                                      line.origin === "Deletion" ? styles.diffLineDeletion :
                                      styles.diffLineContext
                                    }`}>
                                      <span class={styles.diffLineNo}>
                                        {line.new_lineno ?? ""}
                                      </span>
                                      <span class={styles.diffLinePrefix}>
                                        {line.origin === "Addition" ? "+" : line.origin === "Deletion" ? "-" : " "}
                                      </span>
                                      <span class={styles.diffLineContent}>
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

      {/* 丢弃确认对话框 */}
      <Show when={showDiscardConfirm()}>
        <div class={styles.discardOverlay}>
          <div class={styles.discardDialog}>
            <h3 class={styles.discardTitle}>{t("workspace.confirmDiscard")}</h3>
            <p class={styles.discardMessage}>
              {discardTarget() ? `${t("workspace.confirmDiscardFile").replace("{files}", discardTarget()!.join(", "))}` : t("workspace.confirmDiscardAll")}
              {t("workspace.irreversible")}
            </p>
            <div class={styles.discardActions}>
              <Button variant="ghost" size="sm" onClick={() => setShowDiscardConfirm(false)}>
                {t("workspace.cancel")}
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDiscard}>
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default WorkspaceView;
