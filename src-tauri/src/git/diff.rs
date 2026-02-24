use serde::Serialize;

/// A diff hunk
#[derive(Debug, Clone, Serialize)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub header: String,
    pub lines: Vec<DiffLine>,
}

/// A single line in a diff
#[derive(Debug, Clone, Serialize)]
pub struct DiffLine {
    pub origin: DiffLineType,
    pub content: String,
    pub old_lineno: Option<u32>,
    pub new_lineno: Option<u32>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum DiffLineType {
    Context,
    Addition,
    Deletion,
    Header,
}

/// Complete diff output for one or more files
#[derive(Debug, Clone, Serialize)]
pub struct DiffOutput {
    pub files: Vec<DiffFile>,
    pub stats: DiffStats,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffFile {
    pub old_path: Option<String>,
    pub new_path: Option<String>,
    pub hunks: Vec<DiffHunk>,
    pub is_binary: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffStats {
    pub files_changed: usize,
    pub insertions: usize,
    pub deletions: usize,
}

impl DiffOutput {
    pub fn empty() -> Self {
        Self {
            files: Vec::new(),
            stats: DiffStats {
                files_changed: 0,
                insertions: 0,
                deletions: 0,
            },
        }
    }
}
