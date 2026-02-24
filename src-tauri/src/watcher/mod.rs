use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use notify::RecursiveMode;
use notify_debouncer_mini::{new_debouncer, DebounceEventResult};
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tracing::{error, info};

/// File watcher that monitors repository changes
pub struct RepoWatcher {
    #[allow(dead_code)]
    debouncer: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
}

impl RepoWatcher {
    pub fn new() -> Self {
        Self { debouncer: None }
    }

    /// Start watching a repository path
    pub fn watch(
        &mut self,
        repo_path: &Path,
        app_handle: AppHandle,
    ) -> Result<(), notify::Error> {
        let app = Arc::new(Mutex::new(app_handle));
        let mut debouncer = new_debouncer(Duration::from_millis(500), move |res: DebounceEventResult| {
            match res {
                Ok(events) => {
                    let has_changes = events.iter().any(|e| {
                        // Ignore .git directory internal changes
                        let path_str = e.path.to_string_lossy();
                        !path_str.contains(".git/") && !path_str.contains(".git\\")
                    });

                    if has_changes {
                        let app = app.clone();
                        tokio::spawn(async move {
                            let handle = app.lock().await;
                            if let Err(e) = handle.emit("repo:files-changed", ()) {
                                error!("Failed to emit files-changed event: {}", e);
                            }
                        });
                    }
                }
                Err(e) => {
                    error!("File watch error: {:?}", e);
                }
            }
        })?;

        debouncer.watcher().watch(repo_path, RecursiveMode::Recursive)?;
        info!("Watching repository: {}", repo_path.display());
        self.debouncer = Some(debouncer);
        Ok(())
    }

    /// Stop watching
    pub fn unwatch(&mut self) {
        self.debouncer = None;
        info!("Stopped watching repository");
    }
}

impl Default for RepoWatcher {
    fn default() -> Self {
        Self::new()
    }
}
