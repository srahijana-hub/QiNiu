import React from 'react';
import { useDrawingStore } from '../store/drawingStore';
import type { CanvasHandle } from './Canvas';

export interface ToolBarProps {
  isListening: boolean;
  isProcessing: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  canvasRef: React.RefObject<CanvasHandle | null>;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  isListening, isProcessing,
  onStartListening, onStopListening,
  canvasRef,
}) => {
  const undo = useDrawingStore((s) => s.undo);
  const redo = useDrawingStore((s) => s.redo);
  const clearAll = useDrawingStore((s) => s.clearAll);
  const shapes = useDrawingStore((s) => s.shapes);
  const busy = isProcessing;

  const handleSave = () => {
    const el = canvasRef.current?.canvas;
    if (!el) return;
    const a = document.createElement('a');
    a.download = `voice-drawing-${Date.now()}.png`;
    a.href = el.toDataURL('image/png');
    a.click();
  };

  return (
    <div className="toolbar">
      {/* ---- 语音控制 ---- */}
      <div className="toolbar__section">
        {!isListening ? (
          <button className="tb-main tb-main--mic" onClick={onStartListening} disabled={busy}>
            <span className="tb-main__icon"><MicIcon /></span>
            <span className="tb-main__label">开始录音</span>
            <span className="tb-main__hint">点击后说话</span>
          </button>
        ) : (
          <button className="tb-main tb-main--mic tb-main--active" onClick={onStopListening}>
            <span className="tb-main__icon"><MicOffIcon /></span>
            <span className="tb-main__label">停止录音</span>
            <span className="tb-main__hint">点击后解析</span>
          </button>
        )}
      </div>

      {/* ---- 操作 ---- */}
      <div className="toolbar__section">
        <button className="tb-item" onClick={undo} disabled={busy} title="撤销 Ctrl+Z">
          <UndoIcon /><span className="tb-item__label">撤销</span>
        </button>
        <button className="tb-item" onClick={redo} disabled={busy} title="重做 Ctrl+Y">
          <RedoIcon /><span className="tb-item__label">重做</span>
        </button>
      </div>

      <div className="toolbar__sep" />

      <div className="toolbar__section">
        <button className="tb-item tb-item--danger" onClick={clearAll} disabled={busy || shapes.length === 0}>
          <TrashIcon /><span className="tb-item__label">清空</span>
        </button>
        <button className="tb-item" onClick={handleSave} disabled={busy || shapes.length === 0}>
          <SaveIcon /><span className="tb-item__label">保存</span>
        </button>
      </div>
    </div>
  );
};
ToolBar.displayName = 'ToolBar';

/* ============================================================
   Icons
   ============================================================ */

const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const MicOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 1a3 3 0 0 0-3 3v4l6 5.97V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2c0 1.23-.35 2.37-.94 3.34l1.44 1.44A9.96 9.96 0 0 0 21 12v-2h-2z" />
    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);
const RedoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
  </svg>
);
const SaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);
