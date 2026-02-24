import { createEffect, onCleanup } from "solid-js";

export type ThemeMode = "light" | "dark" | "system";

/**
 * 主题 Hook
 * 读取当前主题设置，根据 theme 值设置 document.documentElement 的 data-theme 属性。
 * 当 theme 为 "system" 时，监听 prefers-color-scheme 媒体查询自动切换。
 */
export function useTheme(getTheme: () => ThemeMode): void {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const applyTheme = (mode: ThemeMode) => {
    let resolved: "light" | "dark";
    if (mode === "system") {
      resolved = mediaQuery.matches ? "dark" : "light";
    } else {
      resolved = mode;
    }
    document.documentElement.setAttribute("data-theme", resolved);
  };

  const handleMediaChange = () => {
    if (getTheme() === "system") {
      applyTheme("system");
    }
  };

  createEffect(() => {
    const theme = getTheme();
    applyTheme(theme);
  });

  mediaQuery.addEventListener("change", handleMediaChange);

  onCleanup(() => {
    mediaQuery.removeEventListener("change", handleMediaChange);
  });
}
