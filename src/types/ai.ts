export type ProviderKind = 'OpenAI' | 'Anthropic' | 'Ollama' | 'OpenAICompatible';

export interface ProviderConfig {
  kind: ProviderKind;
  name: string;
  base_url: string;
  model: string;
  has_api_key: boolean;
}

export interface AiConfig {
  enabled: boolean;
  provider: ProviderKind;
  model: string;
  base_url?: string;
}
