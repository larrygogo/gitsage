import type {
  GitHubRepoInfo,
  GitHubRepo,
  AuthStatus,
  UserInfo,
  PullRequestSummary,
  PullRequestDetail,
  PrComment,
  PrReview,
  ReviewComment,
  PrFile,
  LabelInfo,
  CreatePrRequest,
  MergePrRequest,
  CreateReviewRequest,
} from '../types';
import * as ipc from './ipc';

/**
 * GitHub 服务
 * 封装所有 GitHub 相关的 IPC 调用
 */

// ==================== 认证 ====================

export async function checkAuth(): Promise<AuthStatus> {
  return ipc.githubCheckAuth();
}

export async function saveToken(token: string): Promise<void> {
  return ipc.githubSaveToken(token);
}

export async function logout(): Promise<void> {
  return ipc.githubLogout();
}

// ==================== Repo ====================

export async function detectRepo(): Promise<GitHubRepo | null> {
  return ipc.githubDetectRepo();
}

// ==================== Search Repos ====================

export async function searchRepos(query: string, perPage: number = 20): Promise<GitHubRepoInfo[]> {
  return ipc.githubSearchRepos(query, perPage);
}

// ==================== Pull Requests ====================

export async function listPulls(owner: string, repo: string, state: string = 'open', page: number = 1, perPage: number = 30): Promise<PullRequestSummary[]> {
  return ipc.githubListPulls(owner, repo, state, page, perPage);
}

export async function getPull(owner: string, repo: string, number: number): Promise<PullRequestDetail> {
  return ipc.githubGetPull(owner, repo, number);
}

export async function createPull(owner: string, repo: string, req: CreatePrRequest): Promise<PullRequestDetail> {
  return ipc.githubCreatePull(owner, repo, req);
}

export async function mergePull(owner: string, repo: string, number: number, req: MergePrRequest): Promise<void> {
  return ipc.githubMergePull(owner, repo, number, req);
}

// ==================== Comments ====================

export async function listComments(owner: string, repo: string, number: number): Promise<PrComment[]> {
  return ipc.githubListPrComments(owner, repo, number);
}

export async function createComment(owner: string, repo: string, number: number, body: string): Promise<PrComment> {
  return ipc.githubCreatePrComment(owner, repo, number, body);
}

// ==================== Reviews ====================

export async function listReviews(owner: string, repo: string, number: number): Promise<PrReview[]> {
  return ipc.githubListReviews(owner, repo, number);
}

export async function createReview(owner: string, repo: string, number: number, req: CreateReviewRequest): Promise<PrReview> {
  return ipc.githubCreateReview(owner, repo, number, req);
}

export async function listReviewComments(owner: string, repo: string, number: number): Promise<ReviewComment[]> {
  return ipc.githubListReviewComments(owner, repo, number);
}

// ==================== Files ====================

export async function listFiles(owner: string, repo: string, number: number): Promise<PrFile[]> {
  return ipc.githubListPrFiles(owner, repo, number);
}

// ==================== Labels ====================

export async function listLabels(owner: string, repo: string): Promise<LabelInfo[]> {
  return ipc.githubListLabels(owner, repo);
}

export async function addLabels(owner: string, repo: string, number: number, labels: string[]): Promise<LabelInfo[]> {
  return ipc.githubAddLabels(owner, repo, number, labels);
}

export async function removeLabel(owner: string, repo: string, number: number, label: string): Promise<void> {
  return ipc.githubRemoveLabel(owner, repo, number, label);
}

// ==================== Collaborators ====================

export async function listCollaborators(owner: string, repo: string): Promise<UserInfo[]> {
  return ipc.githubListCollaborators(owner, repo);
}

// ==================== Reviewers ====================

export async function requestReviewers(owner: string, repo: string, number: number, reviewers: string[]): Promise<void> {
  return ipc.githubRequestReviewers(owner, repo, number, reviewers);
}
