import { type Component, createSignal, Show } from "solid-js";
import { Button } from "@/components/ui";
import { useGitHub } from "@/stores/github";
import styles from "./GitHubAuth.module.css";

export const GitHubAuth: Component = () => {
  const [ghState, ghActions] = useGitHub();
  const [token, setToken] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const handleSaveToken = async () => {
    const t = token().trim();
    if (!t) return;
    setError(null);
    setSaving(true);
    try {
      await ghActions.saveToken(t);
      setToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    ghActions.checkAuth();
  };

  return (
    <div class={styles.container}>
      {/* GitHub Icon */}
      <div class={styles.icon}>
        <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      </div>

      {/* Title Area */}
      <div class={styles.titleArea}>
        <div class={styles.title}>连接 GitHub</div>
        <div class={styles.subtitle}>管理 Pull Requests、Code Review 和协作</div>
      </div>

      {/* gh CLI Detection Card */}
      <Show when={ghState.ghCliAvailable && !ghState.isAuthenticated}>
        <div class={styles.cliCard}>
          <span>
            检测到已安装 gh CLI，但未获取到有效 token。请运行 <code>gh auth login</code> 登录后重试，或手动输入 PAT。
          </span>
          <div class={styles.cliCardActions}>
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              重新检测
            </Button>
          </div>
        </div>
      </Show>

      {/* PAT Input Card */}
      <div class={styles.patCard}>
        <div class={styles.patLabel}>Personal Access Token</div>
        <div class={styles.patInputRow}>
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxx"
            value={token()}
            onInput={(e) => setToken(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveToken(); }}
            class={styles.patInput}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveToken}
            disabled={!token().trim() || saving()}
            loading={saving()}
          >
            保存
          </Button>
        </div>
        <div class={styles.patHint}>
          需要 <code>repo</code> 权限。
          <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer">
            创建 Token ↗
          </a>
        </div>
      </div>

      {/* Error Card */}
      <Show when={error()}>
        <div class={styles.errorCard}>{error()}</div>
      </Show>
    </div>
  );
};
