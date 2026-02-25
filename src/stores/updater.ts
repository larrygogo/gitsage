import { createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import {
  checkForUpdate,
  downloadAndInstall,
  type UpdateInfo,
  type UpdateProgress,
} from "@/services/updater";

// ==================== 类型定义 ====================

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error"
  | "up-to-date";

export interface UpdaterState {
  status: UpdateStatus;
  dialogOpen: boolean;
  updateInfo: UpdateInfo | null;
  progress: UpdateProgress | null;
  errorMessage: string | null;
}

export interface UpdaterActions {
  checkUpdate: (silent?: boolean) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismissDialog: () => void;
  remindLater: () => void;
}

export type UpdaterStore = [UpdaterState, UpdaterActions];

// ==================== 初始状态 ====================

const initialState: UpdaterState = {
  status: "idle",
  dialogOpen: false,
  updateInfo: null,
  progress: null,
  errorMessage: null,
};

// ==================== Context ====================

export const UpdaterContext = createContext<UpdaterStore>();

export function useUpdater(): UpdaterStore {
  const context = useContext(UpdaterContext);
  if (!context) {
    throw new Error("useUpdater 必须在 UpdaterProvider 内部使用");
  }
  return context;
}

// ==================== Store 工厂函数 ====================

export function createUpdaterStore(): UpdaterStore {
  const [state, setState] = createStore<UpdaterState>({ ...initialState });

  const actions: UpdaterActions = {
    async checkUpdate(silent = false) {
      setState({ status: "checking", errorMessage: null });
      try {
        const info = await checkForUpdate();
        if (info) {
          setState({ status: "available", updateInfo: info, dialogOpen: true });
        } else {
          setState({ status: "up-to-date" });
          if (!silent) {
            setState({ dialogOpen: true });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setState({ status: "error", errorMessage: msg });
        if (!silent) {
          setState({ dialogOpen: true });
        }
      }
    },

    async downloadAndInstall() {
      setState({ status: "downloading", progress: null });
      try {
        await downloadAndInstall((progress) => {
          setState({ progress });
        });
        setState({ status: "ready" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setState({ status: "error", errorMessage: msg });
      }
    },

    dismissDialog() {
      setState({ dialogOpen: false });
    },

    remindLater() {
      setState({ dialogOpen: false });
    },
  };

  return [state, actions];
}
