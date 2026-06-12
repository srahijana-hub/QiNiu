import type { Command } from './commands';

// ============================================================
// LLM 相关类型 —— AI-B 输出的数据结构
// ============================================================

export interface LLMResponse {
  commands: Command[];
  responseText: string;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
  rawTranscript: string;
}

export interface LLMError {
  type: 'recognition_failed' | 'llm_timeout' | 'llm_invalid_response' | 'api_error';
  message: string;
  rawTranscript?: string;
}
