use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::AppResult;

/// AI provider types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProviderKind {
    OpenAI,
    Anthropic,
    Ollama,
    OpenAICompatible,
}

/// AI provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub kind: ProviderKind,
    pub name: String,
    pub base_url: String,
    pub model: String,
    /// API key is stored in system keyring, not here
    pub has_api_key: bool,
}

/// A message in the conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// AI completion request
#[derive(Debug, Clone)]
pub struct CompletionRequest {
    pub messages: Vec<ChatMessage>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub stream: bool,
}

/// AI completion response chunk (for streaming)
#[derive(Debug, Clone, Serialize)]
pub struct CompletionChunk {
    pub content: String,
    pub done: bool,
}

/// Trait for AI providers
#[async_trait]
pub trait AiProvider: Send + Sync {
    /// Get provider info
    fn config(&self) -> &ProviderConfig;

    /// Send a completion request (non-streaming)
    async fn complete(&self, request: &CompletionRequest) -> AppResult<String>;

    /// Validate connection / API key
    async fn validate(&self) -> AppResult<bool>;
}
