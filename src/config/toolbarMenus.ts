import type { MenuGroup } from "@/components/layout/Toolbar";
import type { I18n } from "@/i18n";
import type { RepoEntry } from "@/types";

import FolderOpen from "lucide-solid/icons/folder-open";
import GitFork from "lucide-solid/icons/git-fork";
import FolderPlus from "lucide-solid/icons/folder-plus";
import Settings from "lucide-solid/icons/settings";
import Download from "lucide-solid/icons/download";
import Upload from "lucide-solid/icons/upload";
import RefreshCw from "lucide-solid/icons/refresh-cw";
import GitBranch from "lucide-solid/icons/git-branch";
import Info from "lucide-solid/icons/info";
import Code from "lucide-solid/icons/code";
import RefreshCcw from "lucide-solid/icons/refresh-ccw";
import AppWindow from "lucide-solid/icons/app-window";
import History from "lucide-solid/icons/history";
import Folder from "lucide-solid/icons/folder";

export interface ToolbarMenuHandlers {
  onNewWindow: () => void;
  onOpenRepo: () => void;
  onCloneRepo: () => void;
  onInitRepo: () => void;
  onOpenRepoByPath: (path: string) => void;
  onSettings: () => void;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onPullRebase: () => void;
  onSync: () => void;
  onCheckUpdate: () => void;
}

export function buildToolbarMenus(
  i18n: I18n,
  recentRepos: RepoEntry[],
  handlers: ToolbarMenuHandlers,
): MenuGroup[] {
  const recentRepoItems =
    recentRepos.length === 0
      ? [{ label: i18n.t("toolbar.noRecentRepos"), disabled: true }]
      : recentRepos.slice(0, 10).map((repo) => ({
          label: repo.name,
          icon: Folder,
          action: () => handlers.onOpenRepoByPath(repo.path),
        }));

  return [
    {
      label: i18n.t("toolbar.file"),
      items: [
        {
          label: i18n.t("toolbar.newWindow"),
          icon: AppWindow,
          shortcut: "Ctrl+Shift+N",
          action: handlers.onNewWindow,
        },
        { separator: true, label: "" },
        {
          label: i18n.t("toolbar.openRepo"),
          icon: FolderOpen,
          shortcut: "Ctrl+O",
          action: handlers.onOpenRepo,
        },
        {
          label: i18n.t("toolbar.cloneRepo"),
          icon: GitFork,
          shortcut: "Ctrl+Shift+C",
          action: handlers.onCloneRepo,
        },
        { label: i18n.t("toolbar.initRepo"), icon: FolderPlus, action: handlers.onInitRepo },
        { separator: true, label: "" },
        { label: i18n.t("toolbar.openRecent"), icon: History, children: recentRepoItems },
        { separator: true, label: "" },
        {
          label: i18n.t("toolbar.settings"),
          icon: Settings,
          shortcut: "Ctrl+,",
          action: handlers.onSettings,
        },
      ],
    },
    {
      label: i18n.t("toolbar.git"),
      items: [
        { label: i18n.t("toolbar.fetch"), icon: Download, action: handlers.onFetch },
        {
          label: i18n.t("toolbar.pull"),
          icon: Download,
          shortcut: "Ctrl+Shift+P",
          action: handlers.onPull,
        },
        {
          label: i18n.t("toolbar.push"),
          icon: Upload,
          shortcut: "Ctrl+Shift+U",
          action: handlers.onPush,
        },
        { separator: true, label: "" },
        { label: i18n.t("toolbar.pullRebase"), icon: GitBranch, action: handlers.onPullRebase },
        { label: i18n.t("toolbar.sync"), icon: RefreshCw, action: handlers.onSync },
      ],
    },
    {
      label: i18n.t("toolbar.about"),
      items: [
        { label: i18n.t("toolbar.version"), icon: Info, disabled: true },
        { separator: true, label: "" },
        { label: i18n.t("toolbar.description"), icon: Code, disabled: true },
        { separator: true, label: "" },
        {
          label: i18n.t("updater.checkForUpdates"),
          icon: RefreshCcw,
          action: handlers.onCheckUpdate,
        },
      ],
    },
  ];
}
