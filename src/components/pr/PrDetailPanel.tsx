import { type Component, createSignal, Show, For, createMemo } from "solid-js";
import GitBranch from "lucide-solid/icons/git-branch";
import GitMerge from "lucide-solid/icons/git-merge";
import ArrowRight from "lucide-solid/icons/arrow-right";
import FileCode from "lucide-solid/icons/file-code";
import ChevronRight from "lucide-solid/icons/chevron-right";
import ChevronDown from "lucide-solid/icons/chevron-down";
import XIcon from "lucide-solid/icons/x";
import Plus from "lucide-solid/icons/plus";
import Check from "lucide-solid/icons/check";
import MessageSquare from "lucide-solid/icons/message-square";
import Trash2 from "lucide-solid/icons/trash-2";
import { useGitHub } from "@/stores/github";
import { MergePrDialog } from "./MergePrDialog";
import { LabelSelector } from "./LabelSelector";
import { parsePatchLines, type DiffLine } from "@/utils/diffParser";
import type { PrFile, ReviewComment } from "@/types";
import styles from "../../views/PullsView.module.css";

export interface PrDetailPanelProps {
  onClose: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 7) {
    return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  }
  if (days > 0) return `${days} days ago`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours} hours ago`;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes > 0) return `${minutes} min ago`;
  return "just now";
}

/** 根据标签背景色计算可读的文字颜色 */
function getLabelTextColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.4) {
    const factor = luminance > 0.7 ? 0.3 : 0.5;
    const darken = (v: number) => Math.round(v * factor);
    const dr = darken(r).toString(16).padStart(2, "0");
    const dg = darken(g).toString(16).padStart(2, "0");
    const db = darken(b).toString(16).padStart(2, "0");
    return `#${dr}${dg}${db}`;
  }
  return `#${hexColor}`;
}

export const PrDetailPanel: Component<PrDetailPanelProps> = (props) => {
  const [ghState, ghActions] = useGitHub();
  const [showMergeDialog, setShowMergeDialog] = createSignal(false);
  const [showLabelSelector, setShowLabelSelector] = createSignal(false);
  const [expandedFiles, setExpandedFiles] = createSignal<Set<string>>(new Set());
  const [activeCommentLine, setActiveCommentLine] = createSignal<string | null>(null);
  const [commentText, setCommentText] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<"overview" | "files">("overview");
  const [viewedFiles, setViewedFiles] = createSignal<Set<string>>(new Set());

  const pr = () => ghState.currentPull;

  const commentsForLine = (filename: string, line: number | null, side: string): ReviewComment[] => {
    if (line == null) return [];
    return ghState.reviewComments.filter(c =>
      c.path === filename && c.line === line && (c.side == null || c.side === side)
    );
  };

  const pendingForLine = (filename: string, line: number | null, side: string) => {
    if (line == null) return [];
    return ghState.pendingReviewComments
      .map((c, i) => ({ ...c, _index: i }))
      .filter(c => c.path === filename && c.line === line && (c.side == null || c.side === side));
  };

  const commentLineKey = (filename: string, line: number | null, side: string) => `${filename}:${line}:${side}`;

  const handleAddComment = (filename: string, diffLine: DiffLine) => {
    const lineNum = diffLine.type === 'deleted' ? diffLine.oldLine : diffLine.newLine;
    if (lineNum == null) return;
    const body = commentText().trim();
    if (!body) return;
    ghActions.addPendingComment({
      path: filename,
      line: lineNum,
      side: diffLine.type === 'deleted' ? 'LEFT' : 'RIGHT',
      body,
    });
    setCommentText("");
    setActiveCommentLine(null);
  };

  const handleSubmitReview = async () => {
    const p = pr();
    if (!p) return;
    setIsSubmitting(true);
    try {
      await ghActions.submitReviewWithComments(p.number);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusLabel = () => {
    const p = pr();
    if (!p) return "Open";
    if (p.merged_at) return "Merged";
    return p.state === "open" ? "Open" : "Closed";
  };

  const statusBadgeClass = () => {
    const s = statusLabel();
    if (s === "Merged") return styles.detailStatusBadgeMerged;
    if (s === "Closed") return styles.detailStatusBadgeClosed;
    return styles.detailStatusBadgeOpen;
  };

  const statusDotClass = () => {
    const s = statusLabel();
    if (s === "Merged") return styles.detailStatusDotMerged;
    if (s === "Closed") return styles.detailStatusDotClosed;
    return styles.detailStatusDotOpen;
  };

  const toggleFileExpand = (filename: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  };

  const isFileExpanded = (filename: string) => expandedFiles().has(filename);

  const toggleViewed = (filename: string) => {
    setViewedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  };

  const isFileViewed = (filename: string) => viewedFiles().has(filename);

  const allFiles = () => ghState.prFiles || [];

  const viewedCount = () => {
    const files = allFiles();
    const viewed = viewedFiles();
    return files.filter(f => viewed.has(f.filename)).length;
  };

  return (
    <div class={styles.detailPanel}>
      <Show when={!ghState.isDetailLoading} fallback={
        <div class={styles.detailLoading}>Loading...</div>
      }>
      <Show when={pr()}>
        {(detail) => (
          <>
            {/* ── Fixed Header ── */}
            <div class={styles.detailHeader}>
              {/* Title Row */}
              <div class={styles.detailTitleRow}>
                <span class={statusBadgeClass()}>
                  <span class={`${styles.detailStatusDot} ${statusDotClass()}`} />
                  {statusLabel()}
                </span>
                <span class={styles.detailTitle}>{detail().title}</span>
                <div class={styles.detailHeaderActions}>
                  <Show when={detail().state === "open"}>
                    <Show when={detail().mergeable !== false}>
                      <button class={styles.detailMergeBtnSmall} onClick={() => setShowMergeDialog(true)}>
                        <GitMerge size={12} />
                        Merge
                      </button>
                    </Show>
                    <button class={styles.detailCloseBtnSmall} onClick={props.onClose}>
                      Close PR
                    </button>
                  </Show>
                  <button class={styles.detailCloseIconBtn} onClick={props.onClose} title="关闭详情">
                    <XIcon size={16} />
                  </button>
                </div>
              </div>

              {/* Meta Row */}
              <div class={styles.detailMetaRow}>
                <span class={styles.detailPrNum}>#{detail().number}</span>
                <span class={styles.detailSep}>&middot;</span>
                <span class={styles.detailAuthor}>{detail().user.login}</span>
                <span class={styles.detailSep}>&middot;</span>
                <span class={styles.detailTime}>opened {formatRelativeTime(detail().created_at)}</span>
                <Show when={detail().head?.ref_name}>
                  <span class={styles.detailBranchBadge}>
                    <GitBranch size={12} />
                    {detail().head.ref_name}
                  </span>
                </Show>
                <Show when={detail().head?.ref_name && detail().base?.ref_name}>
                  <span class={styles.detailArrowIcon}>
                    <ArrowRight size={12} />
                  </span>
                  <span class={styles.detailBranchBadge}>
                    <GitBranch size={12} />
                    {detail().base.ref_name}
                  </span>
                </Show>
              </div>
            </div>

            {/* ── Fixed Tab Bar ── */}
            <div class={styles.detailTabBar}>
              <button
                class={`${styles.detailTab} ${activeTab() === "overview" ? styles.detailTabActive : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                <span class={styles.tabText}>Overview</span>
              </button>
              <button
                class={`${styles.detailTab} ${activeTab() === "files" ? styles.detailTabActive : ""}`}
                onClick={() => setActiveTab("files")}
              >
                <span class={styles.tabText}>Files</span>
                <span class={styles.tabCount}>{allFiles().length}</span>
                <Show when={viewedCount() > 0}>
                  <span class={styles.detailViewedProgress}>
                    {viewedCount()}/{allFiles().length} viewed
                  </span>
                </Show>
              </button>
            </div>

            {/* ── Scrollable Body ── */}
            <div class={styles.detailBody}>
              {/* Tab Content */}
              <div class={styles.detailTabContent}>
                {/* ── Overview Tab ── */}
                <Show when={activeTab() === "overview"}>
                  {/* Description */}
                  <div class={styles.detailDescSection}>
                    <span class={styles.detailDescLabel}>Description</span>
                    <span class={styles.detailDescBody}>
                      {detail().body || "No description provided."}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div class={styles.detailInfoGrid}>
                    {/* Left Column */}
                    <div class={styles.detailInfoColumn}>
                      {/* Reviewers Card */}
                      <div class={styles.detailInfoCard}>
                        <span class={styles.detailInfoCardLabel}>Reviewers</span>
                        <Show
                          when={detail().requested_reviewers.length > 0}
                          fallback={
                            <span class={styles.detailInfoItem} style={{ color: "var(--gs-text-muted)" }}>
                              No reviewers
                            </span>
                          }
                        >
                          <For each={detail().requested_reviewers}>
                            {(reviewer) => (
                              <div class={styles.detailInfoItem}>
                                <span class={styles.detailInfoItemDot} style={{ "background-color": "#FF8400" }} />
                                {reviewer.login}
                              </div>
                            )}
                          </For>
                        </Show>
                      </div>

                      {/* Labels Card */}
                      <div class={styles.detailInfoCard}>
                        <span class={styles.detailInfoCardLabel}>Labels</span>
                        <Show
                          when={detail().labels.length > 0}
                          fallback={
                            <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
                              <span class={styles.detailInfoItem} style={{ color: "var(--gs-text-muted)" }}>
                                No labels
                              </span>
                              <button
                                style={{
                                  background: "none", border: "none", cursor: "pointer",
                                  "font-size": "11px", color: "#FF8400",
                                }}
                                onClick={() => setShowLabelSelector(!showLabelSelector())}
                              >
                                + Add
                              </button>
                            </div>
                          }
                        >
                          <div class={styles.detailLabelsRow}>
                            <For each={detail().labels}>
                              {(label) => (
                                <span
                                  class={styles.detailLabel}
                                  style={{
                                    "background-color": `#${label.color}20`,
                                    color: getLabelTextColor(label.color),
                                  }}
                                >
                                  {label.name}
                                </span>
                              )}
                            </For>
                          </div>
                        </Show>
                        <Show when={showLabelSelector()}>
                          <LabelSelector prNumber={detail().number} onClose={() => setShowLabelSelector(false)} />
                        </Show>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div class={styles.detailInfoColumn}>
                      {/* Stats Card */}
                      <div class={styles.detailInfoCard}>
                        <span class={styles.detailInfoCardLabel}>Stats</span>
                        <div class={styles.detailStatsRow}>
                          <span class={styles.detailStatAdd}>+{detail().additions}</span>
                          <span class={styles.detailStatDel}>-{detail().deletions}</span>
                          <span>&middot;</span>
                          <span>{detail().changed_files} files</span>
                          <span>&middot;</span>
                          <span>{detail().commits} commits</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider before comments */}
                  <div class={styles.detailDivider} />

                  {/* PR Comments */}
                  <div class={styles.detailCommentsSection}>
                    <span class={styles.detailDescLabel}>
                      Comments
                      <Show when={ghState.prComments.length > 0}>
                        <span class={styles.diffSectionCount}>{ghState.prComments.length}</span>
                      </Show>
                    </span>
                    <Show
                      when={ghState.prComments.length > 0}
                      fallback={
                        <span class={styles.detailCommentsEmpty}>No comments yet.</span>
                      }
                    >
                      <For each={ghState.prComments}>
                        {(comment) => (
                          <div class={styles.existingComment}>
                            <div class={styles.existingCommentHeader}>
                              <img class={styles.existingCommentAvatar} src={comment.user.avatar_url} alt="" />
                              <span class={styles.existingCommentUser}>{comment.user.login}</span>
                              <span class={styles.existingCommentTime}>{formatRelativeTime(comment.created_at)}</span>
                            </div>
                            <div class={styles.existingCommentBody}>{comment.body}</div>
                          </div>
                        )}
                      </For>
                    </Show>
                  </div>
                </Show>

                {/* ── Files Tab ── */}
                <Show when={activeTab() === "files"}>
                  <Show when={allFiles().length > 0}>
                    <div class={styles.diffSection}>
                      <For each={allFiles()}>
                        {(file) => (
                          <div class={styles.diffFileBlock}>
                            <div
                              class={`${styles.diffFileHeader} ${isFileExpanded(file.filename) ? styles.diffFileHeaderExpanded : ""} ${isFileViewed(file.filename) ? styles.diffFileViewed : ""}`}
                              onClick={() => toggleFileExpand(file.filename)}
                            >
                              <span class={styles.diffFileChevron}>
                                {isFileExpanded(file.filename)
                                  ? <ChevronDown size={14} />
                                  : <ChevronRight size={14} />
                                }
                              </span>
                              <FileCode size={14} style={{ "flex-shrink": "0", color: "var(--gs-text-muted)" }} />
                              <span class={`${styles.diffFileName} ${isFileViewed(file.filename) ? styles.diffFileNameViewed : ""}`}>{file.filename}</span>
                              <Show when={isFileViewed(file.filename)}>
                                <span class={styles.diffFileViewedLabel}>
                                  <Check size={10} />
                                  Viewed
                                </span>
                              </Show>
                              <span class={styles.diffFileStatus}>
                                {file.status === "added" ? "A" : file.status === "removed" ? "D" : "M"}
                              </span>
                              <Show when={file.additions > 0}>
                                <span class={styles.detailFileItemAdd}>+{file.additions}</span>
                              </Show>
                              <Show when={file.deletions > 0}>
                                <span class={styles.detailFileItemDel}>-{file.deletions}</span>
                              </Show>
                              <label
                                class={styles.diffFileViewedCheck}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isFileViewed(file.filename)}
                                  onChange={() => toggleViewed(file.filename)}
                                />
                              </label>
                            </div>
                            <Show when={isFileExpanded(file.filename) && file.patch}>
                              <div class={styles.diffPatchContainer}>
                                <pre class={styles.diffPatch}>
                                  <For each={parsePatchLines(file.patch!)}>
                                    {(diffLine) => {
                                      const lineNum = () => diffLine.type === 'deleted' ? diffLine.oldLine : diffLine.newLine;
                                      const side = () => diffLine.type === 'deleted' ? 'LEFT' : 'RIGHT';
                                      const lineKey = () => commentLineKey(file.filename, lineNum(), side());
                                      let cls = styles.diffLineContext;
                                      if (diffLine.type === 'hunk') cls = styles.diffLineHunk;
                                      else if (diffLine.type === 'added') cls = styles.diffLineAdded;
                                      else if (diffLine.type === 'deleted') cls = styles.diffLineDeleted;
                                      return (
                                        <>
                                          <div class={`${styles.diffLineRow} ${cls}`}>
                                            <div class={styles.diffLineGutter}>
                                              <Show when={diffLine.type !== 'hunk' && lineNum() != null}>
                                                <button
                                                  class={styles.diffLineAddBtn}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCommentText("");
                                                    setActiveCommentLine(lineKey());
                                                  }}
                                                  title="添加评论"
                                                >
                                                  <Plus size={10} />
                                                </button>
                                              </Show>
                                              <span class={styles.diffLineNum}>{lineNum() ?? ""}</span>
                                            </div>
                                            <div class={styles.diffLineContent}>{diffLine.content || " "}</div>
                                          </div>

                                          {/* 已有的 review comments */}
                                          <For each={commentsForLine(file.filename, lineNum(), side())}>
                                            {(comment) => (
                                              <div class={styles.existingComment}>
                                                <div class={styles.existingCommentHeader}>
                                                  <img class={styles.existingCommentAvatar} src={comment.user.avatar_url} alt="" />
                                                  <span class={styles.existingCommentUser}>{comment.user.login}</span>
                                                  <span class={styles.existingCommentTime}>{formatRelativeTime(comment.created_at)}</span>
                                                </div>
                                                <div class={styles.existingCommentBody}>{comment.body}</div>
                                              </div>
                                            )}
                                          </For>

                                          {/* 待提交的 pending comments */}
                                          <For each={pendingForLine(file.filename, lineNum(), side())}>
                                            {(pending) => (
                                              <div class={styles.pendingComment}>
                                                <span class={styles.pendingCommentBadge}>Pending</span>
                                                <span class={styles.pendingCommentBody}>{pending.body}</span>
                                                <button
                                                  class={styles.pendingCommentRemove}
                                                  onClick={() => ghActions.removePendingComment(pending._index)}
                                                  title="移除"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            )}
                                          </For>

                                          {/* 行内评论输入框 */}
                                          <Show when={activeCommentLine() === lineKey()}>
                                            <div class={styles.inlineCommentForm}>
                                              <textarea
                                                class={styles.inlineCommentTextarea}
                                                placeholder="写下你的评论..."
                                                rows={2}
                                                value={commentText()}
                                                onInput={(e) => setCommentText(e.currentTarget.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Escape') setActiveCommentLine(null);
                                                }}
                                                ref={(el) => setTimeout(() => el.focus(), 0)}
                                              />
                                              <div class={styles.inlineCommentActions}>
                                                <button onClick={() => setActiveCommentLine(null)}>Cancel</button>
                                                <button
                                                  onClick={() => handleAddComment(file.filename, diffLine)}
                                                  disabled={!commentText().trim()}
                                                >
                                                  Add Comment
                                                </button>
                                              </div>
                                            </div>
                                          </Show>
                                        </>
                                      );
                                    }}
                                  </For>
                                </pre>
                              </div>
                            </Show>
                            <Show when={isFileExpanded(file.filename) && !file.patch}>
                              <div class={styles.diffPatchEmpty}>Binary file or no diff available</div>
                            </Show>
                          </div>
                        )}
                      </For>

                      {/* Pending Review 提交栏 */}
                      <Show when={ghState.pendingReviewComments.length > 0}>
                        <div class={styles.pendingReviewBar}>
                          <div class={styles.pendingReviewBarLeft}>
                            <MessageSquare size={14} />
                            <span>{ghState.pendingReviewComments.length} pending comment{ghState.pendingReviewComments.length > 1 ? "s" : ""}</span>
                          </div>
                          <div class={styles.pendingReviewBarRight}>
                            <button class={styles.discardBtn} onClick={() => ghActions.clearPendingComments()}>
                              Discard All
                            </button>
                            <button
                              class={styles.submitReviewBtn}
                              onClick={handleSubmitReview}
                              disabled={isSubmitting()}
                            >
                              {isSubmitting() ? "Submitting..." : "Submit Review"}
                            </button>
                          </div>
                        </div>
                      </Show>
                    </div>
                  </Show>
                </Show>
              </div>
            </div>
          </>
        )}
      </Show>

      {/* Merge Dialog */}
      <Show when={showMergeDialog() && pr()}>
        <MergePrDialog
          prNumber={pr()!.number}
          onClose={() => setShowMergeDialog(false)}
        />
      </Show>
      </Show>
    </div>
  );
};
