import { onMount, onCleanup } from "solid-js";

export interface ShortcutHandlers {
  /** 切换到工作区视图 */
  onSwitchWorkspace?: () => void;
  /** 切换到历史视图 */
  onSwitchHistory?: () => void;
  /** 切换到分支视图 */
  onSwitchBranches?: () => void;
  /** 提交 */
  onCommit?: () => void;
}

/**
 * 全局快捷键 Hook
 * - Ctrl/Cmd+1: 切换到工作区视图
 * - Ctrl/Cmd+2: 切换到历史视图
 * - Ctrl/Cmd+3: 切换到分支视图
 * - Ctrl/Cmd+Enter: 提交
 */
export function useShortcuts(handlers: ShortcutHandlers): void {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  const handleKeyDown = (e: KeyboardEvent) => {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod) return;

    switch (e.key) {
      case "1":
        e.preventDefault();
        handlers.onSwitchWorkspace?.();
        break;
      case "2":
        e.preventDefault();
        handlers.onSwitchHistory?.();
        break;
      case "3":
        e.preventDefault();
        handlers.onSwitchBranches?.();
        break;
      case "Enter":
        e.preventDefault();
        handlers.onCommit?.();
        break;
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });
}
