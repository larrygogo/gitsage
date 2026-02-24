import { type Component, createSignal, Show, For, onMount } from "solid-js";
import { Button } from "@/components/ui";
import type { BranchInfo } from "@/types";
import styles from "./BranchesView.module.css";

const BranchesView: Component = () => {
  const [branches, setBranches] = createSignal<BranchInfo[]>([]);
  const [newBranchName, setNewBranchName] = createSignal("");

  const localBranches = () => branches().filter((b) => !b.is_remote);
  const remoteBranches = () => branches().filter((b) => b.is_remote);

  onMount(async () => {
    try {
      // TODO: 从 store 或 service 获取分支列表
      // const list = await gitService.getBranches();
      // setBranches(list);
      setBranches([]);
    } catch (err) {
      console.error("[BranchesView] 获取分支失败:", err);
    }
  });

  const handleCreateBranch = async () => {
    const name = newBranchName().trim();
    if (!name) return;
    try {
      // TODO: 调用 git service 创建分支
      console.log("[BranchesView] create branch:", name);
      setNewBranchName("");
    } catch (err) {
      console.error("[BranchesView] 创建分支失败:", err);
    }
  };

  const handleCheckout = async (name: string) => {
    try {
      // TODO: 调用 git service 切换分支
      console.log("[BranchesView] checkout:", name);
    } catch (err) {
      console.error("[BranchesView] 切换分支失败:", err);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      // TODO: 调用 git service 删除分支（可加确认弹窗）
      console.log("[BranchesView] delete:", name);
    } catch (err) {
      console.error("[BranchesView] 删除分支失败:", err);
    }
  };

  const renderTrackingInfo = (branch: BranchInfo) => {
    if (branch.ahead === 0 && branch.behind === 0) return null;
    return (
      <span class={styles.trackingInfo}>
        <Show when={branch.ahead > 0}>
          <span class={styles.ahead}>{"\u2191"}{branch.ahead}</span>
        </Show>
        <Show when={branch.behind > 0}>
          <span class={styles.behind}>{"\u2193"}{branch.behind}</span>
        </Show>
      </span>
    );
  };

  return (
    <div class={styles.branches}>
      {/* 顶部标题栏 */}
      <div class={styles.header}>
        <span class={styles.title}>分支管理</span>
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
                    <span class={styles.branchIcon}>{"\u2442"}</span>
                    <span class={styles.branchName}>{branch.name}</span>
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
                          {"\u21B5"}
                        </button>
                        <button
                          class={`${styles.branchActionBtn} ${styles.danger}`}
                          onClick={() => handleDelete(branch.name)}
                          title="删除分支"
                        >
                          {"\u2715"}
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
                    <span class={styles.branchIcon}>{"\u2601"}</span>
                    <span class={styles.branchName}>{branch.name}</span>
                    {renderTrackingInfo(branch)}
                    <div class={styles.branchActions}>
                      <button
                        class={styles.branchActionBtn}
                        onClick={() => handleCheckout(branch.name)}
                        title="检出远程分支"
                      >
                        {"\u21B5"}
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default BranchesView;
