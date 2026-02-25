use reqwest::Client;

use crate::error::{AppError, AppResult};

use super::types::*;

const GITHUB_API: &str = "https://api.github.com";
const USER_AGENT: &str = "GitSage/0.1.0";

#[derive(Clone)]
pub struct GitHubClient {
    client: Client,
    token: String,
}

impl GitHubClient {
    pub fn new(token: &str) -> Self {
        Self {
            client: Client::new(),
            token: token.to_string(),
        }
    }

    fn request(&self, method: reqwest::Method, url: &str) -> reqwest::RequestBuilder {
        self.client
            .request(method, url)
            .header("Accept", "application/vnd.github+json")
            .header("Authorization", format!("Bearer {}", self.token))
            .header("User-Agent", USER_AGENT)
            .header("X-GitHub-Api-Version", "2022-11-28")
    }

    fn get(&self, path: &str) -> reqwest::RequestBuilder {
        self.request(reqwest::Method::GET, &format!("{}{}", GITHUB_API, path))
    }

    fn post(&self, path: &str) -> reqwest::RequestBuilder {
        self.request(reqwest::Method::POST, &format!("{}{}", GITHUB_API, path))
    }

    fn put(&self, path: &str) -> reqwest::RequestBuilder {
        self.request(reqwest::Method::PUT, &format!("{}{}", GITHUB_API, path))
    }

    fn delete(&self, path: &str) -> reqwest::RequestBuilder {
        self.request(
            reqwest::Method::DELETE,
            &format!("{}{}", GITHUB_API, path),
        )
    }

    // -- Current User / Orgs ----------------------------------------------

    pub async fn get_current_user(&self) -> AppResult<UserInfo> {
        let resp = self
            .get("/user")
            .send()
            .await?
            .json::<UserInfo>()
            .await?;
        Ok(resp)
    }

    pub async fn list_user_orgs(&self) -> AppResult<Vec<OrgInfo>> {
        let resp = self
            .get("/user/orgs")
            .query(&[("per_page", "100")])
            .send()
            .await?
            .json::<Vec<OrgInfo>>()
            .await?;
        Ok(resp)
    }

    // -- PR CRUD ----------------------------------------------------------

    pub async fn list_pulls(
        &self,
        owner: &str,
        repo: &str,
        state: &str,
        page: u32,
        per_page: u32,
    ) -> AppResult<Vec<PullRequestSummary>> {
        let resp = self
            .get(&format!("/repos/{}/{}/pulls", owner, repo))
            .query(&[
                ("state", state),
                ("page", &page.to_string()),
                ("per_page", &per_page.to_string()),
            ])
            .send()
            .await?
            .json::<Vec<PullRequestSummary>>()
            .await?;
        Ok(resp)
    }

    pub async fn get_pull(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
    ) -> AppResult<PullRequestDetail> {
        let resp = self
            .get(&format!("/repos/{}/{}/pulls/{}", owner, repo, number))
            .send()
            .await?
            .json::<PullRequestDetail>()
            .await?;
        Ok(resp)
    }

    pub async fn create_pull(
        &self,
        owner: &str,
        repo: &str,
        req: CreatePrRequest,
    ) -> AppResult<PullRequestDetail> {
        let resp = self
            .post(&format!("/repos/{}/{}/pulls", owner, repo))
            .json(&req)
            .send()
            .await?
            .json::<PullRequestDetail>()
            .await?;
        Ok(resp)
    }

    pub async fn merge_pull(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        req: MergePrRequest,
    ) -> AppResult<()> {
        let resp = self
            .put(&format!(
                "/repos/{}/{}/pulls/{}/merge",
                owner, repo, number
            ))
            .json(&req)
            .send()
            .await?;
        if resp.status().is_success() {
            Ok(())
        } else {
            let text = resp.text().await.unwrap_or_default();
            Err(AppError::General(format!("Failed to merge PR: {}", text)))
        }
    }

    // -- Comments ---------------------------------------------------------

    pub async fn list_comments(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
    ) -> AppResult<Vec<PrComment>> {
        let resp = self
            .get(&format!(
                "/repos/{}/{}/issues/{}/comments",
                owner, repo, number
            ))
            .send()
            .await?
            .json::<Vec<PrComment>>()
            .await?;
        Ok(resp)
    }

    pub async fn create_comment(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        body: &str,
    ) -> AppResult<PrComment> {
        let resp = self
            .post(&format!(
                "/repos/{}/{}/issues/{}/comments",
                owner, repo, number
            ))
            .json(&serde_json::json!({ "body": body }))
            .send()
            .await?
            .json::<PrComment>()
            .await?;
        Ok(resp)
    }

    // -- Reviews ----------------------------------------------------------

    pub async fn list_reviews(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
    ) -> AppResult<Vec<PrReview>> {
        let resp = self
            .get(&format!(
                "/repos/{}/{}/pulls/{}/reviews",
                owner, repo, number
            ))
            .send()
            .await?
            .json::<Vec<PrReview>>()
            .await?;
        Ok(resp)
    }

    pub async fn list_review_comments(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
    ) -> AppResult<Vec<ReviewComment>> {
        let resp = self
            .get(&format!(
                "/repos/{}/{}/pulls/{}/comments",
                owner, repo, number
            ))
            .send()
            .await?
            .json::<Vec<ReviewComment>>()
            .await?;
        Ok(resp)
    }

    pub async fn create_review(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        req: CreateReviewRequest,
    ) -> AppResult<PrReview> {
        let resp = self
            .post(&format!(
                "/repos/{}/{}/pulls/{}/reviews",
                owner, repo, number
            ))
            .json(&req)
            .send()
            .await?
            .json::<PrReview>()
            .await?;
        Ok(resp)
    }

    // -- Files ------------------------------------------------------------

    pub async fn list_files(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
    ) -> AppResult<Vec<PrFile>> {
        let resp = self
            .get(&format!(
                "/repos/{}/{}/pulls/{}/files",
                owner, repo, number
            ))
            .send()
            .await?
            .json::<Vec<PrFile>>()
            .await?;
        Ok(resp)
    }

    // -- Labels -----------------------------------------------------------

    pub async fn list_labels(
        &self,
        owner: &str,
        repo: &str,
    ) -> AppResult<Vec<LabelInfo>> {
        let resp = self
            .get(&format!("/repos/{}/{}/labels", owner, repo))
            .send()
            .await?
            .json::<Vec<LabelInfo>>()
            .await?;
        Ok(resp)
    }

    pub async fn add_labels(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        labels: Vec<String>,
    ) -> AppResult<Vec<LabelInfo>> {
        let resp = self
            .post(&format!(
                "/repos/{}/{}/issues/{}/labels",
                owner, repo, number
            ))
            .json(&serde_json::json!({ "labels": labels }))
            .send()
            .await?
            .json::<Vec<LabelInfo>>()
            .await?;
        Ok(resp)
    }

    pub async fn remove_label(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        label: &str,
    ) -> AppResult<()> {
        let resp = self
            .delete(&format!(
                "/repos/{}/{}/issues/{}/labels/{}",
                owner, repo, number, label
            ))
            .send()
            .await?;
        if resp.status().is_success() || resp.status() == 404 {
            Ok(())
        } else {
            let text = resp.text().await.unwrap_or_default();
            Err(AppError::General(format!(
                "Failed to remove label: {}",
                text
            )))
        }
    }

    // -- Collaborators ----------------------------------------------------

    pub async fn list_collaborators(
        &self,
        owner: &str,
        repo: &str,
    ) -> AppResult<Vec<UserInfo>> {
        let resp = self
            .get(&format!("/repos/{}/{}/collaborators", owner, repo))
            .query(&[("per_page", "100")])
            .send()
            .await?;
        if resp.status().is_success() {
            Ok(resp.json::<Vec<UserInfo>>().await?)
        } else {
            // 如果没有权限列出协作者，返回空列表
            Ok(vec![])
        }
    }

    pub async fn request_reviewers(
        &self,
        owner: &str,
        repo: &str,
        number: u64,
        reviewers: Vec<String>,
    ) -> AppResult<()> {
        let resp = self
            .post(&format!(
                "/repos/{}/{}/pulls/{}/requested_reviewers",
                owner, repo, number
            ))
            .json(&serde_json::json!({ "reviewers": reviewers }))
            .send()
            .await?;
        if resp.status().is_success() {
            Ok(())
        } else {
            let text = resp.text().await.unwrap_or_default();
            Err(AppError::General(format!(
                "Failed to request reviewers: {}",
                text
            )))
        }
    }

    // -- Search Repos -----------------------------------------------------

    pub async fn search_repos(
        &self,
        query: &str,
        per_page: u64,
    ) -> AppResult<Vec<GitHubRepoInfo>> {
        let resp = self
            .get("/search/repositories")
            .query(&[
                ("q", query),
                ("sort", "updated"),
                ("per_page", &per_page.to_string()),
            ])
            .send()
            .await?
            .json::<SearchReposResponse>()
            .await?;
        Ok(resp.items)
    }

    // -- Utility ----------------------------------------------------------

    /// Parse a GitHub remote URL into owner/repo.
    ///
    /// Supports both SSH and HTTPS formats:
    /// - `git@github.com:owner/repo.git`
    /// - `https://github.com/owner/repo.git`
    pub fn parse_github_remote(url: &str) -> Option<GitHubRepo> {
        // Handle SSH: git@github.com:owner/repo.git
        if let Some(rest) = url.strip_prefix("git@github.com:") {
            let rest = rest.strip_suffix(".git").unwrap_or(rest);
            let parts: Vec<&str> = rest.splitn(2, '/').collect();
            if parts.len() == 2 {
                return Some(GitHubRepo {
                    owner: parts[0].to_string(),
                    repo: parts[1].to_string(),
                });
            }
        }
        // Handle HTTPS: https://github.com/owner/repo.git
        if url.contains("github.com") {
            let url = url.strip_suffix(".git").unwrap_or(url);
            let parts: Vec<&str> = url.rsplitn(3, '/').collect();
            if parts.len() >= 2 {
                return Some(GitHubRepo {
                    owner: parts[1].to_string(),
                    repo: parts[0].to_string(),
                });
            }
        }
        None
    }
}
