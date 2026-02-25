// ==================== GitHub 类型定义 ====================

export interface GitHubRepoInfo {
  name: string;
  full_name: string;
  description: string | null;
  clone_url: string;
  updated_at: string;
  private: boolean;
  fork: boolean;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
}

export interface AuthStatus {
  authenticated: boolean;
  source: string | null;
  gh_cli_available: boolean;
}

export interface UserInfo {
  login: string;
  avatar_url: string;
}

export interface LabelInfo {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface PrBranchRef {
  ref_name: string;
  sha: string;
}

export interface PullRequestSummary {
  number: number;
  title: string;
  state: string;
  user: UserInfo;
  created_at: string;
  updated_at: string;
  draft: boolean;
  labels: LabelInfo[];
  head: PrBranchRef;
  base: PrBranchRef;
}

export interface PullRequestDetail {
  number: number;
  title: string;
  state: string;
  user: UserInfo;
  created_at: string;
  updated_at: string;
  draft: boolean;
  labels: LabelInfo[];
  head: PrBranchRef;
  base: PrBranchRef;
  body: string | null;
  merged_at: string | null;
  mergeable: boolean | null;
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  assignees: UserInfo[];
  requested_reviewers: UserInfo[];
}

export interface PrComment {
  id: number;
  body: string;
  user: UserInfo;
  created_at: string;
  updated_at: string;
}

export interface PrReview {
  id: number;
  user: UserInfo;
  state: string;
  body: string | null;
  submitted_at: string | null;
}

export interface ReviewComment {
  id: number;
  body: string;
  user: UserInfo;
  path: string;
  line: number | null;
  side: string | null;
  diff_hunk: string;
  created_at: string;
}

export interface PrFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface CreatePrRequest {
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
}

export interface MergePrRequest {
  merge_method: string;
  commit_title?: string;
  commit_message?: string;
}

export interface CreateReviewRequest {
  body?: string;
  event: string;
  comments?: ReviewCommentRequest[];
}

export interface ReviewCommentRequest {
  path: string;
  line?: number;
  side?: string;
  body: string;
}
