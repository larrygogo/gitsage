//! Prompt templates for AI features

/// System prompt for commit message generation
pub const COMMIT_MESSAGE_SYSTEM: &str = r#"You are an expert at writing clear, concise git commit messages.
Follow these rules:
1. Write a short summary line (max 72 characters)
2. If needed, add a blank line followed by a more detailed description
3. Use the imperative mood ("Add feature" not "Added feature")
4. Focus on WHY the change was made, not just WHAT changed
5. Reference any relevant issue numbers if mentioned in the context

The user will provide you with:
- The git diff of staged changes
- Recent commit messages (for style reference)
- Optional: a commit message template
"#;

/// Build the commit message generation prompt
pub fn build_commit_prompt(
    diff: &str,
    recent_commits: &[String],
    template: Option<&str>,
) -> String {
    let mut prompt = String::from("Generate a commit message for the following changes.\n\n");

    if !recent_commits.is_empty() {
        prompt.push_str("Recent commit messages (for style reference):\n");
        for msg in recent_commits.iter().take(5) {
            prompt.push_str(&format!("- {}\n", msg));
        }
        prompt.push('\n');
    }

    if let Some(tmpl) = template {
        prompt.push_str(&format!("Commit message template:\n{}\n\n", tmpl));
    }

    prompt.push_str(&format!("Diff:\n```\n{}\n```", diff));
    prompt
}

/// System prompt for change summary
pub const CHANGE_SUMMARY_SYSTEM: &str = r#"You are a helpful assistant that summarizes code changes.
Given a git diff, provide a clear, human-readable summary of what was changed and why it matters.
Keep the summary concise but informative.
Use bullet points for multiple changes.
"#;

/// Build the change summary prompt
pub fn build_summary_prompt(diff: &str) -> String {
    format!(
        "Summarize the following code changes in a clear, concise way:\n\n```\n{}\n```",
        diff
    )
}
