import { createContext, useContext } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import type {
  GitHubRepo,
  PullRequestSummary,
  PullRequestDetail,
  PrComment,
  PrFile,
  ReviewComment,
  ReviewCommentRequest,
} from '../types';
import * as githubService from '../services/github';

// ==================== 类型定义 ====================

export interface GitHubState {
  isAuthenticated: boolean;
  authSource: string | null;
  ghCliAvailable: boolean;
  ghRepo: GitHubRepo | null;
  pulls: PullRequestSummary[];
  currentPull: PullRequestDetail | null;
  prFiles: PrFile[];
  reviewComments: ReviewComment[];
  prComments: PrComment[];
  pendingReviewComments: ReviewCommentRequest[];
  pullFilter: 'open' | 'closed' | 'all';
  isLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
}

export interface GitHubActions {
  checkAuth: () => Promise<void>;
  saveToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  detectRepo: () => Promise<void>;
  loadPulls: (state?: string) => Promise<void>;
  loadPullDetail: (number: number) => Promise<void>;
  loadReviewComments: (prNumber: number) => Promise<void>;
  loadPrComments: (prNumber: number) => Promise<void>;
  addPendingComment: (comment: ReviewCommentRequest) => void;
  removePendingComment: (index: number) => void;
  clearPendingComments: () => void;
  submitReviewWithComments: (prNumber: number, body?: string, event?: string) => Promise<void>;
  setPullFilter: (filter: 'open' | 'closed' | 'all') => void;
  clearCurrentPull: () => void;
  clearError: () => void;
}

export type GitHubStore = [GitHubState, GitHubActions];

// ==================== 初始状态 ====================

const initialState: GitHubState = {
  isAuthenticated: false,
  authSource: null,
  ghCliAvailable: false,
  ghRepo: null,
  pulls: [],
  currentPull: null,
  prFiles: [],
  reviewComments: [],
  prComments: [],
  pendingReviewComments: [],
  pullFilter: 'open',
  isLoading: false,
  isDetailLoading: false,
  error: null,
};

// ==================== Context ====================

export const GitHubContext = createContext<GitHubStore>();

export function useGitHub(): GitHubStore {
  const context = useContext(GitHubContext);
  if (!context) {
    throw new Error('useGitHub 必须在 GitHubProvider 内部使用');
  }
  return context;
}

// ==================== Store 工厂函数 ====================

export function createGitHubStore(): GitHubStore {
  const [state, setState] = createStore<GitHubState>({ ...initialState });

  const actions: GitHubActions = {
    async checkAuth() {
      try {
        const status = await githubService.checkAuth();
        setState(produce((s) => {
          s.isAuthenticated = status.authenticated;
          s.authSource = status.source;
          s.ghCliAvailable = status.gh_cli_available;
        }));
        if (status.authenticated) {
          await actions.detectRepo();
        }
      } catch (error) {
        setState('isAuthenticated', false);
      }
    },

    async saveToken(token: string) {
      try {
        await githubService.saveToken(token);
        setState(produce((s) => {
          s.isAuthenticated = true;
          s.authSource = 'pat';
          s.error = null;
        }));
        await actions.detectRepo();
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },

    async logout() {
      try {
        await githubService.logout();
        setState(produce((s) => {
          s.isAuthenticated = false;
          s.authSource = null;
          s.ghCliAvailable = s.ghCliAvailable; // preserve
          s.ghRepo = null;
          s.pulls = [];
          s.currentPull = null;
          s.prFiles = [];
          s.error = null;
        }));
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      }
    },

    async detectRepo() {
      try {
        const repo = await githubService.detectRepo();
        setState('ghRepo', repo);
      } catch (error) {
        setState('ghRepo', null);
      }
    },

    async loadPulls(pullState?: string) {
      const ghRepo = state.ghRepo;
      if (!ghRepo) return;

      setState('isLoading', true);
      setState('error', null);
      try {
        const filterState = pullState ?? state.pullFilter;
        const pulls = await githubService.listPulls(ghRepo.owner, ghRepo.repo, filterState, 1, 50);
        setState('pulls', pulls);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      } finally {
        setState('isLoading', false);
      }
    },

    async loadPullDetail(number: number) {
      const ghRepo = state.ghRepo;
      if (!ghRepo) return;

      setState('isDetailLoading', true);
      try {
        const [detail, files, comments, prComments] = await Promise.all([
          githubService.getPull(ghRepo.owner, ghRepo.repo, number),
          githubService.listFiles(ghRepo.owner, ghRepo.repo, number),
          githubService.listReviewComments(ghRepo.owner, ghRepo.repo, number).catch(() => [] as ReviewComment[]),
          githubService.listComments(ghRepo.owner, ghRepo.repo, number).catch(() => [] as PrComment[]),
        ]);
        setState('currentPull', detail);
        setState('prFiles', files);
        setState('reviewComments', comments);
        setState('prComments', prComments);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      } finally {
        setState('isDetailLoading', false);
      }
    },

    async loadReviewComments(prNumber: number) {
      const ghRepo = state.ghRepo;
      if (!ghRepo) return;
      try {
        const comments = await githubService.listReviewComments(ghRepo.owner, ghRepo.repo, prNumber);
        setState('reviewComments', comments);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      }
    },

    async loadPrComments(prNumber: number) {
      const ghRepo = state.ghRepo;
      if (!ghRepo) return;
      try {
        const comments = await githubService.listComments(ghRepo.owner, ghRepo.repo, prNumber);
        setState('prComments', comments);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      }
    },

    addPendingComment(comment: ReviewCommentRequest) {
      setState('pendingReviewComments', [...state.pendingReviewComments, comment]);
    },

    removePendingComment(index: number) {
      setState('pendingReviewComments', state.pendingReviewComments.filter((_, i) => i !== index));
    },

    clearPendingComments() {
      setState('pendingReviewComments', []);
    },

    async submitReviewWithComments(prNumber: number, body?: string, event: string = 'COMMENT') {
      const ghRepo = state.ghRepo;
      if (!ghRepo) return;
      try {
        await githubService.createReview(ghRepo.owner, ghRepo.repo, prNumber, {
          body,
          event,
          comments: state.pendingReviewComments.length > 0 ? [...state.pendingReviewComments] : undefined,
        });
        setState('pendingReviewComments', []);
        await actions.loadReviewComments(prNumber);
      } catch (error) {
        setState('error', error instanceof Error ? error.message : String(error));
      }
    },

    setPullFilter(filter: 'open' | 'closed' | 'all') {
      setState('pullFilter', filter);
      actions.loadPulls(filter);
    },

    clearCurrentPull() {
      setState('currentPull', null);
      setState('prFiles', []);
      setState('reviewComments', []);
      setState('prComments', []);
      setState('pendingReviewComments', []);
    },

    clearError() {
      setState('error', null);
    },
  };

  return [state, actions];
}
