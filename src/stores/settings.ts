import { createContext, useContext } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { createPersistedStore } from "../utils/createPersisted";
import type { AiConfig, ProviderKind } from "../types";

// ==================== 类型定义 ====================

export type ThemeMode = "light" | "dark" | "system";

export interface SettingsState {
  theme: ThemeMode;
  locale: string;
  aiConfig: AiConfig;
}

export interface SettingsActions {
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: string) => void;
  updateAiConfig: (config: Partial<AiConfig>) => void;
  setAiEnabled: (enabled: boolean) => void;
  setAiProvider: (provider: ProviderKind) => void;
  setAiModel: (model: string) => void;
}

export type SettingsStore = [SettingsState, SettingsActions];

// ==================== 初始状态 ====================

const initialState: SettingsState = {
  theme: "dark",
  locale: "zh-CN",
  aiConfig: {
    enabled: false,
    provider: "OpenAI",
    model: "gpt-4o",
    base_url: undefined,
  },
};

// ==================== Context ====================

export const SettingsContext = createContext<SettingsStore>();

export function useSettings(): SettingsStore {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings 必须在 SettingsProvider 内部使用");
  }
  return context;
}

// ==================== Store 工厂函数 ====================

export function createSettingsStore(): SettingsStore {
  const [state, setState] = createPersistedStore<SettingsState>("gitsage:settings", initialState);

  const actions: SettingsActions = {
    setTheme(theme: ThemeMode) {
      setState("theme", theme);
    },

    setLocale(locale: string) {
      setState("locale", locale);
    },

    updateAiConfig(config: Partial<AiConfig>) {
      setState("aiConfig", (prev) => ({ ...prev, ...config }));
    },

    setAiEnabled(enabled: boolean) {
      setState("aiConfig", "enabled", enabled);
    },

    setAiProvider(provider: ProviderKind) {
      setState("aiConfig", "provider", provider);
    },

    setAiModel(model: string) {
      setState("aiConfig", "model", model);
    },
  };

  return [state, actions];
}
