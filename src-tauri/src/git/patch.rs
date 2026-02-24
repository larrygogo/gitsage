use crate::git::diff::{DiffHunk, DiffLineType};

/// Generate a unified diff patch for a single hunk
pub fn generate_hunk_patch(file_path: &str, hunk: &DiffHunk, reverse: bool) -> String {
    let mut patch = String::new();

    // Diff header
    if reverse {
        patch.push_str(&format!("--- a/{}\n", file_path));
        patch.push_str(&format!("+++ b/{}\n", file_path));
    } else {
        patch.push_str(&format!("--- a/{}\n", file_path));
        patch.push_str(&format!("+++ b/{}\n", file_path));
    }

    // Hunk header
    if reverse {
        patch.push_str(&format!(
            "@@ -{},{} +{},{} @@\n",
            hunk.new_start, hunk.new_lines, hunk.old_start, hunk.old_lines
        ));
    } else {
        patch.push_str(&format!(
            "@@ -{},{} +{},{} @@\n",
            hunk.old_start, hunk.old_lines, hunk.new_start, hunk.new_lines
        ));
    }

    // Lines
    for line in &hunk.lines {
        match (&line.origin, reverse) {
            (DiffLineType::Context, _) => {
                patch.push(' ');
                patch.push_str(&line.content);
            }
            (DiffLineType::Addition, false) | (DiffLineType::Deletion, true) => {
                patch.push('+');
                patch.push_str(&line.content);
            }
            (DiffLineType::Deletion, false) | (DiffLineType::Addition, true) => {
                patch.push('-');
                patch.push_str(&line.content);
            }
            (DiffLineType::Header, _) => {}
        }
        if !line.content.ends_with('\n') {
            patch.push('\n');
        }
    }

    patch
}

/// Generate a patch for selected lines within a hunk
pub fn generate_line_patch(
    file_path: &str,
    hunk: &DiffHunk,
    selected_lines: &[usize],
    reverse: bool,
) -> String {
    let mut patch = String::new();

    // Diff header
    patch.push_str(&format!("--- a/{}\n", file_path));
    patch.push_str(&format!("+++ b/{}\n", file_path));

    // Collect lines and compute new hunk ranges
    let mut old_count: u32 = 0;
    let mut new_count: u32 = 0;
    let mut lines_output = Vec::new();

    for (idx, line) in hunk.lines.iter().enumerate() {
        let is_selected = selected_lines.contains(&idx);

        match (&line.origin, reverse, is_selected) {
            (DiffLineType::Context, _, _) => {
                old_count += 1;
                new_count += 1;
                lines_output.push(format!(" {}", line.content));
            }
            (DiffLineType::Addition, false, true) | (DiffLineType::Deletion, true, true) => {
                new_count += 1;
                lines_output.push(format!("+{}", line.content));
            }
            (DiffLineType::Addition, false, false) | (DiffLineType::Deletion, true, false) => {
                // Not selected addition: treat as context in old (skip in new side)
                // Actually for partial staging, unselected additions should be omitted
                // and unselected deletions should be treated as context
                old_count += 1;
                new_count += 1;
                lines_output.push(format!(" {}", line.content));
            }
            (DiffLineType::Deletion, false, true) | (DiffLineType::Addition, true, true) => {
                old_count += 1;
                lines_output.push(format!("-{}", line.content));
            }
            (DiffLineType::Deletion, false, false) | (DiffLineType::Addition, true, false) => {
                // Not selected deletion: keep as context
                old_count += 1;
                new_count += 1;
                lines_output.push(format!(" {}", line.content));
            }
            (DiffLineType::Header, _, _) => {}
        }
    }

    // Hunk header with computed ranges
    if reverse {
        patch.push_str(&format!(
            "@@ -{},{} +{},{} @@\n",
            hunk.new_start, new_count, hunk.old_start, old_count
        ));
    } else {
        patch.push_str(&format!(
            "@@ -{},{} +{},{} @@\n",
            hunk.old_start, old_count, hunk.new_start, new_count
        ));
    }

    for line_str in &lines_output {
        patch.push_str(line_str);
        if !line_str.ends_with('\n') {
            patch.push('\n');
        }
    }

    patch
}
