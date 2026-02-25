import { type Component, createSignal, For, Show } from "solid-js";
import X from "lucide-solid/icons/x";
import type { ThemeMode } from "@/stores/settings";
import { useSettings } from "@/stores/settings";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui";
import { useGitHub } from "@/stores/github";
import styles from "./SettingsView.module.css";

const sourceLabels: Record<string, Record<string, string>> = {
  "zh-CN": {
    cached: "已缓存",
    keyring: "系统密钥链",
    gh_cli: "gh CLI 自动检测",
    pat: "手动输入 PAT",
  },
  "en-US": {
    cached: "Cached",
    keyring: "System Keyring",
    gh_cli: "gh CLI auto-detected",
    pat: "Manual PAT",
  },
};

const localeOptions = [
  { value: "zh-CN", label: "中文" },
  { value: "en-US", label: "English" },
];

export interface SettingsViewProps {
  onClose?: () => void;
}

const SettingsView: Component<SettingsViewProps> = (props) => {
  const [settings, settingsActions] = useSettings();
  const { t, locale } = useI18n();
  const [ghState, ghActions] = useGitHub();
  const [token, setToken] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  const [tokenError, setTokenError] = createSignal<string | null>(null);

  const themeOptions = (): { value: ThemeMode; label: string }[] => [
    { value: "light", label: t("settings.themeLight") },
    { value: "dark", label: t("settings.themeDark") },
    { value: "system", label: t("settings.themeSystem") },
  ];

  const getSourceLabel = (source: string | null | undefined) => {
    const loc = locale();
    const labels = sourceLabels[loc] ?? sourceLabels["zh-CN"];
    return labels[source ?? ""] ?? source;
  };

  const handleSaveToken = async () => {
    const tok = token().trim();
    if (!tok) return;
    setTokenError(null);
    setSaving(true);
    try {
      await ghActions.saveToken(tok);
      setToken("");
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class={styles.settings}>
      <div class={styles.header}>
        <span class={styles.title}>{t("settings.title")}</span>
        <Show when={props.onClose}>
          <button class={styles.closeBtn} onClick={() => props.onClose?.()}>
            <X size={16} />
          </button>
        </Show>
      </div>

      <div class={styles.content}>
        {/* 外观设置 */}
        <div class={styles.card}>
          <div class={styles.sectionHeader}>
            <div class={styles.sectionTitle}>{t("settings.appearance")}</div>
          </div>
          <div class={styles.settingRow}>
            <div>
              <div class={styles.settingLabel}>{t("settings.themeMode")}</div>
              <div class={styles.settingDescription}>{t("settings.themeDescription")}</div>
            </div>
            <div class={styles.themeOptions}>
              <For each={themeOptions()}>
                {(option) => (
                  <button
                    class={`${styles.themeOption} ${settings.theme === option.value ? styles.themeOptionActive : ""}`}
                    onClick={() => settingsActions.setTheme(option.value)}
                  >
                    {option.label}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* 语言设置 */}
        <div class={styles.card}>
          <div class={styles.sectionHeader}>
            <div class={styles.sectionTitle}>{t("settings.language")}</div>
          </div>
          <div class={styles.settingRow}>
            <div>
              <div class={styles.settingLabel}>{t("settings.languageLabel")}</div>
              <div class={styles.settingDescription}>{t("settings.languageDescription")}</div>
            </div>
            <div class={styles.themeOptions}>
              <For each={localeOptions}>
                {(option) => (
                  <button
                    class={`${styles.themeOption} ${settings.locale === option.value ? styles.themeOptionActive : ""}`}
                    onClick={() => settingsActions.setLocale(option.value)}
                  >
                    {option.label}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* GitHub 连接管理 */}
        <div class={styles.card}>
          <div class={styles.sectionHeader}>
            <div class={styles.sectionTitle}>{t("settings.github")}</div>
            <div class={styles.sectionDescription}>{t("settings.githubDescription")}</div>
          </div>

          <Show
            when={ghState.isAuthenticated}
            fallback={
              <>
                {/* 未连接状态 */}
                <div class={styles.settingRow}>
                  <div class={styles.statusRow}>
                    <span class={`${styles.statusDot} ${styles.statusDotDisconnected}`} />
                    <span class={styles.statusText}>{t("settings.notConnected")}</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => ghActions.checkAuth()}>
                    {t("settings.recheck")}
                  </Button>
                </div>

                {/* gh CLI 检测提示 */}
                <Show when={ghState.ghCliAvailable}>
                  <div class={styles.infoCard}>
                    {t("settings.ghCliHint")}
                  </div>
                </Show>

                {/* PAT 输入区 */}
                <div class={styles.settingRow} style={{ "flex-direction": "column", "align-items": "stretch" }}>
                  <div class={styles.settingLabel}>{t("settings.patLabel")}</div>
                  <div class={styles.tokenInputRow}>
                    <input
                      type="password"
                      placeholder={t("settings.patPlaceholder")}
                      value={token()}
                      onInput={(e) => setToken(e.currentTarget.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveToken(); }}
                      class={styles.tokenInput}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveToken}
                      disabled={!token().trim() || saving()}
                      loading={saving()}
                    >
                      {t("settings.save")}
                    </Button>
                  </div>
                  <div class={styles.hintText}>
                    {t("settings.patHint")}
                  </div>
                  <Show when={tokenError()}>
                    <div class={styles.errorText}>{tokenError()}</div>
                  </Show>
                </div>
              </>
            }
          >
            {/* 已连接状态 */}
            <div class={styles.settingRow}>
              <div class={styles.statusRow}>
                <span class={`${styles.statusDot} ${styles.statusDotConnected}`} />
                <span class={styles.statusText}>{t("settings.connected")}</span>
                <span class={styles.statusSource}>
                  — {getSourceLabel(ghState.authSource)}
                </span>
              </div>
              <Button variant="danger" size="sm" onClick={() => ghActions.logout()}>
                {t("settings.disconnect")}
              </Button>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
