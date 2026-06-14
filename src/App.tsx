import { useState, useEffect, useRef, useCallback } from 'react';
import type { LLMResponse } from './types/llm';
import type { Command } from './types/commands';
import { Canvas } from './components/Canvas';
import { VoiceIndicator } from './components/VoiceIndicator';
import { FeedbackPanel } from './components/FeedbackPanel';
import { useCanvas } from './hooks/useCanvas';
import { CommandExecutor } from './core/executor/CommandExecutor';
import { ShapeFactory } from './core/canvas/ShapeFactory';
import './App.css';

// ============================================================
// Mock 数据
// ============================================================

/** 测试用 Mock LLMResponse —— 画一个红色圆形 */
function buildMockResponse(): LLMResponse {
  return {
    commands: [
      {
        id: `cmd_${Date.now()}`,
        category: 'create',
        action: 'create_circle',
        params: {
          x: 'center',
          y: 'center',
          radius: 80,
          fill: '#FF4444',
          stroke: '#CC0000',
          strokeWidth: 3,
          opacity: 0.9,
        },
        confidence: 0.95,
      },
      {
        id: `cmd_${Date.now() + 1}`,
        category: 'create',
        action: 'create_rect',
        params: {
          x: 300,
          y: 200,
          width: 160,
          height: 100,
          borderRadius: 12,
          fill: '#4488FF',
          stroke: '#2266DD',
          strokeWidth: 2,
        },
        confidence: 0.92,
      },
      {
        id: `cmd_${Date.now() + 2}`,
        category: 'create',
        action: 'create_triangle',
        params: {
          x: 800,
          y: 300,
          width: 120,
          height: 100,
          fill: '#FFAA00',
          stroke: '#CC8800',
          strokeWidth: 2,
        },
        confidence: 0.90,
      },
      {
        id: `cmd_${Date.now() + 3}`,
        category: 'create',
        action: 'create_text',
        params: {
          x: 'center',
          y: 550,
          content: 'Hello Voice Drawing!',
          fontSize: 28,
          fontFamily: 'Arial',
          fill: '#FFFFFF',
        },
        confidence: 0.88,
      },
    ],
    responseText: '好的，我已经画了一个红色圆形、一个蓝色矩形、一个橙色三角形和一段文字',
    confidence: 0.91,
    needsClarification: false,
    rawTranscript: '画一个红色的圆，一个蓝色的矩形，一个橙色三角形，再加一段文字',
  };
}

// ============================================================
// App
// ============================================================

function App() {
  // ========== 画布 ==========
  const { canvasRef, engine } = useCanvas();

  // ========== CommandExecutor ==========
  const executorRef = useRef<CommandExecutor | null>(null);

  useEffect(() => {
    if (!engine) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const factory = new ShapeFactory(canvas.width, canvas.height);
    executorRef.current = new CommandExecutor(engine, factory);
  }, [engine, canvasRef]);

  // ========== 语音状态（Mock） ==========
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');

  // ========== 反馈面板数据 ==========
  const [responseText, setResponseText] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  // ========== 测试：执行 Mock 指令 ==========
  const handleTestDraw = useCallback(async () => {
    if (!executorRef.current) return;

    // 模拟语音流程
    setIsListening(true);
    setTranscript('画一个红色的圆，一个蓝色的矩形...');

    // 短暂延迟模拟识别过程
    await new Promise((r) => setTimeout(r, 600));
    setIsListening(false);

    // 进入处理状态
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 400));

    const mockResponse = buildMockResponse();

    // 更新 UI 状态
    setTranscript(mockResponse.rawTranscript);
    setResponseText(mockResponse.responseText);

    // 添加到历史
    setHistory((prev) => [
      `[画图] ${mockResponse.rawTranscript}`,
      ...prev,
    ].slice(0, 10));

    // 执行绘图指令
    await executorRef.current.execute(mockResponse, {
      onFeedback: (text) => {
        console.log('[TTS]', text);
      },
      onLowConfidence: async (cmd: Command) => {
        // 测试中低置信度自动确认
        console.warn('[低置信度] 自动确认:', cmd.action, cmd.confidence);
        return true;
      },
      onClarificationNeeded: (question: string) => {
        console.warn('[澄清]', question);
      },
      onExecutionError: (cmdId: string, error: string) => {
        console.error('[执行失败]', cmdId, error);
      },
    });

    setIsProcessing(false);
    setTranscript('');
  }, []);

  // ========== 测试：清空画布 ==========
  const handleClear = useCallback(() => {
    if (!executorRef.current) return;

    const clearResponse: LLMResponse = {
      commands: [
        {
          id: `cmd_${Date.now()}`,
          category: 'canvas',
          action: 'clear',
          params: {},
          confidence: 1.0,
        },
      ],
      responseText: '画布已清除',
      confidence: 1.0,
      needsClarification: false,
      rawTranscript: '清除画布',
    };

    executorRef.current.execute(clearResponse);
    setResponseText(clearResponse.responseText);
    setHistory((prev) => ['[清除] 画布已清除', ...prev].slice(0, 10));
  }, []);

  // ========== 布局 ==========
  return (
    <div className="app-layout">
      {/* ---- 顶部 ---- */}
      <header className="app-header">
        <div className="app-header__left">
          <div className="app-logo" aria-hidden="true">🎨</div>
          <span className="app-title">
            Voice<span className="app-title__accent">Draw</span>
          </span>
        </div>

        <VoiceIndicator
          isListening={isListening}
          isProcessing={isProcessing}
          transcript={transcript}
        />

        <div className="app-test-actions">
          <button
            type="button"
            className="app-test-btn app-test-btn--primary"
            onClick={handleTestDraw}
            disabled={isProcessing}
          >
            ▶ 模拟语音
          </button>
          <button
            type="button"
            className="app-test-btn app-test-btn--ghost"
            onClick={handleClear}
            disabled={isProcessing}
          >
            清空画布
          </button>
        </div>
      </header>

      {/* ---- 中间：画布 ---- */}
      <main className="app-canvas-area">
        <div className="app-canvas-wrapper">
          <Canvas canvasRef={canvasRef} />
        </div>
      </main>

      {/* ---- 底部 ---- */}
      <footer className="app-footer">
        <FeedbackPanel
          responseText={responseText}
          history={history}
        />
      </footer>
    </div>
  );
}

export default App;
