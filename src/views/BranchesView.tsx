import { type Component, createSignal, Show, For } from "solid-js";
import RefreshCw from "lucide-solid/icons/refresh-cw";
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
import { Button } from "@/components/ui";
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
  onFetch?: () => Promise<void>;
  onPull?: () => Promise<void>;
  onPush?: () => Promise<void>;
  onPullRebase?: () => Promise<void>;
}

const BranchesView: Component<BranchesViewProps> = (props) => {
  const [newBranchName, setNewBranchName] = createSignal("");
  const [renamingBranch, setRenamingBranch] = createSignal<string | null>(null);
  const [renameValue, setRenameValue] = createSignal("");
  const [showTagSection, setShowTagSection] = createSignal(true);
  const [newTagName, setNewTagName] = createSignal("");
  const [newTagMessage, setNewTagMessage] = createSignal("");
  const [syncing, setSyncing] = createSignal(false);

  const branches = () => props.branches ?? [];
  const tags = () => props.tags ?? [];
  const localBranches = () => branches().filter((b) => !b.is_remote);
  const remoteBranches = () => branches().filter((b) => b.is_remote);

  const wrapSync = async (fn?: () => Promise<void>) => {
    if (!fn) return;
    setSyncing(true);
    try { await fn(); } finally { setSyncing(false); }
  };

  const handleCreateBranch = async () => {
    const name = newBranchName().trim();
    if (!name) return;
    try {
      await props.onCreateBranch?.(name);
      setNewBranchName("");
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

  return (
    <div class={styles.branches}>
      {/* 顶部标题栏 */}
      <div class={styles.header}>
        <span class={styles.title}>分支管理</span>
        {/* 远程同步操作 */}
        <div style={{ display: "flex", gap: "4px", "margin-left": "auto" }}>
          <button
            style={{
              display: "inline-flex", "align-items": "center", gap: "4px",
              padding: "4px 10px", background: "none", border: "1px solid var(--gs-border-primary)",
              "border-radius": "4px", cursor: "pointer", color: "var(--gs-text-secondary)",
              "font-size": "12px",
            }}
            onClick={() => wrapSync(props.onFetch)}
            disabled={syncing()}
            title="Fetch - 获取远程更新"
          >
            <RefreshCw size={12} />
            Fetch
          </button>
          <button
            style={{
              display: "inline-flex", "align-items": "center", gap: "4px",
              padding: "4px 10px", background: "none", border: "1px solid var(--gs-border-primary)",
              "border-radius": "4px", cursor: "pointer", color: "var(--gs-text-secondary)",
              "font-size": "12px",
            }}
            onClick={() => wrapSync(props.onPull)}
            disabled={syncing()}
            title="Pull - 拉取远程变更"
          >
            <ArrowDown size={12} />
            Pull
          </button>
          <button
            style={{
              display: "inline-flex", "align-items": "center", gap: "4px",
              padding: "4px 10px", background: "none", border: "1px solid var(--gs-border-primary)",
              "border-radius": "4px", cursor: "pointer", color: "var(--gs-text-secondary)",
              "font-size": "12px",
            }}
            onClick={() => wrapSync(props.onPush)}
            disabled={syncing()}
            title="Push - 推送本地变更"
          >
            <ArrowUp size={12} />
            Push
          </button>
          <button
            style={{
              display: "inline-flex", "align-items": "center", gap: "4px",
              padding: "4px 10px", background: "none", border: "1px solid var(--gs-border-primary)",
              "border-radius": "4px", cursor: "pointer", color: "var(--gs-text-secondary)",
              "font-size": "12px",
            }}
            onClick={() => wrapSync(props.onPullRebase)}
            disabled={syncing()}
            title="Pull (Rebase) - 变基拉取"
          >
            <RefreshCw size={12} />
            Pull Rebase
          </button>
        </div>
      </div>

      {/* 新建分支 */}
      <div class={styles.createSection}>
        <input
          class={styles.createInput}
          placeholder="输入新分支名称..."
          value={newBranchName()}
          onInput={(e) => setNewBranchName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreateBranch();
            }
          }}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateBranch}
          disabled={!newBranchName().trim()}
        >
          新建
        </Button>
      </div>

      {/* 分支列表 */}
      <div class={styles.content}>
        {/* 本地分支 */}
        <div class={styles.group}>
          <div class={styles.groupHeader}>
            本地分支
            <span class={styles.groupCount}>{localBranches().length}</span>
          </div>
          <Show
            when={localBranches().length > 0}
            fallback={
              <div class={styles.emptyState}>
                <span class={styles.emptyText}>暂无本地分支</span>
              </div>
            }
          >
            <div class={styles.branchList}>
              <For each={localBranches()}>
                {(branch) => (
                  <div
                    class={`${styles.branchItem} ${branch.is_head ? styles.current : ""}`}
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
                      <span class={styles.currentBadge}>当前</span>
                    </Show>
                    {renderTrackingInfo(branch)}
                    <Show when={!branch.is_head}>
                      <div class={styles.branchActions}>
                        <button
                          class={styles.branchActionBtn}
                          onClick={() => handleCheckout(branch.name)}
                          title="切换到此分支"
                        >
                          <CornerDownLeft size={12} /> 切换
                        </button>
                        <button
                          class={styles.branchActionBtn}
                          onClick={() => handleMerge(branch.name)}
                          title="合并到当前分支"
                        >
                          <GitMerge size={12} /> 合并
                        </button>
                        <button
                          class={styles.branchActionBtn}
                          onClick={() => handleRebase(branch.name)}
                          title="变基到此分支"
                        >
                          <ArrowRightLeft size={12} /> 变基
                        </button>
                        <button
                          class={styles.branchActionBtn}
                          onClick={() => handleStartRename(branch.name)}
                          title="重命名"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          class={`${styles.branchActionBtn} ${styles.danger}`}
                          onClick={() => handleDelete(branch.name)}
                          title="删除分支"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* 远程分支 */}
        <div class={styles.group}>
          <div class={styles.groupHeader}>
            远程分支
            <span class={styles.groupCount}>{remoteBranches().length}</span>
          </div>
          <Show
            when={remoteBranches().length > 0}
            fallback={
              <div class={styles.emptyState}>
                <span class={styles.emptyText}>暂无远程分支</span>
              </div>
            }
          >
            <div class={styles.branchList}>
              <For each={remoteBranches()}>
                {(branch) => (
                  <div class={styles.branchItem}>
                    <span class={styles.branchIcon}><Cloud size={14} /></span>
                    <span class={styles.branchName}>{branch.name}</span>
                    {renderTrackingInfo(branch)}
                    <div class={styles.branchActions}>
                      <button
                        class={styles.branchActionBtn}
                        onClick={() => handleCheckout(branch.name)}
                        title="检出远程分支"
                      >
                        <CornerDownLeft size={12} /> 检出
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* 标签 */}
        <div class={styles.group}>
          <div class={styles.groupHeader}>
            <button
              style={{ display: "flex", "align-items": "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "inherit", "font-size": "inherit", "font-weight": "inherit" }}
              onClick={() => setShowTagSection(!showTagSection())}
            >
              {showTagSection() ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              标签
            </button>
            <span class={styles.groupCount}>{tags().length}</span>
          </div>
          <Show when={showTagSection()}>
            {/* 新建标签 */}
            <div style={{ display: "flex", gap: "6px", padding: "8px 16px" }}>
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
                placeholder="标签名称"
                value={newTagName()}
                onInput={(e) => setNewTagName(e.currentTarget.value)}
              />
              <Button variant="ghost" size="sm" onClick={handleCreateTag} disabled={!newTagName().trim()}>
                创建
              </Button>
            </div>
            <Show
              when={tags().length > 0}
              fallback={<div class={styles.emptyState}><span class={styles.emptyText}>暂无标签</span></div>}
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
                          title="删除标签"
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
    </div>
  );
};

export default BranchesView;
