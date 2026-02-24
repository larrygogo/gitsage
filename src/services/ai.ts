import type { AiConfig, ProviderConfig } from '../types';
import * as ipc from './ipc';

/**
 * AI Service
 * 封装所有 AI 相关的 IPC 调用
 */

/** 基于 diff 内容自动生成提交信息 */
export async function generateCommitMessage(diff: string): Promise<string> {
  return ipc.generateCommitMessage(diff);
}

/** 基于 diff 内容生成变更摘要 */
export async function generateChangeSummary(diff: string): Promise<string> {
  return ipc.generateChangeSummary(diff);
}

/** 获取所有可用的 AI 提供商配置 */
export async function getAiProviders(): Promise<ProviderConfig[]> {
  return ipc.getAiProviders();
}

/** 更新 AI 配置 */
export async function updateAiConfig(config: AiConfig): Promise<void> {
  return ipc.updateAiConfig(config);
}

/** 设置指定提供商的 API Key */
export async function setAiApiKey(provider: string, apiKey: string): Promise<void> {
  return ipc.setAiApiKey(provider, apiKey);
}
