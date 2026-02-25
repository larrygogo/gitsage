import { type Component, createSignal, createEffect, Show, For, onMount, onCleanup } from "solid-js";
import History from "lucide-solid/icons/history";
import Search from "lucide-solid/icons/search";
import FilterIcon from "lucide-solid/icons/filter";
import X from "lucide-solid/icons/x";
import { CommitGraph } from "@/components/graph";
import { useI18n } from "@/i18n";
import type { CommitInfo, DiffOutput, BranchInfo } from "@/types";
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
  if (days > 0) return `${days} days ago`;
  if (hours > 0) return `${hours} hours ago`;
  if (minutes > 0) return `${minutes} min ago`;
  return "just now";
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
  const { t } = useI18n();
  const [commits, setCommits] = createSignal<CommitInfo[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [showSearch, setShowSearch] = createSignal(false);
  const [selectedCommit, setSelectedCommit] = createSignal<CommitInfo | null>(null);
  const [commitDiff, setCommitDiff] = createSignal<DiffOutput | null>(null);
  const [showResetDialog, setShowResetDialog] = createSignal(false);
  const [resetTargetId, setResetTargetId] = createSignal("");
  const [resetMode, setResetMode] = createSignal("mixed");
  const [contextMenu, setContextMenu] = createSignal<{ x: number; y: number; commit: CommitInfo } | null>(null);
  const [branches, setBranches] = createSignal<BranchInfo[]>([]);
  const [selectedBranches, setSelectedBranches] = createSignal<Set<string>>(new Set());
  const [branchTips, setBranchTips] = createSignal<Record<string, string[]>>({});
  const [branchDropdownOpen, setBranchDropdownOpen] = createSignal(false);

  let dropdownRef: HTMLDivElement | undefined;

  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
      setBranchDropdownOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener("mousedown", handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener("mousedown", handleClickOutside);
  });

  const toggleBranch = (name: string) => {
    setSelectedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
    loadCommits();
  };

  const clearBranchSelection = () => {
    setSelectedBranches(new Set<string>());
    loadCommits();
  };

  const filteredBranchTips = () => {
    const sel = selectedBranches();
    const tips = branchTips();
    if (sel.size === 0) return tips;
    const result: Record<string, string[]> = {};
    for (const [commitId, names] of Object.entries(tips)) {
      const filtered = names.filter((n) => sel.has(n));
      if (filtered.length > 0) {
        result[commitId] = filtered;
      }
    }
    return result;
  };

  const branchSelectLabel = () => {
    const sel = selectedBranches();
    if (sel.size === 0) return t("history.filter");
    if (sel.size === 1) return Array.from(sel)[0];
    return `${sel.size} branches`;
  };

  const loadCommits = async () => {
    setLoading(true);
    try {
      const sel = selectedBranches();
      if (sel.size > 0) {
        const allLogs = await Promise.all(
          Array.from(sel).map((b) => gitService.getBranchLog(b, 200, true))
        );
        const seen = new Set<string>();
        const merged: CommitInfo[] = [];
        for (const log of allLogs) {
          for (const commit of log) {
            if (!seen.has(commit.id)) {
              seen.add(commit.id);
              merged.push(commit);
            }
          }
        }
        merged.sort((a, b) => b.timestamp - a.timestamp);
        const commitIdSet = new Set(merged.map((c) => c.id));
        for (const commit of merged) {
          commit.parent_ids = commit.parent_ids.filter((pid) => commitIdSet.has(pid));
        }
        setCommits(merged);
      } else {
        const log = await gitService.getCommitLog(200);
        setCommits(log);
      }
    } catch (err) {
      console.error("[HistoryView] Failed to load commits:", err);
      setCommits([]);
    } finally {
      setLoading(false);
    }
  };

  onMount(async () => {
    const [, branchList, tips] = await Promise.all([
      loadCommits(),
      gitService.getBranches().catch(() => [] as BranchInfo[]),
      gitService.getBranchTips().catch(() => ({} as Record<string, string[]>)),
    ]);
    setBranches(branchList);
    setBranchTips(tips);
  });

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
      console.error("[HistoryView] Search failed:", err);
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
      console.error("[HistoryView] Failed to load commit diff:", err);
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
      {/* Top Bar */}
      <div class={styles.topBar}>
        <div class={styles.topBarLeft}>
          <span class={styles.topBarTitle}>{t("history.title")}</span>
          <Show when={!loading()}>
            <span class={styles.topBarBadge}>{commits().length} {t("history.commits")}</span>
          </Show>
        </div>
        <div class={styles.topBarRight}>
          <button class={styles.topBarBtn} onClick={() => setShowSearch(!showSearch())}>
            <Search size={14} />
            <span>{t("history.searchPlaceholder")}</span>
          </button>
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button class={styles.topBarBtn} onClick={() => setBranchDropdownOpen(!branchDropdownOpen())}>
              <FilterIcon size={14} />
              <span>{branchSelectLabel()}</span>
              <Show when={selectedBranches().size > 0}>
                <span
                  class={styles.clearFilterBtn}
                  onClick={(e) => { e.stopPropagation(); clearBranchSelection(); }}
                >
                  <X size={12} />
                </span>
              </Show>
            </button>
            <Show when={branchDropdownOpen()}>
              <div class={styles.filterDropdown}>
                <Show when={branches().filter(b => !b.is_remote).length > 0}>
                  <div class={styles.filterGroupLabel}>LOCAL</div>
                  <For each={branches().filter(b => !b.is_remote)}>
                    {(b) => (
                      <label class={styles.filterItem}>
                        <input
                          type="checkbox"
                          checked={selectedBranches().has(b.name)}
                          onChange={() => toggleBranch(b.name)}
                        />
                        <span class={styles.filterItemText}>{b.name}</span>
                      </label>
                    )}
                  </For>
                </Show>
                <Show when={branches().filter(b => b.is_remote).length > 0}>
                  <Show when={branches().filter(b => !b.is_remote).length > 0}>
                    <div class={styles.filterDivider} />
                  </Show>
                  <div class={styles.filterGroupLabel}>REMOTE</div>
                  <For each={branches().filter(b => b.is_remote)}>
                    {(b) => (
                      <label class={styles.filterItem}>
                        <input
                          type="checkbox"
                          checked={selectedBranches().has(b.name)}
                          onChange={() => toggleBranch(b.name)}
                        />
                        <span class={styles.filterItemText}>{b.name}</span>
                      </label>
                    )}
                  </For>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Search Bar (expandable) */}
      <Show when={showSearch()}>
        <div class={styles.searchBar}>
          <input
            class={styles.searchInput}
            placeholder={t("history.searchPlaceholder")}
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
              if (e.key === "Escape") setShowSearch(false);
            }}
            autofocus
          />
          <button
            class={styles.searchCloseBtn}
            onClick={() => {
              setShowSearch(false);
              if (searchQuery()) {
                setSearchQuery("");
                loadCommits();
              }
            }}
          >
            <X size={14} />
          </button>
        </div>
      </Show>

      {/* Content */}
      <Show when={!loading()} fallback={<div class={styles.loading}>{t("history.loading")}</div>}>
        <Show
          when={commits().length > 0}
          fallback={
            <div class={styles.emptyState}>
              <span class={styles.emptyIcon}><History size={36} /></span>
              <span class={styles.emptyText}>{t("history.noCommits")}</span>
            </div>
          }
        >
          <div class={styles.content}>
            <div
              class={styles.commitList}
              style={{ flex: selectedCommit() ? "0 0 50%" : "1" }}
              onContextMenu={(e) => {
                const target = e.target as HTMLElement;
                const row = target.closest("[data-commit-id]");
                if (row) {
                  const commitId = row.getAttribute("data-commit-id");
                  const commit = commits().find((c) => c.id === commitId);
                  if (commit) handleContextMenu(e, commit);
                }
              }}
            >
              <CommitGraph
                commits={commits()}
                selectedCommitId={selectedCommit()?.id}
                onSelectCommit={handleSelectCommit}
                branchTips={filteredBranchTips()}
              />
            </div>

            {/* Detail Panel */}
            <Show when={selectedCommit()}>
              {(commit) => (
                <div class={styles.detailPanel}>
                  <div class={styles.detailHeader}>
                    <span class={styles.detailTitle}>{t("history.commitDetails")}</span>
                    <button
                      class={styles.detailCloseBtn}
                      onClick={() => { setSelectedCommit(null); setCommitDiff(null); }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div class={styles.detailBody}>
                    <div class={styles.detailMeta}>
                      <div class={styles.detailMetaRow}>
                        <span class={styles.detailMetaLabel}>{t("history.hash")}</span>
                        <code class={styles.detailMetaValue}>{commit().id}</code>
                      </div>
                      <div class={styles.detailMetaRow}>
                        <span class={styles.detailMetaLabel}>{t("history.author")}</span>
                        <span class={styles.detailMetaValue}>
                          {commit().author_name} &lt;{commit().author_email}&gt;
                        </span>
                      </div>
                      <div class={styles.detailMetaRow}>
                        <span class={styles.detailMetaLabel}>{t("history.date")}</span>
                        <span class={styles.detailMetaValue}>
                          {new Date(commit().timestamp * 1000).toLocaleString("zh-CN")}
                        </span>
                      </div>
                    </div>
                    <pre class={styles.detailMessage}>{commit().message}</pre>
                    <Show when={commitDiff()}>
                      {(diff) => (
                        <div>
                          <div class={styles.detailDiffStats}>
                            {diff().stats.files_changed} files changed,
                            +{diff().stats.insertions} -{diff().stats.deletions}
                          </div>
                          <For each={diff().files}>
                            {(file) => (
                              <div class={styles.detailFile}>
                                <div class={styles.detailFileName}>
                                  {file.new_path ?? file.old_path}
                                </div>
                                <For each={file.hunks}>
                                  {(hunk) => (
                                    <div class={styles.detailHunk}>
                                      <div class={styles.detailHunkHeader}>{hunk.header}</div>
                                      <For each={hunk.lines}>
                                        {(line) => (
                                          <div class={`${styles.detailDiffLine} ${
                                            line.origin === "Addition" ? styles.detailDiffLineAdd :
                                            line.origin === "Deletion" ? styles.detailDiffLineDel : ""
                                          }`}>
                                            <span class={styles.detailDiffLinePrefix}>
                                              {line.origin === "Addition" ? "+" : line.origin === "Deletion" ? "-" : " "}
                                            </span>
                                            <span>{line.content}</span>
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
                </div>
              )}
            </Show>
          </div>
        </Show>
      </Show>

      {/* Context Menu */}
      <Show when={contextMenu()}>
        {(menu) => (
          <div
            class={styles.contextMenu}
            style={{ left: `${menu().x}px`, top: `${menu().y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              class={styles.contextMenuItem}
              onClick={() => { props.onCherryPick?.(menu().commit.id); closeContextMenu(); }}
            >
              {t("history.cherryPick")}
            </button>
            <button
              class={styles.contextMenuItem}
              onClick={() => { props.onRevert?.(menu().commit.id); closeContextMenu(); }}
            >
              {t("history.revert")}
            </button>
            <div class={styles.contextMenuDivider} />
            <button
              class={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
              onClick={() => handleResetOpen(menu().commit.id)}
            >
              {t("history.resetToCommit")}
            </button>
          </div>
        )}
      </Show>

      {/* Reset Dialog */}
      <Show when={showResetDialog()}>
        <div class={styles.dialogOverlay}>
          <div class={styles.dialogBox}>
            <h3 class={styles.dialogTitle}>{t("history.resetTitle")}</h3>
            <p class={styles.dialogSubtitle}>{t("history.resetTarget")}: {shortHash(resetTargetId())}</p>
            <div class={styles.dialogOptions}>
              <label class={styles.dialogOption}>
                <input
                  type="radio" name="resetMode" value="soft"
                  checked={resetMode() === "soft"}
                  onChange={() => setResetMode("soft")}
                />
                {t("history.resetSoft")}
              </label>
              <label class={styles.dialogOption}>
                <input
                  type="radio" name="resetMode" value="mixed"
                  checked={resetMode() === "mixed"}
                  onChange={() => setResetMode("mixed")}
                />
                {t("history.resetMixed")}
              </label>
              <label class={styles.dialogOption}>
                <input
                  type="radio" name="resetMode" value="hard"
                  checked={resetMode() === "hard"}
                  onChange={() => setResetMode("hard")}
                />
                {t("history.resetHard")}
              </label>
            </div>
            <div class={styles.dialogActions}>
              <button class={styles.dialogBtnCancel} onClick={() => setShowResetDialog(false)}>
                {t("common.cancel")}
              </button>
              <button class={styles.dialogBtnDanger} onClick={handleResetConfirm}>
                {t("history.reset")}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default HistoryView;
