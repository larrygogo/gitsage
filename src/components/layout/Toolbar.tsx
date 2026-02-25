import { type Component, Show, For, createSignal, onCleanup } from "solid-js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Dynamic } from "solid-js/web";
import GitBranch from "lucide-solid/icons/git-branch";
import Minus from "lucide-solid/icons/minus";
import Square from "lucide-solid/icons/square";
import X from "lucide-solid/icons/x";
import Copy from "lucide-solid/icons/copy";
import ChevronRight from "lucide-solid/icons/chevron-right";
import styles from "./Toolbar.module.css";

export interface MenuItem {
  label: string;
  action?: () => void;
  separator?: boolean;
  icon?: Component<{ size?: number }>;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  /** 子菜单项（hover 展开） */
  children?: MenuItem[];
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export interface ToolbarProps {
  menus?: MenuGroup[];
  repoName?: string;
  branchName?: string;
}

const appWindow = getCurrentWindow();

const Toolbar: Component<ToolbarProps> = (props) => {
  const menus = () => props.menus ?? [];

  const [openMenu, setOpenMenu] = createSignal<string | null>(null);
  const [isMaximized, setIsMaximized] = createSignal(false);

  // 检测窗口是否最大化
  appWindow.isMaximized().then(setIsMaximized);
  const unlisten = appWindow.onResized(async () => {
    setIsMaximized(await appWindow.isMaximized());
  });
  onCleanup(() => { unlisten.then((fn) => fn()); });

  // 点击外部关闭菜单
  const handleDocClick = (e: MouseEvent) => {
    if (openMenu() && !(e.target as HTMLElement).closest(`.${styles.menuGroup}`)) {
      setOpenMenu(null);
    }
  };
  document.addEventListener("click", handleDocClick);
  onCleanup(() => document.removeEventListener("click", handleDocClick));

  const toggleMenu = (label: string) => {
    setOpenMenu((prev) => (prev === label ? null : label));
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;
    if (item.action) {
      item.action();
    }
    setOpenMenu(null);
  };

  // 拖拽区域 ref：用原生事件绑定，确保 startDragging 在 mousedown 同步帧内触发
  const bindDragRegion = (el: HTMLDivElement) => {
    el.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        appWindow.startDragging();
      }
    });
    el.addEventListener("dblclick", () => {
      appWindow.toggleMaximize();
    });
  };

  return (
    <header class={styles.toolbar}>
      {/* 左侧：Logo + 分隔线 + 菜单 */}
      <div class={styles.leftSection}>
        <span class={styles.appLogo}>
          <GitBranch size={14} />
        </span>
        <span class={styles.appName}>GitSage</span>

        <span class={styles.menuDivider} />

        <nav class={styles.menuBar}>
          <For each={menus()}>
            {(menu) => (
              <div class={styles.menuGroup}>
                <button
                  class={`${styles.menuTrigger} ${openMenu() === menu.label ? styles.menuTriggerActive : ""}`}
                  onClick={() => toggleMenu(menu.label)}
                  onMouseEnter={() => { if (openMenu()) setOpenMenu(menu.label); }}
                >
                  {menu.label}
                </button>
                <Show when={openMenu() === menu.label}>
                  <div class={styles.menuDropdown}>
                    <For each={menu.items}>
                      {(item) => (
                        <Show when={!item.separator} fallback={<div class={styles.menuSeparator} />}>
                          <Show
                            when={!item.children}
                            fallback={
                              <div class={styles.submenuWrapper}>
                                <button
                                  class={`${styles.menuItem}${item.disabled ? ` ${styles.menuItemDisabled}` : ""}`}
                                >
                                  <Show when={item.icon}>
                                    <span class={styles.menuItemIcon}>
                                      <Dynamic component={item.icon} size={14} />
                                    </span>
                                  </Show>
                                  <span class={styles.menuItemLabel}>{item.label}</span>
                                  <span class={styles.submenuArrow}><ChevronRight size={12} /></span>
                                </button>
                                <div class={styles.submenuDropdown}>
                                  <For each={item.children}>
                                    {(child) => (
                                      <Show when={!child.separator} fallback={<div class={styles.menuSeparator} />}>
                                        <button
                                          class={`${styles.menuItem}${child.disabled ? ` ${styles.menuItemDisabled}` : ""}`}
                                          onClick={() => handleItemClick(child)}
                                        >
                                          <Show when={child.icon}>
                                            <span class={styles.menuItemIcon}>
                                              <Dynamic component={child.icon} size={14} />
                                            </span>
                                          </Show>
                                          <span class={styles.menuItemLabel}>{child.label}</span>
                                          <Show when={child.shortcut}>
                                            <span class={styles.menuItemShortcut}>{child.shortcut}</span>
                                          </Show>
                                        </button>
                                      </Show>
                                    )}
                                  </For>
                                </div>
                              </div>
                            }
                          >
                            <button
                              class={`${styles.menuItem}${item.danger ? ` ${styles.menuItemDanger}` : ""}${item.disabled ? ` ${styles.menuItemDisabled}` : ""}`}
                              onClick={() => handleItemClick(item)}
                            >
                              <Show when={item.icon}>
                                <span class={styles.menuItemIcon}>
                                  <Dynamic component={item.icon} size={14} />
                                </span>
                              </Show>
                              <span class={styles.menuItemLabel}>{item.label}</span>
                              <Show when={item.shortcut}>
                                <span class={styles.menuItemShortcut}>{item.shortcut}</span>
                              </Show>
                            </button>
                          </Show>
                        </Show>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </nav>
      </div>

      {/* 中间：拖拽区域 + 仓库/分支信息 */}
      <div
        class={styles.dragRegion}
        ref={bindDragRegion}
      >
        <Show when={props.repoName}>
          <div class={styles.repoInfo}>
            <span class={styles.repoInfoName}>{props.repoName}</span>
            <Show when={props.branchName}>
              <span class={styles.repoInfoSep}>/</span>
              <GitBranch size={11} class={styles.repoInfoBranchIcon} />
              <span class={styles.repoInfoBranch}>{props.branchName}</span>
            </Show>
          </div>
        </Show>
      </div>

      {/* 右侧：窗口控制按钮 */}
      <div class={styles.windowControls}>
        <button
          class={styles.windowBtn}
          onClick={() => appWindow.minimize()}
          title="最小化"
        >
          <Minus size={14} />
        </button>
        <button
          class={styles.windowBtn}
          onClick={() => appWindow.toggleMaximize()}
          title={isMaximized() ? "还原" : "最大化"}
        >
          {isMaximized() ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          class={`${styles.windowBtn} ${styles.windowBtnClose}`}
          onClick={() => appWindow.close()}
          title="关闭"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
};

export default Toolbar;
