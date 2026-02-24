export type FileStatusKind = 'New' | 'Modified' | 'Deleted' | 'Renamed' | 'Typechange' | 'Conflicted';

export interface FileStatus {
  path: string;
  status: FileStatusKind;
  staged: boolean;
}

export interface BranchInfo {
  name: string;
  is_head: boolean;
  is_remote: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
}

export interface CommitInfo {
  id: string;
  summary: string;
  message: string;
  author_name: string;
  author_email: string;
  timestamp: number;
  parent_ids: string[];
}

export interface DiffLine {
  origin: 'Context' | 'Addition' | 'Deletion' | 'Header';
  content: string;
  old_lineno: number | null;
  new_lineno: number | null;
}

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  old_path: string | null;
  new_path: string | null;
  hunks: DiffHunk[];
  is_binary: boolean;
}

export interface DiffStats {
  files_changed: number;
  insertions: number;
  deletions: number;
}

export interface DiffOutput {
  files: DiffFile[];
  stats: DiffStats;
}

export interface RepoEntry {
  path: string;
  name: string;
  last_opened: string;
}

// ==================== Phase 1 类型 ====================

export interface StashEntry {
  index: number;
  message: string;
  timestamp: number;
}

export type RepoOperationState = 'Normal' | 'Merging' | 'Rebasing' | 'CherryPicking' | 'Reverting';

// ==================== Phase 2 类型 ====================

export interface TagInfo {
  name: string;
  target_id: string;
  message: string | null;
  tagger: string | null;
  timestamp: number | null;
  is_lightweight: boolean;
}

export interface RemoteInfo {
  name: string;
  url: string;
  fetch_url: string | null;
}

// ==================== Phase 3 类型 ====================

export interface ConflictFile {
  path: string;
  has_base: boolean;
  has_ours: boolean;
  has_theirs: boolean;
}

export interface ConflictVersions {
  base: string | null;
  ours: string | null;
  theirs: string | null;
}

// ==================== Phase 4 类型 ====================

export interface BlameLine {
  line_no: number;
  commit_id: string;
  author_name: string;
  author_email: string;
  timestamp: number;
  content: string;
}

// ==================== Phase 5 类型 ====================

export type ChangeType = 'Added' | 'Modified' | 'Deleted';

export interface LineChange {
  start_line: number;
  end_line: number;
  change_type: ChangeType;
}

export interface SubmoduleInfo {
  name: string;
  path: string;
  url: string;
  head_id: string | null;
  is_initialized: boolean;
}

export interface WorktreeInfo {
  path: string;
  branch: string;
  head_id: string;
  is_main: boolean;
}
