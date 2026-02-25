import { type Component, createSignal, Show, For, onMount } from "solid-js";
import GitPullRequest from "lucide-solid/icons/git-pull-request";
import Plus from "lucide-solid/icons/plus";
import { useGitHub } from "@/stores/github";
import { useI18n } from "@/i18n";
import { GitHubAuth } from "@/components/github/GitHubAuth";
import { PrDetailPanel } from "@/components/pr/PrDetailPanel";
import { CreatePrDialog } from "@/components/pr/CreatePrDialog";
import type { PullRequestSummary } from "@/types";
import styles from "./PullsView.module.css";

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

const PullsView: Component = () => {
  const { t } = useI18n();
  const [ghState, ghActions] = useGitHub();
  const [selectedPr, setSelectedPr] = createSignal<PullRequestSummary | null>(null);
  const [showCreateDialog, setShowCreateDialog] = createSignal(false);

  onMount(async () => {
    await ghActions.checkAuth();
    if (ghState.isAuthenticated && ghState.ghRepo) {
      await ghActions.loadPulls();
    }
  });

  const handleSelectPr = async (pr: PullRequestSummary) => {
    setSelectedPr(pr);
    await ghActions.loadPullDetail(pr.number);
  };

  const openPulls = () => ghState.pulls.filter((pr) => pr.state === "open");
  const closedPulls = () => ghState.pulls.filter((pr) => pr.state === "closed");

  const filteredPulls = () => {
    if (ghState.pullFilter === "open") return openPulls();
    if (ghState.pullFilter === "closed") return closedPulls();
    return ghState.pulls;
  };

  const hasDetail = () => !!selectedPr();

  /** PR 列表行渲染 */
  const PrRow = (prProps: { pr: PullRequestSummary }) => {
    const pr = prProps.pr;
    const isActive = () => selectedPr()?.number === pr.number;
    const statusClass = pr.state === "open" ? styles.prStatusOpen : styles.prStatusClosed;

    return (
      <div
        class={`${styles.prRow} ${isActive() ? styles.prRowActive : ""}`}
        onClick={() => handleSelectPr(pr)}
      >
        <div class={`${styles.prStatusIcon} ${statusClass}`}>
          <GitPullRequest size={14} />
        </div>
        <div class={styles.prInfo}>
          <span class={styles.prTitle} title={pr.title}>{pr.title}</span>
          <div class={styles.prMeta}>
            <span class={styles.prNumber}>#{pr.number}</span>
            <span class={styles.prAuthor}>{pr.user.login}</span>
            <span class={styles.prTime}>opened {formatRelativeTime(pr.created_at)}</span>
            <Show when={pr.head?.ref_name && pr.base?.ref_name}>
              <span class={styles.prBranch}>
                {pr.head.ref_name} → {pr.base.ref_name}
              </span>
            </Show>
          </div>
        </div>
        <Show when={pr.draft}>
          <div class={styles.prRight}>
            <span class={styles.prReviews}>Draft</span>
          </div>
        </Show>
      </div>
    );
  };

  /** Tab Bar 组件 */
  const TabBar = () => (
    <div class={styles.tabBar}>
      <button
        class={`${styles.tab} ${ghState.pullFilter === "open" ? styles.tabActive : ""}`}
        onClick={() => ghActions.setPullFilter("open")}
      >
        <span class={styles.tabText}>{t("pulls.open")}</span>
        <span class={styles.tabCount}>{openPulls().length}</span>
      </button>
      <button
        class={`${styles.tab} ${ghState.pullFilter === "closed" ? styles.tabActive : ""}`}
        onClick={() => ghActions.setPullFilter("closed")}
      >
        <span class={styles.tabText}>{t("pulls.closed")}</span>
        <span class={styles.tabCount}>{closedPulls().length}</span>
      </button>
    </div>
  );

  /** PR 列表 */
  const PrListContent = () => (
    <div class={styles.prList}>
      <For each={filteredPulls()}>
        {(pr) => <PrRow pr={pr} />}
      </For>
    </div>
  );

  return (
    <div class={styles.pullsView}>
      {/* Top Bar */}
      <div class={styles.topBar}>
        <div class={styles.topBarLeft}>
          <span class={styles.topBarTitle}>{t("pulls.title")}</span>
          <Show when={openPulls().length > 0}>
            <span class={styles.topBarBadge}>{openPulls().length} open</span>
          </Show>
        </div>
        <div class={styles.topBarRight}>
          <Show when={!ghState.isAuthenticated}>
            <div class={styles.authStatus}>
              <span class={`${styles.authDot} ${styles.authDotDisconnected}`} />
              {t("pulls.notConnected")}
            </div>
          </Show>
          <button class={styles.newPrBtn} onClick={() => setShowCreateDialog(true)}>
            <Plus size={14} />
            <span>{t("pulls.newPr")}</span>
          </button>
        </div>
      </div>

      <Show
        when={ghState.isAuthenticated}
        fallback={
          <div class={styles.emptyState}>
            <GitHubAuth />
          </div>
        }
      >
        <Show when={!ghState.isLoading} fallback={<div class={styles.loading}>{t("pulls.loading")}</div>}>
          <Show
            when={filteredPulls().length > 0}
            fallback={
              <>
                <TabBar />
                <div class={styles.emptyState}>
                  <span class={styles.emptyIcon}><GitPullRequest size={36} /></span>
                  <span class={styles.emptyText}>{t("pulls.noPulls")}</span>
                </div>
              </>
            }
          >
            {/* Split layout: list | detail when PR selected */}
            <Show
              when={hasDetail()}
              fallback={
                <>
                  <TabBar />
                  <PrListContent />
                </>
              }
            >
              <div class={styles.content}>
                {/* Left Panel (380px) */}
                <div class={styles.leftPanel}>
                  <TabBar />
                  <PrListContent />
                </div>

                {/* Right Detail Panel */}
                <PrDetailPanel
                  onClose={() => { setSelectedPr(null); ghActions.clearCurrentPull(); }}
                />
              </div>
            </Show>
          </Show>
        </Show>
      </Show>

      {/* Create PR Dialog */}
      <Show when={showCreateDialog()}>
        <CreatePrDialog onClose={() => setShowCreateDialog(false)} />
      </Show>
    </div>
  );
};

export default PullsView;
