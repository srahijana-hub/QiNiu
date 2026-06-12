import type { LLMResponse } from './llm';
import type { CanvasState } from './canvas';

// ============================================================
// 模块间回调接口 —— AI-A 和 AI-B 的交互契约
// ============================================================

/** AI-B → AI-A: 传递绘图指令 */
export type OnCommandsReady = (response: LLMResponse) => void;

/** AI-A → AI-B: 传递画布状态（注入 LLM 上下文） */
export type OnCanvasStateUpdate = (state: CanvasState) => void;

/** AI-B → AI-A: 语音状态变化通知（用于 UI 更新） */
export type OnVoiceStateChange = (state: {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
}) => void;
