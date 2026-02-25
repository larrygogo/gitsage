import { type Component, createSignal, Show, For, onMount } from "solid-js";
import GitBranch from "lucide-solid/icons/git-branch";
import Search from "lucide-solid/icons/search";
import Zap from "lucide-solid/icons/zap";
import FolderOpen from "lucide-solid/icons/folder-open";
import Download from "lucide-solid/icons/download";
import { useI18n } from "@/i18n";
import type { RepoEntry } from "@/types";
import { getRecentRepos } from "@/services/git";
import styles from "./WelcomeView.module.css";

export interface WelcomeViewProps {
  onOpenRepo?: (path: string) => void;
  onCloneRepo?: () => void;
  onInitRepo?: () => void;
  onViewAll?: () => void;
}

const WelcomeView: Component<WelcomeViewProps> = (props) => {
  const { t } = useI18n();
  const [recentRepos, setRecentRepos] = createSignal<RepoEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [searchQuery, setSearchQuery] = createSignal("");

  onMount(async () => {
    try {
      const repos = await getRecentRepos();
      setRecentRepos(repos);
    } catch (err) {
      console.error("[WelcomeView] 获取最近仓库失败:", err);
    }
  });

  const MAX_VISIBLE = 3;

  const filteredRepos = () => {
    const q = searchQuery().toLowerCase();
    const all = !q
      ? recentRepos()
      : recentRepos().filter(
          (r) => r.name.toLowerCase().includes(q) || r.path.toLowerCase().includes(q)
        );
    // 搜索时显示全部结果；非搜索时截断到 MAX_VISIBLE
    if (q) return all;
    return all.slice(0, MAX_VISIBLE);
  };

  const hasMore = () => {
    const q = searchQuery().toLowerCase();
    if (q) return false;
    return recentRepos().length > MAX_VISIBLE;
  };

  const remainingCount = () => recentRepos().length - MAX_VISIBLE;

  const handleOpenRepo = () => {
    props.onOpenRepo?.("");
  };

  const handleCloneRepo = () => {
    props.onCloneRepo?.();
  };

  const handleRecentClick = (entry: RepoEntry, index: number) => {
    setSelectedIndex(index);
    props.onOpenRepo?.(entry.path);
  };

  return (
    <div class={styles.welcome}>
      {/* Left Brand Panel */}
      <div class={styles.leftPanel}>
        <div class={styles.glowEffect} />
        <div class={styles.contentWrapper}>
          {/* Brand Section */}
          <div class={styles.brandSection}>
            {/* Logo Row */}
            <div class={styles.logoRow}>
              <div class={styles.logoIcon}>
                <GitBranch size={24} />
              </div>
              <span class={styles.logoText}>GitSage</span>
            </div>

            {/* Hero Text */}
            <div class={styles.heroText}>
              <h1 class={styles.heroTitleMuted}>{t("welcome.heroTitleMuted")}</h1>
              <h1 class={styles.heroTitleBold}>{t("welcome.heroTitleBold")}</h1>
              <p class={styles.heroSubtitle}>
                {t("welcome.heroSubtitle")}
              </p>
            </div>

            {/* Feature List */}
            <div class={styles.featureList}>
              <div class={styles.featureItem}>
                <div class={styles.featureIcon}>
                  <GitBranch size={16} />
                </div>
                <span class={styles.featureText}>{t("welcome.feature1")}</span>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.featureIcon}>
                  <Search size={16} />
                </div>
                <span class={styles.featureText}>{t("welcome.feature2")}</span>
              </div>
              <div class={styles.featureItem}>
                <div class={styles.featureIcon}>
                  <Zap size={16} />
                </div>
                <span class={styles.featureText}>{t("welcome.feature3")}</span>
              </div>
            </div>

            {/* Version Info */}
            <div class={styles.versionInfo}>
              <span class={styles.versionText}>v1.0.0</span>
              <span class={styles.versionDot} />
              <span class={styles.versionText}>Ready</span>
            </div>
          </div>

          {/* Shortcut Bar */}
          <div class={styles.shortcutBar}>
            <div class={styles.shortcutItem}>
              <span class={styles.shortcutKey}>O</span>
              <span class={styles.shortcutLabel}>Open</span>
            </div>
            <div class={styles.shortcutItem}>
              <span class={styles.shortcutKey}>N</span>
              <span class={styles.shortcutLabel}>New</span>
            </div>
            <div class={styles.shortcutItem}>
              <span class={styles.shortcutKey}>S</span>
              <span class={styles.shortcutLabel}>Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Content Panel */}
      <div class={styles.rightPanel}>
        <div class={styles.rightContent}>
          {/* Header */}
          <div class={styles.header}>
            <h2 class={styles.headerTitle}>{t("welcome.openRepo")}</h2>
            <p class={styles.headerDesc}>{t("welcome.selectRepo")}</p>
          </div>

          {/* Search Box */}
          <div class={styles.searchBox}>
            <span class={styles.searchIcon}>
              <Search size={18} />
            </span>
            <input
              class={styles.searchInput}
              type="text"
              placeholder={t("welcome.searchRepos")}
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
            <span class={styles.searchBadge}>/</span>
          </div>

          {/* Recent Label + View All */}
          <div class={styles.recentLabel}>
            <div class={styles.recentLabelLeft}>
              <span class={styles.recentDot} />
              <span class={styles.recentText}>RECENT</span>
            </div>
            <Show when={hasMore()}>
              <button class={styles.viewAllLink} onClick={() => props.onViewAll?.()}>
                {t("welcome.viewAll")} ({recentRepos().length})
              </button>
            </Show>
          </div>

          {/* Repo List */}
          <Show
            when={filteredRepos().length > 0}
            fallback={<div class={styles.emptyRecent}>{t("welcome.noRecentRepos")}</div>}
          >
            <div class={styles.repoList}>
              <For each={filteredRepos()}>
                {(entry, index) => (
                  <button
                    class={`${styles.repoItem} ${index() === selectedIndex() ? styles.repoItemActive : ""}`}
                    onClick={() => handleRecentClick(entry, index())}
                  >
                    <span class={styles.repoName}>{entry.name}</span>
                    <span class={styles.repoPath}>{entry.path}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>

          {/* Divider */}
          <div class={styles.divider} />

          {/* Action Buttons */}
          <div class={styles.actionButtons}>
            <button class={styles.openFolderBtn} onClick={handleOpenRepo}>
              <FolderOpen size={18} />
              {t("welcome.openFolder")}
            </button>
            <button class={styles.cloneBtn} onClick={handleCloneRepo}>
              <Download size={18} />
              {t("welcome.cloneRepo")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeView;
