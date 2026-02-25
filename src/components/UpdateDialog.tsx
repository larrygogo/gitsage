import { type Component, Show, Switch, Match } from "solid-js";
import Modal from "@/components/ui/Modal";
import { useUpdater } from "@/stores/updater";
import { useI18n } from "@/i18n";
import styles from "./UpdateDialog.module.css";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const UpdateDialog: Component = () => {
  const [state, actions] = useUpdater();
  const { t } = useI18n();

  const footer = () => {
    switch (state.status) {
      case "available":
        return (
          <>
            <button class="gs-btn gs-btn-ghost" onClick={() => actions.remindLater()}>
              {t("updater.remindLater")}
            </button>
            <button class="gs-btn gs-btn-primary" onClick={() => actions.downloadAndInstall()}>
              {t("updater.installNow")}
            </button>
          </>
        );
      case "error":
        return (
          <>
            <button class="gs-btn gs-btn-ghost" onClick={() => actions.dismissDialog()}>
              {t("common.close")}
            </button>
            <button class="gs-btn gs-btn-primary" onClick={() => actions.checkUpdate()}>
              {t("updater.retry")}
            </button>
          </>
        );
      case "up-to-date":
        return (
          <button class="gs-btn gs-btn-primary" onClick={() => actions.dismissDialog()}>
            {t("common.confirm")}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      open={state.dialogOpen}
      onClose={() => actions.dismissDialog()}
      title={t("updater.title")}
      footer={footer()}
    >
      <div class={styles.body}>
        <Switch>
          {/* 有新版本 */}
          <Match when={state.status === "available"}>
            <div class={styles.versionInfo}>
              <span class={styles.versionLabel}>{t("updater.newVersion")}</span>
              <span class={styles.versionValue}>v{state.updateInfo?.version}</span>
            </div>
            <Show when={state.updateInfo?.body}>
              <div class={styles.releaseNotes}>{state.updateInfo!.body}</div>
            </Show>
          </Match>

          {/* 下载中 */}
          <Match when={state.status === "downloading"}>
            <div class={styles.progressArea}>
              <span>{t("updater.downloading")}</span>
              <div class={styles.progressBar}>
                <div
                  class={styles.progressFill}
                  style={{ width: `${state.progress?.percent ?? 0}%` }}
                />
              </div>
              <div class={styles.progressText}>
                <span>{(state.progress?.percent ?? 0).toFixed(0)}%</span>
                <span>
                  {formatBytes(state.progress?.downloaded ?? 0)} / {formatBytes(state.progress?.total ?? 0)}
                </span>
              </div>
            </div>
          </Match>

          {/* 下载完成 */}
          <Match when={state.status === "ready"}>
            <div class={styles.readyMessage}>{t("updater.restartMessage")}</div>
          </Match>

          {/* 错误 */}
          <Match when={state.status === "error"}>
            <div class={styles.errorMessage}>{state.errorMessage}</div>
          </Match>

          {/* 已是最新 */}
          <Match when={state.status === "up-to-date"}>
            <div class={styles.upToDate}>{t("updater.upToDate")}</div>
          </Match>

          {/* 检查中 */}
          <Match when={state.status === "checking"}>
            <div class={styles.upToDate}>{t("updater.checking")}</div>
          </Match>
        </Switch>
      </div>
    </Modal>
  );
};

export default UpdateDialog;
