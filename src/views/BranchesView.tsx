import { type Component, type JSX, createSignal, createMemo, Show, For, onCleanup } from "solid-js";
import ArrowDown from "lucide-solid/icons/arrow-down";
import ArrowUp from "lucide-solid/icons/arrow-up";
import GitBranch from "lucide-solid/icons/git-branch";
import Cloud from "lucide-solid/icons/cloud";
import GitMerge from "lucide-solid/icons/git-merge";
import ArrowRightLeft from "lucide-solid/icons/arrow-right-left";
import Pencil from "lucide-solid/icons/pencil";
import Trash2 from "lucide-solid/icons/trash-2";
import Tag from "lucide-solid/icons/tag";
import ChevronDown from "lucide-solid/icons/chevron-down";
import ChevronRight from "lucide-solid/icons/chevron-right";
import CornerDownLeft from "lucide-solid/icons/corner-down-left";
import Search from "lucide-solid/icons/search";
import Plus from "lucide-solid/icons/plus";
import X from "lucide-solid/icons/x";
import ListIcon from "lucide-solid/icons/list";
import FolderTree from "lucide-solid/icons/folder-tree";
import FolderIcon from "lucide-solid/icons/folder";
import FolderOpenIcon from "lucide-solid/icons/folder-open";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n";
import type { BranchInfo, TagInfo } from "@/types";
import styles from "./BranchesView.module.css";

export interface BranchesViewProps {
  branches?: BranchInfo[];
  tags?: TagInfo[];
  currentBranch?: string;
  onCreateBranch?: (name: string) => Promise<void>;
  onCheckoutBranch?: (name: string) => Promise<void>;
  onDeleteBranch?: (name: string) => Promise<void>;
  onRenameBranch?: (oldName: string, newName: string) => Promise<void>;
  onMergeBranch?: (branch: string, noFf?: boolean) => Promise<void>;
  onRebaseOnto?: (onto: string) => Promise<void>;
  onCreateTag?: (name: string, message?: string) => Promise<void>;
  onDeleteTag?: (name: string) => Promise<void>;
}

/* ── 分支树数据结构 ── */

interface BranchTreeNode {
  name: string;
  fullPath: string;
  type: "folder" | "branch";
  branch?: BranchInfo;
  children: BranchTreeNode[];
}

function buildBranchTree(branches: BranchInfo[]): BranchTreeNode[] {
  const root: BranchTreeNode[] = [];

  for (const branch of branches) {
    const parts = branch.name.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isBranch = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");

      if (isBranch) {
        current.push({ name, fullPath, type: "branch", branch, children: [] });
      } else {
        let folder = current.find((n) => n.type === "folder" && n.name === name);
        if (!folder) {
          folder = { name, fullPath, type: "folder", children: [] };
          current.push(folder);
        }
        current = folder.children;
      }
    }
  }

  // 排序：文件夹在前，分支在后，同类按名称排序
  const sortNodes = (nodes: BranchTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children.length > 0) sortNodes(node.children);
    }
  };
  sortNodes(root);

  return root;
}

const BranchesView: Component<BranchesViewProps> = (props) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = createSignal("");
  const [createMode, setCreateMode] = createSignal(false);
  const [newBranchName, setNewBranchName] = createSignal("");
  const [renamingBranch, setRenamingBranch] = createSignal<string | null>(null);
  const [renameValue, setRenameValue] = createSignal("");
  const [showTagSection, setShowTagSection] = createSignal(true);
  const [newTagName, setNewTagName] = createSignal("");
  const [newTagMessage, setNewTagMessage] = createSignal("");
  const [showLocalBranches, setShowLocalBranches] = createSignal(true);
  const [showRemoteBranches, setShowRemoteBranches] = createSignal(true);
  const [expandedBranchDirs, setExpandedBranchDirs] = createSignal<Set<string>>(new Set());
  const [branchViewMode, setBranchViewMode] = createSignal<"tree" | "list">("tree");
  const [contextMenu, setContextMenu] = createSignal<{ x: number; y: number; branch: BranchInfo; isRemote: boolean } | null>(null);

  const branches = () => props.branches ?? [];
  const tags = () => props.tags ?? [];
  const localBranches = () => {
    const q = searchQuery().toLowerCase().trim();
    const list = branches().filter((b) => !b.is_remote);
    return q ? list.filter((b) => b.name.toLowerCase().includes(q)) : list;
  };
  const remoteBranches = () => {
    const q = searchQuery().toLowerCase().trim();
    const list = branches().filter((b) => b.is_remote);
    return q ? list.filter((b) => b.name.toLowerCase().includes(q)) : list;
  };

  const localBranchTree = createMemo(() => buildBranchTree(localBranches()));
  const remoteBranchTree = createMemo(() => buildBranchTree(remoteBranches()));

  const toggleBranchDir = (path: string) => {
    setExpandedBranchDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const isBranchDirExpanded = (path: string) => expandedBranchDirs().has(path);

  // Close context menu on click outside
  const handleGlobalClick = () => setContextMenu(null);
  onCleanup(() => {});

  const handleCreateBranch = async () => {
    const name = newBranchName().trim();
    if (!name) return;
    try {
      await props.onCreateBranch?.(name);
      setNewBranchName("");
      setCreateMode(false);
    } catch (err) {
      console.error("[BranchesView] 创建分支失败:", err);
    }
  };

  const handleCheckout = async (name: string) => {
    try {
      await props.onCheckoutBranch?.(name);
    } catch (err) {
      console.error("[BranchesView] 切换分支失败:", err);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await props.onDeleteBranch?.(name);
    } catch (err) {
      console.error("[BranchesView] 删除分支失败:", err);
    }
  };

  const handleStartRename = (name: string) => {
    setRenamingBranch(name);
    setRenameValue(name);
  };

  const handleFinishRename = async () => {
    const oldName = renamingBranch();
    const newName = renameValue().trim();
    if (!oldName || !newName || oldName === newName) {
      setRenamingBranch(null);
      return;
    }
    try {
      await props.onRenameBranch?.(oldName, newName);
    } catch (err) {
      console.error("[BranchesView] 重命名分支失败:", err);
    }
    setRenamingBranch(null);
  };

  const handleMerge = async (name: string) => {
    try {
      await props.onMergeBranch?.(name);
    } catch (err) {
      console.error("[BranchesView] 合并分支失败:", err);
    }
  };

  const handleRebase = async (name: string) => {
    try {
      await props.onRebaseOnto?.(name);
    } catch (err) {
      console.error("[BranchesView] 变基失败:", err);
    }
  };

  const handleCreateTag = async () => {
    const name = newTagName().trim();
    if (!name) return;
    try {
      const msg = newTagMessage().trim() || undefined;
      await props.onCreateTag?.(name, msg);
      setNewTagName("");
      setNewTagMessage("");
    } catch (err) {
      console.error("[BranchesView] 创建标签失败:", err);
    }
  };

  const handleContextMenu = (e: MouseEvent, branch: BranchInfo, isRemote: boolean) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, branch, isRemote });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleCreateFromBranch = (branchName: string) => {
    closeContextMenu();
    setCreateMode(true);
    setNewBranchName(branchName + "-");
  };

  const renderTrackingInfo = (branch: BranchInfo) => {
    if (branch.ahead === 0 && branch.behind === 0) return null;
    return (
      <span class={styles.trackingInfo}>
        <Show when={branch.ahead > 0}>
          <span class={styles.ahead}><ArrowUp size={10} />{branch.ahead}</span>
        </Show>
        <Show when={branch.behind > 0}>
          <span class={styles.behind}><ArrowDown size={10} />{branch.behind}</span>
        </Show>
      </span>
    );
  };

  const renderLocalBranchItem = (branch: BranchInfo, depth: number) => (
    <div
      class={`${styles.branchItem} ${branch.is_head ? styles.current : ""}`}
      style={{ "padding-left": `${16 + depth * 16}px` }}
      onContextMenu={(e) => handleContextMenu(e, branch, false)}
    >
      <span class={styles.branchIcon}><GitBranch size={14} /></span>
      <Show
        when={renamingBranch() !== branch.name}
        fallback={
          <input
            style={{
              flex: "1",
              height: "24px",
              padding: "0 6px",
              "font-size": "13px",
              border: "1px solid var(--gs-border-focus)",
              "border-radius": "3px",
              outline: "none",
            }}
            value={renameValue()}
            onInput={(e) => setRenameValue(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFinishRename();
              if (e.key === "Escape") setRenamingBranch(null);
            }}
            onBlur={handleFinishRename}
            autofocus
          />
        }
      >
        <span class={styles.branchName}>{branch.name}</span>
      </Show>
      <Show when={branch.is_head}>
        <span class={styles.currentBadge}>{t("branches.current")}</span>
      </Show>
      {renderTrackingInfo(branch)}
      <Show when={!branch.is_head}>
        <div class={styles.branchActions}>
          <button
            class={styles.branchActionBtn}
            onClick={() => handleCheckout(branch.name)}
            title={t("branches.switchTo")}
          >
            <CornerDownLeft size={12} /> {t("branches.checkout")}
          </button>
          <button
            class={styles.branchActionBtn}
            onClick={() => handleMerge(branch.name)}
            title={t("branches.mergeToCurrent")}
          >
            <GitMerge size={12} /> {t("branches.merge")}
          </button>
          <button
            class={styles.branchActionBtn}
            onClick={() => handleRebase(branch.name)}
            title={t("branches.rebaseTo")}
          >
            <ArrowRightLeft size={12} /> {t("branches.rebase")}
          </button>
          <button
            class={styles.branchActionBtn}
            onClick={() => handleStartRename(branch.name)}
            title={t("branches.rename")}
          >
            <Pencil size={12} />
          </button>
          <button
            class={`${styles.branchActionBtn} ${styles.danger}`}
            onClick={() => handleDelete(branch.name)}
            title={t("branches.deleteBranch")}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </Show>
    </div>
  );

  const renderRemoteBranchItem = (branch: BranchInfo, depth: number) => (
    <div
      class={styles.branchItem}
      style={{ "padding-left": `${16 + depth * 16}px` }}
      onContextMenu={(e) => handleContextMenu(e, branch, true)}
    >
      <span class={styles.branchIcon}><Cloud size={14} /></span>
      <span class={styles.branchName}>{branch.name}</span>
      {renderTrackingInfo(branch)}
      <div class={styles.branchActions}>
        <button
          class={styles.branchActionBtn}
          onClick={() => handleCheckout(branch.name)}
          title={t("branches.checkoutRemoteTitle")}
        >
          <CornerDownLeft size={12} /> {t("branches.checkoutRemote")}
        </button>
      </div>
    </div>
  );

  const renderBranchTree = (
    nodes: BranchTreeNode[],
    depth: number,
    renderItem: (branch: BranchInfo, depth: number) => JSX.Element,
  ): JSX.Element => (
    <For each={nodes}>
      {(node) => (
        <Show
          when={node.type === "folder"}
          fallback={node.branch ? renderItem(node.branch, depth) : null}
        >
          <div
            class={styles.branchTreeFolder}
            style={{ "padding-left": `${16 + depth * 16}px` }}
            onClick={() => toggleBranchDir(node.fullPath)}
          >
            <span class={styles.branchTreeChevron}>
              {isBranchDirExpanded(node.fullPath) ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </span>
            <span class={styles.branchTreeFolderIcon}>
              {isBranchDirExpanded(node.fullPath) ? <FolderOpenIcon size={14} /> : <FolderIcon size={14} />}
            </span>
            <span class={styles.branchTreeFolderName}>{node.name}</span>
          </div>
          <Show when={isBranchDirExpanded(node.fullPath)}>
            {renderBranchTree(node.children, depth + 1, renderItem)}
          </Show>
        </Show>
      )}
    </For>
  );

  const renderBranchList = (
    branchList: BranchInfo[],
    renderItem: (branch: BranchInfo, depth: number) => JSX.Element,
  ): JSX.Element => (
    <For each={branchList}>
      {(branch) => renderItem(branch, 0)}
    </For>
  );

  return (
    <div class={styles.branches} onClick={handleGlobalClick}>
      {/* 顶部标题栏 */}
      <div class={styles.header}>
        <span class={styles.title}>{t("branches.title")}</span>
        <div class={styles.headerActions}>
          <button
            class={styles.viewModeBtn}
            onClick={() => setBranchViewMode(branchViewMode() === "tree" ? "list" : "tree")}
            title={branchViewMode() === "tree" ? t("branches.listView") : t("branches.treeView")}
          >
            {branchViewMode() === "tree" ? <ListIcon size={14} /> : <FolderTree size={14} />}
          </button>
        </div>
      </div>

      {/* 搜索栏 + 新建按钮 */}
      <div class={styles.createSection}>
        <div style={{ position: "relative", flex: "1", display: "flex", "align-items": "center" }}>
          <Search size={14} style={{ position: "absolute", left: "8px", color: "var(--gs-text-muted)", "pointer-events": "none" }} />
          <input
            class={styles.createInput}
            style={{ "padding-left": "28px" }}
            placeholder={t("branches.searchPlaceholder")}
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </div>
        <button
          style={{
            display: "inline-flex", "align-items": "center", "justify-content": "center",
            width: "30px", height: "30px", background: "none",
            border: "1px solid var(--gs-border-primary)", "border-radius": "4px",
            cursor: "pointer", color: "var(--gs-text-secondary)", "flex-shrink": "0",
          }}
          onClick={() => { setCreateMode(!createMode()); setNewBranchName(""); }}
          title={t("branches.create")}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 新建分支行 */}
      <Show when={createMode()}>
        <div class={styles.createSection}>
          <input
            class={styles.createInput}
            placeholder={t("branches.newBranchName")}
            value={newBranchName()}
            onInput={(e) => setNewBranchName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateBranch();
              }
              if (e.key === "Escape") {
                setCreateMode(false);
                setNewBranchName("");
              }
            }}
            autofocus
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateBranch}
            disabled={!newBranchName().trim()}
          >
            {t("branches.new")}
          </Button>
          <button
            style={{
              display: "inline-flex", "align-items": "center", "justify-content": "center",
              width: "30px", height: "30px", background: "none",
              border: "1px solid var(--gs-border-primary)", "border-radius": "4px",
              cursor: "pointer", color: "var(--gs-text-secondary)", "flex-shrink": "0",
            }}
            onClick={() => { setCreateMode(false); setNewBranchName(""); }}
            title={t("common.cancel")}
          >
            <X size={14} />
          </button>
        </div>
      </Show>

      {/* 分支列表 */}
      <div class={styles.content}>
        {/* 本地分支 */}
        <div class={`${styles.group} ${showLocalBranches() ? styles.groupOpen : ""}`}>
          <div class={styles.groupHeader} onClick={() => setShowLocalBranches(!showLocalBranches())}>
            <div class={styles.groupHeaderLeft}>
              {showLocalBranches() ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              {t("branches.local")}
            </div>
            <span class={styles.groupCount}>{localBranches().length}</span>
          </div>
          <Show when={showLocalBranches()}>
            <Show
              when={localBranches().length > 0}
              fallback={
                <div class={styles.emptyState}>
                  <span class={styles.emptyText}>{t("branches.noLocalBranches")}</span>
                </div>
              }
            >
              <div class={styles.branchList}>
                <Show
                  when={branchViewMode() === "tree"}
                  fallback={renderBranchList(localBranches(), renderLocalBranchItem)}
                >
                  {renderBranchTree(localBranchTree(), 0, renderLocalBranchItem)}
                </Show>
              </div>
            </Show>
          </Show>
        </div>

        {/* 远程分支 */}
        <div class={`${styles.group} ${showRemoteBranches() ? styles.groupOpen : ""}`}>
          <div class={styles.groupHeader} onClick={() => setShowRemoteBranches(!showRemoteBranches())}>
            <div class={styles.groupHeaderLeft}>
              {showRemoteBranches() ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              {t("branches.remote")}
            </div>
            <span class={styles.groupCount}>{remoteBranches().length}</span>
          </div>
          <Show when={showRemoteBranches()}>
            <Show
              when={remoteBranches().length > 0}
              fallback={
                <div class={styles.emptyState}>
                  <span class={styles.emptyText}>{t("branches.noRemoteBranches")}</span>
                </div>
              }
            >
              <div class={styles.branchList}>
                <Show
                  when={branchViewMode() === "tree"}
                  fallback={renderBranchList(remoteBranches(), renderRemoteBranchItem)}
                >
                  {renderBranchTree(remoteBranchTree(), 0, renderRemoteBranchItem)}
                </Show>
              </div>
            </Show>
          </Show>
        </div>

        {/* 标签 */}
        <div class={`${styles.group} ${showTagSection() ? styles.groupOpen : ""}`}>
          <div class={styles.groupHeader} onClick={() => setShowTagSection(!showTagSection())}>
            <div class={styles.groupHeaderLeft}>
              {showTagSection() ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              {t("branches.tags")}
            </div>
            <span class={styles.groupCount}>{tags().length}</span>
          </div>
          <Show when={showTagSection()}>
            {/* 新建标签 */}
            <div style={{ display: "flex", gap: "6px", padding: "8px 16px", "flex-shrink": "0" }}>
              <input
                style={{
                  flex: "1",
                  height: "28px",
                  padding: "0 8px",
                  "font-size": "12px",
                  border: "1px solid var(--gs-border-primary)",
                  "border-radius": "3px",
                  "background-color": "var(--gs-bg-primary)",
                  color: "var(--gs-text-primary)",
                  outline: "none",
                }}
                placeholder={t("branches.tagNamePlaceholder")}
                value={newTagName()}
                onInput={(e) => setNewTagName(e.currentTarget.value)}
              />
              <Button variant="ghost" size="sm" onClick={handleCreateTag} disabled={!newTagName().trim()}>
                {t("branches.createTag")}
              </Button>
            </div>
            <Show
              when={tags().length > 0}
              fallback={<div class={styles.emptyState}><span class={styles.emptyText}>{t("branches.noTags")}</span></div>}
            >
              <div class={styles.branchList}>
                <For each={tags()}>
                  {(tag) => (
                    <div class={styles.branchItem}>
                      <span class={styles.branchIcon}><Tag size={14} /></span>
                      <span class={styles.branchName}>{tag.name}</span>
                      <Show when={!tag.is_lightweight}>
                        <span style={{ "font-size": "10px", color: "var(--gs-text-muted)" }}>
                          {tag.message?.slice(0, 30)}
                        </span>
                      </Show>
                      <div class={styles.branchActions}>
                        <button
                          class={`${styles.branchActionBtn} ${styles.danger}`}
                          onClick={() => props.onDeleteTag?.(tag.name)}
                          title={t("branches.deleteTag")}
                        ><Trash2 size={12} /></button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>
      </div>

      {/* Context Menu */}
      <Show when={contextMenu()}>
        {(menu) => (
          <>
            <div class={styles.contextMenuOverlay} onClick={closeContextMenu} />
            <div
              class={styles.contextMenu}
              style={{ left: `${menu().x}px`, top: `${menu().y}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              <Show when={!menu().isRemote}>
                <Show when={!menu().branch.is_head}>
                  <button
                    class={styles.contextMenuItem}
                    onClick={() => { handleCheckout(menu().branch.name); closeContextMenu(); }}
                  >
                    {t("branches.contextMenu.checkout")}
                  </button>
                  <button
                    class={styles.contextMenuItem}
                    onClick={() => { handleMerge(menu().branch.name); closeContextMenu(); }}
                  >
                    {t("branches.contextMenu.mergeToCurrent")}
                  </button>
                  <button
                    class={styles.contextMenuItem}
                    onClick={() => { handleRebase(menu().branch.name); closeContextMenu(); }}
                  >
                    {t("branches.contextMenu.rebaseTo")}
                  </button>
                  <div class={styles.contextMenuDivider} />
                </Show>
                <button
                  class={styles.contextMenuItem}
                  onClick={() => { handleStartRename(menu().branch.name); closeContextMenu(); }}
                >
                  {t("branches.contextMenu.rename")}
                </button>
                <Show when={!menu().branch.is_head}>
                  <button
                    class={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
                    onClick={() => { handleDelete(menu().branch.name); closeContextMenu(); }}
                  >
                    {t("branches.contextMenu.delete")}
                  </button>
                </Show>
                <div class={styles.contextMenuDivider} />
                <button
                  class={styles.contextMenuItem}
                  onClick={() => handleCreateFromBranch(menu().branch.name)}
                >
                  {t("branches.contextMenu.createFromThis")}
                </button>
              </Show>
              <Show when={menu().isRemote}>
                <button
                  class={styles.contextMenuItem}
                  onClick={() => { handleCheckout(menu().branch.name); closeContextMenu(); }}
                >
                  {t("branches.contextMenu.checkoutRemote")}
                </button>
                <button
                  class={styles.contextMenuItem}
                  onClick={() => handleCreateFromBranch(menu().branch.name)}
                >
                  {t("branches.contextMenu.createFromRemote")}
                </button>
              </Show>
            </div>
          </>
        )}
      </Show>
    </div>
  );
};

export default BranchesView;
