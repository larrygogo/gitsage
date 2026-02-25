import { createContext, useContext } from 'solid-js';
import { createPersistedStore } from '../utils/createPersisted';

// ==================== 类型定义 ====================

export type ActiveView = 'workspace' | 'history' | 'branches' | 'pulls' | 'settings';

export interface UiState {
  activeView: ActiveView;
  sidebarCollapsed: boolean;
  lastRepoPath: string | null;
  selectedFile: string | null;
  detailPanelVisible: boolean;
}

export interface UiActions {
  setActiveView: (view: ActiveView) => void;
  toggleSidebar: () => void;
  setLastRepoPath: (path: string | null) => void;
  selectFile: (path: string | null) => void;
  toggleDetailPanel: () => void;
  setDetailPanelVisible: (visible: boolean) => void;
}

export type UiStore = [UiState, UiActions];

// ==================== 初始状态 ====================

const initialState: UiState = {
  activeView: 'workspace',
  sidebarCollapsed: false,
  lastRepoPath: null,
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
  const [state, setState] = createPersistedStore<UiState>(
    'gitsage:ui',
    initialState,
    { pick: ['activeView', 'sidebarCollapsed', 'lastRepoPath'] },
  );

  const actions: UiActions = {
    setActiveView(view: ActiveView) {
      setState('activeView', view);
    },

    toggleSidebar() {
      setState('sidebarCollapsed', (prev) => !prev);
    },

    setLastRepoPath(path: string | null) {
      setState('lastRepoPath', path);
    },

    selectFile(path: string | null) {
      setState('selectedFile', path);
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
