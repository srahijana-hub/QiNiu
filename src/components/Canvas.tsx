import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { CanvasEngine } from '../core/canvas/CanvasEngine';
import { useDrawingStore } from '../store/drawingStore';

// ============================================================
// 常量
// ============================================================

const DEFAULT_W = 1200;
const DEFAULT_H = 800;

// ============================================================
// Canvas 组件
// ============================================================

export interface CanvasHandle {
  engine: CanvasEngine | null;
  canvas: HTMLCanvasElement | null;
}

/**
 * AI 语音绘图画布
 *
 * - 内部分辨率 1200×800，CSS 自适应
 * - 挂载时创建 CanvasEngine，自动订阅 Store 重绘
 * - 通过 ref 暴露 engine 供父组件调用
 */
export const Canvas = forwardRef<CanvasHandle>((_, ref) => {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const [, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    engine: engineRef.current,
    canvas: canvasElRef.current,
  }));

  // ========== 初始化引擎 ==========
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el) return;

    el.width = DEFAULT_W;
    el.height = DEFAULT_H;

    const engine = new CanvasEngine(el);
    engineRef.current = engine;
    setReady(true);

    // 白色底色
    const ctx = el.getContext('2d');
    if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, DEFAULT_W, DEFAULT_H); }

    // 首次渲染已有图形
    const { shapes } = useDrawingStore.getState();
    if (shapes.length > 0) engine.redrawAll(shapes);

    // 窗口 resize 时更新画布尺寸
    const onResize = () => {
      const parent = el.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      engine.resize(w, h);
      engine.redrawAll(useDrawingStore.getState().shapes);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      engineRef.current = null;
    };
  }, []);

  // ========== 订阅 Store → 自动重绘 ==========
  useEffect(() => {
    const unsub = useDrawingStore.subscribe(
      (s) => s.shapes,
      (shapes) => engineRef.current?.redrawAll(shapes),
    );
    return unsub;
  }, []);

  // ========== 渲染 ==========
  return (
    <canvas
      ref={canvasElRef}
      className="drawing-canvas"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  );
});

Canvas.displayName = 'Canvas';
