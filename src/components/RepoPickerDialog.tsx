import { type Component, createSignal, createEffect, Show, For, onCleanup } from "solid-js";
import Search from "lucide-solid/icons/search";
import Lock from "lucide-solid/icons/lock";
import { useI18n } from "@/i18n";
import type { RepoEntry, GitHubRepoInfo } from "@/types";
import { getRecentRepos } from "@/services/git";
import * as githubService from "@/services/github";
import { useGitHub } from "@/stores/github";
import { logger } from "@/utils/logger";
import styles from "./RepoPickerDialog.module.css";

export interface RepoPickerDialogProps {
  open: boolean;
  /** 仅显示远程 GitHub 搜索，隐藏本地 RECENT 区域 */
  remoteOnly?: boolean;
  onClose: () => void;
  onOpenRepo: (path: string) => void;
  onCloneRepo: (cloneUrl: string) => void;
}

const RepoPickerDialog: Component<RepoPickerDialogProps> = (props) => {
  const { t } = useI18n();
  const [ghState] = useGitHub();
  const [searchQuery, setSearchQuery] = createSignal("");
  const [recentRepos, setRecentRepos] = createSignal<RepoEntry[]>([]);
  const [ghRepos, setGhRepos] = createSignal<GitHubRepoInfo[]>([]);
  const [ghLoading, setGhLoading] = createSignal(false);

  let inputRef: HTMLInputElement | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  const isRemoteOnly = () => !!props.remoteOnly;

  // 打开时加载本地仓库 & 重置状态
  createEffect(() => {
    if (props.open) {
      setSearchQuery("");
      setGhRepos([]);
      setGhLoading(false);
      if (!isRemoteOnly()) {
        loadRecentRepos();
      }
      setTimeout(() => inputRef?.focus(), 50);
    }
  });

  // 搜索关键词变化时，防抖搜索 GitHub
  createEffect(() => {
    const q = searchQuery().trim();
    if (debounceTimer) clearTimeout(debounceTimer);

    if (!q || !ghState.isAuthenticated) {
      setGhRepos([]);
      setGhLoading(false);
      return;
    }

    setGhLoading(true);
    debounceTimer = setTimeout(() => {
      searchGhRepos(q);
    }, 350);
  });

  const loadRecentRepos = async () => {
    try {
      const repos = await getRecentRepos();
      setRecentRepos(repos);
    } catch (err) {
      logger.error("RepoPickerDialog", "获取最近仓库失败:", err);
    }
  };

  const searchGhRepos = async (query: string) => {
    try {
      const repos = await githubService.searchRepos(query, 20);
      // 只更新仍匹配当前关键词的结果
      if (searchQuery().trim() === query) {
        setGhRepos(repos);
      }
    } catch (err) {
      logger.error("RepoPickerDialog", "搜索 GitHub 仓库失败:", err);
    } finally {
      if (searchQuery().trim() === query) {
        setGhLoading(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onClose();
    }
  };

  const filteredRecent = () => {
    const q = searchQuery().toLowerCase();
    if (!q) return recentRepos();
    return recentRepos().filter(
      (r) => r.name.toLowerCase().includes(q) || r.path.toLowerCase().includes(q),
    );
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  const hasQuery = () => searchQuery().trim().length > 0;

  const searchPlaceholder = () =>
    isRemoteOnly() ? t("welcome.searchRepos") : t("welcome.searchRepos");

  return (
    <Show when={props.open}>
      <div class={styles.overlay} onClick={handleOverlayClick} onKeyDown={handleKeyDown}>
        <div class={styles.card}>
          {/* Header: search */}
          <div class={styles.header}>
            <span class={styles.searchIcon}>
              <Search size={18} />
            </span>
            <input
              ref={inputRef}
              class={styles.searchInput}
              type="text"
              placeholder={searchPlaceholder()}
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
            <span class={styles.shortcutHint}>ESC</span>
          </div>

          {/* Scrollable content */}
          <div class={styles.content}>
            {/* RECENT section — 非 remoteOnly 时显示 */}
            <Show when={!isRemoteOnly()}>
              <div class={styles.section}>
                <div class={styles.sectionLabel}>
                  <span class={styles.sectionDot} />
                  <span class={styles.sectionText}>RECENT</span>
                </div>
                <Show
                  when={filteredRecent().length > 0}
                  fallback={<div class={styles.emptyText}>{t("welcome.noRecentRepos")}</div>}
                >
                  <For each={filteredRecent()}>
                    {(entry) => (
                      <button
                        class={styles.repoItem}
                        onClick={() => {
                          props.onOpenRepo(entry.path);
                          props.onClose();
                        }}
                      >
                        <span class={styles.repoName}>{entry.name}</span>
                        <span class={styles.repoPath}>{entry.path}</span>
                      </button>
                    )}
                  </For>
                </Show>
              </div>
            </Show>

            {/* GITHUB section */}
            <Show when={ghState.isAuthenticated && (isRemoteOnly() || hasQuery())}>
              <div class={styles.section}>
                <div class={styles.sectionLabel}>
                  <span class={styles.sectionDotGithub} />
                  <span class={styles.sectionText}>GITHUB</span>
                </div>
                <Show when={!hasQuery() && isRemoteOnly()}>
                  <div class={styles.emptyText}>{t("common.search")}</div>
                </Show>
                <Show when={hasQuery()}>
                  <Show when={ghLoading()}>
                    <div class={styles.loadingText}>{t("common.loading")}</div>
                  </Show>
                  <Show when={!ghLoading()}>
                    <Show
                      when={ghRepos().length > 0}
                      fallback={<div class={styles.emptyText}>{t("pulls.noPulls")}</div>}
                    >
                      <For each={ghRepos()}>
                        {(repo) => (
                          <button
                            class={styles.ghRepoItem}
                            onClick={() => {
                              props.onCloneRepo(repo.clone_url);
                              props.onClose();
                            }}
                          >
                            <div class={styles.ghRepoInfo}>
                              <span class={styles.ghRepoFullName}>{repo.full_name}</span>
                              <Show when={repo.description}>
                                <span class={styles.ghRepoDesc}>{repo.description}</span>
                              </Show>
                            </div>
                            <div class={styles.ghRepoBadge}>
                              <Show when={repo.private}>
                                <span class={styles.privateBadge}>
                                  <Lock size={10} /> private
                                </span>
                              </Show>
                            </div>
                          </button>
                        )}
                      </For>
                    </Show>
                  </Show>
                </Show>
              </div>
            </Show>

            {/* remoteOnly 但未认证 GitHub 时的提示 */}
            <Show when={isRemoteOnly() && !ghState.isAuthenticated}>
              <div class={styles.section}>
                <div class={styles.emptyText}>{t("pulls.notConnected")}</div>
              </div>
            </Show>
          </div>

          {/* Footer hints */}
          <div class={styles.footer}>
            <div class={styles.footerHints}>
              <div class={styles.footerHint}>
                <span class={styles.footerKey}>Enter</span>
                <span>{t("welcome.open")}</span>
              </div>
              <div class={styles.footerHint}>
                <span class={styles.footerKey}>ESC</span>
                <span>{t("common.close")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default RepoPickerDialog;
