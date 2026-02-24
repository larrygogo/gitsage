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
