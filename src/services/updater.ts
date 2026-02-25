import { check, type Update } from "@tauri-apps/plugin-updater";

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body: string;
  date: string | null;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percent: number;
}

/**
 * 检查是否有新版本可用
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const update = await check();
  if (!update) return null;

  return {
    version: update.version,
    currentVersion: update.currentVersion,
    body: update.body ?? "",
    date: update.date ?? null,
  };
}

/**
 * 下载并安装更新
 */
export async function downloadAndInstall(
  onProgress?: (progress: UpdateProgress) => void,
): Promise<void> {
  const update = await check();
  if (!update) throw new Error("No update available");

  let downloaded = 0;
  let total = 0;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = (event.data as { contentLength?: number }).contentLength ?? 0;
    } else if (event.event === "Progress") {
      const chunkLen = (event.data as { chunkLength: number }).chunkLength;
      downloaded += chunkLen;
      onProgress?.({
        downloaded,
        total,
        percent: total > 0 ? Math.min((downloaded / total) * 100, 100) : 0,
      });
    } else if (event.event === "Finished") {
      onProgress?.({ downloaded: total, total, percent: 100 });
    }
  });
}
