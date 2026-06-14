import { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasEngine } from '../core/canvas/CanvasEngine';
import { useDrawingStore } from '../store/drawingStore';

// ============================================================
// 默认值
// ============================================================

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;

// ============================================================
// useCanvas
// ============================================================

export interface UseCanvasReturn {
  /** canvas 元素的 ref，需绑定到 <canvas ref={canvasRef}> */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** CanvasEngine 实例，canvas 挂载后才可用，初始为 null */
  engine: CanvasEngine | null;
}

/**
 * Canvas 绘图 Hook
 *
 * 封装 CanvasEngine 的初始化、Zustand Store 订阅、以及画布生命周期管理。
 *
 * 使用方式：
 * ```tsx
 * const { canvasRef, engine } = useCanvas();
 * return <canvas ref={canvasRef} />;
 * ```
 *
 * - canvas 挂载后自动创建 CanvasEngine 实例
 * - 自动订阅 drawingStore.shapes，变化时调用 engine.redrawAll()
 * - 组件卸载时自动清理
 */
export function useCanvas(
  existingRef?: React.RefObject<HTMLCanvasElement | null>,
): UseCanvasReturn {
  // ========== Refs & State ==========

  const internalRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = existingRef ?? internalRef;
  const engineRef = useRef<CanvasEngine | null>(null);
  const [engine, setEngine] = useState<CanvasEngine | null>(null);

  // ========== 初始化 CanvasEngine ==========

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 设置画布内部分辨率
    canvas.width = DEFAULT_WIDTH;
    canvas.height = DEFAULT_HEIGHT;

    // 创建引擎实例
    const eng = new CanvasEngine(canvas);
    engineRef.current = eng;
    setEngine(eng);

    // 如果 Store 中已有图形，立即渲染
    const { shapes } = useDrawingStore.getState();
    if (shapes.length > 0) {
      eng.redrawAll(shapes);
    }

    return () => {
      engineRef.current = null;
      setEngine(null);
    };
  }, []);

  // ========== 订阅 Store 变化 → 自动重绘 ==========

  useEffect(() => {
    const unsubscribe = useDrawingStore.subscribe(
      (state) => state.shapes,
      (shapes) => {
        engineRef.current?.redrawAll(shapes);
      },
    );

    return unsubscribe;
  }, []);

  return { canvasRef, engine };
}
