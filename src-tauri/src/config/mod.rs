use serde::{Deserialize, Serialize};

use crate::ai::provider::ProviderKind;

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub theme: ThemeMode,
    pub locale: String,
    pub ai: AiConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ThemeMode {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub enabled: bool,
    pub provider: ProviderKind,
    pub model: String,
    pub base_url: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: ThemeMode::System,
            locale: "zh-CN".to_string(),
            ai: AiConfig {
                enabled: true,
                provider: ProviderKind::OpenAI,
                model: "gpt-4o".to_string(),
                base_url: None,
            },
        }
    }
}
