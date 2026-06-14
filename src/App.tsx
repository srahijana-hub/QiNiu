import { useRef, useCallback, useState, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import type { CanvasHandle } from './components/Canvas';
import { SpeechRecognizer } from './core/speech';
import { ImageGenerator } from './core/image';
import './App.css';

const CW = 1200;
const CH = 800;

// ============================================================
// SVG Icons
// ============================================================

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const StopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
  </svg>
);

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);

// ============================================================
// App
// ============================================================

function App() {
  const canvasRef = useRef<CanvasHandle>(null);
  const imageGenRef = useRef(new ImageGenerator());
  const recognizerRef = useRef<SpeechRecognizer | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [responseText, setResponseText] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [lastImage, setLastImage] = useState<HTMLImageElement | null>(null);

  // 生成图片的核心函数
  const generateImage = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    setResponseText('正在生成图片...');
    try {
      const img = await imageGenRef.current.generateAndLoad(prompt);
      const canvas = canvasRef.current?.canvas;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (canvas.width - w) / 2;
          const y = (canvas.height - h) / 2;
          ctx.drawImage(img, x, y, w, h);
          setLastImage(img);
        }
      }
      setResponseText(`已生成: "${prompt}"`);
      setHistory((prev) => [prompt, ...prev].slice(0, 20));
    } catch (err) {
      setResponseText(`生成失败: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // 初始化语音识别器，注册回调：识别完成 → 自动生图
  useEffect(() => {
    const recognizer = new SpeechRecognizer();
    recognizerRef.current = recognizer;

    recognizer.onResult((text, isFinal) => {
      setTranscript(text);
      if (isFinal && text.trim()) {
        generateImage(text);
      }
    });

    recognizer.onStateChange((state) => {
      setIsListening(state.isListening);
      setIsRecognizing(state.isProcessing);
    });

    recognizer.onError((msg) => {
      setSpeechError(msg);
    });

    return () => { recognizerRef.current = null; };
  }, [generateImage]);

  const handleStartListening = useCallback(async () => {
    setSpeechError('');
    setTranscript('');
    await recognizerRef.current?.start();
  }, []);

  const handleStopListening = useCallback(() => {
    recognizerRef.current?.stop();
    // onResult 回调会自动触发生图，不需要在这里处理
  }, []);

  const handleSubmitText = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    await generateImage(text);
  }, [inputText, generateImage]);

  const handleClear = () => {
    const canvas = canvasRef.current?.canvas;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setLastImage(null);
    setResponseText('');
  };

  const handleSave = () => {
    const el = canvasRef.current?.canvas;
    if (!el) return;
    const a = document.createElement('a');
    a.download = `ai-drawing-${Date.now()}.png`;
    a.href = el.toDataURL('image/png');
    a.click();
  };

  const busy = isRecognizing || isGenerating;
  const voiceLabel = isGenerating ? '正在生成图片...' : isRecognizing ? '正在识别语音...' : isListening ? '正在聆听...' : '等待指令';

  return (
    <div className="app-shell">
      {/* ========== 左侧面板 ========== */}
      <aside className="app-sidebar">
        {/* 标题 */}
        <div className="sidebar-header">
          <h1>
            <span className="logo-icon">AI</span>
            AI 语音绘图
          </h1>
          <p>说出你想画的内容，AI 帮你实现</p>
        </div>

        {/* 语音控制 */}
        <div className="voice-section">
          <div className="voice-status">
            <span className={`voice-dot ${isListening ? 'voice-dot--listening' : ''} ${isGenerating ? 'voice-dot--processing' : ''}`} />
            <span className="voice-status-text">{voiceLabel}</span>
          </div>

          <div className={`voice-transcript ${transcript ? 'voice-transcript--active' : ''}`}>
            {transcript || '等待语音输入...'}
          </div>

          {!isListening ? (
            <button
              className="btn-record btn-record--start"
              onClick={handleStartListening}
              disabled={busy}
            >
              <MicIcon />
              开始录音
            </button>
          ) : (
            <button
              className="btn-record btn-record--stop"
              onClick={handleStopListening}
            >
              <StopIcon />
              停止录音并解析
            </button>
          )}
        </div>

        {/* 文字输入 */}
        <div className="text-input-section">
          <div className="text-input-label">文字输入</div>
          <div className="text-input-row">
            <input
              className="text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitText()}
              placeholder="描述你想画的内容..."
              disabled={busy}
            />
            <button
              className="btn-generate"
              onClick={handleSubmitText}
              disabled={busy || !inputText.trim()}
            >
              生成
            </button>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="actions-section">
          <div className="actions-grid">
            <button className="btn-action btn-action--danger" onClick={handleClear} disabled={busy || !lastImage}>
              <TrashIcon /> 清空画布
            </button>
            <button className="btn-action btn-action--primary" onClick={handleSave} disabled={busy || !lastImage}>
              <SaveIcon /> 保存图片
            </button>
          </div>
        </div>

        {/* 反馈面板 */}
        <div className="feedback-section">
          <div className="feedback-label">
            <span className="dot" />
            AI 回复
          </div>

          <div className="feedback-current">
            <p className="feedback-text">
              {responseText || <span className="feedback-text--placeholder">说出指令开始绘图...</span>}
              {responseText && <span className="feedback-cursor">|</span>}
            </p>
          </div>

          {speechError && <div className="speech-error">{speechError}</div>}

          <div className="feedback-label" style={{ marginTop: 4 }}>指令历史</div>
          <div className="feedback-history">
            {history.length === 0 ? (
              <span className="feedback-history-empty">暂无历史记录</span>
            ) : (
              history.map((item, i) => (
                <div key={i} className="feedback-history-item">
                  <span className="icon">{'>'}</span>
                  <span className="text">{item}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ========== 右侧画布 ========== */}
      <main className="app-main">
        <div className="main-header">
          <h2>画布</h2>
          <span className="canvas-info">{CW} x {CH}</span>
        </div>
        <div className="canvas-container">
          <div className="canvas-frame">
            <Canvas ref={canvasRef} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
