import { useRef, useCallback, useState } from 'react';
import { Canvas } from './components/Canvas';
import type { CanvasHandle } from './components/Canvas';
import { VoiceIndicator } from './components/VoiceIndicator';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ToolBar } from './components/ToolBar';
import { BackgroundDots } from './components/BackgroundDots';
import { useVoiceCommands } from './hooks/useVoiceCommands';
import { useDrawingStore } from './store/drawingStore';
import { ShapeFactory } from './core/canvas/ShapeFactory';
import { TransformManager } from './core/canvas/TransformManager';
import type { Command, CommandParams } from './types/commands';
import type { CanvasState } from './types/canvas';
import './App.css';

// ============================================================
// 常量
// ============================================================

const CW = 1200;
const CH = 800;

// ============================================================
// Command Dispatcher（轻量内联，避免修改 core/）
// ============================================================

function resolveTargetId(
  targetId: string,
  shapes: { id: string }[],
): string | null {
  if (targetId === 'last') return shapes.length > 0 ? shapes[shapes.length - 1].id : null;
  return targetId;
}

function resolveTargetIds(
  targetId: string,
  shapes: { id: string }[],
): string[] {
  if (targetId === 'all') return shapes.map((s) => s.id);
  const id = resolveTargetId(targetId, shapes);
  return id ? [id] : [];
}

/** 单条指令分发 */
function dispatchCommand(cmd: Command, factory: ShapeFactory, tm: TransformManager) {
  const store = useDrawingStore.getState();

  switch (cmd.action) {
    // ---- create ----
    case 'create_circle':
      store.addShape(factory.createCircle(cmd.params as any)); break;
    case 'create_rect':
      store.addShape(factory.createRect(cmd.params as any)); break;
    case 'create_line':
      store.addShape(factory.createLine(cmd.params as any)); break;
    case 'create_triangle':
      store.addShape(factory.createTriangle(cmd.params as any)); break;
    case 'create_ellipse':
      store.addShape(factory.createEllipse(cmd.params as any)); break;
    case 'create_polygon':
      store.addShape(factory.createPolygon(cmd.params as any)); break;
    case 'create_text':
      store.addShape(factory.createText(cmd.params as any)); break;

    // ---- transform ----
    case 'move': {
      const p = cmd.params as any;
      const tid = resolveTargetId(p.targetId, store.shapes);
      if (!tid) break;
      const s = store.shapes.find((x) => x.id === tid);
      if (s) store.updateShape(tid, tm.moveShape(s, p.dx, p.dy));
      break;
    }
    case 'scale': {
      const p = cmd.params as any;
      const tid = resolveTargetId(p.targetId, store.shapes);
      if (!tid) break;
      const s = store.shapes.find((x) => x.id === tid);
      if (s) store.updateShape(tid, tm.scaleShape(s, p.factor));
      break;
    }
    case 'rotate': {
      const p = cmd.params as any;
      const tid = resolveTargetId(p.targetId, store.shapes);
      if (!tid) break;
      const s = store.shapes.find((x) => x.id === tid);
      if (s) store.updateShape(tid, tm.rotateShape(s, p.angle));
      break;
    }

    // ---- delete ----
    case 'delete_shape': {
      const p = cmd.params as any;
      const tid = resolveTargetId(p.targetId, store.shapes);
      if (tid) store.removeShape(tid);
      break;
    }
    case 'delete_all':
    case 'clear':
      store.clearAll();
      break;

    // ---- style ----
    case 'set_color': {
      const p = cmd.params as any;
      const tids = resolveTargetIds(p.targetId, store.shapes);
      const su: any = {};
      if (p.property === 'fill' || p.property === 'both') su.fill = p.color;
      if (p.property === 'stroke' || p.property === 'both') su.stroke = p.color;
      for (const id of tids) store.updateShape(id, { style: su } as any);
      break;
    }
    case 'set_stroke_width': {
      const p = cmd.params as any;
      const tids = resolveTargetIds(p.targetId, store.shapes);
      for (const id of tids) store.updateShape(id, { style: { strokeWidth: p.width } } as any);
      break;
    }
    case 'set_fill': {
      const p = cmd.params as any;
      const tids = resolveTargetIds(p.targetId, store.shapes);
      for (const id of tids) {
        const shape = store.shapes.find((x) => x.id === id);
        store.updateShape(id, { style: { fill: p.filled ? (p.color ?? shape?.style.stroke ?? '#000000') : undefined } } as any);
      }
      break;
    }
    case 'set_line_style': {
      const p = cmd.params as any;
      const tids = resolveTargetIds(p.targetId, store.shapes);
      for (const id of tids) store.updateShape(id, { style: { lineStyle: p.style } } as any);
      break;
    }
    case 'set_opacity': {
      const p = cmd.params as any;
      const tids = resolveTargetIds(p.targetId, store.shapes);
      for (const id of tids) store.updateShape(id, { style: { opacity: p.opacity } } as any);
      break;
    }

    // ---- canvas ----
    case 'undo': store.undo(); break;
    case 'redo': store.redo(); break;
    case 'save': {
      // save is handled by ToolBar
      console.log('[dispatch] save handled externally');
      break;
    }

    case 'zoom_in':
    case 'zoom_out':
    case 'modify_position':
    case 'modify_size':
    case 'modify_props':
      break; // 未实现，静默跳过

    default:
      console.warn('[dispatch] unknown action:', (cmd as any).action);
  }
}

// ============================================================
// App
// ============================================================

function App() {
  const canvasRef = useRef<CanvasHandle>(null);
  const factoryRef = useRef(new ShapeFactory(CW, CH));
  const tmRef = useRef(new TransformManager());

  const {
    isListening,
    isProcessing,
    transcript,
    speechError,
    startListening,
    stopListening,
    processTranscript,
    speakResponse,
  } = useVoiceCommands();

  const [responseText, setResponseText] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const getCanvasState = useDrawingStore((s) => s.getCanvasState);

  // ========== 语音 → LLM → 绘图 完整流程 ==========
  const handleStopListening = useCallback(async () => {
    stopListening();

    if (!transcript.trim()) return;

    // 获取当前画布状态
    const canvasState: CanvasState = getCanvasState();

    try {
      const llmRes = await processTranscript(transcript, canvasState);

      // 执行 LLM 返回的指令
      for (const cmd of llmRes.commands) {
        dispatchCommand(cmd, factoryRef.current, tmRef.current);
      }

      // 更新反馈面板
      setResponseText(llmRes.responseText);
      setHistory((prev) => [`🎙 ${transcript}`, ...prev].slice(0, 20));

      // 语音回复
      if (llmRes.responseText) speakResponse(llmRes.responseText);
    } catch {
      // LLM 解析失败已在 hook 内降级，这里兜底
      setResponseText('解析指令时出现问题，请重试');
    }
  }, [transcript, stopListening, processTranscript, getCanvasState, speakResponse]);

  // ========== 布局 ==========
  return (
    <div className="app-shell">
      {/* 背景点阵 */}
      <BackgroundDots />

      {/* ---- 顶部：3D 粒子声纹中枢 ---- */}
      <header className="app-top">
        <VoiceIndicator
          isListening={isListening}
          isProcessing={isProcessing}
          transcript={transcript}
        />
      </header>

      {/* ---- 中央画布 ---- */}
      <main className="app-canvas-stage">
        <div className="app-canvas-frame">
          <Canvas ref={canvasRef} />
        </div>
      </main>

      {/* ---- 底部工具栏 ---- */}
      <div className="app-toolbar">
        <ToolBar
          isListening={isListening}
          isProcessing={isProcessing}
          onStartListening={startListening}
          onStopListening={handleStopListening}
          canvasRef={canvasRef}
        />
      </div>

      {/* ---- 右下角反馈面板 ---- */}
      <footer className="app-feedback">
        <FeedbackPanel responseText={responseText} history={history} />
        {speechError && (
          <div className="app-speech-error">{speechError}</div>
        )}
      </footer>
    </div>
  );
}

export default App;
