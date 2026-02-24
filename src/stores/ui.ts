import { createContext, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';

// ==================== 类型定义 ====================

export type ActiveView = 'workspace' | 'history' | 'branches';

export interface UiState {
  activeView: ActiveView;
  sidebarCollapsed: boolean;
  selectedFile: string | null;
  detailPanelVisible: boolean;
}

export interface UiActions {
  setActiveView: (view: ActiveView) => void;
  toggleSidebar: () => void;
  selectFile: (path: string | null) => void;
  toggleDetailPanel: () => void;
  setDetailPanelVisible: (visible: boolean) => void;
}

export type UiStore = [UiState, UiActions];

// ==================== 初始状态 ====================

const initialState: UiState = {
  activeView: 'workspace',
  sidebarCollapsed: false,
  selectedFile: null,
  detailPanelVisible: true,
};

// ==================== Context ====================

export const UiContext = createContext<UiStore>();

export function useUi(): UiStore {
  const context = useContext(UiContext);
  if (!context) {
    throw new Error('useUi 必须在 UiProvider 内部使用');
  }
  return context;
}

// ==================== Store 工厂函数 ====================

export function createUiStore(): UiStore {
  const [state, setState] = createStore<UiState>({ ...initialState });

  const actions: UiActions = {
    setActiveView(view: ActiveView) {
      setState('activeView', view);
    },

    toggleSidebar() {
      setState('sidebarCollapsed', (prev) => !prev);
    },

    selectFile(path: string | null) {
      setState('selectedFile', path);
      // 选中文件时自动显示详情面板
      if (path !== null) {
        setState('detailPanelVisible', true);
      }
    },

    toggleDetailPanel() {
      setState('detailPanelVisible', (prev) => !prev);
    },

    setDetailPanelVisible(visible: boolean) {
      setState('detailPanelVisible', visible);
    },
  };

  return [state, actions];
}
