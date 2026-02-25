use tauri::State;

use crate::error::AppError;
use crate::github::auth;
use crate::github::client::GitHubClient;
use crate::github::types::*;
use crate::state::AppState;

// ==================== 认证 ====================

#[tauri::command]
pub async fn github_check_auth(
    state: State<'_, AppState>,
) -> Result<AuthStatus, AppError> {
    let gh_cli_available = auth::is_gh_cli_available();

    // 1. 内存缓存已有 client → 直接用
    if state.github_client.lock().await.is_some() {
        return Ok(AuthStatus {
            authenticated: true,
            source: Some("cached".to_string()),
            gh_cli_available,
        });
    }

    // 2. keyring 中有 token → 加载并用
    if let Some(token) = auth::load_token()? {
        let client = GitHubClient::new(&token);
        *state.github_client.lock().await = Some(client);
        return Ok(AuthStatus {
            authenticated: true,
            source: Some("keyring".to_string()),
            gh_cli_available,
        });
    }

    // 3. gh auth token 能获取到 → 自动存入 keyring 并用
    if let Some(token) = auth::detect_gh_token()? {
        auth::store_token(&token)?;
        let client = GitHubClient::new(&token);
        *state.github_client.lock().await = Some(client);
        return Ok(AuthStatus {
            authenticated: true,
            source: Some("gh_cli".to_string()),
            gh_cli_available,
        });
    }

    // 4. 都没有 → 未认证
    Ok(AuthStatus {
        authenticated: false,
        source: None,
        gh_cli_available,
    })
}

#[tauri::command]
pub async fn github_save_token(
    token: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    auth::store_token(&token)?;
    let client = GitHubClient::new(&token);
    *state.github_client.lock().await = Some(client);
    Ok(())
}

#[tauri::command]
pub async fn github_logout(
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    auth::delete_token()?;
    *state.github_client.lock().await = None;
    Ok(())
}

// ==================== Repo Detection ====================

#[tauri::command]
pub async fn github_detect_repo(
    state: State<'_, AppState>,
) -> Result<Option<GitHubRepo>, AppError> {
    let repo = state.current_repo.lock().await;
    let repo = match repo.as_ref() {
        Some(r) => r,
        None => return Ok(None),
    };
    let remotes = repo.remotes()?;
    for remote in &remotes {
        if remote.name == "origin" {
            return Ok(GitHubClient::parse_github_remote(&remote.url));
        }
    }
    // Fallback: try the first remote
    if let Some(remote) = remotes.first() {
        return Ok(GitHubClient::parse_github_remote(&remote.url));
    }
    Ok(None)
}

// ==================== Helper ====================

async fn get_client(state: &State<'_, AppState>) -> Result<GitHubClient, AppError> {
    let guard = state.github_client.lock().await;
    guard
        .as_ref()
        .map(|c| c.clone())
        .ok_or_else(|| AppError::General("GitHub 未认证，请先连接 GitHub".into()))
}

// ==================== Search Repos ====================

#[tauri::command]
pub async fn github_search_repos(
    query: String,
    per_page: u64,
    state: State<'_, AppState>,
) -> Result<Vec<GitHubRepoInfo>, AppError> {
    let client = get_client(&state).await?;

    // 并行获取用户信息、组织列表
    let (user_result, orgs_result) = tokio::join!(
        client.get_current_user(),
        client.list_user_orgs(),
    );

    // 构建 user:/org: 限定符（容忍失败，降级为纯全局搜索）
    let mut scopes = Vec::new();
    if let Ok(user) = &user_result {
        scopes.push(format!("user:{}", user.login));
    }
    if let Ok(orgs) = &orgs_result {
        for org in orgs {
            scopes.push(format!("org:{}", org.login));
        }
    }

    if scopes.is_empty() {
        // 无法获取用户/组织信息，直接全局搜索
        return client.search_repos(&query, per_page).await;
    }

    // 阶段 1：搜索自己 + 组织范围内的仓库
    let scoped_query = format!("{} {}", query, scopes.join(" "));
    let (scoped_result, global_result) = tokio::join!(
        client.search_repos(&scoped_query, per_page),
        client.search_repos(&query, per_page),
    );

    let mut results: Vec<GitHubRepoInfo> = scoped_result.unwrap_or_default();
    let mut seen: std::collections::HashSet<String> =
        results.iter().map(|r| r.full_name.clone()).collect();

    // 阶段 2：追加全局搜索结果（去重）
    if let Ok(global) = global_result {
        for repo in global {
            if seen.insert(repo.full_name.clone()) {
                results.push(repo);
            }
        }
    }

    // 截断到 per_page
    results.truncate(per_page as usize);
    Ok(results)
}

// ==================== Pull Requests ====================

#[tauri::command]
pub async fn github_list_pulls(
    owner: String,
    repo: String,
    pull_state: String,
    page: u32,
    per_page: u32,
    state: State<'_, AppState>,
) -> Result<Vec<PullRequestSummary>, AppError> {
    let client = get_client(&state).await?;
    client.list_pulls(&owner, &repo, &pull_state, page, per_page).await
}

#[tauri::command]
pub async fn github_get_pull(
    owner: String,
    repo: String,
    number: u64,
    state: State<'_, AppState>,
) -> Result<PullRequestDetail, AppError> {
    let client = get_client(&state).await?;
    client.get_pull(&owner, &repo, number).await
}

#[tauri::command]
pub async fn github_create_pull(
    owner: String,
    repo: String,
    req: CreatePrRequest,
    state: State<'_, AppState>,
) -> Result<PullRequestDetail, AppError> {
    let client = get_client(&state).await?;
    client.create_pull(&owner, &repo, req).await
}

#[tauri::command]
pub async fn github_merge_pull(
    owner: String,
    repo: String,
    number: u64,
    req: MergePrRequest,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let client = get_client(&state).await?;
    client.merge_pull(&owner, &repo, number, req).await
}

// ==================== Comments ====================

#[tauri::command]
pub async fn github_list_pr_comments(
    owner: String,
    repo: String,
    number: u64,
    state: State<'_, AppState>,
) -> Result<Vec<PrComment>, AppError> {
    let client = get_client(&state).await?;
    client.list_comments(&owner, &repo, number).await
}

#[tauri::command]
pub async fn github_create_pr_comment(
    owner: String,
    repo: String,
    number: u64,
    body: String,
    state: State<'_, AppState>,
) -> Result<PrComment, AppError> {
    let client = get_client(&state).await?;
    client.create_comment(&owner, &repo, number, &body).await
}

// ==================== Reviews ====================

#[tauri::command]
pub async fn github_list_reviews(
    owner: String,
    repo: String,
    number: u64,
    state: State<'_, AppState>,
) -> Result<Vec<PrReview>, AppError> {
    let client = get_client(&state).await?;
    client.list_reviews(&owner, &repo, number).await
}

#[tauri::command]
pub async fn github_create_review(
    owner: String,
    repo: String,
    number: u64,
    req: CreateReviewRequest,
    state: State<'_, AppState>,
) -> Result<PrReview, AppError> {
    let client = get_client(&state).await?;
    client.create_review(&owner, &repo, number, req).await
}

#[tauri::command]
pub async fn github_list_review_comments(
    owner: String,
    repo: String,
    number: u64,
    state: State<'_, AppState>,
) -> Result<Vec<ReviewComment>, AppError> {
    let client = get_client(&state).await?;
    client.list_review_comments(&owner, &repo, number).await
}

// ==================== Files ====================

#[tauri::command]
pub async fn github_list_pr_files(
    owner: String,
    repo: String,
    number: u64,
    state: State<'_, AppState>,
) -> Result<Vec<PrFile>, AppError> {
    let client = get_client(&state).await?;
    client.list_files(&owner, &repo, number).await
}

// ==================== Labels ====================

#[tauri::command]
pub async fn github_list_labels(
    owner: String,
    repo: String,
    state: State<'_, AppState>,
) -> Result<Vec<LabelInfo>, AppError> {
    let client = get_client(&state).await?;
    client.list_labels(&owner, &repo).await
}

#[tauri::command]
pub async fn github_add_labels(
    owner: String,
    repo: String,
    number: u64,
    labels: Vec<String>,
    state: State<'_, AppState>,
) -> Result<Vec<LabelInfo>, AppError> {
    let client = get_client(&state).await?;
    client.add_labels(&owner, &repo, number, labels).await
}

#[tauri::command]
pub async fn github_remove_label(
    owner: String,
    repo: String,
    number: u64,
    label: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let client = get_client(&state).await?;
    client.remove_label(&owner, &repo, number, &label).await
}

// ==================== Collaborators ====================

#[tauri::command]
pub async fn github_list_collaborators(
    owner: String,
    repo: String,
    state: State<'_, AppState>,
) -> Result<Vec<UserInfo>, AppError> {
    let client = get_client(&state).await?;
    client.list_collaborators(&owner, &repo).await
}

// ==================== Reviewers ====================

#[tauri::command]
pub async fn github_request_reviewers(
    owner: String,
    repo: String,
    number: u64,
    reviewers: Vec<String>,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let client = get_client(&state).await?;
    client
        .request_reviewers(&owner, &repo, number, reviewers)
        .await
}
